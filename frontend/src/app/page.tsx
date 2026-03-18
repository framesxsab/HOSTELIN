"use client";

import { type FormEvent, useCallback, useEffect, useMemo, useState } from "react";

import { AppShell } from "@/components/app-shell";
import { UiIcon } from "@/components/ui-icon";
import { apiFetchJson, getRetryAfterSeconds, isRetryableError, toUiMessage } from "@/lib/api-client";
import { type BunkyResponse, type DashboardSummary } from "@/lib/types";

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

  useEffect(() => {
    if (cooldownSeconds <= 0) {
      return;
    }

    const timer = setInterval(() => {
      setCooldownSeconds((current) => (current > 0 ? current - 1 : 0));
    }, 1000);

    return () => clearInterval(timer);
  }, [cooldownSeconds]);

  const appendActivity = useCallback((message: string) => {
    setSummary((current) => {
      if (current.recent_activity[0] === message) {
        return current;
      }

      const deduped = [message, ...current.recent_activity.filter((item) => item !== message)];
      return {
        ...current,
        recent_activity: deduped.slice(0, 6),
      };
    });
  }, []);

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

  useEffect(() => {
    void fetchSummary();
  }, [fetchSummary]);

  useEffect(() => {
    const interval = setInterval(() => {
      void fetchSummary();
    }, 15000);

    return () => clearInterval(interval);
  }, [fetchSummary]);

  useEffect(() => {
    const stream = new EventSource(`${API_BASE}/api/dashboard/activity/stream`);

    const onActivity = (event: MessageEvent<string>) => {
      try {
        const parsed = JSON.parse(event.data) as { message?: string };
        if (parsed.message) {
          appendActivity(parsed.message);
        }
      } catch {
        // Ignore malformed stream event payloads and keep stream alive.
      }
    };

    stream.addEventListener("activity", onActivity as EventListener);

    return () => {
      stream.removeEventListener("activity", onActivity as EventListener);
      stream.close();
    };
  }, [appendActivity]);

  const metricLabel = useMemo(
    () => ({
      dinner: isLoadingSummary ? "Loading..." : summary.dinner_time,
      fixit: isLoadingSummary ? "Loading..." : `${summary.fixit_pending} Pending`,
      roomtab: isLoadingSummary ? "Loading..." : summary.roomtab_balance,
      parcel: isLoadingSummary ? "Loading..." : `${summary.parcel_arrived} Arrived`,
    }),
    [isLoadingSummary, summary],
  );

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!command.trim()) {
      return;
    }
    if (cooldownSeconds > 0) {
      setResponseText(`Rate limit active. Retry in ${cooldownSeconds}s.`);
      return;
    }

    const commandToRun = command.trim();
    setIsSending(true);
    setCommandState("idle");
    setResponseText("");
    appendActivity(`Command queued: ${commandToRun}`);
    try {
      setLastCommand(commandToRun);
      const payload = await apiFetchJson<BunkyResponse>("/api/bunky/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ command: commandToRun }),
      });
      setResponseText(payload.result.message);
      setCanRetryCommand(false);
      setCommandState("success");
      appendActivity(`Command completed: ${payload.result.tool}`);
      await fetchSummary();
    } catch (error) {
      const retryAfterSeconds = getRetryAfterSeconds(error);
      if (retryAfterSeconds && retryAfterSeconds > 0) {
        setCooldownSeconds(retryAfterSeconds);
      }
      setResponseText(toUiMessage(error, "Could not run command."));
      setCanRetryCommand(isRetryableError(error));
      setCommandState("error");
      appendActivity(`Command failed: ${commandToRun}`);
    } finally {
      setIsSending(false);
    }
  };

  const rerunLastCommand = async () => {
    if (!lastCommand || isSending) {
      return;
    }
    if (cooldownSeconds > 0) {
      setResponseText(`Rate limit active. Retry in ${cooldownSeconds}s.`);
      return;
    }
    setCommand(lastCommand);
    setIsSending(true);
    setCommandState("idle");
    setResponseText("");
    appendActivity(`Command re-run queued: ${lastCommand}`);
    try {
      const payload = await apiFetchJson<BunkyResponse>("/api/bunky/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ command: lastCommand }),
      });
      setResponseText(payload.result.message);
      setCanRetryCommand(false);
      setCommandState("success");
      appendActivity(`Command completed: ${payload.result.tool}`);
      await fetchSummary();
    } catch (error) {
      const retryAfterSeconds = getRetryAfterSeconds(error);
      if (retryAfterSeconds && retryAfterSeconds > 0) {
        setCooldownSeconds(retryAfterSeconds);
      }
      setResponseText(toUiMessage(error, "Could not run command."));
      setCanRetryCommand(isRetryableError(error));
      setCommandState("error");
      appendActivity(`Command failed: ${lastCommand}`);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <AppShell active="dashboard">
      <div className="w-full max-w-4xl mx-auto space-y-3">
        {(syncError || lastSyncAt) && (
          <div className="pixel-panel flex flex-wrap items-center justify-between gap-2 rounded-lg border border-accent-dark bg-background-dark/35 px-3 py-2 text-xs font-mono">
            <span className={syncError ? "text-red-300" : "text-slate-400"}>
              {syncError || `Summary synced at ${lastSyncAt}`}
            </span>
            {syncError && (
              <button
                type="button"
                onClick={() => void fetchSummary()}
                className="pixel-control rounded border border-primary/30 px-2 py-1 text-primary hover:bg-primary/10"
              >
                Retry Sync
              </button>
            )}
          </div>
        )}
        <form onSubmit={onSubmit} className="pixel-panel bg-neutral-dark/80 border border-accent-dark rounded-lg flex flex-wrap items-center gap-2 px-4 py-3 shadow-2xl shadow-primary/5">
          <span className="text-primary font-mono font-bold mr-1 text-lg sm:mr-3">&gt;</span>
          <input
            value={command}
            onChange={(event) => setCommand(event.target.value)}
            className="min-w-0 flex-1 bg-transparent text-primary text-sm font-mono outline-none placeholder:text-primary/40"
            placeholder="Try: fixit for broken fan in room 14"
            aria-label="Bunky command"
          />
          <button
            type="submit"
            disabled={isSending || cooldownSeconds > 0}
            className="pixel-control ml-auto rounded border border-primary/40 px-3 py-1 text-xs font-mono text-primary hover:bg-primary/10 disabled:opacity-40"
          >
            {isSending ? "RUNNING" : cooldownSeconds > 0 ? `WAIT ${cooldownSeconds}s` : "RUN"}
          </button>
        </form>
        <div className="pixel-panel flex flex-wrap items-center gap-3 rounded-lg border border-accent-dark bg-background-dark/45 px-3 py-2">
          <p
            className={`min-w-0 flex-1 text-xs font-mono break-words ${commandState === "error" ? "text-red-300" : commandState === "success" ? "text-primary" : "text-slate-300"}`}
          >
            {responseText}
          </p>
          {canRetryCommand && (
            <button
              type="button"
              onClick={() => void rerunLastCommand()}
              className="rounded border border-primary/30 px-2 py-1 text-xs font-mono text-primary hover:bg-primary/10"
            >
              Retry Command
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        <div className="pixel-panel bg-neutral-dark/80 border border-accent-dark p-5 rounded-lg hover:border-primary/50 transition-all flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div className="size-10 bg-primary/10 rounded-full flex items-center justify-center text-primary">
              <UiIcon name="restaurant" className="size-5" />
            </div>
            <span className="text-[10px] font-mono text-slate-500">MESSMATE_CORE</span>
          </div>
          <div>
            <h3 className="text-xl font-mono font-bold text-white uppercase tracking-tight">{metricLabel.dinner}</h3>
            <p className="text-[10px] font-mono text-slate-500 mt-1">
              {isLoadingSummary ? "Loading..." : `${summary.mess_skipped_today} skipped today`}
            </p>
          </div>
        </div>
        <div className="pixel-panel bg-neutral-dark/80 border border-accent-dark p-5 rounded-lg hover:border-primary/50 transition-all flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div className="size-10 bg-yellow-500/10 rounded-full flex items-center justify-center text-yellow-500">
              <UiIcon name="confirmation_number" className="size-5" />
            </div>
            <span className="text-[10px] font-mono text-slate-500">FIXIT_QUEUE</span>
          </div>
          <div>
            <h3 className="text-xl font-mono font-bold text-white uppercase tracking-tight">{metricLabel.fixit}</h3>
          </div>
        </div>
        <div className="pixel-panel bg-neutral-dark/80 border border-accent-dark p-5 rounded-lg hover:border-primary/50 transition-all flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div className="size-10 bg-blue-500/10 rounded-full flex items-center justify-center text-blue-500">
              <UiIcon name="payments" className="size-5" />
            </div>
            <span className="text-[10px] font-mono text-slate-500">ROOMTAB_LEDGER</span>
          </div>
          <div>
            <h3 className="text-xl font-mono font-bold text-white uppercase tracking-tight">{metricLabel.roomtab}</h3>
          </div>
        </div>
        <div className="pixel-panel bg-neutral-dark/80 border border-accent-dark p-5 rounded-lg hover:border-primary/50 transition-all flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div className="size-10 bg-primary/10 rounded-full flex items-center justify-center text-primary">
              <UiIcon name="local_shipping" className="size-5" />
            </div>
            <span className="text-[10px] font-mono text-slate-500">PARCELPING_LOG</span>
          </div>
          <div>
            <h3 className="text-xl font-mono font-bold text-white uppercase tracking-tight">{metricLabel.parcel}</h3>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 flex-1">
        <div className="pixel-panel xl:col-span-2 flex flex-col bg-neutral-dark/80 border border-accent-dark rounded-lg overflow-hidden min-h-[24rem]">
          <div className="px-5 py-3 border-b border-accent-dark flex items-center justify-between bg-background-dark/50">
            <h2 className="text-xs font-mono font-bold text-white uppercase tracking-widest">System Activity Log</h2>
          </div>
          <div className="p-4 font-mono text-xs flex flex-col gap-3 overflow-y-auto">
            {summary.recent_activity.length === 0 && (
              <div className="flex gap-4 p-2 rounded">
                <span className="text-slate-500">[IDLE]</span>
                <span className="text-primary">INFO</span>
                <span className="text-slate-300">No activity yet. Run a Bunky command to generate events.</span>
              </div>
            )}
            {summary.recent_activity.map((item, index) => (
              <div key={`${item}-${index}`} className="flex min-w-0 gap-4 p-2 rounded hover:bg-accent-dark/30 transition-colors">
                <span className="shrink-0 text-slate-500">[LIVE]</span>
                <span className="shrink-0 text-primary">INFO</span>
                <span className="min-w-0 break-words text-slate-300">{item}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </AppShell>
  );
}