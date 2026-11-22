import type { BackgroundPattern, PageBackground, ShapeKind } from "./types";

/** Shape outlines in a 100×100 box; stretched to the element frame. */
export const SHAPE_PATHS: Record<Exclude<ShapeKind, "rectangle" | "ellipse">, string> = {
  triangle: "M50 2 L98 98 L2 98 Z",
  rightTriangle: "M2 2 L98 98 L2 98 Z",
  diamond: "M50 2 L98 50 L50 98 L2 50 Z",
  pentagon: "M50 2 L98 38 L80 98 L20 98 L2 38 Z",
  hexagon: "M25 4 L75 4 L98 50 L75 96 L25 96 L2 50 Z",
  octagon: "M30 2 L70 2 L98 30 L98 70 L70 98 L30 98 L2 70 L2 30 Z",
  star: "M50 2 L61 36 L98 36 L68 58 L79 94 L50 72 L21 94 L32 58 L2 36 L39 36 Z",
  arrowRight: "M2 30 L60 30 L60 8 L98 50 L60 92 L60 70 L2 70 Z",
  arrowLeft: "M98 30 L40 30 L40 8 L2 50 L40 92 L40 70 L98 70 Z",
  arrowUp: "M30 98 L30 40 L8 40 L50 2 L92 40 L70 40 L70 98 Z",
  arrowDown: "M30 2 L30 60 L8 60 L50 98 L92 60 L70 60 L70 2 Z",
  chevron: "M2 2 L70 2 L98 50 L70 98 L2 98 L30 50 Z",
  speechBubble: "M4 4 H96 V70 H40 L22 92 L26 70 H4 Z",
  heart: "M50 96 C20 70 2 54 2 32 C2 16 14 6 28 6 C38 6 46 12 50 20 C54 12 62 6 72 6 C86 6 98 16 98 32 C98 54 80 70 50 96 Z",
  cloud: "M30 90 H78 C92 90 98 78 94 68 C98 56 90 46 78 46 C76 30 60 22 46 30 C36 18 14 24 14 42 C4 46 2 62 10 70 C6 82 16 90 30 90 Z",
  plus: "M35 2 H65 V35 H98 V65 H65 V98 H35 V65 H2 V35 H35 Z",
  parallelogram: "M25 2 H98 L75 98 H2 Z",
  trapezoid: "M20 2 H80 L98 98 H2 Z",
  halfCircle: "M2 98 A48 48 0 0 1 98 98 Z",
  ring: "M50 2 A48 48 0 1 0 50 98 A48 48 0 1 0 50 2 Z M50 26 A24 24 0 1 1 50 74 A24 24 0 1 1 50 26 Z",
};

export const SHAPE_LABELS: Record<ShapeKind, string> = {
  rectangle: "Rectangle",
  ellipse: "Ellipse",
  triangle: "Triangle",
  rightTriangle: "Triangle rectangle",
  diamond: "Losange",
  pentagon: "Pentagone",
  hexagon: "Hexagone",
  octagon: "Octogone",
  star: "Étoile",
  arrowRight: "Flèche droite",
  arrowLeft: "Flèche gauche",
  arrowUp: "Flèche haut",
  arrowDown: "Flèche bas",
  chevron: "Chevron",
  speechBubble: "Bulle",
  heart: "Cœur",
  cloud: "Nuage",
  plus: "Croix",
  parallelogram: "Parallélogramme",
  trapezoid: "Trapèze",
  halfCircle: "Demi-cercle",
  ring: "Anneau",
};

export const GRADIENT_PRESETS: { from: string; to: string; angle: number }[] = [
  { from: "#7c3aed", to: "#f97316", angle: 135 },
  { from: "#dc2626", to: "#7c3aed", angle: 135 },
  { from: "#166534", to: "#86efac", angle: 135 },
  { from: "#4338ca", to: "#c4b5fd", angle: 135 },
  { from: "#f97316", to: "#fde68a", angle: 135 },
  { from: "#9a3412", to: "#fdba74", angle: 135 },
  { from: "#fbcfe8", to: "#fef3c7", angle: 135 },
  { from: "#0f172a", to: "#1e3a8a", angle: 160 },
  { from: "#0f766e", to: "#99f6e4", angle: 135 },
  { from: "#111827", to: "#4b5563", angle: 135 },
  { from: "#173b45", to: "#285d68", angle: 135 },
  { from: "#f4f2eb", to: "#ffffff", angle: 180 },
];

export function backgroundCss(background: PageBackground): string {
  if (background.type === "gradient") return `linear-gradient(${background.angle}deg, ${background.from}, ${background.to})`;
  if (background.type === "color") return background.value;
  return background.color;
}

export function patternCss(pattern: BackgroundPattern | undefined): { backgroundImage: string; backgroundSize: string } | null {
  switch (pattern) {
    case "dots":
      return { backgroundImage: "radial-gradient(rgba(0,0,0,0.18) 1.5px, transparent 1.6px)", backgroundSize: "24px 24px" };
    case "grid":
      return { backgroundImage: "linear-gradient(rgba(0,0,0,0.12) 1px, transparent 1px), linear-gradient(90deg, rgba(0,0,0,0.12) 1px, transparent 1px)", backgroundSize: "40px 40px" };
    case "lines":
      return { backgroundImage: "repeating-linear-gradient(135deg, rgba(0,0,0,0.08) 0 2px, transparent 2px 18px)", backgroundSize: "auto" };
    default:
      return null;
  }
}
