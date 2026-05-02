"use client";

/**
 * use-pretext.ts
 *
 * Shared React hooks and pure helpers wrapping @chenglou/pretext for
 * DOM-free text measurement across HostelOS pages.
 *
 * All Pretext calls are SSR-safe: they only run when `window` is available.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { prepare, layout, prepareWithSegments, walkLineRanges } from "@chenglou/pretext";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Line height that matches Tailwind's `leading-relaxed` on text-xs (12px) */
export const MONO_LINE_HEIGHT = 20;
/** Default font matching Tailwind font-mono at text-xs */
export const MONO_FONT_SM = '12px ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace';
/** Tailwind text-sm (14px) mono */
export const MONO_FONT_BASE = '14px ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace';
/** Tailwind text-base (16px) for body text */
export const SANS_FONT_BASE = '16px ui-sans-serif, system-ui, -apple-system, sans-serif';

// ---------------------------------------------------------------------------
// Pure imperative helper (safe to call anywhere on client)
// ---------------------------------------------------------------------------

/**
 * Measure the pixel height of a text string at a given max width.
 * Returns `null` when called server-side (SSR / no canvas).
 */
export function measureTextHeight(
  text: string,
  font: string,
  maxWidth: number,
  lineHeight: number,
): number | null {
  if (typeof window === "undefined" || maxWidth <= 0) return null;
  try {
    const prepared = prepare(text, font);
    const result = layout(prepared, maxWidth, lineHeight);
    return result.height;
  } catch {
    return null;
  }
}

/**
 * Measure how many lines a piece of text takes at a given width.
 * Returns `null` server-side.
 */
export function measureLineCount(
  text: string,
  font: string,
  maxWidth: number,
  lineHeight: number,
): number | null {
  if (typeof window === "undefined" || maxWidth <= 0) return null;
  try {
    const prepared = prepare(text, font);
    const result = layout(prepared, maxWidth, lineHeight);
    return result.lineCount;
  } catch {
    return null;
  }
}

/**
 * Measure the "shrink-wrap" width — the tightest container that still fits
 * the text without wrapping. Uses walkLineRanges internally.
 * Returns `null` server-side.
 */
export function measureShrinkWrapWidth(
  text: string,
  font: string,
): number | null {
  if (typeof window === "undefined") return null;
  try {
    const prepared = prepareWithSegments(text, font);
    let maxW = 0;
    // Use a very wide max so nothing wraps — result is the widest line.
    walkLineRanges(prepared, 9999, (line) => {
      if (line.width > maxW) maxW = line.width;
    });
    return maxW;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Hook: useTextHeight
// ---------------------------------------------------------------------------

/**
 * React hook that measures and tracks the pixel height of `text` at the
 * current `maxWidth`. Re-measures when text or maxWidth changes.
 * Falls back to `null` during SSR.
 */
export function useTextHeight(
  text: string,
  font: string = MONO_FONT_SM,
  maxWidth: number,
  lineHeight: number = MONO_LINE_HEIGHT,
): number | null {
  const [height, setHeight] = useState<number | null>(null);

  useEffect(() => {
    if (typeof window === "undefined" || maxWidth <= 0) return;
    const measured = measureTextHeight(text, font, maxWidth, lineHeight);
    setHeight(measured);
  }, [text, font, maxWidth, lineHeight]);

  return height;
}

// ---------------------------------------------------------------------------
// Hook: useElementWidth — thin wrapper on ResizeObserver
// ---------------------------------------------------------------------------

/**
 * Returns the current pixel width of an element, updated on resize.
 * Pass the ref to the element you want to measure.
 */
export function useElementWidth<T extends HTMLElement = HTMLDivElement>(
  fallback: number = 0,
): [React.RefObject<T>, number] {
  const ref = useRef<T>(null!);
  const [width, setWidth] = useState<number>(fallback);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) {
        setWidth(entry.contentRect.width);
      }
    });

    observer.observe(el);
    setWidth(el.getBoundingClientRect().width);

    return () => observer.disconnect();
  }, []);

  return [ref, width];
}

// ---------------------------------------------------------------------------
// Hook: usePretextVirtualizer
// ---------------------------------------------------------------------------

export type VirtualRow<T> = {
  item: T;
  index: number;
  offsetTop: number;
  height: number;
};

/**
 * Windowed list virtualizer backed by Pretext measurements.
 *
 * @param items       - Full list of items to virtualize
 * @param getText     - Extracts the text to measure from each item
 * @param font        - CSS font shorthand for measurement
 * @param maxWidth    - Container width (update on resize)
 * @param lineHeight  - Line height in px
 * @param baseHeight  - Fixed base height per row (for non-text content)
 * @param overscan    - Number of off-screen rows to render above/below
 */
export function usePretextVirtualizer<T>(
  items: T[],
  getText: (item: T) => string,
  font: string = MONO_FONT_SM,
  maxWidth: number = 600,
  lineHeight: number = MONO_LINE_HEIGHT,
  baseHeight: number = 32,
  overscan: number = 3,
): {
  containerRef: React.RefObject<HTMLDivElement>;
  visibleRows: VirtualRow<T>[];
  totalHeight: number;
  scrollTop: number;
} {
  const containerRef = useRef<HTMLDivElement>(null!);
  const [scrollTop, setScrollTop] = useState(0);
  const [containerHeight, setContainerHeight] = useState(400);

  // Compute row heights + cumulative offsets in one pass (avoids double measurement)
  const [heights, setHeights] = useState<number[]>([]);
  const [offsets, setOffsets] = useState<number[]>([]);
  const [totalHeight, setTotalHeight] = useState(0);

  useEffect(() => {
    const h: number[] = items.map((item) => {
      if (typeof window === "undefined" || maxWidth <= 0) return baseHeight;
      const text = getText(item);
      if (!text.trim()) return baseHeight;
      const measured = measureTextHeight(text, font, maxWidth, lineHeight);
      return (measured ?? lineHeight) + baseHeight;
    });
    const cumulative: number[] = [];
    let acc = 0;
    for (const val of h) {
      cumulative.push(acc);
      acc += val;
    }
    setHeights(h);
    setOffsets(cumulative);
    setTotalHeight(acc);
  }, [items, getText, font, maxWidth, lineHeight, baseHeight]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const onScroll = () => setScrollTop(el.scrollTop);
    const resizeObs = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) setContainerHeight(entry.contentRect.height);
    });

    el.addEventListener("scroll", onScroll, { passive: true });
    resizeObs.observe(el);
    setContainerHeight(el.getBoundingClientRect().height);

    return () => {
      el.removeEventListener("scroll", onScroll);
      resizeObs.disconnect();
    };
  }, []);

  const [visibleRowsState, setVisibleRowsState] = useState<VirtualRow<T>[]>([]);

  useEffect(() => {
    if (offsets.length === 0 || items.length === 0) {
      setVisibleRowsState([]);
      return;
    }
    const viewStart = scrollTop;
    const viewEnd = scrollTop + containerHeight;
    const overscanPx = overscan * baseHeight;
    const result: VirtualRow<T>[] = [];

    for (let i = 0; i < items.length; i++) {
      const top = offsets[i] ?? 0;
      const h = heights[i] ?? baseHeight;
      const bottom = top + h;
      if (bottom >= viewStart - overscanPx && top <= viewEnd + overscanPx) {
        result.push({ item: items[i]!, index: i, offsetTop: top, height: h });
      }
    }
    setVisibleRowsState(result);
  }, [offsets, heights, items, scrollTop, containerHeight, baseHeight, overscan]);

  return {
    containerRef,
    visibleRows: visibleRowsState,
    totalHeight,
    scrollTop,
  };
}

// ---------------------------------------------------------------------------
// Hook: useOverflowDetect — tells you if text exceeds N lines
// ---------------------------------------------------------------------------

/**
 * Returns `true` if `text` exceeds `maxLines` lines at `maxWidth`.
 * Useful for "show more" toggles.
 */
export function useOverflowDetect(
  text: string,
  font: string,
  maxWidth: number,
  lineHeight: number,
  maxLines: number,
): boolean {
  const [overflows, setOverflows] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined" || maxWidth <= 0) return;
    const count = measureLineCount(text, font, maxWidth, lineHeight);
    setOverflows(count !== null && count > maxLines);
  }, [text, font, maxWidth, lineHeight, maxLines]);

  return overflows;
}
