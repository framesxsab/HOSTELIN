"use client";

import { type FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";

import { AppShell } from "@/components/app-shell";
import { UiIcon } from "@/components/ui-icon";
import { apiFetchJson, getRetryAfterSeconds, isRetryableError, toUiMessage } from "@/lib/api-client";
import { type BunkyResponse, type DashboardSummary } from "@/lib/types";
import { useElementWidth, useTextHeight, MONO_FONT_SM, MONO_LINE_HEIGHT } from "@/lib/use-pretext";

const INITIAL_SUMMARY: DashboardSummary = {
  dinner_time: "",
  mess_skipped_today: 0,
  fixit_pending: 0,
  roomtab_balance: "",
  parcel_arrived: 0,
  recent_activity: [],
};

const API_BASE = process.env.NEXT_PUBLIC_BUNKY_API_BASE ?? "http://127.0.0.1:8000";

export default function Dashboard() {
  const [summary, setSummary] = useState<DashboardSummary>(INITIAL_SUMMARY);
  const [command, setCommand] = useState("");
  const [responseText, setResponseText] = useState("");
  const [isLoadingSummary, setIsLoadingSummary] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [syncError, setSyncError] = useState("");
  const [lastSyncAt, setLastSyncAt] = useState("");
  const [lastCommand, setLastCommand] = useState("");
  const [canRetryCommand, setCanRetryCommand] = useState(false);
  const [commandState, setCommandState] = useState<"idle" | "success" | "error">("idle");
  const [cooldownSeconds, setCooldownSeconds] = useState(0);
  const [streamStatus, setStreamStatus] = useState<"connected" | "reconnecting" | "offline">("reconnecting");

  const [responsePanelRef, responsePanelWidth] = useElementWidth<HTMLDivElement>();
  const responseHeight = useTextHeight(responseText, MONO_FONT_SM, Math.max(responsePanelWidth - 80, 120), MONO_LINE_HEIGHT);
  const activityLogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (cooldownSeconds <= 0) return;
    const timer = setInterval(() => {
      setCooldownSeconds((current) => (current > 0 ? current - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldownSeconds]);

  const appendActivity = useCallback((message: string) => {
    setSummary((current) => {
      if (current.recent_activity[0] === message) return current;
      const deduped = [message, ...current.recent_activity.filter((item) => item !== message)];
      return { ...current, recent_activity: deduped.slice(0, 6) };
    });
  }, []);

  useEffect(() => {
    const el = activityLogRef.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [summary.recent_activity]);

  const fetchSummary = useCallback(async () => {
    setIsLoadingSummary(true);
    try {
      const payload = await apiFetchJson<DashboardSummary>("/api/dashboard/summary");
      setSummary(payload);
      setSyncError("");
      setLastSyncAt(new Date().toLocaleTimeString());
    } catch (error) {
      setSyncError(toUiMessage(error, "Could not sync dashboard summary."));
    } finally {
      setIsLoadingSummary(false);
    }
  }, []);

  useEffect(() => { void fetchSummary(); }, [fetchSummary]);

  useEffect(() => {
    const interval = setInterval(() => { void fetchSummary(); }, 15000);
    return () => clearInterval(interval);
  }, [fetchSummary]);

  useEffect(() => {
    let stream: EventSource | null = null;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    let attempts = 0;
    let unmounted = false;

    function connect() {
      if (unmounted) return;
      stream = new EventSource(`${API_BASE}/api/dashboard/activity/stream`);

      stream.onopen = () => {
        attempts = 0;
        setStreamStatus("connected");
      };

      stream.addEventListener("activity", ((event: MessageEvent<string>) => {
        try {
          const parsed = JSON.parse(event.data) as { message?: string };
          if (parsed.message) appendActivity(parsed.message);
        } catch {
          // Ignore malformed payloads
        }
      }) as EventListener);

      stream.onerror = () => {
        stream?.close();
        setStreamStatus("reconnecting");
        attempts++;
        const delay = Math.min(1000 * Math.pow(2, attempts), 30000);
        reconnectTimer = setTimeout(connect, delay);
      };
    }

    connect();

    return () => {
      unmounted = true;
      stream?.close();
      if (reconnectTimer) clearTimeout(reconnectTimer);
    };
  }, [appendActivity]);

  const metricLabel = useMemo(
    () => ({
      dinner: isLoadingSummary ? "..." : summary.dinner_time,
      fixit: isLoadingSummary ? "..." : `${summary.fixit_pending} Pending`,
      roomtab: isLoadingSummary ? "..." : summary.roomtab_balance,
      parcel: isLoadingSummary ? "..." : `${summary.parcel_arrived} Arrived`,
    }),
    [isLoadingSummary, summary],
  );

  const runCommand = async (cmd: string) => {
    setIsSending(true);
    setCommandState("idle");
    setResponseText("");
    setLastCommand(cmd);
    appendActivity(`Command queued: ${cmd}`);
    try {
      const payload = await apiFetchJson<BunkyResponse>("/api/bunky/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ command: cmd }),
      });
      setResponseText(payload.result.message);
      setCanRetryCommand(false);
      setCommandState("success");
      appendActivity(`Command completed: ${payload.result.tool}`);
      await fetchSummary();
    } catch (error) {
      const retryAfterSeconds = getRetryAfterSeconds(error);
      if (retryAfterSeconds && retryAfterSeconds > 0) setCooldownSeconds(retryAfterSeconds);
      setResponseText(toUiMessage(error, "Could not run command."));
      setCanRetryCommand(isRetryableError(error));
      setCommandState("error");
      appendActivity(`Command failed: ${cmd}`);
    } finally {
      setIsSending(false);
    }
  };

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!command.trim()) return;
    if (cooldownSeconds > 0) {
      setResponseText(`Rate limit active. Retry in ${cooldownSeconds}s.`);
      return;
    }
    await runCommand(command.trim());
  };

  const rerunLastCommand = async () => {
    if (!lastCommand || isSending) return;
    if (cooldownSeconds > 0) {
      setResponseText(`Rate limit active. Retry in ${cooldownSeconds}s.`);
      return;
    }
    setCommand(lastCommand);
    await runCommand(lastCommand);
  };

  const metricCards = useMemo(() => [
    { label: "MESSMATE", sublabel: isLoadingSummary ? "..." : `${summary.mess_skipped_today} skipped today`, value: metricLabel.dinner, icon: "restaurant" as const, color: "text-primary", bg: "bg-primary/10" },
    { label: "FIXIT_QUEUE", value: metricLabel.fixit, icon: "confirmation_number" as const, color: "text-accent", bg: "bg-accent/10" },
    { label: "ROOMTAB", value: metricLabel.roomtab, icon: "payments" as const, color: "text-info", bg: "bg-info/10" },
    { label: "PARCELPING", value: metricLabel.parcel, icon: "local_shipping" as const, color: "text-primary", bg: "bg-primary/10" },
  ], [isLoadingSummary, summary.mess_skipped_today, metricLabel]);

  return (
    <AppShell active="dashboard">
      {/* Sync status */}
      <div className="w-full max-w-4xl mx-auto space-y-3">
        {(syncError || lastSyncAt) && (
          <div className="pixel-panel flex flex-wrap items-center justify-between gap-2 rounded-lg border border-void-border bg-void/40 px-3 py-2 text-xs font-mono">
            <span className={syncError ? "text-danger" : "text-text-muted"}>
              {syncError || `Synced at ${lastSyncAt}`}
            </span>
            {syncError && (
              <button
                type="button"
                onClick={() => void fetchSummary()}
                className="pixel-control rounded-md border border-primary/30 px-2 py-1 text-primary hover:bg-primary/10"
              >
                Retry Sync
              </button>
            )}
          </div>
        )}

        {/* Command input */}
        <form onSubmit={onSubmit} className="pixel-panel bg-void-panel/80 border border-void-border rounded-lg flex flex-wrap items-center gap-2 px-4 py-3 shadow-2xl shadow-primary/5">
          <span className="text-primary font-mono font-bold mr-1 text-lg sm:mr-3">&gt;</span>
          <input
            value={command}
            onChange={(event) => setCommand(event.target.value)}
            className="min-w-0 flex-1 bg-transparent text-primary text-sm font-mono outline-none placeholder:text-primary/35"
            placeholder="Try: fixit for broken fan in room 14"
            aria-label="Bunky command"
          />
          <button
            type="submit"
            disabled={isSending || cooldownSeconds > 0}
            className="pixel-control ml-auto rounded-md border border-primary/40 px-3 py-1 text-xs font-mono text-primary hover:bg-primary/10 disabled:opacity-40"
          >
            {isSending ? "RUNNING" : cooldownSeconds > 0 ? `WAIT ${cooldownSeconds}s` : "RUN"}
          </button>
        </form>

        {/* Command response */}
        <div
          ref={responsePanelRef}
          className="pixel-panel flex flex-wrap items-center gap-3 rounded-lg border border-void-border bg-void/50 px-3 overflow-hidden"
          style={{
            minHeight: "2.25rem",
            height: responseText
              ? `${Math.max((responseHeight ?? MONO_LINE_HEIGHT) + 16, 36)}px`
              : "2.25rem",
            transition: "height 200ms ease",
            paddingTop: "0.5rem",
            paddingBottom: "0.5rem",
          }}
        >
          <p className={`min-w-0 flex-1 text-xs font-mono break-words ${commandState === "error" ? "text-danger" : commandState === "success" ? "text-primary" : "text-text-secondary"}`}>
            {responseText}
          </p>
          {canRetryCommand && (
            <button
              type="button"
              onClick={() => void rerunLastCommand()}
              className="rounded-md border border-primary/30 px-2 py-1 text-xs font-mono text-primary hover:bg-primary/10"
            >
              Retry Command
            </button>
          )}
        </div>
      </div>

      {/* Metric cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {metricCards.map((card) => (
          <div key={card.label} className="pixel-panel bg-void-panel/80 border border-void-border p-5 rounded-lg hover:border-primary/40 transition-all flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div className={`size-10 ${card.bg} rounded-full flex items-center justify-center ${card.color}`}>
                <UiIcon name={card.icon} className="size-5" />
              </div>
              <span className="text-[10px] font-mono text-text-dim">{card.label}</span>
            </div>
            <div>
              <h3 className="text-xl font-mono font-bold text-white uppercase tracking-tight">{card.value}</h3>
              {card.sublabel && (
                <p className="text-[10px] font-mono text-text-dim mt-1">{card.sublabel}</p>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Activity log */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 flex-1">
        <div className="pixel-panel xl:col-span-2 flex flex-col bg-void-panel/80 border border-void-border rounded-lg overflow-hidden min-h-[24rem]">
          <div className="px-5 py-3 border-b border-void-border flex items-center justify-between bg-void/50">
            <h2 className="text-xs font-mono font-bold text-white uppercase tracking-widest">System Activity Log</h2>
            <div className="flex items-center gap-2">
              <span className={`inline-block size-1.5 rounded-full ${streamStatus === "connected" ? "bg-primary shadow-[0_0_4px_rgba(163,230,53,0.5)]" : streamStatus === "reconnecting" ? "bg-accent animate-pulse" : "bg-danger"}`} />
              <span className="text-[10px] font-mono text-text-dim uppercase tracking-widest">
                {streamStatus === "connected" ? "LIVE" : streamStatus === "reconnecting" ? "RECONNECTING" : "OFFLINE"}
              </span>
            </div>
          </div>
          <div
            ref={activityLogRef}
            className="p-4 font-mono text-xs flex flex-col gap-3 overflow-y-auto custom-scrollbar flex-1"
          >
            {summary.recent_activity.length === 0 && (
              <div className="flex gap-4 p-2 rounded animate-pulse">
                <span className="text-text-dim">[IDLE]</span>
                <span className="text-primary/50">INFO</span>
                <span className="text-text-muted">No activity yet. Run a Bunky command to generate events.</span>
              </div>
            )}
            {summary.recent_activity.map((item, index) => (
              <div
                key={`${item}-${index}`}
                className="flex min-w-0 gap-4 p-2 rounded hover:bg-void-elevated/50 transition-colors animate-fade-in"
                style={{ animationDelay: `${index * 40}ms` }}
              >
                <span className="shrink-0 text-text-dim">[LIVE]</span>
                <span className="shrink-0 text-primary">INFO</span>
                <span className="min-w-0 break-words text-text-secondary">{item}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </AppShell>
  );
}
