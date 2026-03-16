"use client";

import { type FormEvent, useEffect, useState } from "react";

import { AppShell } from "@/components/app-shell";

type RoomTabExpense = {
  id: string;
  title: string;
  payer: string;
  total: number;
  share: number;
  status: string;
};

type RoomTabSummary = {
  currency: string;
  net_balance: number;
  you_are_owed: number;
  you_owe: number;
  expenses: RoomTabExpense[];
};

const API_BASE = process.env.NEXT_PUBLIC_BUNKY_API_BASE ?? "http://127.0.0.1:8000";

export default function RoomTabPage() {
  const [summary, setSummary] = useState<RoomTabSummary | null>(null);
  const [title, setTitle] = useState("");
  const [payer, setPayer] = useState("Self");
  const [total, setTotal] = useState("");
  const [share, setShare] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState("Ledger connected.");

  const formatMoney = (value: number, currency: string) => {
    const sign = value > 0 ? "+" : "";
    return `${sign}${currency} ${value.toFixed(2)}`;
  };

  const loadSummary = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE}/api/roomtab/summary`, { cache: "no-store" });
      if (!response.ok) {
        throw new Error("Failed to load roomtab summary");
      }
      const data = (await response.json()) as RoomTabSummary;
      setSummary(data);
    } catch {
      setMessage("Backend unavailable. RoomTab sync failed.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadSummary();
  }, []);

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const totalValue = Number(total);
    const shareValue = Number(share);
    if (!title.trim() || Number.isNaN(totalValue) || Number.isNaN(shareValue) || totalValue <= 0) {
      setMessage("Enter valid title, total, and share.");
      return;
    }

    setSending(true);
    try {
      const response = await fetch(`${API_BASE}/api/roomtab/expenses`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: title.trim(), payer: payer.trim() || "Self", total: totalValue, share: shareValue }),
      });
      if (!response.ok) {
        throw new Error("Failed to add expense");
      }
      setTitle("");
      setTotal("");
      setShare("");
      setMessage("Expense logged.");
      await loadSummary();
    } catch {
      setMessage("Expense creation failed.");
    } finally {
      setSending(false);
    }
  };

  return (
    <AppShell active="roomtab">
      <form onSubmit={onSubmit} className="grid grid-cols-1 md:grid-cols-5 gap-2">
        <input
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="Expense title"
          className="bg-white/5 border border-accent-dark rounded-lg px-3 py-2 text-sm font-mono"
        />
        <input
          value={payer}
          onChange={(event) => setPayer(event.target.value)}
          placeholder="Payer"
          className="bg-white/5 border border-accent-dark rounded-lg px-3 py-2 text-sm font-mono"
        />
        <input
          value={total}
          onChange={(event) => setTotal(event.target.value)}
          placeholder="Total"
          className="bg-white/5 border border-accent-dark rounded-lg px-3 py-2 text-sm font-mono"
        />
        <input
          value={share}
          onChange={(event) => setShare(event.target.value)}
          placeholder="Your share (+/-)"
          className="bg-white/5 border border-accent-dark rounded-lg px-3 py-2 text-sm font-mono"
        />
        <button
          type="submit"
          disabled={sending}
          className="bg-primary text-background-dark rounded-lg px-3 py-2 text-sm font-bold disabled:opacity-40"
        >
          {sending ? "ADDING" : "ADD EXPENSE"}
        </button>
      </form>

      <p className="text-xs text-slate-400 font-mono">{message}</p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-2">
        <div className="bg-surface-dark p-6 border border-border-dark rounded-xl">
          <p className="text-slate-500 text-[10px] font-bold uppercase tracking-[0.2em] mb-1">Status: Net Credit</p>
          <p className="text-primary text-sm font-bold">YOU ARE OWED</p>
          <p className="text-slate-100 text-4xl font-bold mt-2">
            {loading || !summary ? "..." : formatMoney(summary.you_are_owed, summary.currency)}
          </p>
        </div>
        <div className="bg-surface-dark p-6 border border-border-dark rounded-xl">
          <p className="text-slate-500 text-[10px] font-bold uppercase tracking-[0.2em] mb-1">Status: Liabilities</p>
          <p className="text-slate-100 text-sm font-bold">YOU OWE</p>
          <p className="text-slate-100 text-4xl font-bold mt-2">
            {loading || !summary ? "..." : `-${summary.currency} ${summary.you_owe.toFixed(2)}`}
          </p>
        </div>
        <div className="bg-primary p-6 border border-primary rounded-xl">
          <p className="text-background-dark/60 text-[10px] font-bold uppercase tracking-[0.2em] mb-1">Action Required</p>
          <p className="text-background-dark text-sm font-bold">NET BALANCE</p>
          <p className="text-background-dark text-4xl font-bold mt-2">
            {loading || !summary ? "..." : formatMoney(summary.net_balance, summary.currency)}
          </p>
        </div>
      </div>

      <div className="space-y-2">
        {summary?.expenses.map((expense) => (
          <div key={expense.id} className="grid grid-cols-1 md:grid-cols-12 items-center gap-4 p-4 bg-surface-dark border border-border-dark rounded-lg hover:border-primary/50 transition-colors">
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
