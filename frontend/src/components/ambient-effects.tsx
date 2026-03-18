"use client";

import { useEffect } from "react";

export function AmbientEffects() {
  useEffect(() => {
    const root = document.documentElement;

    const updateCursor = (x: number, y: number) => {
      root.style.setProperty("--cursor-x", `${x}px`);
      root.style.setProperty("--cursor-y", `${y}px`);
    };

    const updateScroll = () => {
      const scrollTop = window.scrollY;
      const maxScroll = Math.max(document.documentElement.scrollHeight - window.innerHeight, 1);
      const progress = Math.min(Math.max(scrollTop / maxScroll, 0), 1);
      root.style.setProperty("--scroll-progress", `${progress * 100}%`);
    };

    updateCursor(window.innerWidth * 0.5, window.innerHeight * 0.22);
    updateScroll();

    const handlePointerMove = (event: PointerEvent) => {
      if (event.pointerType === "touch") {
        return;
      }

      updateCursor(event.clientX, event.clientY);
    };

    window.addEventListener("pointermove", handlePointerMove, { passive: true });
    window.addEventListener("scroll", updateScroll, { passive: true });
    window.addEventListener("resize", updateScroll);

    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("scroll", updateScroll);
      window.removeEventListener("resize", updateScroll);
    };
  }, []);

  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
      <div className="scroll-progress-track">
        <div className="scroll-progress-bar" />
      </div>
      <div className="cursor-orb" />
      <div className="cursor-core" />
    </div>
  );
}