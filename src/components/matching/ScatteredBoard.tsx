"use client";
import { useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { scatterCardWidth, scatterPositions } from "@/lib/matching/scatter";

export function ScatteredBoard({
  items,
  seed,
}: {
  items: { id: string; content: ReactNode; hidden?: boolean }[];
  seed: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [measurement, setMeasurement] = useState({
    width: 0,
    heights: {} as Record<string, number>,
  });
  const keys = items.map((item) => item.id).join("|");
  useLayoutEffect(() => {
    const board = ref.current;
    if (!board) return;
    const measure = () => {
      const width = board.clientWidth;
      const heights: Record<string, number> = {};
      board
        .querySelectorAll<HTMLElement>("[data-scatter-item]")
        .forEach((item) => {
          heights[item.dataset.scatterItem!] = item.offsetHeight;
        });
      setMeasurement((previous) =>
        previous.width === width &&
        JSON.stringify(previous.heights) === JSON.stringify(heights)
          ? previous
          : { width, heights },
      );
    };
    const observer = new ResizeObserver(measure);
    observer.observe(board);
    board
      .querySelectorAll<HTMLElement>("[data-scatter-item]")
      .forEach((item) => observer.observe(item));
    measure();
    return () => observer.disconnect();
  }, [keys, seed]);
  const sizes = items.map((item, index) => ({
    id: item.id,
    width: scatterCardWidth(measurement.width, index, seed),
    height: measurement.heights[item.id] ?? 150,
  }));
  const layout = scatterPositions(sizes, measurement.width, seed);
  return (
    <div
      ref={ref}
      aria-label="Scattered matching cards"
      className={`relative isolate rounded-3xl bg-slate-50/70 ${measurement.width ? "" : "flex flex-wrap gap-4 p-4"}`}
      style={
        measurement.width
          ? { height: items.every((item) => item.hidden) ? 0 : layout.height }
          : undefined
      }
    >
      {items.map((item, index) => {
        const position = layout.positions[index];
        return (
          <div
            key={item.id}
            data-scatter-item={item.id}
            className="hover:z-30 focus-within:z-40 has-[[data-match-drop-target]]:z-40"
            style={
              measurement.width
                ? {
                    visibility: item.hidden ? "hidden" : undefined,
                    position: "absolute",
                    width: sizes[index].width,
                    left: position.left,
                    top: position.top,
                    transform: `rotate(${position.rotation}deg)`,
                  }
                : {
                    visibility: item.hidden ? "hidden" : undefined,
                    width: "min(100%, 220px)",
                  }
            }
          >
            {item.content}
          </div>
        );
      })}
    </div>
  );
}
