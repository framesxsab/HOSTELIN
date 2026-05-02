"use client";

import { useCallback, useEffect, useState } from "react";

import { AppShell } from "@/components/app-shell";
import { UiIcon } from "@/components/ui-icon";
import { apiFetchJson, toUiMessage } from "@/lib/api-client";
import {
  type MealRating,
  type MealRatingsResponse,
  type MessMateResponse,
  type MessMateSkipResponse,
  type MessMateUnskipResponse,
} from "@/lib/types";
import { measureTextHeight, useElementWidth, MONO_FONT_SM, MONO_LINE_HEIGHT } from "@/lib/use-pretext";

function StarRating({
  rating,
  average,
  totalRatings,
  onRate,
  disabled,
}: {
  rating: number;
  average: number;
  totalRatings: number;
  onRate: (stars: number) => void;
  disabled: boolean;
}) {
  const [hovered, setHovered] = useState(0);

  return (
    <div className="flex items-center gap-2 mt-2">
      <div className="flex gap-0.5" onMouseLeave={() => setHovered(0)}>
        {[1, 2, 3, 4, 5].map((star) => {
          const isFilled = star <= (hovered || rating);
          return (
            <button
              key={star}
              type="button"
              disabled={disabled}
              onMouseEnter={() => setHovered(star)}
              onClick={() => onRate(star)}
              className="p-0.5 transition-transform hover:scale-110 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <UiIcon
                name={isFilled ? "star_filled" : "star"}
                className={`size-4 ${isFilled ? "text-accent" : "text-text-dim"}`}
                filled={isFilled}
              />
            </button>
          );
        })}
      </div>
      {totalRatings > 0 && (
        <span className="text-[10px] font-mono text-text-muted">
          {average}/5 ({totalRatings})
        </span>
      )}
    </div>
  );
}

export default function MessMatePage() {
  const [data, setData] = useState<MessMateResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionMessage, setActionMessage] = useState("");
  const [processingMeal, setProcessingMeal] = useState("");
  const [ratings, setRatings] = useState<Record<string, MealRating>>({});
  const [ratingMeal, setRatingMeal] = useState("");
  const slots = data?.slots ?? [];
  const week = data?.week ?? [];
  const weekRange = week.length > 0 ? `${week[0].date} to ${week[week.length - 1].date}` : data?.period ?? "Loading";

  const [cardGridRef, cardGridWidth] = useElementWidth<HTMLDivElement>();
  const cardInnerWidth = Math.max((cardGridWidth - 48) / 3, 120);

  const [equalCardBodyHeight, setEqualCardBodyHeight] = useState<number | null>(null);
  useEffect(() => {
    if (typeof window === "undefined" || slots.length === 0 || cardInnerWidth <= 0) return;
    const heights = slots.map((slot) => {
      const text = (slot.menu ?? []).join(" + ");
      return measureTextHeight(text, MONO_FONT_SM, cardInnerWidth - 32, MONO_LINE_HEIGHT) ?? MONO_LINE_HEIGHT;
    });
    setEqualCardBodyHeight(Math.max(...heights));
  }, [slots, cardInnerWidth]);

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

  const loadRatings = useCallback(async () => {
    try {
      const payload = await apiFetchJson<MealRatingsResponse>("/api/messmate/ratings");
      const map: Record<string, MealRating> = {};
      for (const r of payload.ratings) {
        map[r.meal] = r;
      }
      setRatings(map);
    } catch {
      // Ratings are non-critical
    }
  }, []);

  useEffect(() => {
    void load();
    void loadRatings();
  }, [load, loadRatings]);

  useEffect(() => {
    const interval = setInterval(() => {
      void load();
      void loadRatings();
    }, 15000);
    return () => clearInterval(interval);
  }, [load, loadRatings]);

  const onToggleMealSkip = async (meal: string, currentlySkipped: boolean) => {
    if (processingMeal || !data) return;
    setProcessingMeal(meal);
    setActionMessage("");

    setData((current) => {
      if (!current) return current;
      return {
        ...current,
        slots: current.slots.map((slot) =>
          slot.meal === meal ? { ...slot, skipped: !currentlySkipped } : slot,
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

  const onRateMeal = async (meal: string, stars: number) => {
    setRatingMeal(meal);
    try {
      const result = await apiFetchJson<MealRating>("/api/messmate/rate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ meal, rating: stars }),
      });
      setRatings((prev) => ({ ...prev, [result.meal]: result }));
      setActionMessage(`Rated ${meal} ${stars}/5`);
    } catch (err) {
      setActionMessage(toUiMessage(err, "Could not submit rating."));
    } finally {
      setRatingMeal("");
    }
  };

  const MEAL_ICONS = { Breakfast: "wb_sunny", Lunch: "lunch_dining", Dinner: "dark_mode" } as const;

  return (
    <AppShell active="messmate">
      <div className="pixel-panel flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-primary/15 pb-6 rounded-lg p-4 bg-void/35">
        <div>
          <h1 className="text-4xl font-black tracking-tighter uppercase font-mono">Weekly Nutrition Plan</h1>
          <p className="text-primary/55 font-mono text-sm mt-1">
            Period: {data?.period ?? "Loading"} | Today: <span className="text-primary">{data?.today_label ?? "Loading"}</span>
          </p>
        </div>
      </div>

      {loading && <p className="text-xs text-text-muted font-mono">Loading menu...</p>}
      {error && (
        <div className="flex items-center gap-3">
          <p className="text-xs text-danger font-mono">{error}</p>
          <button
            type="button"
            onClick={() => void load()}
            className="pixel-control rounded-md border border-primary/30 px-2 py-1 text-xs font-mono text-primary hover:bg-primary/10"
          >
            Retry
          </button>
        </div>
      )}
      {actionMessage && <p className="text-xs text-primary font-mono">{actionMessage}</p>}
      {!loading && !error && slots.length === 0 && <p className="text-xs text-text-muted font-mono">No menu slots available right now.</p>}

      {/* Today's meals */}
      <div ref={cardGridRef} className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {slots.map((slot, index) => {
          const mealRating = ratings[slot.meal];
          const isHighlight = slot.meal === "Lunch";
          const menuText = (slot.menu ?? []).join(" + ");
          return (
            <div
              key={`${slot.meal}-${index}`}
              className={
                isHighlight
                  ? "pixel-panel bg-void border-2 border-primary rounded-lg overflow-hidden shadow-[0_0_24px_rgba(163,230,53,0.08)]"
                  : "pixel-panel bg-void/60 border border-primary/15 rounded-lg overflow-hidden"
              }
            >
              <div
                className={
                  isHighlight
                    ? "px-4 py-2 bg-primary border-b border-primary flex justify-between items-center"
                    : "px-4 py-2 bg-primary/8 border-b border-primary/10 flex justify-between items-center"
                }
              >
                <span className={isHighlight ? "text-[10px] font-bold font-mono uppercase tracking-widest text-void" : "text-[10px] font-bold font-mono uppercase tracking-widest text-primary/70"}>
                  {slot.time}
                </span>
                <UiIcon
                  name={MEAL_ICONS[slot.meal as keyof typeof MEAL_ICONS] ?? "restaurant"}
                  className={isHighlight ? "size-4 text-void" : "size-4 text-primary"}
                />
              </div>
              <div
                className="p-4"
                style={{
                  minHeight: equalCardBodyHeight ? `${equalCardBodyHeight + 80}px` : undefined,
                  transition: "min-height 200ms ease",
                }}
              >
                <h4 className="text-lg font-bold font-mono uppercase mb-1">{slot.title}</h4>
                <p className={isHighlight ? "text-xs text-primary mb-3 uppercase" : "text-xs text-text-muted mb-3 uppercase"}>
                  {menuText || "No menu data"}
                </p>

                <StarRating
                  rating={mealRating?.rating ?? 0}
                  average={mealRating?.average ?? 0}
                  totalRatings={mealRating?.total_ratings ?? 0}
                  onRate={(stars) => void onRateMeal(slot.meal, stars)}
                  disabled={ratingMeal === slot.meal}
                />

                <div className="mt-3">
                  <button
                    type="button"
                    disabled={processingMeal === slot.meal}
                    onClick={() => void onToggleMealSkip(slot.meal, slot.skipped)}
                    className={
                      slot.skipped
                        ? "pixel-control rounded-md border border-primary/30 bg-primary/10 px-2 py-1 text-[10px] font-mono uppercase tracking-wide text-primary"
                        : "pixel-control rounded-md border border-void-border px-2 py-1 text-[10px] font-mono uppercase tracking-wide text-text-secondary hover:border-primary/40 hover:text-primary disabled:opacity-50"
                    }
                  >
                    {processingMeal === slot.meal ? "Working..." : slot.skipped ? "Undo Skip" : "Skip Meal"}
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Weekly menu table */}
      <div className="pixel-panel overflow-hidden rounded-lg">
        <div className="flex items-center justify-between gap-3 border-b border-void-border bg-void/40 px-4 py-3">
          <h2 className="text-xs font-mono font-bold uppercase tracking-[0.24em] text-white">Weekly Menu Matrix</h2>
          <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-text-muted">{weekRange}</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] border-collapse font-mono text-xs">
            <thead>
              <tr className="border-b border-void-border text-text-dim uppercase tracking-[0.18em]">
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
                  <tr key={`${day.day}-${day.date}`} className={isToday ? "bg-primary/5" : "border-b border-void-border/40"}>
                    <td className="px-4 py-4 align-top text-white">
                      <div className="font-bold uppercase tracking-[0.16em]">{day.day}</div>
                      <div className="mt-1 text-[10px] text-text-muted">({day.date})</div>
                    </td>
                    {([day.breakfast, day.lunch, day.dinner] as const).map((cell, cellIndex) => (
                      <td key={`${day.day}-${cellIndex}`} className="px-4 py-4 align-top text-text-secondary">
                        <div className="space-y-1">
                          {cell.items.map((line) => (
                            <div key={line} className="leading-relaxed">{line}</div>
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
