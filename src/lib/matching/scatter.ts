export type ScatterSize = { id: string; width: number; height: number };
export type ScatterPosition = {
  id: string;
  left: number;
  top: number;
  rotation: number;
};
function random(seed: number) {
  let value = seed | 0;
  return () => {
    value = (Math.imul(1664525, value) + 1013904223) | 0;
    return (value >>> 0) / 4294967296;
  };
}
export function scatterCardWidth(
  boardWidth: number,
  index: number,
  seed: number,
) {
  const usable = Math.max(120, boardWidth - 36);
  const columns = Math.max(1, Math.min(5, Math.floor((usable + 14) / 185)));
  const nominal = Math.min(240, (usable + (columns - 1) * 10) / columns);
  const jitter = random(seed ^ Math.imul(index + 1, 0x45d9f3b))();
  return Math.max(100, nominal - jitter * 34);
}
/** Seeded freeform placement: allow cards to overlap at their margins, never across their content. */
export function scatterPositions(
  sizes: ScatterSize[],
  width: number,
  seed: number,
) {
  const next = random(seed);
  const positions: ScatterPosition[] = [];
  const margin = 18;
  const usable = Math.max(100, width - margin * 2);
  let height = Math.max(
    240,
    (sizes.reduce((area, size) => area + size.width * size.height, 0) /
      usable) *
      1.12 +
      Math.max(0, ...sizes.map((size) => size.height)),
  );
  const fits = (left: number, top: number, size: ScatterSize) =>
    positions.every((placed, i) => {
      const other = sizes[i];
      const overlapX =
        Math.min(left + size.width, placed.left + other.width) -
        Math.max(left, placed.left);
      const overlapY =
        Math.min(top + size.height, placed.top + other.height) -
        Math.max(top, placed.top);
      return overlapX <= 16 || overlapY <= 16;
    });
  sizes.forEach((size, index) => {
    const maxX = Math.max(margin, width - size.width - margin);
    let candidate: { left: number; top: number } | null = null;
    // Small clusters occasionally tuck one card under a neighbour, like cards on a desk.
    if (index % 3 === 1) {
      const previous = positions[index - 1];
      const left = previous.left + sizes[index - 1].width - 12;
      const top = previous.top + 12 + next() * 20;
      if (left <= maxX && fits(left, top, size)) candidate = { left, top };
    }
    for (let attempt = 0; !candidate && attempt < 1200; attempt++) {
      if (attempt && attempt % 150 === 0) height += 70;
      const left = margin + next() * (maxX - margin);
      const top = 24 + next() * Math.max(0, height - size.height - 52);
      if (fits(left, top, size)) candidate = { left, top };
    }
    if (!candidate)
      candidate = {
        left: margin,
        top:
          Math.max(
            24,
            ...positions.map((placed, i) => placed.top + sizes[i].height),
          ) + 16,
      };
    const maxRotation = Math.min(
      width < 340 ? 2 : 3.5,
      800 / Math.max(size.height, 1),
    );
    positions.push({
      id: size.id,
      ...candidate,
      rotation: (next() - 0.5) * maxRotation * 2,
    });
  });
  return {
    positions,
    height: sizes.length
      ? Math.max(
          ...positions.map((placed, i) => placed.top + sizes[i].height),
        ) + 28
      : 0,
  };
}
