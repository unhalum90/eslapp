/**
 * Converts a Genially HTML export into a Studio document.
 *
 * Strategy (PRD §14): preserve the visual source, reconstruct the
 * high-value interactions, and report everything that was dropped.
 * The module only imports types so it can run under `node --test`.
 */
import type {
  AssetKind,
  CanvasElement,
  Id,
  Interaction,
  StudioAction,
  StudioAsset,
  StudioDocument,
  StudioPage,
  TextStyle,
} from "../types";
import type {
  GeniallyAction,
  GeniallyArea,
  GeniallyBox,
  GeniallyData,
  GeniallyElementBase,
  GeniallyImage,
  GeniallyPosition,
  GeniallyRichContent,
  GeniallySlide,
  GeniallyText,
  GeniallyVideo,
} from "./types";

export const SUPPORTED_GENIALLY_VERSION_MAX = 24;
const LOGICAL = { width: 1280, height: 720 };
const SCHEMA_VERSION = 1;

export type ImportSeverity = "info" | "warning" | "error";

export interface ImportIssue {
  severity: ImportSeverity;
  code: string;
  message: string;
  pageId?: Id;
  elementId?: Id;
}

export interface MediaRequest {
  assetId: Id;
  /** Path inside the export folder, e.g. "images/abc.png". */
  zipPath: string;
  kind: AssetKind;
  name: string;
  mime: string;
  /** Embedded SVG is rasterized in the browser before upload. */
  inlineSvg?: string;
}

export interface ImportStats {
  pages: number;
  popupPages: number;
  elements: number;
  hotspots: number;
  tooltips: number;
  navigations: number;
  audio: number;
  externalLinks: number;
  embedsReplaced: number;
  skippedEffects: number;
  skippedElements: number;
}

export interface ConversionResult {
  document: StudioDocument;
  media: MediaRequest[];
  issues: ImportIssue[];
  stats: ImportStats;
  sourceName: string;
}

// ---------------------------------------------------------------------------
// Extraction
// ---------------------------------------------------------------------------

export function extractGeniallyJson(html: string): GeniallyData {
  const match = html.match(/window\.dataBase64\s*=\s*"([A-Za-z0-9+/=]+)"/);
  if (!match) throw new Error("Ce fichier ne contient pas de données Genially (window.dataBase64 introuvable).");
  const json = decodeBase64Utf8(match[1]);
  let data: unknown;
  try {
    data = JSON.parse(json);
  } catch {
    throw new Error("Les données Genially sont illisibles.");
  }
  if (!data || typeof data !== "object" || !Array.isArray((data as GeniallyData).Slides)) {
    throw new Error("Les données Genially n'ont pas la structure attendue (pas de diapositives).");
  }
  return data as GeniallyData;
}

function decodeBase64Utf8(value: string): string {
  if (typeof atob === "function" && typeof TextDecoder !== "undefined") {
    const binary = atob(value);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
    return new TextDecoder("utf-8").decode(bytes);
  }
  // Node fallback (tests)
  const buffer = (globalThis as unknown as { Buffer?: { from: (v: string, e: string) => { toString: (e: string) => string } } }).Buffer;
  if (!buffer) throw new Error("Base64 decoding is not available.");
  return buffer.from(value, "base64").toString("utf8");
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const ALPHABET = "abcdefghijklmnopqrstuvwxyz0123456789";
let counter = 0;
function newId(prefix: string): string {
  counter += 1;
  let body = "";
  for (let i = 0; i < 8; i += 1) body += ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
  return `${prefix}_${body}${counter.toString(36)}`;
}

function safeId(value: string | undefined, prefix: string): string {
  if (value && /^[A-Za-z0-9_-]{1,64}$/.test(value)) return value;
  return newId(prefix);
}

function px(value: string | number | undefined | null, fallback = 0): number {
  if (typeof value === "number") return Number.isFinite(value) ? value : fallback;
  if (typeof value !== "string") return fallback;
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function rotation(value: GeniallyElementBase["Rotation"]): number {
  const raw = value?.Rotatione ?? "";
  const match = /rotate\((-?[\d.]+)deg\)/.exec(raw);
  return match ? Number.parseFloat(match[1]) || 0 : 0;
}

const ENTITIES: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ", hellip: "…", rsquo: "’", lsquo: "‘", ldquo: "“", rdquo: "”", eacute: "é", egrave: "è", agrave: "à", ccedil: "ç", ecirc: "ê", ocirc: "ô", ugrave: "ù", icirc: "î" };

export function htmlToPlainText(html: string | undefined | null): string {
  if (!html) return "";
  let text = html
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|li|h[1-6]|tr)>/gi, "\n")
    .replace(/<li[^>]*>/gi, "• ")
    .replace(/<[^>]+>/g, "");
  text = text.replace(/&(#x?[0-9a-f]+|[a-z]+);/gi, (whole, entity: string) => {
    if (entity[0] === "#") {
      const code = entity[1].toLowerCase() === "x" ? Number.parseInt(entity.slice(2), 16) : Number.parseInt(entity.slice(1), 10);
      return Number.isFinite(code) ? String.fromCodePoint(code) : whole;
    }
    return ENTITIES[entity.toLowerCase()] ?? whole;
  });
  return text.replace(/[ \t]+\n/g, "\n").replace(/\n{3,}/g, "\n\n").replace(/ /g, " ").trim();
}

function firstImageSource(html: string | undefined): string | null {
  const match = /<img[^>]+src=["']([^"']+)["']/i.exec(html ?? "");
  return match ? match[1] : null;
}

function normalizeRelativePath(source: string): string {
  return source.replace(/^\.\//, "").replace(/^\//, "").split("?")[0];
}

function isLocalMedia(source: string | undefined | null): source is string {
  return typeof source === "string" && /^\.?\/?(images|audios|videos)\//.test(source);
}

function mimeFor(path: string, kind: AssetKind): string {
  const ext = path.split(".").pop()?.toLowerCase() ?? "";
  const map: Record<string, string> = { png: "image/png", jpg: "image/jpeg", jpeg: "image/jpeg", webp: "image/webp", gif: "image/gif", svg: "image/svg+xml", mp3: "audio/mpeg", mpga: "audio/mpeg", wav: "audio/wav", ogg: "audio/ogg", m4a: "audio/mp4", aac: "audio/aac" };
  return map[ext] ?? (kind === "image" ? "image/png" : "audio/mpeg");
}

function normalizeUrl(value: string | undefined | null): string | null {
  if (!value) return null;
  let url = value.trim();
  const youtu = /^https?:\/\/youtu\.be\/([A-Za-z0-9_-]+)/.exec(url);
  if (youtu) url = `https://www.youtube.com/watch?v=${youtu[1]}`;
  if (!/^https:\/\//i.test(url)) return null;
  try {
    return new URL(url).toString();
  } catch {
    return null;
  }
}

function iframeSource(html: string | undefined): string | null {
  const match = /<iframe[^>]+src=["']([^"']+)["']/i.exec(html ?? "");
  return match ? match[1] : null;
}

function colorOf(value: string | undefined | null, palette: Record<string, string>, fallback: string, seen = new Set<string>()): string {
  if (typeof value !== "string") return fallback;
  const raw = value.trim().replace(/\s*!important\s*$/i, "");
  const variable = /^var\(\s*--genially-([a-z0-9_-]+)\s*(?:,\s*([\s\S]+))?\)$/i.exec(raw);
  if (variable) {
    const key = variable[1].toLowerCase();
    if (seen.has(key)) return fallback;
    const next = new Set(seen).add(key);
    const mapped = Object.entries(palette).find(([name]) => name.toLowerCase() === key)?.[1];
    const variableFallback = colorOf(variable[2], palette, fallback, next);
    return colorOf(mapped, palette, variableFallback, next);
  }
  if (/^#(?:[0-9a-f]{3}|[0-9a-f]{4}|[0-9a-f]{6}|[0-9a-f]{8})$/i.test(raw)) return raw;
  if (/^rgba?\([\d.,%+\-\s/]{1,40}\)$/i.test(raw)) return raw;
  // Convert HSL because the Studio's persisted colour schema uses RGB/hex.
  const hsl = /^hsla?\(\s*(-?[\d.]+)(?:deg)?[\s,]+([\d.]+)%[\s,]+([\d.]+)%(?:\s*[,/]\s*([\d.]+%?))?\s*\)$/i.exec(raw);
  if (hsl) {
    const hue = ((Number(hsl[1]) % 360) + 360) % 360 / 30;
    const saturation = Math.min(100, Number(hsl[2])) / 100;
    const lightness = Math.min(100, Number(hsl[3])) / 100;
    const amplitude = saturation * Math.min(lightness, 1 - lightness);
    const channel = (offset: number) => {
      const k = (offset + hue) % 12;
      return Math.round(255 * (lightness - amplitude * Math.max(-1, Math.min(k - 3, 9 - k, 1))));
    };
    const alpha = hsl[4] ? Math.min(1, Number.parseFloat(hsl[4]) / (hsl[4].endsWith("%") ? 100 : 1)) : 1;
    return `rgba(${channel(0)}, ${channel(8)}, ${channel(4)}, ${alpha})`;
  }
  const named = new Set("transparent black silver gray grey white maroon red purple fuchsia green lime olive yellow navy blue teal aqua orange pink brown coral gold indigo violet beige ivory lavender rebeccapurple lightblue lightgray lightgrey darkblue darkgreen darkgray darkgrey whitesmoke aliceblue crimson salmon tomato turquoise steelblue royalblue dodgerblue seagreen darkslategray midnightblue slategray gainsboro lightyellow lightgreen peachpuff papayawhip wheat khaki moccasin linen snow mintcream honeydew azure".split(" "));
  return named.has(raw.toLowerCase()) ? raw.toLowerCase() : fallback;
}

function cssProperty(html: string, property: string): string | null {
  // Match declarations only: `color` must never match `background-color`.
  let result: string | null = null;
  for (const style of html.matchAll(/\bstyle\s*=\s*(["'])([\s\S]*?)\1/gi)) {
    for (const declaration of style[2].split(";")) {
      const separator = declaration.indexOf(":");
      if (separator < 0 || declaration.slice(0, separator).trim().toLowerCase() !== property) continue;
      result = declaration.slice(separator + 1).trim();
    }
    if (result) return result;
  }
  return result;
}

function backgroundOf(item: { Background?: string | null; BackgroundColor?: string | null }, palette: Record<string, string>, html = ""): string {
  return colorOf(cssProperty(html, "background-color"), palette,
    colorOf(cssProperty(html, "background"), palette,
      colorOf(item.BackgroundColor, palette, colorOf(item.Background, palette, ""))));
}

// ---------------------------------------------------------------------------
// Conversion
// ---------------------------------------------------------------------------

interface Ctx {
  scale: number;
  palette: Record<string, string>;
  actions: Record<string, GeniallyAction>;
  slideToPage: Map<string, Id>;
  elementIds: Set<Id>;
  popupOpeners: Map<Id, Id>;
  media: MediaRequest[];
  mediaByPath: Map<string, Id>;
  assets: Record<Id, StudioAsset>;
  issues: ImportIssue[];
  stats: ImportStats;
}

export function convertGenially(data: GeniallyData): ConversionResult {
  const version = typeof data.version === "number" ? data.version : 0;
  const issues: ImportIssue[] = [];
  if (version > SUPPORTED_GENIALLY_VERSION_MAX) {
    issues.push({ severity: "warning", code: "version", message: `Export Genially version ${version} : plus récent que la version testée (${SUPPORTED_GENIALLY_VERSION_MAX}). L'import est tenté quand même, vérifiez le résultat.` });
  }
  const slides = [...(data.Slides ?? [])].sort((a, b) => (a.Order ?? 0) - (b.Order ?? 0));
  if (slides.length === 0) throw new Error("Aucune diapositive dans cet export.");
  const slideWidth = px(slides[0].Size?.Width, 1200) || 1200;
  const slideHeight = px(slides[0].Size?.Height, 675) || 675;
  const scale = Math.min(LOGICAL.width / slideWidth, LOGICAL.height / slideHeight);

  const ctx: Ctx = {
    scale,
    palette: data.DocumentConfig?.colors ?? {},
    actions: data.interactivityActions ?? {},
    slideToPage: new Map(),
    elementIds: new Set(),
    popupOpeners: new Map(),
    media: [],
    mediaByPath: new Map(),
    assets: {},
    issues,
    stats: { pages: 0, popupPages: 0, elements: 0, hotspots: 0, tooltips: 0, navigations: 0, audio: 0, externalLinks: 0, embedsReplaced: 0, skippedEffects: 0, skippedElements: 0 },
  };

  for (const slide of slides) ctx.slideToPage.set(slide.Id, safeId(slide.Id, "page"));

  const collections: { items: GeniallyElementBase[]; kind: "text" | "image" | "area" | "video" | "rich" | "svg" }[] = [
    { items: data.Texts ?? [], kind: "text" },
    { items: data.Images ?? [], kind: "image" },
    { items: data.Svgs ?? [], kind: "svg" },
    { items: data.Areas ?? [], kind: "area" },
    { items: data.Videos ?? [], kind: "video" },
    { items: data.RichContents ?? [], kind: "rich" },
  ];
  for (const { items } of collections) for (const item of items) ctx.elementIds.add(safeId(item.Id, "el"));

  // Pre-pass: which page opens which popup (for closeSlidePopup).
  for (const { items } of collections) {
    for (const item of items) {
      const pageId = ctx.slideToPage.get(item.IdSlide);
      if (!pageId) continue;
      for (const actionRef of Object.values(item.interactivities ?? {})) {
        for (const action of resolveActionTree(ctx, actionRef)) {
          if (action.type === "slidePopup" && action.targetSlideId) {
            const target = ctx.slideToPage.get(action.targetSlideId);
            if (target && !ctx.popupOpeners.has(target)) ctx.popupOpeners.set(target, pageId);
          }
        }
      }
    }
  }

  const unsupported: [string, GeniallyElementBase[] | undefined][] = [["Groups", data.Groups], ["Pins", data.Pins], ["Arrows", data.Arrows], ["Charts", data.Charts], ["BaseWidgets", data.BaseWidgets], ["Activities", data.Activities], ["Audios", data.Audios]];
  for (const [name, list] of unsupported) {
    if (list && list.length) {
      ctx.stats.skippedElements += list.length;
      issues.push({ severity: "warning", code: "unsupported-collection", message: `${list.length} élément(s) « ${name} » ignoré(s) : ce type n'est pas pris en charge par le Studio.` });
    }
  }

  const pages: StudioPage[] = [];
  slides.forEach((slide, index) => {
    const pageId = ctx.slideToPage.get(slide.Id)!;
    const page: StudioPage = {
      id: pageId,
      name: cleanSlideName(slide.Name, index),
      hiddenFromNavigation: Boolean(slide.Hidden || slide.Popup),
      background: pageBackground(ctx, slide, pageId),
      notes: "",
      elements: [],
    };
    if (slide.Popup) ctx.stats.popupPages += 1;

    const backgroundElement = convertSlideBackground(ctx, slide, pageId, index);
    if (backgroundElement) page.elements.push(backgroundElement);

    const slideElements: { z: number; order: number; element: CanvasElement }[] = [];
    let order = 0;
    for (const { items, kind } of collections) {
      for (const item of items) {
        if (item.IdSlide !== slide.Id) continue;
        order += 1;
        const element = convertElement(ctx, item, kind, pageId, order);
        if (element) slideElements.push({ z: item.ZIndex ?? 0, order, element });
      }
    }
    slideElements.sort((a, b) => a.z - b.z || a.order - b.order);
    for (const entry of slideElements) page.elements.push(entry.element);

    if (slide.Popup) {
      const opener = ctx.popupOpeners.get(pageId);
      page.elements.push(makeHotspot(ctx, { id: newId("el"), name: "Retour", label: "Back", frame: { x: LOGICAL.width - 196, y: 16, width: 180, height: 56, rotation: 0 }, icon: "arrow", transparent: false, actions: [{ type: "navigate", target: opener ?? "previous" }] }));
    }

    page.elements.forEach((element, readingIndex) => {
      element.accessibility.readingOrder = readingIndex;
    });
    const byPosition = [...page.elements].sort((a, b) => a.frame.y - b.frame.y || a.frame.x - b.frame.x);
    byPosition.forEach((element, readingIndex) => {
      element.accessibility.readingOrder = readingIndex;
    });

    pages.push(page);
    ctx.stats.pages += 1;
    ctx.stats.elements += page.elements.length;
  });

  const imagesWithoutAlt = pages.reduce((count, page) => count + page.elements.filter((element) => element.content.type === "image" && !element.accessibility.decorative).length, 0);
  if (imagesWithoutAlt) {
    issues.push({ severity: "info", code: "alt-needed", message: `${imagesWithoutAlt} image(s) importée(s) sans texte alternatif. Ajoutez-en pour la version texte et les lecteurs d'écran.` });
  }
  if (ctx.stats.skippedEffects) {
    issues.push({ severity: "info", code: "effects-skipped", message: `${ctx.stats.skippedEffects} effet(s) (zoom, animations) ignoré(s) : le Studio n'anime pas les éléments.` });
  }

  const title = (data.Genially?.Name ?? "").trim() || "Import Genially";
  const document: StudioDocument = {
    schemaVersion: SCHEMA_VERSION,
    id: newId("doc"),
    title: title.slice(0, 200),
    level: null,
    logicalSize: { ...LOGICAL },
    settings: {
      navigationMode: data.Genially?.SettingGenially?.ShowPage === false ? "exploration" : "linear",
      showInteractiveHints: true,
      instructions: "",
      completionMessage: "Well done! You finished the activity.",
      contentLanguage: "en",
    },
    pages,
    assets: ctx.assets,
  };

  return { document, media: ctx.media, issues, stats: ctx.stats, sourceName: title };
}

/** Genially auto-names slides "2", "2 Copy", "2 Copy Copy"; those become "Page n". */
function cleanSlideName(raw: string | null | undefined, index: number): string {
  const name = (raw ?? "").trim();
  if (!name || /^\d+(\s+copy)*$/i.test(name) || /^(copy)(\s+copy)*$/i.test(name)) return `Page ${index + 1}`;
  return name.slice(0, 200);
}

// ---------------------------------------------------------------------------
// Elements
// ---------------------------------------------------------------------------

function frameOf(ctx: Ctx, size: GeniallyBox | undefined, position: GeniallyPosition | undefined, rot: GeniallyElementBase["Rotation"]) {
  const width = Math.max(8, Math.round(px(size?.Width, 100) * ctx.scale));
  const height = Math.max(8, Math.round(px(size?.Height, 60) * ctx.scale));
  return {
    x: Math.round(px(position?.PositionLeft) * ctx.scale),
    y: Math.round(px(position?.PositionTop) * ctx.scale),
    width,
    height,
    rotation: rotation(rot),
  };
}

function baseElement(ctx: Ctx, item: GeniallyElementBase, name: string): Omit<CanvasElement, "content"> {
  return {
    id: safeId(item.Id, "el"),
    name,
    frame: frameOf(ctx, item.Size, item.Position, item.Rotation),
    opacity: Math.max(0, Math.min(1, px(item.Opacity, 1))),
    lockedInEditor: false,
    initiallyVisible: !item.IsHidden,
    interactions: [],
    accessibility: { label: "", readingOrder: 0, decorative: false },
  };
}

function requestMedia(ctx: Ctx, source: string, kind: AssetKind): Id {
  const zipPath = normalizeRelativePath(source);
  const existing = ctx.mediaByPath.get(zipPath);
  if (existing) return existing;
  const assetId = newId("asset");
  let name = zipPath.split("/").pop() ?? zipPath;
  try { name = decodeURIComponent(name); } catch { /* Keep malformed export filenames usable. */ }
  name = name.slice(0, 200);
  const mime = mimeFor(zipPath, kind);
  ctx.media.push({ assetId, zipPath, kind, name, mime });
  ctx.mediaByPath.set(zipPath, assetId);
  ctx.assets[assetId] = { id: assetId, kind, name, mime, bytes: 0, path: "" };
  return assetId;
}

function pageBackground(ctx: Ctx, slide: GeniallySlide, pageId: Id): StudioPage["background"] {
  const raw = slide.BackgroundColor || (!isLocalMedia(slide.Background) && !/^https?:/i.test(slide.Background ?? "") ? slide.Background : null);
  const solid = colorOf(raw, ctx.palette, "");
  if (solid) return { type: "color", value: solid };
  // Split only top-level commas so rgb() and palette fallbacks stay intact.
  const gradient = /^linear-gradient\(([\s\S]+)\)$/i.exec(raw?.trim() ?? "");
  if (gradient) {
    const parts: string[] = [];
    let depth = 0, start = 0;
    for (let i = 0; i < gradient[1].length; i += 1) {
      const char = gradient[1][i];
      if (char === "(") depth += 1;
      if (char === ")") depth -= 1;
      if (char === "," && depth === 0) { parts.push(gradient[1].slice(start, i).trim()); start = i + 1; }
    }
    parts.push(gradient[1].slice(start).trim());
    let angle = 180;
    const directions: Record<string, number> = { "to top": 0, "to right": 90, "to bottom": 180, "to left": 270, "to top right": 45, "to bottom right": 135, "to bottom left": 225, "to top left": 315 };
    if (/^-?[\d.]+deg$/i.test(parts[0])) angle = ((Number.parseFloat(parts.shift()!) % 360) + 360) % 360;
    else if (parts[0] in directions) angle = directions[parts.shift()!];
    const from = colorOf(parts[0]?.replace(/\s+0%$/, ""), ctx.palette, "");
    const to = colorOf(parts[1]?.replace(/\s+100%$/, ""), ctx.palette, "");
    if (parts.length === 2 && from && to) return { type: "gradient", from, to, angle };
  }
  if (raw) ctx.issues.push({ severity: "warning", code: "background-style", message: "Fond non pris en charge (couleur ou dégradé complexe) : vérifiez cette page après l’import.", pageId });
  return { type: "color", value: colorOf(slide.Background, ctx.palette, "#ffffff") };
}

function convertSvg(ctx: Ctx, item: GeniallyImage, pageId: Id, name: string): CanvasElement | null {
  let source = item.Source?.trim() ?? "";
  if (isLocalMedia(source || null)) return convertImage(ctx, item, pageId, name);
  if (/^data:image\/svg\+xml[;,]/i.test(source)) {
    try {
      const comma = source.indexOf(",");
      source = /;base64$/i.test(source.slice(0, comma)) ? decodeBase64Utf8(source.slice(comma + 1)) : decodeURIComponent(source.slice(comma + 1));
    } catch { source = ""; }
  }
  if (/^<svg[\s>]/i.test(source) && /<\/svg>\s*$/i.test(source) && source.length <= 1_000_000) {
    // Palette substitutions are limited to colour values, never arbitrary markup.
    source = source.replace(/var\(\s*--genially-[a-z0-9_-]+(?:\s*,\s*[^()]+)?\s*\)/gi, value => colorOf(value, ctx.palette, "transparent"));
    const assetId = newId("asset");
    const filename = `${item.Id}.svg`;
    ctx.assets[assetId] = { id: assetId, kind: "image", name: filename, mime: "image/svg+xml", bytes: 0, path: "" };
    ctx.media.push({ assetId, zipPath: "", kind: "image", name: filename, mime: "image/svg+xml", inlineSvg: source });
    const element: CanvasElement = { ...baseElement(ctx, item, name), content: { type: "image", assetId, alt: "", fit: "fill", radius: 0 } };
    element.interactions = convertInteractions(ctx, item, pageId, element.id, name);
    element.accessibility.decorative = element.interactions.length === 0;
    return element;
  }
  ctx.stats.skippedElements += 1;
  ctx.issues.push({ severity: "warning", code: "svg-skipped", message: `« ${name} » : forme SVG sans source locale ou intégrée reconnue.`, pageId });
  return null;
}

function convertSlideBackground(ctx: Ctx, slide: GeniallySlide, pageId: Id, index: number): CanvasElement | null {
  const source = slide.Background;
  if (!source) return null;
  if (!isLocalMedia(source)) {
    if (/^https?:\/\//.test(source)) {
      ctx.issues.push({ severity: "warning", code: "remote-background", message: `Page ${index + 1} : le fond est une image distante qui ne peut pas être importée.`, pageId });
    }
    return null;
  }
  const assetId = requestMedia(ctx, source, "image");
  const frame = frameOf(ctx, slide.SizeBackground ?? slide.Size, slide.PositionBackground, null);
  return {
    id: newId("el"),
    name: "Fond",
    frame,
    opacity: 1,
    lockedInEditor: true,
    initiallyVisible: true,
    content: { type: "image", assetId, alt: "", fit: "fill", radius: 0 },
    interactions: [],
    accessibility: { label: "", readingOrder: 0, decorative: true },
  };
}

function convertElement(ctx: Ctx, item: GeniallyElementBase, kind: "text" | "image" | "area" | "video" | "rich" | "svg", pageId: Id, order: number): CanvasElement | null {
  const layerName = (item.LayerTitle ?? item.Name ?? "").trim();
  switch (kind) {
    case "svg":
      return convertSvg(ctx, item as GeniallyImage, pageId, layerName || `Forme ${order}`);
    case "text":
      return convertText(ctx, item as GeniallyText, pageId, layerName || `Texte ${order}`);
    case "image":
      return convertImage(ctx, item as GeniallyImage, pageId, layerName || `Image ${order}`);
    case "area":
      return convertArea(ctx, item as GeniallyArea, pageId, layerName || `Zone ${order}`);
    case "video":
      return convertVideo(ctx, item as GeniallyVideo, pageId, layerName || `Vidéo ${order}`);
    case "rich":
      return convertRichContent(ctx, item as GeniallyRichContent, pageId, layerName || `Contenu ${order}`);
  }
}

function convertText(ctx: Ctx, item: GeniallyText, pageId: Id, name: string): CanvasElement | null {
  const html = item.TextMessage ?? "";
  const text = htmlToPlainText(html);
  const background = backgroundOf(item, ctx.palette, html);
  if (!text && !background) return null;
  const inlineColor = cssProperty(html, "color");
  const align = (cssProperty(html, "text-align") ?? "left").toLowerCase();
  const style: TextStyle = {
    fontSize: Math.max(8, Math.round(px(item.FontSize, 24) * ctx.scale)),
    bold: /font-weight:\s*(bold|[6-9]00)/i.test(html) || /^title/i.test(item.BrandStyle ?? "") || /<(b|strong)[\s>]/i.test(html),
    italic: /font-style:\s*italic/i.test(html) || /<(i|em)[\s>]/i.test(html),
    align: align === "center" || align === "right" ? align : "left",
    color: colorOf(inlineColor, ctx.palette, colorOf(item.Color, ctx.palette, "#18282b")),
    background: background || null,
    padding: Math.round(px(item.Padding, 0) * ctx.scale),
    radius: 0,
  };
  const element: CanvasElement = { ...baseElement(ctx, item, name), content: { type: "text", text: text.slice(0, 4000), style } };
  element.interactions = convertInteractions(ctx, item, pageId, element.id, name);
  return element;
}

function convertImage(ctx: Ctx, item: GeniallyImage, pageId: Id, name: string): CanvasElement | null {
  if (!isLocalMedia(item.Source)) {
    ctx.stats.skippedElements += 1;
    ctx.issues.push({ severity: "warning", code: "remote-image", message: `« ${name} » : image distante non importée (${(item.Source ?? "").slice(0, 60)}).`, pageId });
    return null;
  }
  const assetId = requestMedia(ctx, item.Source, "image");
  if (item.Transformations?.flip?.x || item.Transformations?.flip?.y || item.Transformations?.innerRotation) {
    ctx.issues.push({ severity: "info", code: "image-transform", message: `« ${name} » : retournement ou rotation interne ignoré.`, pageId, elementId: safeId(item.Id, "el") });
  }
  const element: CanvasElement = { ...baseElement(ctx, item, name), content: { type: "image", assetId, alt: "", fit: "fill", radius: 0 } };
  element.interactions = convertInteractions(ctx, item, pageId, element.id, name);
  return element;
}

function convertArea(ctx: Ctx, item: GeniallyArea, pageId: Id, name: string): CanvasElement | null {
  const interactions = convertInteractions(ctx, item, pageId, safeId(item.Id, "el"), name);
  const fill = backgroundOf(item, ctx.palette);
  if (fill && fill !== "transparent") {
    return {
      ...baseElement(ctx, item, name),
      content: { type: "shape", shape: "rectangle", fill, stroke: "transparent", strokeWidth: 0, radius: 0 },
      interactions,
      accessibility: { label: "", readingOrder: 0, decorative: interactions.length === 0 },
    };
  }
  if (interactions.length === 0) {
    ctx.stats.skippedElements += 1;
    return null;
  }
  const element = makeHotspot(ctx, { id: safeId(item.Id, "el"), name, label: name, frame: frameOf(ctx, item.Size, item.Position, item.Rotation), icon: "none", transparent: true, actions: [] });
  element.interactions = interactions;
  element.initiallyVisible = !item.IsHidden;
  element.opacity = Math.max(0, Math.min(1, px(item.Opacity, 1)));
  ctx.issues.push({ severity: "info", code: "label-generic", message: `Zone « ${name} » : donnez-lui une étiquette parlante (onglet Contenu).`, pageId, elementId: element.id });
  return element;
}

function convertVideo(ctx: Ctx, item: GeniallyVideo, pageId: Id, name: string): CanvasElement | null {
  const url = normalizeUrl(item.Source);
  const id = safeId(item.Id, "el");
  if (!url) {
    ctx.stats.skippedElements += 1;
    ctx.issues.push({ severity: "warning", code: "video-skipped", message: `« ${name} » : vidéo ignorée (source non reconnue).`, pageId });
    return null;
  }
  ctx.stats.externalLinks += 1;
  ctx.stats.embedsReplaced += 1;
  ctx.issues.push({ severity: "warning", code: "video-replaced", message: `« ${name} » : la vidéo intégrée devient un bouton qui ouvre ${url} dans un nouvel onglet.`, pageId, elementId: id });
  const element = makeHotspot(ctx, { id, name, label: "Video", frame: frameOf(ctx, item.Size, item.Position, item.Rotation), icon: "arrow", transparent: false, actions: [{ type: "externalLink", url }] });
  element.initiallyVisible = !item.IsHidden;
  return element;
}

function convertRichContent(ctx: Ctx, item: GeniallyRichContent, pageId: Id, name: string): CanvasElement | null {
  const source = iframeSource(item.Source) ?? item.Source ?? "";
  const url = normalizeUrl(source);
  const id = safeId(item.Id, "el");
  const isDrive = /drive\.google\.com/.test(source);
  if (!url) {
    ctx.stats.skippedElements += 1;
    ctx.issues.push({ severity: "warning", code: "embed-skipped", message: `« ${name} » : contenu intégré ignoré (pas de lien https).`, pageId });
    return null;
  }
  ctx.stats.embedsReplaced += 1;
  ctx.stats.externalLinks += 1;
  ctx.issues.push({
    severity: "warning",
    code: isDrive ? "drive-embed" : "embed-replaced",
    message: isDrive
      ? `« ${name} » : lecteur Google Drive remplacé par un lien externe. Pour une lecture intégrée, importez le fichier audio dans Médias et ajoutez une action « Audio » à cette zone.`
      : `« ${name} » : contenu intégré remplacé par un lien externe (${url.slice(0, 60)}).`,
    pageId,
    elementId: id,
  });
  const element = makeHotspot(ctx, { id, name, label: isDrive ? "Audio" : "Link", frame: frameOf(ctx, item.Size, item.Position, item.Rotation), icon: isDrive ? "audio" : "info", transparent: false, actions: [{ type: "externalLink", url }] });
  element.initiallyVisible = !item.IsHidden;
  return element;
}

function makeHotspot(ctx: Ctx, input: { id: Id; name: string; label: string; frame: CanvasElement["frame"]; icon: "none" | "arrow" | "info" | "audio"; transparent: boolean; actions: StudioAction[] }): CanvasElement {
  ctx.stats.hotspots += 1;
  return {
    id: input.id,
    name: input.name,
    frame: input.frame,
    opacity: 1,
    lockedInEditor: false,
    initiallyVisible: true,
    content: { type: "hotspot", label: input.label, icon: input.icon, number: null, color: input.transparent ? "#d45b3f" : "#285d68", showHint: true, transparent: input.transparent },
    interactions: input.actions.length ? [{ id: newId("ix"), trigger: "activate", actions: input.actions }] : [],
    accessibility: { label: "", readingOrder: 0, decorative: false },
  };
}

// ---------------------------------------------------------------------------
// Interactions
// ---------------------------------------------------------------------------

function resolveActionTree(ctx: Ctx, ref: string | string[] | GeniallyAction | undefined, depth = 0): GeniallyAction[] {
  if (!ref || depth > 6) return [];
  if (Array.isArray(ref)) return ref.flatMap((entry) => resolveActionTree(ctx, entry, depth + 1));
  const action = typeof ref === "string" ? ctx.actions[ref] : ref;
  if (!action || typeof action !== "object") return [];
  if (action.type === "parallel" || action.type === "sequence") {
    return (action.interactivityActions ?? []).flatMap((entry) => resolveActionTree(ctx, entry, depth + 1));
  }
  return [action];
}

function convertInteractions(ctx: Ctx, item: GeniallyElementBase, pageId: Id, elementId: Id, displayName?: string): Interaction[] {
  const interactions: Interaction[] = [];
  const entries = Object.entries(item.interactivities ?? {});
  for (const [event, ref] of entries) {
    const actions = resolveActionTree(ctx, ref).flatMap((action) => convertAction(ctx, action, pageId, elementId));
    if (actions.length === 0) continue;
    if (event === "hover") {
      const essential = actions.some((action) => action.type === "navigate" || action.type === "externalLink" || action.type === "modal");
      interactions.push({ id: newId("ix"), trigger: "activate", actions });
      if (!essential) interactions.push({ id: newId("ix"), trigger: "hoverOrFocus", actions: actions.filter((action) => action.type === "tooltip") });
      ctx.issues.push({ severity: "info", code: "hover-converted", message: `« ${displayName || item.LayerTitle || item.Name || elementId} » : l'interaction au survol est aussi déclenchée au clic (tablettes et clavier).`, pageId, elementId });
    } else {
      interactions.push({ id: newId("ix"), trigger: "activate", actions });
    }
  }
  return interactions.filter((interaction) => interaction.actions.length > 0).slice(0, 4);
}

function convertAction(ctx: Ctx, action: GeniallyAction, pageId: Id, elementId: Id): StudioAction[] {
  switch (action.type) {
    case "goToSlide": {
      const target = action.target?.slideId ? ctx.slideToPage.get(action.target.slideId) : undefined;
      if (!target) {
        ctx.issues.push({ severity: "warning", code: "nav-missing", message: "Un lien vers une diapositive inexistante a été ignoré.", pageId, elementId });
        return [];
      }
      ctx.stats.navigations += 1;
      return [{ type: "navigate", target }];
    }
    case "slidePopup": {
      const target = action.targetSlideId ? ctx.slideToPage.get(action.targetSlideId) : undefined;
      if (!target) return [];
      ctx.stats.navigations += 1;
      return [{ type: "navigate", target }];
    }
    case "closeSlidePopup": {
      const opener = ctx.popupOpeners.get(pageId);
      return [{ type: "navigate", target: opener ?? "previous" }];
    }
    case "htmlTooltip": {
      const text = htmlToPlainText(action.html);
      const image = firstImageSource(action.html);
      const imageAssetId = image && isLocalMedia(image) ? requestMedia(ctx, image, "image") : null;
      if (!text && !imageAssetId) return [];
      ctx.stats.tooltips += 1;
      return [{ type: "tooltip", text: text.slice(0, 4000), imageAssetId, audioAssetId: null }];
    }
    case "playAudio": {
      if (!isLocalMedia(action.source)) {
        ctx.issues.push({ severity: "warning", code: "audio-remote", message: `Audio « ${action.name ?? ""} » non importé (source distante).`, pageId, elementId });
        return [];
      }
      const assetId = requestMedia(ctx, action.source, "audio");
      if (action.name) ctx.assets[assetId].name = action.name.slice(0, 200);
      ctx.stats.audio += 1;
      ctx.issues.push({ severity: "info", code: "transcript-needed", message: `Audio « ${action.name ?? "audio"} » importé : ajoutez une transcription (étiquette ou lecteur audio).`, pageId, elementId });
      return [{ type: "playAudio", assetId }];
    }
    case "openLink": {
      const url = normalizeUrl(action.link);
      if (!url) {
        ctx.issues.push({ severity: "warning", code: "link-skipped", message: `Lien ignoré (seul https est accepté) : ${(action.link ?? "").slice(0, 60)}`, pageId, elementId });
        return [];
      }
      ctx.stats.externalLinks += 1;
      return [{ type: "externalLink", url }];
    }
    case "showElements": {
      const targets = (action.stagedAnimations?.animations ?? []).map((animation) => animation.targetItemId).filter((id): id is string => Boolean(id) && ctx.elementIds.has(id!));
      if (targets.length === 0) {
        ctx.stats.skippedEffects += 1;
        return [];
      }
      return [{ type: "setVisibility", elementIds: targets, mode: "show" }];
    }
    case "hideElements": {
      const targets = (action.stagedAnimations?.animations ?? []).map((animation) => animation.targetItemId).filter((id): id is string => Boolean(id) && ctx.elementIds.has(id!));
      return targets.length ? [{ type: "setVisibility", elementIds: targets, mode: "hide" }] : [];
    }
    case "zoom":
    case "playAnimation":
    case "playStagedAnimations":
      ctx.stats.skippedEffects += 1;
      return [];
    default:
      ctx.stats.skippedEffects += 1;
      ctx.issues.push({ severity: "info", code: "action-skipped", message: `Action Genially « ${action.type} » non prise en charge, ignorée.`, pageId, elementId });
      return [];
  }
}
