"use client";

import { useEffect, useState } from "react";

import { AppShell } from "@/components/app-shell";

type MealSlot = {
  meal: string;
  time: string;
  title: string;
  menu: string[];
  status: string;
};

type MessMateResponse = {
  period: string;
  slots: MealSlot[];
};

const API_BASE = process.env.NEXT_PUBLIC_BUNKY_API_BASE ?? "http://127.0.0.1:8000";

export default function MessMatePage() {
  const [data, setData] = useState<MessMateResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const response = await fetch(`${API_BASE}/api/messmate/menu`, { cache: "no-store" });
        if (!response.ok) {
          throw new Error("Failed to fetch schedule");
        }
        const payload = (await response.json()) as MessMateResponse;
        setData(payload);
      } catch {
        setError("Backend unavailable. Could not load menu.");
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, []);

  return (
    <AppShell active="messmate">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-primary/20 pb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2 py-0.5 bg-primary/20 text-primary text-[10px] font-mono font-bold rounded uppercase">System Active</span>
            <span className="text-primary/40 text-[10px] font-mono uppercase">Term-Luxe: Nutri_Module</span>
          </div>
          <h1 className="text-4xl font-black tracking-tighter uppercase font-mono">Weekly Nutrition Plan</h1>
          <p className="text-primary/60 font-mono text-sm mt-1">
            Period: {data?.period ?? "Loading"} | Status: <span className="text-primary">ENFORCED</span>
          </p>
        </div>
      </div>

      {loading && <p className="text-xs text-slate-400 font-mono">Loading menu...</p>}
      {error && <p className="text-xs text-slate-400 font-mono">{error}</p>}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {data?.slots.map((slot, index) => (
          <div
            key={`${slot.meal}-${index}`}
            className={
              slot.meal === "Lunch"
                ? "bg-background-dark border-2 border-primary rounded-xl overflow-hidden shadow-[0_0_20px_rgba(33,196,93,0.1)]"
                : "bg-background-dark/60 border border-primary/20 rounded-xl overflow-hidden"
            }
          >
            <div
              className={
                slot.meal === "Lunch"
                  ? "px-4 py-2 bg-primary border-b border-primary flex justify-between items-center"
                  : "px-4 py-2 bg-primary/10 border-b border-primary/10 flex justify-between items-center"
              }
            >
              <span className={slot.meal === "Lunch" ? "text-[10px] font-bold font-mono uppercase tracking-widest text-background-dark" : "text-[10px] font-bold font-mono uppercase tracking-widest text-primary/80"}>
                {slot.time}
              </span>
              <span className={slot.meal === "Lunch" ? "material-symbols-outlined text-background-dark text-sm" : "material-symbols-outlined text-primary text-sm"}>
                {slot.meal === "Breakfast" ? "wb_sunny" : slot.meal === "Lunch" ? "lunch_dining" : "dark_mode"}
              </span>
            </div>
            <div className="p-4">
              <h4 className="text-lg font-bold font-mono uppercase mb-1">{slot.title}</h4>
              <p className={slot.meal === "Lunch" ? "text-xs text-primary mb-4 uppercase" : "text-xs text-slate-400 mb-4 uppercase"}>
                {slot.menu.join(" + ")}
              </p>
            </div>
          </div>
        ))}
      </div>
    </AppShell>
  );
}
