"use client";

import { useCallback, useEffect, useState } from "react";

import { AppShell } from "@/components/app-shell";
import { UiIcon } from "@/components/ui-icon";
import { apiFetchJson, toUiMessage } from "@/lib/api-client";
import { type MessMateResponse, type MessMateSkipResponse, type MessMateUnskipResponse } from "@/lib/types";

export default function MessMatePage() {
  const [data, setData] = useState<MessMateResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionMessage, setActionMessage] = useState("");
  const [processingMeal, setProcessingMeal] = useState("");
  const slots = data?.slots ?? [];
  const week = data?.week ?? [];
  const weekRange = week.length > 0 ? `${week[0].date} to ${week[week.length - 1].date}` : data?.period ?? "Loading";

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const payload = await apiFetchJson<MessMateResponse>("/api/messmate/menu");
      setData(payload);
      setError("");
    } catch (fetchError) {
      setError(toUiMessage(fetchError, "Could not load menu."));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const interval = setInterval(() => {
      void load();
    }, 15000);

    return () => clearInterval(interval);
  }, [load]);

  const onToggleMealSkip = async (meal: string, currentlySkipped: boolean) => {
    if (processingMeal || !data) {
      return;
    }

    setProcessingMeal(meal);
    setActionMessage("");

    setData((current) => {
      if (!current) {
        return current;
      }
      return {
        ...current,
        slots: current.slots.map((slot) =>
          slot.meal === meal
            ? {
                ...slot,
                skipped: !currentlySkipped,
              }
            : slot,
        ),
      };
    });

    try {
      const payload = await apiFetchJson<MessMateSkipResponse | MessMateUnskipResponse>(
        currentlySkipped ? "/api/messmate/unskip" : "/api/messmate/skip",
        {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ meal }),
        },
      );
      setActionMessage(payload.message);
    } catch (skipError) {
      setActionMessage(toUiMessage(skipError, currentlySkipped ? "Could not undo meal skip." : "Could not skip meal."));
      await load();
    } finally {
      setProcessingMeal("");
    }
  };

  return (
    <AppShell active="messmate">
      <div className="pixel-panel flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-primary/20 pb-6 rounded-sm p-4 bg-background-dark/30">
        <div>
          <h1 className="text-4xl font-black tracking-tighter uppercase font-mono">Weekly Nutrition Plan</h1>
          <p className="text-primary/60 font-mono text-sm mt-1">
            Period: {data?.period ?? "Loading"} | Today: <span className="text-primary">{data?.today_label ?? "Loading"}</span>
          </p>
        </div>
      </div>

      {loading && <p className="text-xs text-slate-400 font-mono">Loading menu...</p>}
      {error && (
        <div className="flex items-center gap-3">
          <p className="text-xs text-slate-400 font-mono">{error}</p>
          <button
            type="button"
            onClick={() => void load()}
            className="pixel-control rounded border border-primary/30 px-2 py-1 text-xs font-mono text-primary hover:bg-primary/10"
          >
            Retry
          </button>
        </div>
      )}
      {actionMessage && <p className="text-xs text-primary font-mono">{actionMessage}</p>}
      {!loading && !error && slots.length === 0 && <p className="text-xs text-slate-400 font-mono">No menu slots available right now.</p>}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {slots.map((slot, index) => (
          <div
            key={`${slot.meal}-${index}`}
            className={
              slot.meal === "Lunch"
                ? "pixel-panel bg-background-dark border-2 border-primary rounded-sm overflow-hidden shadow-[0_0_20px_rgba(122,217,87,0.1)]"
                : "pixel-panel bg-background-dark/60 border border-primary/20 rounded-sm overflow-hidden"
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
              <UiIcon
                name={slot.meal === "Breakfast" ? "wb_sunny" : slot.meal === "Lunch" ? "lunch_dining" : "dark_mode"}
                className={slot.meal === "Lunch" ? "size-4 text-background-dark" : "size-4 text-primary"}
              />
            </div>
            <div className="p-4">
              <h4 className="text-lg font-bold font-mono uppercase mb-1">{slot.title}</h4>
              <p className={slot.meal === "Lunch" ? "text-xs text-primary mb-4 uppercase" : "text-xs text-slate-400 mb-4 uppercase"}>
                {slot.menu.join(" + ")}
              </p>
              <button
                type="button"
                disabled={processingMeal === slot.meal}
                onClick={() => void onToggleMealSkip(slot.meal, slot.skipped)}
                className={
                  slot.skipped
                    ? "pixel-control rounded border border-primary/30 bg-primary/10 px-2 py-1 text-[10px] font-mono uppercase tracking-wide text-primary"
                    : "pixel-control rounded border border-accent-dark px-2 py-1 text-[10px] font-mono uppercase tracking-wide text-slate-300 hover:border-primary/40 hover:text-primary disabled:opacity-50"
                }
              >
                {processingMeal === slot.meal ? "Working..." : slot.skipped ? "Undo Skip" : "Skip Meal"}
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="pixel-panel overflow-hidden rounded-lg">
        <div className="flex items-center justify-between gap-3 border-b border-accent-dark/40 bg-background-dark/35 px-4 py-3">
          <h2 className="text-xs font-mono font-bold uppercase tracking-[0.24em] text-white">Weekly Menu Matrix</h2>
          <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-slate-400">{weekRange}</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] border-collapse font-mono text-xs">
            <thead>
              <tr className="border-b border-accent-dark/40 text-slate-500 uppercase tracking-[0.18em]">
                <th className="px-4 py-3 text-left font-normal">Day</th>
                <th className="px-4 py-3 text-left font-normal">Breakfast</th>
                <th className="px-4 py-3 text-left font-normal">Lunch</th>
                <th className="px-4 py-3 text-left font-normal">Dinner</th>
              </tr>
            </thead>
            <tbody>
              {week.map((day) => {
                const todayDayName = data?.today_label?.split(" ")[0]?.toUpperCase() ?? "";
                const isToday = day.day.toUpperCase() === todayDayName;
                return (
                <tr key={`${day.day}-${day.date}`} className={isToday ? "bg-primary/5" : "border-b border-accent-dark/25"}>
                  <td className="px-4 py-4 align-top text-white">
                    <div className="font-bold uppercase tracking-[0.16em]">{day.day}</div>
                    <div className="mt-1 text-[10px] text-slate-400">({day.date})</div>
                  </td>
                  {([day.breakfast, day.lunch, day.dinner] as const).map((cell, cellIndex) => (
                    <td key={`${day.day}-${cellIndex}`} className="px-4 py-4 align-top text-slate-300">
                      <div className="space-y-1">
                        {cell.items.map((line) => (
                          <div key={line} className="leading-relaxed">
                            {line}
                          </div>
                        ))}
                      </div>
                    </td>
                  ))}
                </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </AppShell>
  );
}
