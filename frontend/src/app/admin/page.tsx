"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { AppShell } from "@/components/app-shell";
import { UiIcon, type UiIconName } from "@/components/ui-icon";
import { apiFetchJson, toUiMessage } from "@/lib/api-client";
import { useAuthStore } from "@/lib/auth-store";
import { type FixItTicket, type ParcelItem } from "@/lib/types";
import { useRouter } from "next/navigation";
import { useElementWidth, useTextHeight, MONO_FONT_BASE } from "@/lib/use-pretext";

type Tab = "fixit" | "parcels" | "menu";

const TABS: { id: Tab; label: string; icon: UiIconName }[] = [
  { id: "fixit", label: "FixIt Queue", icon: "construction" },
  { id: "parcels", label: "Parcel Logs", icon: "package_2" },
  { id: "menu", label: "Menu Editor", icon: "restaurant" },
];

const TICKET_STATUSES = ["Received", "Assigned", "In Progress", "Resolved"] as const;
const PARCEL_STATUSES = ["Arrived", "In Transit", "Delayed"] as const;

export default function AdminDashboard() {
  const { user } = useAuthStore();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<Tab>("fixit");

  const [tickets, setTickets] = useState<FixItTicket[]>([]);
  const [parcels, setParcels] = useState<ParcelItem[]>([]);
  const [menuJson, setMenuJson] = useState("");
  const [status, setStatus] = useState<{ msg: string; kind: "success" | "error" } | null>(null);

  const [textareaRef, textareaWidth] = useElementWidth<HTMLTextAreaElement>();
  const expectedTextAreaHeight = useTextHeight(menuJson, MONO_FONT_BASE, Math.max(textareaWidth - 32, 100), 23);
  const finalTextAreaHeight = Math.max(500, (expectedTextAreaHeight ?? 0) + 60);

  const showStatus = useCallback((msg: string, kind: "success" | "error") => {
    setStatus({ msg, kind });
  }, []);

  useEffect(() => {
    if (user && user.role !== "admin") router.push("/");
  }, [user, router]);

  const loadFixIt = useCallback(async () => {
    try {
      const data = await apiFetchJson<FixItTicket[]>("/api/fixit/tickets");
      setTickets(data);
    } catch (err) {
      showStatus(toUiMessage(err, "Could not load tickets."), "error");
    }
  }, []);

  const loadParcels = useCallback(async () => {
    try {
      const data = await apiFetchJson<ParcelItem[]>("/api/parcelping/parcels");
      setParcels(data);
    } catch (err) {
      showStatus(toUiMessage(err, "Could not load parcels."), "error");
    }
  }, []);

  const loadMenu = useCallback(async () => {
    try {
      const data = await apiFetchJson<unknown[]>("/api/messmate/schedule");
      setMenuJson(JSON.stringify(data, null, 2));
    } catch (err) {
      showStatus(toUiMessage(err, "Could not load menu data."), "error");
    }
  }, []);

  useEffect(() => {
    setStatus(null);
    if (activeTab === "fixit") void loadFixIt();
    if (activeTab === "parcels") void loadParcels();
    if (activeTab === "menu") void loadMenu();
  }, [activeTab, loadFixIt, loadParcels, loadMenu]);

  const handleUpdateTicket = async (id: string, newStatus: string, assignee?: string, eta?: string) => {
    const body: Record<string, string> = { status: newStatus };
    if (assignee !== undefined) body.assignee = assignee;
    if (eta !== undefined) body.eta = eta;

    try {
      await apiFetchJson(`/api/admin/fixit/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      showStatus(`Ticket ${id} updated.`, "success");
      void loadFixIt();
    } catch (err) {
      showStatus(toUiMessage(err, "Ticket update failed."), "error");
    }
  };

  const handleUpdateParcel = async (id: string, newStatus: string, newEta: string) => {
    try {
      await apiFetchJson(`/api/admin/parcel/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus, eta: newEta }),
      });
      showStatus(`Parcel ${id} updated.`, "success");
      void loadParcels();
    } catch (err) {
      showStatus(toUiMessage(err, "Parcel update failed."), "error");
    }
  };

  const handleMenuSave = async () => {
    let parsed: unknown;
    try {
      parsed = JSON.parse(menuJson);
    } catch {
      showStatus("Invalid JSON. Check syntax and try again.", "error");
      return;
    }

    try {
      await apiFetchJson("/api/admin/menu", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ week: parsed }),
      });
      showStatus("Menu updated successfully.", "success");
    } catch (err) {
      showStatus(toUiMessage(err, "Menu save failed."), "error");
    }
  };

  if (!user || user.role !== "admin") return null;

  return (
    <AppShell active="admin">
      <div className="flex flex-col gap-6 w-full max-w-6xl mx-auto pb-24 lg:pb-6 relative z-10">
        {/* Header */}
        <header className="flex flex-col gap-2">
          <h1 className="text-3xl font-display font-bold uppercase tracking-wider text-primary">
            Admin Panel
          </h1>
          <p className="text-sm font-mono text-primary/50">
            System configuration and management overrides.
          </p>
        </header>

        {/* Status banner */}
        {status && (
          <div className={`pixel-panel rounded-lg px-4 py-2.5 text-sm font-mono border ${
            status.kind === "error"
              ? "border-danger/30 bg-danger/8 text-danger"
              : "border-primary/30 bg-primary/8 text-primary"
          }`}>
            {status.msg}
          </div>
        )}

        {/* Tab row */}
        <div className="flex gap-3 p-2 bg-void-panel/50 rounded-xl border border-void-border backdrop-blur-xl shrink-0 overflow-x-auto">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-6 py-3 rounded-lg font-mono text-sm tracking-widest uppercase transition-all whitespace-nowrap ${
                activeTab === tab.id
                  ? "bg-primary text-void font-bold shadow-[0_0_20px_rgba(163,230,53,0.2)]"
                  : "text-text-muted hover:bg-void-elevated hover:text-text-primary"
              }`}
            >
              <UiIcon name={tab.icon} className="w-5 h-5" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div className="flex-1 bg-void-panel/30 rounded-2xl border border-void-border p-6 backdrop-blur-md">
          {/* FixIt tab */}
          {activeTab === "fixit" && (
            <div className="flex flex-col gap-4">
              <h2 className="font-mono text-primary tracking-wider mb-4 border-b border-void-border pb-2">Active Maintenance Requests</h2>
              {tickets.length === 0 ? (
                <p className="text-text-dim font-mono">No tickets in the system.</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {tickets.map((t) => (
                    <div
                      key={t.id}
                      className={`p-4 bg-void-surface border ${
                        t.status === "Resolved" ? "border-void-border/40 opacity-50 grayscale" : "border-void-border"
                      } rounded-xl flex flex-col gap-3 transition-opacity`}
                    >
                      <div className="flex justify-between items-start">
                        <span className={`font-mono font-bold ${t.status === "Resolved" ? "line-through text-text-dim" : "text-text-primary"}`}>
                          {t.title}
                        </span>
                        <span className="text-xs font-mono px-2 py-1 rounded-md bg-void-panel text-text-secondary border border-void-border">
                          {t.id}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-2 mt-2">
                        <div className="flex flex-col gap-1">
                          <label className="text-xs text-text-dim uppercase">Assignee</label>
                          <input
                            type="text"
                            defaultValue={t.assignee}
                            onBlur={(e) => void handleUpdateTicket(t.id, t.status, e.target.value, t.eta)}
                            className="bg-void/60 border border-void-border rounded-md p-2 text-primary font-mono text-sm outline-none focus:border-primary/40"
                          />
                        </div>
                        <div className="flex flex-col gap-1">
                          <label className="text-xs text-text-dim uppercase">ETA</label>
                          <input
                            type="text"
                            defaultValue={t.eta}
                            onBlur={(e) => void handleUpdateTicket(t.id, t.status, t.assignee, e.target.value)}
                            className="bg-void/60 border border-void-border rounded-md p-2 text-primary font-mono text-sm outline-none focus:border-primary/40"
                          />
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center gap-2 mt-2">
                        <span className="text-xs text-text-dim uppercase">Set Status:</span>
                        {TICKET_STATUSES.map((s) => (
                          <button
                            key={s}
                            onClick={() => void handleUpdateTicket(t.id, s, t.assignee, t.eta)}
                            className={`px-3 py-1 rounded-md font-mono text-xs border ${
                              t.status === s
                                ? "bg-primary/15 text-primary border-primary/40"
                                : "text-text-dim border-void-border hover:text-text-secondary"
                            }`}
                          >
                            {s}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Parcels tab */}
          {activeTab === "parcels" && (
            <div className="flex flex-col gap-4">
              <h2 className="font-mono text-primary tracking-wider mb-4 border-b border-void-border pb-2">Parcel Operations Hub</h2>
              {parcels.length === 0 ? (
                <p className="text-text-dim font-mono">No parcels in the system.</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {parcels.map((p) => (
                    <div key={p.id} className="p-4 bg-void-surface border border-void-border rounded-xl flex flex-col gap-3">
                      <div className="flex justify-between items-start">
                        <span className="font-mono font-bold text-text-primary">{p.vendor} (via {p.location})</span>
                        <span className="text-[10px] font-mono px-2 py-1 rounded-md bg-void-panel text-text-muted">
                          {p.id}
                        </span>
                      </div>
                      <div className="flex flex-col gap-2 mt-2">
                        <label className="text-xs text-text-dim uppercase">Override ETA</label>
                        <input
                          type="text"
                          defaultValue={p.eta}
                          onBlur={(e) => void handleUpdateParcel(p.id, p.status, e.target.value)}
                          className="bg-void/60 border border-void-border rounded-md p-2 text-primary font-mono text-sm outline-none focus:border-primary/40"
                        />
                      </div>
                      <div className="flex flex-wrap items-center gap-2 mt-1">
                        <span className="text-xs text-text-dim uppercase">Status:</span>
                        {PARCEL_STATUSES.map((s) => (
                          <button
                            key={s}
                            onClick={() => void handleUpdateParcel(p.id, s, p.eta)}
                            className={`px-3 py-1 rounded-md font-mono text-xs border ${
                              p.status === s
                                ? "bg-primary/15 text-primary border-primary/40"
                                : "text-text-dim border-void-border hover:text-text-secondary"
                            }`}
                          >
                            {s}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Menu editor tab */}
          {activeTab === "menu" && (
            <div className="flex flex-col gap-4 h-full">
              <div className="flex justify-between items-center mb-4 border-b border-void-border pb-2">
                <h2 className="font-mono text-primary tracking-wider">Weekly Mess Schedule (JSON Config)</h2>
                <button
                  onClick={() => void handleMenuSave()}
                  className="bg-primary hover:bg-primary/85 text-void font-bold px-4 py-2 rounded-lg uppercase text-xs font-mono tracking-widest transition-colors flex items-center gap-2 shadow-lg shadow-primary/15"
                >
                  <UiIcon name="save" className="w-4 h-4" />
                  Save Changes
                </button>
              </div>
              <p className="text-xs text-text-dim font-mono">
                WARNING: This modifies the core JSON schedule database. Maintain exact array schemas (title is index 0).
              </p>
              <textarea
                ref={textareaRef}
                value={menuJson}
                onChange={(e) => setMenuJson(e.target.value)}
                style={{ height: finalTextAreaHeight, transition: "height 200ms ease" }}
                className="flex-1 w-full bg-void border border-void-border rounded-xl p-4 text-primary font-mono text-sm leading-relaxed outline-none focus:border-primary/40 font-normal shadow-inner resize-none"
                spellCheck="false"
              />
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
