"use client";

import { type FormEvent, useEffect, useState } from "react";

import { AppShell } from "@/components/app-shell";

type FixItTicket = {
  id: string;
  title: string;
  assignee: string;
  status: string;
  eta: string;
};

const API_BASE = process.env.NEXT_PUBLIC_BUNKY_API_BASE ?? "http://127.0.0.1:8000";

export default function FixItPage() {
  const [tickets, setTickets] = useState<FixItTicket[]>([]);
  const [title, setTitle] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState("Live queue synced.");

  const loadTickets = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE}/api/fixit/tickets`, { cache: "no-store" });
      if (!response.ok) {
        throw new Error("Failed to load tickets");
      }
      const data = (await response.json()) as FixItTicket[];
      setTickets(data);
    } catch {
      setMessage("Backend unavailable. Could not load ticket queue.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadTickets();
  }, []);

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!title.trim()) {
      return;
    }

    setSending(true);
    try {
      const response = await fetch(`${API_BASE}/api/fixit/tickets`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: title.trim() }),
      });
      if (!response.ok) {
        throw new Error("Failed to create ticket");
      }
      const created = (await response.json()) as FixItTicket;
      setTickets((prev) => [created, ...prev]);
      setTitle("");
      setMessage(`Created ${created.id}.`);
    } catch {
      setMessage("Ticket creation failed.");
    } finally {
      setSending(false);
    }
  };

  return (
    <AppShell active="fixit">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight font-mono">Maintenance Terminal</h1>
          <p className="text-slate-500 text-sm font-mono">
            System Status: <span className="text-primary font-bold">OPTIMAL</span>
          </p>
        </div>
        <form onSubmit={onSubmit} className="flex items-center gap-2 w-full sm:w-auto">
          <input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Issue title"
            className="bg-white/5 border border-accent-dark rounded-lg px-3 py-2 text-sm font-mono w-full sm:w-72"
          />
          <button
            type="submit"
            disabled={sending}
            className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-white px-5 py-2.5 rounded-lg font-bold text-sm transition-all shadow-lg shadow-primary/20 disabled:opacity-40"
          >
            <span className="material-symbols-outlined">add_circle</span>
            {sending ? "CREATING" : "NEW REQUEST"}
          </button>
        </form>
      </div>

      <p className="text-xs text-slate-400 font-mono">{message}</p>

      <div className="space-y-3">
        {loading && <p className="text-xs text-slate-400 font-mono">Loading queue...</p>}
        {tickets.map((ticket) => (
          <div
            key={ticket.id}
            className="group bg-white/5 hover:bg-white/10 border border-accent-dark p-4 rounded-xl transition-all flex flex-col md:flex-row gap-4 items-start md:items-center"
          >
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-bold px-2 py-0.5 rounded bg-primary/10 text-primary border border-primary/20 uppercase font-mono">
                  {ticket.status}
                </span>
                <span className="text-xs text-slate-400 font-mono">#{ticket.id}</span>
              </div>
              <h3 className="font-bold text-slate-100 truncate">{ticket.title}</h3>
              <p className="text-sm text-slate-400 mt-1">
                Assigned to: <span className="font-medium text-slate-200">{ticket.assignee}</span>
              </p>
            </div>
            <div className="flex items-center gap-1.5 text-primary font-mono text-sm bg-primary/10 px-3 py-1 rounded-full border border-primary/20">
              <span className="material-symbols-outlined text-sm">timer</span>
              ETA: {ticket.eta}
            </div>
          </div>
        ))}
      </div>
    </AppShell>
  );
}
