import { z } from "zod";
import { SHAPE_KINDS, STUDIO_LIMITS, STUDIO_SCHEMA_VERSION, type StudioDocument } from "./types";

const id = z.string().min(1).max(64).regex(/^[A-Za-z0-9_-]+$/);
const shortText = z.string().max(STUDIO_LIMITS.maxLabelLength);
const longText = z.string().max(STUDIO_LIMITS.maxTextLength);
const color = z.string().max(64).regex(/^(#[0-9a-fA-F]{3,8}|rgba?\([^)]{0,40}\)|transparent|[a-zA-Z]{3,24})$/);
const finite = z.number().finite();
const coord = finite.min(-20000).max(20000);
const size = finite.min(1).max(20000);

const textStyle = z.object({
  fontSize: finite.min(8).max(200),
  bold: z.boolean(),
  italic: z.boolean(),
  align: z.enum(["left", "center", "right"]),
  color,
  background: color.nullable(),
  padding: finite.min(0).max(200),
  radius: finite.min(0).max(400),
  fontFamily: z.enum(["sans", "serif", "rounded", "mono", "hand", "display"]).optional(),
  shadow: z.boolean().optional(),
  lineHeight: finite.min(0.8).max(3).optional(),
  verticalAlign: z.enum(["top", "middle", "bottom"]).optional(),
});

const httpsUrl = z
  .string()
  .max(2048)
  .refine((value) => {
    try {
      const url = new URL(value);
      return url.protocol === "https:";
    } catch {
      return false;
    }
  }, "Seuls les liens https:// sont acceptés.");

const action = z.discriminatedUnion("type", [
  z.object({ type: z.literal("tooltip"), text: longText, imageAssetId: id.nullable(), audioAssetId: id.nullable() }),
  z.object({
    type: z.literal("modal"),
    title: shortText,
    text: longText,
    size: z.enum(["small", "medium", "large"]),
    imageAssetId: id.nullable(),
    audioAssetId: id.nullable(),
  }),
  z.object({ type: z.literal("navigate"), target: z.union([id, z.literal("next"), z.literal("previous")]) }),
  z.object({ type: z.literal("playAudio"), assetId: id.nullable() }),
  z.object({ type: z.literal("stopAudio") }),
  z.object({ type: z.literal("setVisibility"), elementIds: z.array(id).max(50), mode: z.enum(["show", "hide", "toggle"]) }),
  z.object({ type: z.literal("externalLink"), url: httpsUrl }),
]);

const actions = z.array(action).max(STUDIO_LIMITS.maxActionsPerInteraction);

const interaction = z.object({
  id,
  trigger: z.enum(["activate", "hoverOrFocus"]),
  actions,
});

const content = z.discriminatedUnion("type", [
  z.object({ type: z.literal("text"), text: longText, style: textStyle }),
  z.object({
    type: z.literal("image"),
    assetId: id.nullable(),
    alt: shortText,
    fit: z.enum(["contain", "cover", "fill"]),
    radius: finite.min(0).max(400),
  }),
  z.object({
    type: z.literal("shape"),
    shape: z.enum(SHAPE_KINDS as [string, ...string[]]),
    fill: color,
    stroke: color,
    strokeWidth: finite.min(0).max(60),
    radius: finite.min(0).max(400),
    shadow: z.boolean().optional(),
  }),
  z.object({
    type: z.literal("icon"),
    name: z.string().min(1).max(64).regex(/^[A-Za-z0-9]+$/),
    color,
    background: color.nullable(),
    backgroundShape: z.enum(["circle", "rounded", "none"]),
    strokeWidth: finite.min(0.5).max(4),
  }),
  z.object({
    type: z.literal("button"),
    label: shortText,
    variant: z.enum(["filled", "outline", "soft"]),
    shape: z.enum(["pill", "rounded", "square"]),
    color,
    textColor: color,
    fontSize: finite.min(8).max(120),
    icon: z.string().max(64).regex(/^[A-Za-z0-9]*$/).nullable(),
  }),
  z.object({
    type: z.literal("line"),
    stroke: color,
    strokeWidth: finite.min(1).max(60),
    dash: z.enum(["solid", "dashed", "dotted"]),
    startArrow: z.boolean(),
    endArrow: z.boolean(),
  }),
  z.object({
    type: z.literal("hotspot"),
    label: shortText,
    icon: z.enum(["audio", "info", "question", "pin", "eye", "arrow", "star", "number", "none"]),
    number: z.number().int().min(0).max(99).nullable(),
    color,
    showHint: z.boolean(),
    transparent: z.boolean(),
  }),
  z.object({
    type: z.literal("audio"),
    assetId: id.nullable(),
    label: shortText,
    transcript: longText,
    showTranscript: z.boolean(),
  }),
  z.object({
    type: z.literal("singleChoice"),
    prompt: longText,
    options: z.array(z.object({ id, label: shortText })).min(1).max(STUDIO_LIMITS.maxOptions),
    correctOptionId: id,
    correctFeedback: longText,
    retryFeedback: longText,
    allowRetry: z.boolean(),
    onCorrect: actions,
  }),
]);

const element = z.object({
  id,
  name: shortText,
  frame: z.object({ x: coord, y: coord, width: size, height: size, rotation: finite.min(-360).max(360) }),
  opacity: finite.min(0).max(1),
  lockedInEditor: z.boolean(),
  initiallyVisible: z.boolean(),
  content,
  interactions: z.array(interaction).max(STUDIO_LIMITS.maxInteractionsPerElement),
  accessibility: z.object({
    label: shortText,
    readingOrder: z.number().int().min(0).max(10000),
    decorative: z.boolean(),
  }),
});

const background = z.discriminatedUnion("type", [
  z.object({ type: z.literal("color"), value: color }),
  z.object({ type: z.literal("gradient"), from: color, to: color, angle: finite.min(0).max(360) }),
  z.object({ type: z.literal("image"), assetId: id, fit: z.enum(["contain", "cover", "fill"]), color }),
]);

const page = z.object({
  id,
  name: shortText,
  hiddenFromNavigation: z.boolean(),
  background,
  pattern: z.enum(["none", "dots", "grid", "lines"]).optional(),
  notes: longText,
  elements: z.array(element).max(STUDIO_LIMITS.maxElementsPerPage),
});

const asset = z.object({
  id,
  kind: z.enum(["image", "audio"]),
  name: shortText,
  mime: z.string().max(100),
  bytes: z.number().int().min(0),
  path: z.string().max(512),
  width: z.number().int().min(1).max(20000).optional(),
  height: z.number().int().min(1).max(20000).optional(),
  duration: finite.min(0).optional(),
  url: z.string().max(2048).optional(),
});

export const studioDocumentSchema = z.object({
  schemaVersion: z.literal(STUDIO_SCHEMA_VERSION),
  id,
  title: shortText,
  level: z.enum(["6e", "5e", "4e", "3e"]).nullable(),
  logicalSize: z.object({ width: size, height: size }),
  settings: z.object({
    navigationMode: z.enum(["linear", "exploration"]),
    showInteractiveHints: z.boolean(),
    instructions: longText,
    completionMessage: longText,
    contentLanguage: z.enum(["en", "fr"]),
  }),
  pages: z.array(page).min(1).max(STUDIO_LIMITS.maxPages),
  assets: z.record(id, asset).refine((map) => Object.keys(map).length <= STUDIO_LIMITS.maxAssets, "Trop de médias."),
});

export type ParseResult =
  | { ok: true; document: StudioDocument }
  | { ok: false; message: string; unsupportedVersion?: boolean };

export function parseStudioDocument(input: unknown): ParseResult {
  if (input && typeof input === "object" && "schemaVersion" in input) {
    const version = (input as { schemaVersion?: unknown }).schemaVersion;
    if (typeof version === "number" && version > STUDIO_SCHEMA_VERSION) {
      return {
        ok: false,
        unsupportedVersion: true,
        message: `Cette leçon utilise une version plus récente du Studio (v${version}). Mettez l'application à jour.`,
      };
    }
  }
  const parsed = studioDocumentSchema.safeParse(input);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    const where = first?.path?.length ? ` (${first.path.join(".")})` : "";
    return { ok: false, message: `Document invalide${where} : ${first?.message ?? "erreur inconnue"}` };
  }
  return { ok: true, document: parsed.data as StudioDocument };
}
