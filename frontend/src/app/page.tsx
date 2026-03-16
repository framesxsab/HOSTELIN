"use client";

import { type FormEvent, useCallback, useEffect, useMemo, useState } from "react";

import { AppShell } from "@/components/app-shell";

type DashboardSummary = {
  dinner_time: string;
  fixit_pending: number;
  roomtab_balance: string;
  parcel_arrived: number;
  recent_activity: string[];
};

type BunkyResponse = {
  intent: string;
  result: {
    tool: string;
    message: string;
  };
};

const API_BASE = process.env.NEXT_PUBLIC_BUNKY_API_BASE ?? "http://127.0.0.1:8000";

const INITIAL_SUMMARY: DashboardSummary = {
  dinner_time: "Dinner: --",
  fixit_pending: 0,
  roomtab_balance: "INR 0.00",
  parcel_arrived: 0,
  recent_activity: ["Booting Bunky data stream..."],
};

export default function Dashboard() {
  const [summary, setSummary] = useState<DashboardSummary>(INITIAL_SUMMARY);
  const [command, setCommand] = useState("mess status");
  const [responseText, setResponseText] = useState("Run a command to get started.");
  const [isLoadingSummary, setIsLoadingSummary] = useState(true);
  const [isSending, setIsSending] = useState(false);

  const fetchSummary = useCallback(async () => {
    setIsLoadingSummary(true);
    try {
      const response = await fetch(`${API_BASE}/api/dashboard/summary`, { cache: "no-store" });
      if (!response.ok) {
        throw new Error("Failed to load dashboard summary");
      }

      const payload = (await response.json()) as DashboardSummary;
      setSummary(payload);
    } catch {
      setResponseText("Backend unavailable. Start FastAPI to enable live module state.");
    } finally {
      setIsLoadingSummary(false);
    }
  }, []);

  useEffect(() => {
    void fetchSummary();
  }, [fetchSummary]);

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

    setIsSending(true);
    try {
      const response = await fetch(`${API_BASE}/api/bunky/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ command }),
      });

      if (!response.ok) {
        throw new Error("Command request failed");
      }

      const payload = (await response.json()) as BunkyResponse;
      setResponseText(payload.result.message);
      await fetchSummary();
    } catch {
      setResponseText("Could not reach Bunky API. Verify backend is running on port 8000.");
    } finally {
      setIsSending(false);
    }
  };

  return (
    <AppShell active="dashboard">
      <div className="w-full max-w-4xl mx-auto space-y-2">
        <form onSubmit={onSubmit} className="bg-neutral-dark border border-accent-dark rounded-lg flex items-center px-4 py-3 shadow-2xl shadow-primary/5">
          <span className="text-primary font-mono font-bold mr-3 text-lg">&gt;</span>
          <input
            value={command}
            onChange={(event) => setCommand(event.target.value)}
            className="flex-1 bg-transparent text-primary text-sm font-mono outline-none placeholder:text-primary/40"
            placeholder="Try: fixit for broken fan in room 14"
            aria-label="Bunky command"
          />
          <button
            type="submit"
            disabled={isSending}
            className="ml-4 rounded-md border border-primary/40 px-3 py-1 text-xs font-mono text-primary hover:bg-primary/10 disabled:opacity-40"
          >
            {isSending ? "RUNNING" : "RUN"}
          </button>
        </form>
        <p className="text-xs font-mono text-slate-300 bg-background-dark/50 border border-accent-dark rounded px-3 py-2">{responseText}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        <div className="bg-neutral-dark border border-accent-dark p-5 rounded-xl hover:border-primary/50 transition-all flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div className="size-10 bg-primary/10 rounded-lg flex items-center justify-center text-primary">
              <span className="material-symbols-outlined">restaurant</span>
            </div>
            <span className="text-[10px] font-mono text-slate-500">MESSMATE_CORE</span>
          </div>
          <div>
            <h3 className="text-xl font-mono font-bold text-white uppercase tracking-tight">{metricLabel.dinner}</h3>
          </div>
        </div>
        <div className="bg-neutral-dark border border-accent-dark p-5 rounded-xl hover:border-primary/50 transition-all flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div className="size-10 bg-yellow-500/10 rounded-lg flex items-center justify-center text-yellow-500">
              <span className="material-symbols-outlined">confirmation_number</span>
            </div>
            <span className="text-[10px] font-mono text-slate-500">FIXIT_QUEUE</span>
          </div>
          <div>
            <h3 className="text-xl font-mono font-bold text-white uppercase tracking-tight">{metricLabel.fixit}</h3>
          </div>
        </div>
        <div className="bg-neutral-dark border border-accent-dark p-5 rounded-xl hover:border-primary/50 transition-all flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div className="size-10 bg-blue-500/10 rounded-lg flex items-center justify-center text-blue-500">
              <span className="material-symbols-outlined">payments</span>
            </div>
            <span className="text-[10px] font-mono text-slate-500">ROOMTAB_LEDGER</span>
          </div>
          <div>
            <h3 className="text-xl font-mono font-bold text-white uppercase tracking-tight">{metricLabel.roomtab}</h3>
          </div>
        </div>
        <div className="bg-neutral-dark border border-accent-dark p-5 rounded-xl hover:border-primary/50 transition-all flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div className="size-10 bg-primary/10 rounded-lg flex items-center justify-center text-primary">
              <span className="material-symbols-outlined">local_shipping</span>
            </div>
            <span className="text-[10px] font-mono text-slate-500">PARCELPING_LOG</span>
          </div>
          <div>
            <h3 className="text-xl font-mono font-bold text-white uppercase tracking-tight">{metricLabel.parcel}</h3>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 flex-1">
        <div className="xl:col-span-2 flex flex-col bg-neutral-dark border border-accent-dark rounded-xl overflow-hidden min-h-100">
          <div className="px-5 py-3 border-b border-accent-dark flex items-center justify-between bg-background-dark/50">
            <h2 className="text-xs font-mono font-bold text-white uppercase tracking-widest">System Activity Log</h2>
          </div>
          <div className="p-4 font-mono text-xs flex flex-col gap-3 overflow-y-auto">
            {summary.recent_activity.map((item, index) => (
              <div key={`${item}-${index}`} className="flex gap-4 p-2 rounded hover:bg-accent-dark/30 transition-colors">
                <span className="text-slate-500">[LIVE]</span>
                <span className="text-primary">INFO</span>
                <span className="text-slate-300">{item}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </AppShell>
  );
}