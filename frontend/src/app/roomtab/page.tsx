"use client";

import { type FormEvent, useCallback, useEffect, useState } from "react";

import { AppShell } from "@/components/app-shell";
import { apiFetchJson, toUiMessage } from "@/lib/api-client";
import { type RoomTabSummary } from "@/lib/types";

export default function RoomTabPage() {
  const [summary, setSummary] = useState<RoomTabSummary | null>(null);
  const [title, setTitle] = useState("");
  const [payer, setPayer] = useState("");
  const [total, setTotal] = useState("");
  const [share, setShare] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState("");
  const [titleError, setTitleError] = useState("");
  const [payerError, setPayerError] = useState("");
  const [totalError, setTotalError] = useState("");
  const [shareError, setShareError] = useState("");

  const formatMoney = (value: number, currency: string) => {
    const sign = value > 0 ? "+" : "";
    return `${sign}${currency} ${value.toFixed(2)}`;
  };

  const loadSummary = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiFetchJson<RoomTabSummary>("/api/roomtab/summary");
      setSummary(data);
      setMessage("");
    } catch (error) {
      setMessage(toUiMessage(error, "RoomTab sync failed."));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadSummary();
  }, [loadSummary]);

  useEffect(() => {
    const interval = setInterval(() => {
      void loadSummary();
    }, 15000);

    return () => clearInterval(interval);
  }, [loadSummary]);

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    setTitleError("");
    setPayerError("");
    setTotalError("");
    setShareError("");

    const trimmedTitle = title.trim();
    const trimmedPayer = payer.trim();
    const totalValue = Number(total);
    const shareValue = Number(share);

    let hasError = false;
    if (trimmedTitle.length < 3) {
      setTitleError("Title must be at least 3 characters.");
      hasError = true;
    }
    if (trimmedPayer.length < 2) {
      setPayerError("Payer must be at least 2 characters.");
      hasError = true;
    }
    if (Number.isNaN(totalValue) || totalValue <= 0) {
      setTotalError("Total must be a number greater than 0.");
      hasError = true;
    }
    if (Number.isNaN(shareValue)) {
      setShareError("Share must be a valid number.");
      hasError = true;
    }
    if (hasError) {
      setMessage("Fix validation errors and retry.");
      return;
    }

    setSending(true);
    try {
      await apiFetchJson("/api/roomtab/expenses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: trimmedTitle, payer: trimmedPayer, total: totalValue, share: shareValue }),
      });
      setTitle("");
      setTotal("");
      setShare("");
      setMessage("");
      await loadSummary();
    } catch (error) {
      setMessage(toUiMessage(error, "Expense creation failed."));
    } finally {
      setSending(false);
    }
  };

  return (
    <AppShell active="roomtab">
      <form onSubmit={onSubmit} className="pixel-panel grid grid-cols-1 md:grid-cols-5 gap-2 rounded-sm p-3 bg-background-dark/25">
        <div>
          <input
            value={title}
            onChange={(event) => {
              setTitle(event.target.value);
              if (titleError) {
                setTitleError("");
              }
            }}
            placeholder="Expense title"
            className={`pixel-control bg-white/5 border rounded px-3 py-2 text-sm font-mono w-full ${titleError ? "border-red-400" : "border-accent-dark"}`}
            aria-invalid={titleError ? true : undefined}
          />
          {titleError && <p className="mt-1 text-[11px] font-mono text-red-300">{titleError}</p>}
        </div>
        <div>
          <input
            value={payer}
            onChange={(event) => {
              setPayer(event.target.value);
              if (payerError) {
                setPayerError("");
              }
            }}
            placeholder="Payer"
            className={`pixel-control bg-white/5 border rounded px-3 py-2 text-sm font-mono w-full ${payerError ? "border-red-400" : "border-accent-dark"}`}
            aria-invalid={payerError ? true : undefined}
          />
          {payerError && <p className="mt-1 text-[11px] font-mono text-red-300">{payerError}</p>}
        </div>
        <div>
          <input
            value={total}
            onChange={(event) => {
              setTotal(event.target.value);
              if (totalError) {
                setTotalError("");
              }
            }}
            placeholder="Total"
            className={`pixel-control bg-white/5 border rounded px-3 py-2 text-sm font-mono w-full ${totalError ? "border-red-400" : "border-accent-dark"}`}
            aria-invalid={totalError ? true : undefined}
          />
          {totalError && <p className="mt-1 text-[11px] font-mono text-red-300">{totalError}</p>}
        </div>
        <div>
          <input
            value={share}
            onChange={(event) => {
              setShare(event.target.value);
              if (shareError) {
                setShareError("");
              }
            }}
            placeholder="Your share (+/-)"
            className={`pixel-control bg-white/5 border rounded px-3 py-2 text-sm font-mono w-full ${shareError ? "border-red-400" : "border-accent-dark"}`}
            aria-invalid={shareError ? true : undefined}
          />
          {shareError && <p className="mt-1 text-[11px] font-mono text-red-300">{shareError}</p>}
        </div>
        <button
          type="submit"
          disabled={sending}
          className="pixel-control bg-primary text-background-dark rounded px-3 py-2 text-sm font-bold disabled:opacity-40"
        >
          {sending ? "ADDING" : "ADD EXPENSE"}
        </button>
      </form>

      <div className="flex items-center gap-3">
        <p className="text-xs text-slate-400 font-mono">{message}</p>
        {message.toLowerCase().includes("retry") || message.toLowerCase().includes("offline") || message.toLowerCase().includes("failed") ? (
          <button
            type="button"
            onClick={() => void loadSummary()}
            className="pixel-control rounded border border-primary/30 px-2 py-1 text-xs font-mono text-primary hover:bg-primary/10"
          >
            Retry
          </button>
        ) : null}
      </div>

      {loading && <p className="text-xs text-slate-400 font-mono">Loading...</p>}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-2">
        <div className="pixel-panel bg-surface-dark p-6 border border-border-dark rounded-sm">
          <p className="text-slate-500 text-[10px] font-bold uppercase tracking-[0.2em] mb-1">Status: Net Credit</p>
          <p className="text-primary text-sm font-bold">YOU ARE OWED</p>
          <p className="text-slate-100 text-4xl font-bold mt-2">
            {loading || !summary ? "Loading..." : formatMoney(summary.you_are_owed, summary.currency)}
          </p>
        </div>
        <div className="pixel-panel bg-surface-dark p-6 border border-border-dark rounded-sm">
          <p className="text-slate-500 text-[10px] font-bold uppercase tracking-[0.2em] mb-1">Status: Liabilities</p>
          <p className="text-slate-100 text-sm font-bold">YOU OWE</p>
          <p className="text-slate-100 text-4xl font-bold mt-2">
            {loading || !summary ? "Loading..." : `-${summary.currency} ${summary.you_owe.toFixed(2)}`}
          </p>
        </div>
        <div className="pixel-panel bg-primary p-6 border border-primary rounded-sm">
          <p className="text-background-dark/60 text-[10px] font-bold uppercase tracking-[0.2em] mb-1">Action Required</p>
          <p className="text-background-dark text-sm font-bold">NET BALANCE</p>
          <p className="text-background-dark text-4xl font-bold mt-2">
            {loading || !summary ? "Loading..." : formatMoney(summary.net_balance, summary.currency)}
          </p>
        </div>
      </div>

      <div className="space-y-2">
        {!loading && summary && summary.expenses.length === 0 && <p className="text-xs text-slate-400 font-mono">No expenses available.</p>}
        {summary?.expenses.map((expense) => (
          <div key={expense.id} className="pixel-panel grid grid-cols-1 md:grid-cols-12 items-center gap-4 p-4 bg-surface-dark border border-border-dark rounded-sm hover:border-primary/50 transition-colors">
            <div className="md:col-span-7">
              <p className="text-slate-100 text-xs font-bold uppercase tracking-tight">{expense.title}</p>
              <p className="text-slate-500 text-[10px] uppercase">
                Paid by <span className="text-slate-300">{expense.payer}</span> Total {summary.currency} {expense.total.toFixed(2)}
              </p>
            </div>
            <div className="md:col-span-2 text-right text-sm font-bold text-primary">{formatMoney(expense.share, summary.currency)}</div>
            <div className="md:col-span-3 text-right text-[10px] uppercase text-slate-400">{expense.status}</div>
          </div>
        ))}
      </div>
    </AppShell>
  );
}
