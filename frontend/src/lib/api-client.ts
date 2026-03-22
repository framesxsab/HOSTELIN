export type ApiErrorKind = "timeout" | "network" | "http" | "unknown";

export class ApiClientError extends Error {
  kind: ApiErrorKind;
  status?: number;
  retryAfterSeconds?: number;

  constructor(kind: ApiErrorKind, message: string, status?: number, retryAfterSeconds?: number) {
    super(message);
    this.name = "ApiClientError";
    this.kind = kind;
    this.status = status;
    this.retryAfterSeconds = retryAfterSeconds;
  }
}

const API_BASE = process.env.NEXT_PUBLIC_BUNKY_API_BASE ?? "http://127.0.0.1:8000";
const API_TIMEOUT_MS = Number(process.env.NEXT_PUBLIC_BUNKY_API_TIMEOUT_MS ?? "10000");

function tryParseJson(input: string): unknown {
  try {
    return JSON.parse(input);
  } catch {
    return null;
  }
}

function extractHttpMessage(rawBody: string, status: number): string {
  if (!rawBody) {
    return `Request failed (${status}).`;
  }

  const parsed = tryParseJson(rawBody);
  if (parsed && typeof parsed === "object" && "detail" in parsed) {
    const detail = parsed.detail;
    if (typeof detail === "string" && detail.trim()) {
      return detail;
    }
    return "Request validation failed.";
  }

  return rawBody.slice(0, 240);
}

function parseRetryAfterSeconds(value: string | null): number | undefined {
  if (!value) {
    return undefined;
  }

  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return undefined;
  }

  return Math.ceil(parsed);
}

function getStoredToken(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem("hostelos-auth");
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { state?: { token?: string } };
    return parsed?.state?.token ?? null;
  } catch {
    return null;
  }
}

export async function apiFetchJson<T>(path: string, init?: RequestInit): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), API_TIMEOUT_MS);

  const token = getStoredToken();
  const authHeader: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};

  try {
    const response = await fetch(`${API_BASE}${path}`, {
      ...init,
      cache: init?.cache ?? "no-store",
      signal: controller.signal,
      headers: {
        ...authHeader,
        ...(init?.headers as Record<string, string> | undefined),
      },
    });

    const responseText = await response.text();
    if (!response.ok) {
      const retryAfterSeconds = parseRetryAfterSeconds(response.headers.get("Retry-After"));
      throw new ApiClientError("http", extractHttpMessage(responseText, response.status), response.status, retryAfterSeconds);
    }

    return (responseText ? (JSON.parse(responseText) as T) : ({} as T));
  } catch (error) {
    if (error instanceof ApiClientError) {
      throw error;
    }

    if (error instanceof DOMException && error.name === "AbortError") {
      throw new ApiClientError("timeout", "Request timed out. Please retry.");
    }

    if (error instanceof TypeError) {
      throw new ApiClientError("network", "Backend offline or unreachable. Start API and retry.");
    }

    throw new ApiClientError("unknown", "Unexpected request failure.");
  } finally {
    clearTimeout(timeout);
  }
}

export function toUiMessage(error: unknown, fallback: string): string {
  if (error instanceof ApiClientError) {
    if (error.kind === "http") {
      if (error.status === 429) {
        if (error.retryAfterSeconds && error.retryAfterSeconds > 0) {
          return `Too many requests. Retry in ${error.retryAfterSeconds}s.`;
        }
        return "Too many requests. Please retry shortly.";
      }
      return error.message;
    }
    if (error.kind === "network") {
      return "Backend offline. Start FastAPI on port 8000 and retry.";
    }
    if (error.kind === "timeout") {
      return "Request timed out. Please retry.";
    }
    return error.message;
  }

  return fallback;
}

export function isRetryableError(error: unknown): boolean {
  if (error instanceof ApiClientError) {
    return error.kind === "network" || error.kind === "timeout" || (error.kind === "http" && (error.status ?? 0) >= 500);
  }
  return false;
}

export function getRetryAfterSeconds(error: unknown): number | undefined {
  if (error instanceof ApiClientError) {
    return error.retryAfterSeconds;
  }
  return undefined;
}

export function isRetryableMessage(message: string): boolean {
  const normalized = message.toLowerCase();
  return normalized.includes("retry") || normalized.includes("offline") || normalized.includes("timed out") || normalized.includes("failed");
}
