"use client";

import { type FormEvent, useCallback, useEffect, useState } from "react";

import { AppShell } from "@/components/app-shell";
import { ExpandableTitle } from "@/components/expandable-title";
import { UiIcon } from "@/components/ui-icon";
import { apiFetchJson, isRetryableMessage, toUiMessage } from "@/lib/api-client";
import { type ParcelItem } from "@/lib/types";
import { SANS_FONT_BASE } from "@/lib/use-pretext";

const VENDOR_FONT = `bold 18px ${SANS_FONT_BASE.slice(5)}`;
const VENDOR_LINE_HEIGHT = 28;

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

  useEffect(() => { void loadParcels(); }, [loadParcels]);

  useEffect(() => {
    const interval = setInterval(() => { void loadParcels(); }, 15000);
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

    if (trimmedVendor.length < 2) { setVendorError("Vendor must be at least 2 characters."); hasError = true; }
    if (trimmedLocation.length < 2) { setLocationError("Location must be at least 2 characters."); hasError = true; }
    if (trimmedStatus.length < 2) { setStatusError("Status must be at least 2 characters."); hasError = true; }
    if (trimmedEta.length < 2) { setEtaError("ETA must be at least 2 characters."); hasError = true; }
    if (hasError) { setMessage("Fix validation errors and retry."); return; }

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
      <div className="pixel-panel flex items-center justify-between rounded-lg p-4 bg-void/35">
        <h2 className="text-2xl font-bold tracking-tight font-mono">Incoming Stream</h2>
      </div>

      {/* Create parcel form */}
      <form onSubmit={onCreate} className="pixel-panel grid grid-cols-1 md:grid-cols-5 gap-2 rounded-lg p-3 bg-void/30">
        <div>
          <input
            value={vendor}
            onChange={(event) => { setVendor(event.target.value); if (vendorError) setVendorError(""); }}
            placeholder="Vendor"
            className={`pixel-control bg-white/5 border rounded-md px-3 py-2 text-sm font-mono w-full ${vendorError ? "border-danger" : "border-void-border"}`}
            aria-invalid={vendorError ? true : undefined}
          />
          {vendorError && <p className="mt-1 text-[11px] font-mono text-danger">{vendorError}</p>}
        </div>
        <div>
          <input
            value={location}
            onChange={(event) => { setLocation(event.target.value); if (locationError) setLocationError(""); }}
            placeholder="Location"
            className={`pixel-control bg-white/5 border rounded-md px-3 py-2 text-sm font-mono w-full ${locationError ? "border-danger" : "border-void-border"}`}
            aria-invalid={locationError ? true : undefined}
          />
          {locationError && <p className="mt-1 text-[11px] font-mono text-danger">{locationError}</p>}
        </div>
        <div>
          <input
            value={status}
            onChange={(event) => { setStatus(event.target.value); if (statusError) setStatusError(""); }}
            placeholder="Status"
            className={`pixel-control bg-white/5 border rounded-md px-3 py-2 text-sm font-mono w-full ${statusError ? "border-danger" : "border-void-border"}`}
            aria-invalid={statusError ? true : undefined}
          />
          {statusError && <p className="mt-1 text-[11px] font-mono text-danger">{statusError}</p>}
        </div>
        <div>
          <input
            value={eta}
            onChange={(event) => { setEta(event.target.value); if (etaError) setEtaError(""); }}
            placeholder="ETA"
            className={`pixel-control bg-white/5 border rounded-md px-3 py-2 text-sm font-mono w-full ${etaError ? "border-danger" : "border-void-border"}`}
            aria-invalid={etaError ? true : undefined}
          />
          {etaError && <p className="mt-1 text-[11px] font-mono text-danger">{etaError}</p>}
        </div>
        <button
          type="submit"
          disabled={sending}
          className="pixel-control bg-primary text-void rounded-md px-3 py-2 text-sm font-bold disabled:opacity-40"
        >
          {sending ? "LOGGING" : "LOG PARCEL"}
        </button>
      </form>

      {/* Message + retry */}
      <div className="flex items-center gap-3">
        <p className="text-xs text-text-muted font-mono">{message}</p>
        {isRetryableMessage(message) && (
          <button
            type="button"
            onClick={() => void loadParcels()}
            className="pixel-control rounded-md border border-primary/30 px-2 py-1 text-xs font-mono text-primary hover:bg-primary/10"
          >
            Retry
          </button>
        )}
      </div>

      {loading && <p className="text-xs text-text-muted font-mono">Loading...</p>}
      {!loading && parcels.length === 0 && <p className="text-xs text-text-muted font-mono">No parcels available.</p>}

      {/* Parcel grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {parcels.map((parcel) => (
          <div key={parcel.id} className="pixel-panel bg-void-panel/60 border border-primary/20 rounded-lg overflow-hidden">
            <div className="relative h-32 bg-void">
              <div className="absolute top-3 left-3 bg-primary text-void px-2 py-1 rounded-md text-[10px] font-bold font-mono">
                {parcel.status}
              </div>
              <div className="absolute bottom-3 right-3 bg-void/80 px-2 py-1 rounded-md text-[10px] text-text-secondary font-mono border border-white/10">
                ID: #{parcel.id}
              </div>
            </div>
            <div className="p-4 flex flex-col gap-3">
              <div className="flex justify-between items-start gap-3">
                <div className="flex-1 min-w-0">
                  <ExpandableTitle text={parcel.vendor} as="h4" font={VENDOR_FONT} lineHeight={VENDOR_LINE_HEIGHT} className="font-bold text-lg text-text-primary" />
                  <p className="text-xs text-text-muted truncate">{parcel.location}</p>
                </div>
                <p className="text-primary text-xs font-bold font-mono whitespace-nowrap">{parcel.eta}</p>
              </div>
              <button
                onClick={() => void onPickup(parcel.id)}
                disabled={parcel.picked_up}
                className="pixel-control w-full bg-primary/10 border border-primary/15 text-primary py-2 rounded-md text-xs font-bold hover:bg-primary hover:text-void transition-all flex items-center justify-center gap-2 disabled:opacity-40"
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
