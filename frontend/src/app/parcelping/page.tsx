"use client";

import { type FormEvent, useCallback, useEffect, useState } from "react";

import { AppShell } from "@/components/app-shell";
import { UiIcon } from "@/components/ui-icon";
import { apiFetchJson, toUiMessage } from "@/lib/api-client";
import { type ParcelItem } from "@/lib/types";

export default function ParcelPingPage() {
  const [parcels, setParcels] = useState<ParcelItem[]>([]);
  const [vendor, setVendor] = useState("");
  const [location, setLocation] = useState("");
  const [status, setStatus] = useState("");
  const [eta, setEta] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState("");
  const [vendorError, setVendorError] = useState("");
  const [locationError, setLocationError] = useState("");
  const [statusError, setStatusError] = useState("");
  const [etaError, setEtaError] = useState("");

  const loadParcels = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiFetchJson<ParcelItem[]>("/api/parcelping/parcels");
      setParcels(data);
      setMessage("");
    } catch (error) {
      setMessage(toUiMessage(error, "Parcel stream sync failed."));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadParcels();
  }, [loadParcels]);

  useEffect(() => {
    const interval = setInterval(() => {
      void loadParcels();
    }, 15000);

    return () => clearInterval(interval);
  }, [loadParcels]);

  const onCreate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    setVendorError("");
    setLocationError("");
    setStatusError("");
    setEtaError("");

    const trimmedVendor = vendor.trim();
    const trimmedLocation = location.trim();
    const trimmedStatus = status.trim();
    const trimmedEta = eta.trim();
    let hasError = false;

    if (trimmedVendor.length < 2) {
      setVendorError("Vendor must be at least 2 characters.");
      hasError = true;
    }
    if (trimmedLocation.length < 2) {
      setLocationError("Location must be at least 2 characters.");
      hasError = true;
    }
    if (trimmedStatus.length < 2) {
      setStatusError("Status must be at least 2 characters.");
      hasError = true;
    }
    if (trimmedEta.length < 2) {
      setEtaError("ETA must be at least 2 characters.");
      hasError = true;
    }

    if (hasError) {
      setMessage("Fix validation errors and retry.");
      return;
    }

    setSending(true);
    try {
      await apiFetchJson("/api/parcelping/parcels", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ vendor: trimmedVendor, location: trimmedLocation, status: trimmedStatus, eta: trimmedEta }),
      });
      setVendor("");
      setLocation("");
      setMessage("");
      await loadParcels();
    } catch (error) {
      setMessage(toUiMessage(error, "Parcel creation failed."));
    } finally {
      setSending(false);
    }
  };

  const onPickup = async (id: string) => {
    try {
      await apiFetchJson("/api/parcelping/pickup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      setMessage(`Marked ${id} as picked up.`);
      await loadParcels();
    } catch (error) {
      setMessage(toUiMessage(error, "Could not update parcel state."));
    }
  };

  return (
    <AppShell active="parcelping">
      <div className="pixel-panel flex items-center justify-between rounded-sm p-4 bg-background-dark/30">
        <h2 className="text-2xl font-bold tracking-tight font-mono">Incoming Stream</h2>
      </div>

      <form onSubmit={onCreate} className="pixel-panel grid grid-cols-1 md:grid-cols-5 gap-2 rounded-sm p-3 bg-background-dark/25">
        <div>
          <input
            value={vendor}
            onChange={(event) => {
              setVendor(event.target.value);
              if (vendorError) {
                setVendorError("");
              }
            }}
            placeholder="Vendor"
            className={`pixel-control bg-white/5 border rounded px-3 py-2 text-sm font-mono w-full ${vendorError ? "border-red-400" : "border-accent-dark"}`}
            aria-invalid={vendorError ? true : undefined}
          />
          {vendorError && <p className="mt-1 text-[11px] font-mono text-red-300">{vendorError}</p>}
        </div>
        <div>
          <input
            value={location}
            onChange={(event) => {
              setLocation(event.target.value);
              if (locationError) {
                setLocationError("");
              }
            }}
            placeholder="Location"
            className={`pixel-control bg-white/5 border rounded px-3 py-2 text-sm font-mono w-full ${locationError ? "border-red-400" : "border-accent-dark"}`}
            aria-invalid={locationError ? true : undefined}
          />
          {locationError && <p className="mt-1 text-[11px] font-mono text-red-300">{locationError}</p>}
        </div>
        <div>
          <input
            value={status}
            onChange={(event) => {
              setStatus(event.target.value);
              if (statusError) {
                setStatusError("");
              }
            }}
            placeholder="Status"
            className={`pixel-control bg-white/5 border rounded px-3 py-2 text-sm font-mono w-full ${statusError ? "border-red-400" : "border-accent-dark"}`}
            aria-invalid={statusError ? true : undefined}
          />
          {statusError && <p className="mt-1 text-[11px] font-mono text-red-300">{statusError}</p>}
        </div>
        <div>
          <input
            value={eta}
            onChange={(event) => {
              setEta(event.target.value);
              if (etaError) {
                setEtaError("");
              }
            }}
            placeholder="ETA"
            className={`pixel-control bg-white/5 border rounded px-3 py-2 text-sm font-mono w-full ${etaError ? "border-red-400" : "border-accent-dark"}`}
            aria-invalid={etaError ? true : undefined}
          />
          {etaError && <p className="mt-1 text-[11px] font-mono text-red-300">{etaError}</p>}
        </div>
        <button
          type="submit"
          disabled={sending}
          className="pixel-control bg-primary text-background-dark rounded px-3 py-2 text-sm font-bold disabled:opacity-40"
        >
          {sending ? "LOGGING" : "LOG PARCEL"}
        </button>
      </form>

      <div className="flex items-center gap-3">
        <p className="text-xs text-slate-400 font-mono">{message}</p>
        {message.toLowerCase().includes("retry") || message.toLowerCase().includes("offline") || message.toLowerCase().includes("failed") ? (
          <button
            type="button"
            onClick={() => void loadParcels()}
            className="pixel-control rounded border border-primary/30 px-2 py-1 text-xs font-mono text-primary hover:bg-primary/10"
          >
            Retry
          </button>
        ) : null}
      </div>
      {loading && <p className="text-xs text-slate-400 font-mono">Loading...</p>}
      {!loading && parcels.length === 0 && <p className="text-xs text-slate-400 font-mono">No parcels available.</p>}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {parcels.map((parcel) => (
          <div key={parcel.id} className="pixel-panel bg-terminal-gray/60 border border-primary/30 rounded-sm overflow-hidden">
            <div className="relative h-32 bg-background-dark">
              <div className="absolute top-3 left-3 bg-primary text-background-dark px-2 py-1 rounded-sm text-[10px] font-bold font-mono">
                {parcel.status}
              </div>
              <div className="absolute bottom-3 right-3 bg-background-dark/80 px-2 py-1 rounded-sm text-[10px] text-slate-300 font-mono border border-white/10">
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
                className="pixel-control w-full bg-primary/10 border border-primary/20 text-primary py-2 rounded text-xs font-bold hover:bg-primary hover:text-background-dark transition-all flex items-center justify-center gap-2 disabled:opacity-40"
              >
                <UiIcon name="qr_code" className="size-4" />
                {parcel.picked_up ? "Picked Up" : "Mark Picked Up"}
              </button>
            </div>
          </div>
        ))}
      </div>
    </AppShell>
  );
}
