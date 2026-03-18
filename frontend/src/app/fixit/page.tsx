"use client";

import { type FormEvent, useCallback, useEffect, useState } from "react";

import { AppShell } from "@/components/app-shell";
import { UiIcon } from "@/components/ui-icon";
import { apiFetchJson, isRetryableMessage, toUiMessage } from "@/lib/api-client";
import { type FixItTicket } from "@/lib/types";

export default function FixItPage() {
  const [tickets, setTickets] = useState<FixItTicket[]>([]);
  const [title, setTitle] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState("");
  const [titleError, setTitleError] = useState("");

  const loadTickets = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiFetchJson<FixItTicket[]>("/api/fixit/tickets");
      setTickets(data);
      setMessage("");
    } catch (error) {
      setMessage(toUiMessage(error, "Could not load ticket queue."));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadTickets();
  }, [loadTickets]);

  useEffect(() => {
    const interval = setInterval(() => {
      void loadTickets();
    }, 15000);

    return () => clearInterval(interval);
  }, [loadTickets]);

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmedTitle = title.trim();
    if (trimmedTitle.length < 3) {
      setTitleError("Title must be at least 3 characters.");
      return;
    }
    setTitleError("");

    setSending(true);
    try {
      const created = await apiFetchJson<FixItTicket>("/api/fixit/tickets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: trimmedTitle }),
      });
      setTickets((prev) => [created, ...prev]);
      setTitle("");
      setMessage(`Created ${created.id}.`);
    } catch (error) {
      setMessage(toUiMessage(error, "Ticket creation failed."));
    } finally {
      setSending(false);
    }
  };

  return (
    <AppShell active="fixit">
      <div className="pixel-panel flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 rounded-sm p-4 bg-background-dark/30">
        <div>
          <h1 className="text-2xl font-bold tracking-tight font-mono">Maintenance Terminal</h1>
          <p className="text-slate-500 text-sm font-mono">Track and submit repair requests.</p>
        </div>
        <form onSubmit={onSubmit} className="flex items-center gap-2 w-full sm:w-auto">
          <div className="w-full sm:w-72">
            <input
              value={title}
              onChange={(event) => {
                setTitle(event.target.value);
                if (titleError) {
                  setTitleError("");
                }
              }}
              placeholder="Issue title"
              className={`pixel-control bg-white/5 border rounded px-3 py-2 text-sm font-mono w-full ${titleError ? "border-red-400" : "border-accent-dark"}`}
              aria-invalid={titleError ? true : undefined}
            />
            {titleError && <p className="mt-1 text-[11px] font-mono text-red-300">{titleError}</p>}
          </div>
          <button
            type="submit"
            disabled={sending}
            className="pixel-control flex items-center gap-2 bg-primary hover:bg-primary/90 text-background-dark px-5 py-2.5 rounded font-bold text-sm transition-all shadow-lg shadow-primary/20 disabled:opacity-40"
          >
            <UiIcon name="add_circle" className="size-4" />
            {sending ? "CREATING" : "NEW REQUEST"}
          </button>
        </form>
      </div>

      <div className="flex items-center gap-3">
        <p className="text-xs text-slate-400 font-mono">{message}</p>
        {isRetryableMessage(message) ? (
          <button
            type="button"
            onClick={() => void loadTickets()}
            className="pixel-control rounded border border-primary/30 px-2 py-1 text-xs font-mono text-primary hover:bg-primary/10"
          >
            Retry
          </button>
        ) : null}
      </div>

      <div className="space-y-3">
        {loading && <p className="text-xs text-slate-400 font-mono">Loading...</p>}
        {!loading && tickets.length === 0 && <p className="text-xs text-slate-400 font-mono">No tickets available.</p>}
        {tickets.map((ticket) => (
          <div
            key={ticket.id}
            className="pixel-panel group bg-white/5 hover:bg-white/10 border border-accent-dark p-4 rounded-sm transition-all flex flex-col md:flex-row gap-4 items-start md:items-center"
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
              <UiIcon name="timer" className="size-4" />
              ETA: {ticket.eta}
            </div>
          </div>
        ))}
      </div>
    </AppShell>
  );
}
