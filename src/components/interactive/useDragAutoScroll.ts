"use client";
import { useEffect, useRef, type RefObject } from "react";
export function useDragAutoScroll(
  point: { x: number; y: number } | null,
  root: RefObject<HTMLElement | null>,
) {
  const current = useRef(point);
  const active = point !== null;
  useEffect(() => {
    current.current = point;
  }, [point]);
  useEffect(() => {
    if (!active) return;
    let frame = 0;
    function tick() {
      const p = current.current;
      if (!p) return;
      const main = root.current?.closest<HTMLElement>("main");
      const scroll =
        main && main.scrollHeight > main.clientHeight
          ? main
          : document.scrollingElement;
      const bounds =
        scroll === main
          ? main!.getBoundingClientRect()
          : { top: 0, bottom: window.innerHeight };
      const dy =
        p.y < bounds.top + 55
          ? -15
          : p.y > Math.min(bounds.bottom, window.innerHeight) - 55
            ? 15
            : 0;
      if (dy) scroll?.scrollBy(0, dy);
      frame = requestAnimationFrame(tick);
    }
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [active, root]);
}
