"use client";

import { type FormEvent, useEffect, useState } from "react";

import { AppShell } from "@/components/app-shell";

type ParcelItem = {
  id: string;
  vendor: string;
  location: string;
  status: string;
  eta: string;
  picked_up: boolean;
};

const API_BASE = process.env.NEXT_PUBLIC_BUNKY_API_BASE ?? "http://127.0.0.1:8000";

export default function ParcelPingPage() {
  const [parcels, setParcels] = useState<ParcelItem[]>([]);
  const [vendor, setVendor] = useState("");
  const [location, setLocation] = useState("");
  const [status, setStatus] = useState("READY FOR PICKUP");
  const [eta, setEta] = useState("30m at Gate");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState("Incoming stream synced.");

  const loadParcels = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE}/api/parcelping/parcels`, { cache: "no-store" });
      if (!response.ok) {
        throw new Error("Failed to fetch parcels");
      }
      const data = (await response.json()) as ParcelItem[];
      setParcels(data);
    } catch {
      setMessage("Backend unavailable. Parcel stream offline.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadParcels();
  }, []);

  const onCreate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!vendor.trim() || !location.trim()) {
      setMessage("Enter vendor and location.");
      return;
    }

    setSending(true);
    try {
      const response = await fetch(`${API_BASE}/api/parcelping/parcels`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ vendor: vendor.trim(), location: location.trim(), status: status.trim(), eta: eta.trim() }),
      });
      if (!response.ok) {
        throw new Error("Create parcel failed");
      }
      setVendor("");
      setLocation("");
      setMessage("Parcel logged.");
      await loadParcels();
    } catch {
      setMessage("Parcel creation failed.");
    } finally {
      setSending(false);
    }
  };

  const onPickup = async (id: string) => {
    try {
      const response = await fetch(`${API_BASE}/api/parcelping/pickup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      if (!response.ok) {
        throw new Error("Pickup failed");
      }
      setMessage(`Marked ${id} as picked up.`);
      await loadParcels();
    } catch {
      setMessage("Could not update parcel state.");
    }
  };

  return (
    <AppShell active="parcelping">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold tracking-tight font-mono">Incoming Stream</h2>
      </div>

      <form onSubmit={onCreate} className="grid grid-cols-1 md:grid-cols-5 gap-2">
        <input
          value={vendor}
          onChange={(event) => setVendor(event.target.value)}
          placeholder="Vendor"
          className="bg-white/5 border border-accent-dark rounded-lg px-3 py-2 text-sm font-mono"
        />
        <input
          value={location}
          onChange={(event) => setLocation(event.target.value)}
          placeholder="Location"
          className="bg-white/5 border border-accent-dark rounded-lg px-3 py-2 text-sm font-mono"
        />
        <input
          value={status}
          onChange={(event) => setStatus(event.target.value)}
          placeholder="Status"
          className="bg-white/5 border border-accent-dark rounded-lg px-3 py-2 text-sm font-mono"
        />
        <input
          value={eta}
          onChange={(event) => setEta(event.target.value)}
          placeholder="ETA"
          className="bg-white/5 border border-accent-dark rounded-lg px-3 py-2 text-sm font-mono"
        />
        <button
          type="submit"
          disabled={sending}
          className="bg-primary text-background-dark rounded-lg px-3 py-2 text-sm font-bold disabled:opacity-40"
        >
          {sending ? "LOGGING" : "LOG PARCEL"}
        </button>
      </form>

      <p className="text-xs text-slate-400 font-mono">{message}</p>
      {loading && <p className="text-xs text-slate-400 font-mono">Loading parcels...</p>}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {parcels.map((parcel) => (
          <div key={parcel.id} className="bg-terminal-gray/60 border border-primary/30 rounded-xl overflow-hidden">
            <div className="relative h-32 bg-background-dark">
              <div className="absolute top-3 left-3 bg-primary text-background-dark px-2 py-1 rounded text-[10px] font-bold font-mono">
                {parcel.status}
              </div>
              <div className="absolute bottom-3 right-3 bg-background-dark/80 px-2 py-1 rounded text-[10px] text-slate-300 font-mono border border-white/10">
                ID: #{parcel.id}
              </div>
            </div>
            <div className="p-4 flex flex-col gap-3">
              <div className="flex justify-between items-start gap-3">
                <div>
                  <h4 className="font-bold text-lg text-slate-100">{parcel.vendor}</h4>
                  <p className="text-xs text-slate-400">{parcel.location}</p>
                </div>
                <p className="text-primary text-xs font-bold font-mono">{parcel.eta}</p>
              </div>
              <button
                onClick={() => void onPickup(parcel.id)}
                disabled={parcel.picked_up}
                className="w-full bg-primary/10 border border-primary/20 text-primary py-2 rounded-lg text-xs font-bold hover:bg-primary hover:text-background-dark transition-all flex items-center justify-center gap-2 disabled:opacity-40"
              >
                <span className="material-symbols-outlined text-sm">qr_code</span>
                {parcel.picked_up ? "Picked Up" : "Mark Picked Up"}
              </button>
            </div>
          </div>
        ))}
      </div>
    </AppShell>
  );
}
