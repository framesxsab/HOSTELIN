"use client";

import { useState } from "react";
import { useElementWidth, useOverflowDetect, useTextHeight, MONO_FONT_BASE, MONO_LINE_HEIGHT } from "@/lib/use-pretext";

export function ExpandableTitle({
  text,
  font = MONO_FONT_BASE,
  lineHeight = MONO_LINE_HEIGHT,
  className = "font-bold text-text-primary",
  as: Tag = "h3",
}: {
  text: string;
  font?: string;
  lineHeight?: number;
  className?: string;
  as?: "h3" | "h4" | "span";
}) {
  const [expanded, setExpanded] = useState(false);
  const [ref, width] = useElementWidth<HTMLDivElement>();
  const effectiveWidth = Math.max(width - 8, 80);
  const overflows = useOverflowDetect(text, font, effectiveWidth, lineHeight, 1);
  const expandedHeight = useTextHeight(text, font, effectiveWidth, lineHeight);

  return (
    <div ref={ref} className="min-w-0 flex-1">
      <Tag
        className={`${className} transition-all overflow-hidden`}
        style={{
          height: expanded
            ? `${(expandedHeight ?? lineHeight) + 4}px`
            : `${lineHeight + 4}px`,
          transition: "height 200ms ease",
          whiteSpace: expanded ? "normal" : "nowrap",
          overflow: "hidden",
          textOverflow: expanded ? "unset" : "ellipsis",
        }}
        title={text}
      >
        {text}
      </Tag>
      {overflows && (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="mt-0.5 text-[10px] font-mono text-primary/60 hover:text-primary transition-colors"
        >
          {expanded ? "Show less" : "Show more"}
        </button>
      )}
    </div>
  );
}
