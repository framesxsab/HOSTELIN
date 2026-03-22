"use client";

import { useState, useEffect } from "react";
import { AppShell } from "@/components/app-shell";
import { UiIcon } from "@/components/ui-icon";
import { apiFetchJson } from "@/lib/api-client";
import { useAuthStore } from "@/lib/auth-store";
import { useRouter } from "next/navigation";

type Tab = "fixit" | "parcels" | "menu";

export default function AdminDashboard() {
  const { user } = useAuthStore();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<Tab>("fixit");

  // FixIt State
  const [tickets, setTickets] = useState<any[]>([]);
  
  // Parcels State
  const [parcels, setParcels] = useState<any[]>([]);
  
  // Menu State
  const [menuData, setMenuData] = useState<any[]>([]);
  const [menuJson, setMenuJson] = useState("");

  useEffect(() => {
    if (user && user.role !== "admin") {
      router.push("/");
    }
  }, [user, router]);

  const loadFixIt = async () => {
    try {
      const data = await apiFetchJson<any[]>("/api/fixit/tickets");
      setTickets(data);
    } catch {}
  };

  const loadParcels = async () => {
    try {
      const data = await apiFetchJson<any[]>("/api/parcelping/parcels");
      setParcels(data);
    } catch {}
  };

  const loadMenu = async () => {
    try {
      const data = await apiFetchJson<any[]>("/api/messmate/schedule");
      setMenuData(data);
      setMenuJson(JSON.stringify(data, null, 2));
    } catch {}
  };

  useEffect(() => {
    if (activeTab === "fixit") loadFixIt();
    if (activeTab === "parcels") loadParcels();
    if (activeTab === "menu") loadMenu();
  }, [activeTab]);

  const handleUpdateTicket = async (id: string, newStatus: string, assignee?: string, eta?: string) => {
    const body: any = { status: newStatus };
    if (assignee !== undefined) body.assignee = assignee;
    if (eta !== undefined) body.eta = eta;

    try {
      await apiFetchJson(`/api/admin/fixit/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      loadFixIt();
    } catch {}
  };

  const handleUpdateParcel = async (id: string, newStatus: string, newEta: string) => {
    try {
      await apiFetchJson(`/api/admin/parcel/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus, eta: newEta }),
      });
      loadParcels();
    } catch {}
  };

  const handleMenuSave = async () => {
    try {
      const parsed = JSON.parse(menuJson);
      await apiFetchJson("/api/admin/menu", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ week: parsed }),
      });
      alert("Menu updated successfully!");
    } catch (err: any) {
      alert("Failed to parse or save JSON. " + err.message);
    }
  };

  if (!user || user.role !== "admin") return null;

  return (
    <AppShell active="admin">
      <div className="flex flex-col gap-6 w-full max-w-6xl mx-auto pb-24 lg:pb-6 relative z-10">
        <header className="flex flex-col gap-2">
          <h1 className="text-3xl font-display font-bold uppercase tracking-wider text-emerald-400">
            Admin Panel
          </h1>
          <p className="text-sm font-mono text-emerald-500/60">
            System configuration and management overrides.
          </p>
        </header>

        {/* GLASMORPHIC TAB ROW */}
        <div className="flex gap-4 p-2 bg-emerald-950/20 rounded-2xl border border-emerald-500/20 backdrop-blur-xl shrink-0 overflow-x-auto">
          {[
            { id: "fixit", label: "FixIt Queue", icon: "construction" },
            { id: "parcels", label: "Parcel Logs", icon: "package_2" },
            { id: "menu", label: "Mess Menu Editor", icon: "restaurant" }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as Tab)}
              className={`flex items-center gap-2 px-6 py-3 rounded-xl font-mono text-sm tracking-widest uppercase transition-all whitespace-nowrap ${
                activeTab === tab.id
                  ? "bg-emerald-500 text-slate-900 font-bold shadow-[0_0_20px_rgba(16,185,129,0.3)]"
                  : "text-emerald-500/60 hover:bg-emerald-500/10 hover:text-emerald-400"
              }`}
            >
              <UiIcon name={tab.icon as any} className="w-5 h-5" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* TAB CONTENTS */}
        <div className="flex-1 bg-emerald-950/10 rounded-3xl border border-emerald-500/10 p-6 backdrop-blur-md">
          {activeTab === "fixit" && (
            <div className="flex flex-col gap-4">
              <h2 className="font-mono text-emerald-400 tracking-wider mb-4 border-b border-emerald-500/20 pb-2">Active Maintenance Requests</h2>
              {tickets.length === 0 ? (
                <p className="text-emerald-500/50 font-mono">No tickets in the system.</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {tickets.map(t => (
                    <div key={t.id} className={`p-4 bg-emerald-950/30 border ${t.status === 'Resolved' ? 'border-emerald-500/10 opacity-50 grayscale' : 'border-emerald-500/20'} rounded-xl flex flex-col gap-3 transition-opacity`}>
                      <div className="flex justify-between items-start">
                        <span className={`font-mono font-bold ${t.status === 'Resolved' ? 'line-through text-emerald-500/50' : 'text-slate-200'}`}>{t.title}</span>
                        <span className="text-xs font-mono px-2 py-1 rounded bg-slate-800 text-slate-300 border border-emerald-500/30">
                          {t.id}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-2 mt-2">
                        <div className="flex flex-col gap-1">
                          <label className="text-xs text-emerald-500/60 uppercase">Assignee</label>
                          <input 
                            type="text" 
                            defaultValue={t.assignee}
                            onBlur={(e) => handleUpdateTicket(t.id, t.status, e.target.value, t.eta)}
                            className="bg-black/40 border border-emerald-500/20 rounded p-2 text-emerald-300 font-mono text-sm outline-none focus:border-emerald-500/50"
                          />
                        </div>
                        <div className="flex flex-col gap-1">
                          <label className="text-xs text-emerald-500/60 uppercase">ETA</label>
                          <input 
                            type="text" 
                            defaultValue={t.eta}
                            onBlur={(e) => handleUpdateTicket(t.id, t.status, t.assignee, e.target.value)}
                            className="bg-black/40 border border-emerald-500/20 rounded p-2 text-emerald-300 font-mono text-sm outline-none focus:border-emerald-500/50"
                          />
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center gap-2 mt-2">
                        <span className="text-xs text-emerald-500/60 uppercase">Set Status:</span>
                        {["Received", "Assigned", "In Progress", "Resolved"].map(s => (
                          <button 
                            key={s} 
                            onClick={() => handleUpdateTicket(t.id, s, t.assignee, t.eta)}
                            className={`px-3 py-1 rounded font-mono text-xs border ${
                              t.status === s 
                                ? "bg-emerald-500/20 text-emerald-400 border-emerald-500 border-opacity-100" 
                                : "text-emerald-500/40 border-emerald-500/20 hover:text-emerald-300"
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

          {activeTab === "parcels" && (
            <div className="flex flex-col gap-4">
              <h2 className="font-mono text-emerald-400 tracking-wider mb-4 border-b border-emerald-500/20 pb-2">Parcel Operations Hub</h2>
              {parcels.length === 0 ? (
                <p className="text-emerald-500/50 font-mono">No parcels in the system.</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {parcels.map(p => (
                    <div key={p.id} className="p-4 bg-emerald-950/30 border border-emerald-500/20 rounded-xl flex flex-col gap-3">
                      <div className="flex justify-between items-start">
                        <span className="font-mono font-bold text-slate-200">{p.vendor} (via {p.location})</span>
                        <span className="text-[10px] font-mono px-2 py-1 rounded bg-slate-800 text-slate-400">
                          {p.id}
                        </span>
                      </div>
                      <div className="flex flex-col gap-2 mt-2">
                        <label className="text-xs text-emerald-500/60 uppercase">Override ETA</label>
                        <input 
                          type="text" 
                          defaultValue={p.eta}
                          onBlur={(e) => handleUpdateParcel(p.id, p.status, e.target.value)}
                          className="bg-black/40 border border-emerald-500/20 rounded p-2 text-emerald-300 font-mono text-sm outline-none focus:border-emerald-500/50"
                        />
                      </div>
                      <div className="flex flex-wrap items-center gap-2 mt-1">
                        <span className="text-xs text-emerald-500/60 uppercase">Status:</span>
                        {["Arrived", "In Transit", "Delayed"].map(s => (
                          <button 
                            key={s} 
                            onClick={() => handleUpdateParcel(p.id, s, p.eta)}
                            className={`px-3 py-1 rounded font-mono text-xs border ${
                              p.status === s 
                                ? "bg-emerald-500/20 text-emerald-400 border-emerald-500" 
                                : "text-emerald-500/40 border-emerald-500/20 hover:text-emerald-300"
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

          {activeTab === "menu" && (
            <div className="flex flex-col gap-4 h-full">
              <div className="flex justify-between items-center mb-4 border-b border-emerald-500/20 pb-2">
                <h2 className="font-mono text-emerald-400 tracking-wider">Weekly Mess Schedule (JSON Config)</h2>
                <button 
                  onClick={handleMenuSave}
                  className="bg-emerald-500 hover:bg-emerald-400 text-slate-900 font-bold px-4 py-2 rounded uppercase text-xs font-mono tracking-widest transition-colors flex items-center gap-2"
                >
                  <UiIcon name="save" className="w-4 h-4" />
                  Save Changes
                </button>
              </div>
              <p className="text-xs text-emerald-500/60">
                WARNING: This modifies the core JSON schedule database. Maintain exact array schemas (title is index 0).
              </p>
              <textarea
                value={menuJson}
                onChange={(e) => setMenuJson(e.target.value)}
                className="flex-1 min-h-[500px] w-full bg-[#050510] border border-emerald-500/20 rounded-xl p-4 text-emerald-300 font-mono text-sm leading-relaxed outline-none focus:border-emerald-500/50 font-normal shadow-inner"
                spellCheck="false"
              />
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
