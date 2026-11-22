"use client";

import { type CSSProperties, type ReactNode, useState } from "react";
import { ArrowRight, Check, Eye, HelpCircle, Info, MapPin, Pause, Play, RotateCcw, Star, Volume2, X } from "lucide-react";
import { elementAccessibleName } from "@/lib/studio/document";
import { FONT_STACKS, renderIcon } from "@/lib/studio/icons";
import { backgroundCss, patternCss, SHAPE_PATHS } from "@/lib/studio/shapes";
import type { AudioState } from "@/lib/studio/audio";
import type { AnswerState, CanvasElement, HotspotIcon, Id, StudioDocument, StudioPage } from "@/lib/studio/types";

export const MIN_HIT_PX = 44;

export interface StageProps {
  document: StudioDocument;
  page: StudioPage;
  scale: number;
  mode: "editor" | "player";
  /** Learner visibility overrides (player). */
  visibility?: Record<Id, boolean>;
  hintsVisible?: boolean;
  highlightInteractive?: boolean;
  resolveAssetUrl: (assetId: Id | null | undefined) => string | undefined;
  onActivate?: (element: CanvasElement, origin: HTMLElement) => void;
  onHoverChange?: (element: CanvasElement, hovering: boolean, origin: HTMLElement) => void;
  answers?: Record<Id, AnswerState>;
  revealAnswers?: boolean;
  onAnswer?: (element: CanvasElement, optionId: Id) => void;
  onRetry?: (element: CanvasElement) => void;
  audioState?: AudioState;
  onAudioToggle?: (element: CanvasElement) => void;
  onAudioReplay?: (element: CanvasElement) => void;
  /** Editor: wrap each element (selection, drag handles). */
  elementWrapper?: (element: CanvasElement, node: ReactNode, index: number) => ReactNode;
  showHiddenInEditor?: boolean;
  /** Overlays positioned in logical coordinates (tooltips, guides). */
  children?: ReactNode;
  className?: string;
  stageRef?: (node: HTMLDivElement | null) => void;
  large?: boolean;
}

export function StudioStage(props: StageProps) {
  const { document, page, scale, mode, visibility = {}, resolveAssetUrl, elementWrapper, children, className, stageRef } = props;
  const { width, height } = document.logicalSize;
  const background = page.background;
  const backgroundUrl = background.type === "image" ? resolveAssetUrl(background.assetId) : undefined;
  const pattern = patternCss(page.pattern);

  return (
    <div
      className={`relative overflow-hidden ${className ?? ""}`}
      style={{ width: width * scale, height: height * scale }}
    >
      <div
        ref={stageRef}
        className="absolute left-0 top-0 origin-top-left select-none"
        data-studio-stage
        style={{
          width,
          height,
          transform: `scale(${scale})`,
          backgroundColor: background.type === "gradient" ? background.from : backgroundCss(background),
          backgroundImage: background.type === "gradient" ? backgroundCss(background) : backgroundUrl ? `url("${backgroundUrl}")` : undefined,
          backgroundSize: background.type === "image" ? (background.fit === "fill" ? "100% 100%" : background.fit) : undefined,
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
        }}
      >
        {pattern ? <div aria-hidden className="pointer-events-none absolute inset-0" style={pattern} /> : null}
        {page.elements.map((element, index) => {
          const visible = visibility[element.id] ?? element.initiallyVisible;
          if (!visible && mode === "player") return null;
          const node = (
            <ElementNode
              key={element.id}
              element={element}
              visible={visible}
              {...props}
            />
          );
          return elementWrapper ? <ElementWrapperSlot key={element.id}>{elementWrapper(element, node, index)}</ElementWrapperSlot> : node;
        })}
        {children}
      </div>
    </div>
  );
}

function ElementWrapperSlot({ children }: { children: ReactNode }) {
  return <>{children}</>;
}

export interface ElementNodeProps extends StageProps {
  element: CanvasElement;
  visible: boolean;
}

function ElementNode(props: ElementNodeProps) {
  const { element, visible, mode, scale, hintsVisible, highlightInteractive, onActivate, onHoverChange, showHiddenInEditor } = props;
  const { frame } = element;
  const activate = element.interactions.filter((interaction) => interaction.trigger === "activate" && interaction.actions.length > 0);
  const hover = element.interactions.filter((interaction) => interaction.trigger === "hoverOrFocus" && interaction.actions.length > 0);
  const interactive = mode === "player" && (activate.length > 0 || hover.length > 0);
  const isSelfManaged = element.content.type === "singleChoice" || element.content.type === "audio";

  const style: CSSProperties = {
    position: "absolute",
    left: frame.x,
    top: frame.y,
    width: frame.width,
    height: frame.height,
    transform: frame.rotation ? `rotate(${frame.rotation}deg)` : undefined,
    transformOrigin: "center",
    opacity: visible ? element.opacity : showHiddenInEditor ? Math.min(element.opacity, 0.35) : 0,
    pointerEvents: visible || mode === "editor" ? undefined : "none",
  };

  const body = <ElementContentView {...props} />;
  const hintOn = hintsVisible && element.content.type === "hotspot" && element.content.showHint;
  const ring = highlightInteractive && (interactive || isSelfManaged) && mode === "player";

  if (interactive && !isSelfManaged) {
    const padX = Math.max(0, (MIN_HIT_PX / scale - frame.width) / 2);
    const padY = Math.max(0, (MIN_HIT_PX / scale - frame.height) / 2);
    const label = elementAccessibleName(element);
    return (
      <div style={style} data-element-id={element.id}>
        {body}
        <button
          type="button"
          aria-label={label}
          className={`studio-hit absolute rounded-xl focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-[#285d68] ${ring ? "studio-highlight" : ""} ${hintOn ? "studio-pulse" : ""}`}
          style={{ left: -padX, top: -padY, right: -padX, bottom: -padY, borderRadius: element.content.type === "hotspot" && frame.width === frame.height ? "9999px" : undefined }}
          onClick={(event) => onActivate?.(element, event.currentTarget)}
          onMouseEnter={hover.length ? (event) => onHoverChange?.(element, true, event.currentTarget) : undefined}
          onMouseLeave={hover.length ? (event) => onHoverChange?.(element, false, event.currentTarget) : undefined}
          onFocus={hover.length ? (event) => onHoverChange?.(element, true, event.currentTarget) : undefined}
          onBlur={hover.length ? (event) => onHoverChange?.(element, false, event.currentTarget) : undefined}
        />
      </div>
    );
  }

  return (
    <div
      style={style}
      data-element-id={element.id}
      className={`${!visible && mode === "editor" ? "studio-hidden-outline" : ""} ${ring ? "studio-highlight rounded-xl" : ""}`}
    >
      {body}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Content views
// ---------------------------------------------------------------------------

function ElementContentView(props: ElementNodeProps) {
  const { element } = props;
  switch (element.content.type) {
    case "text":
      return <TextView element={element} />;
    case "image":
      return <ImageView {...props} />;
    case "shape":
      return <ShapeView element={element} />;
    case "icon":
      return <IconView element={element} />;
    case "button":
      return <ButtonView element={element} />;
    case "line":
      return <LineView element={element} />;
    case "hotspot":
      return <HotspotView {...props} />;
    case "audio":
      return <AudioView {...props} />;
    case "singleChoice":
      return <SingleChoiceView {...props} />;
  }
}

function TextView({ element }: { element: CanvasElement }) {
  if (element.content.type !== "text") return null;
  const { text, style } = element.content;
  const vertical = style.verticalAlign ?? "top";
  return (
    <div
      className="flex h-full w-full overflow-hidden"
      style={{
        background: style.background ?? undefined,
        padding: style.padding,
        borderRadius: style.radius,
        alignItems: vertical === "middle" ? "center" : vertical === "bottom" ? "flex-end" : "flex-start",
      }}
    >
      <div
        className="w-full whitespace-pre-wrap break-words"
        style={{
          fontSize: style.fontSize,
          fontWeight: style.bold ? 800 : 400,
          fontStyle: style.italic ? "italic" : "normal",
          fontFamily: FONT_STACKS[style.fontFamily ?? "sans"],
          textAlign: style.align,
          color: style.color,
          lineHeight: style.lineHeight ?? 1.3,
          textShadow: style.shadow ? "0 2px 6px rgba(0,0,0,0.55), 0 0 2px rgba(0,0,0,0.6)" : undefined,
        }}
      >
        {text}
      </div>
    </div>
  );
}

function ImageView({ element, resolveAssetUrl, mode }: ElementNodeProps) {
  if (element.content.type !== "image") return null;
  const { assetId, alt, fit, radius } = element.content;
  const url = resolveAssetUrl(assetId);
  if (!url) {
    return (
      <div
        className="flex h-full w-full items-center justify-center border-2 border-dashed border-slate-400 bg-slate-100 text-center text-slate-500"
        style={{ borderRadius: radius, fontSize: 20 }}
        role={mode === "player" ? "img" : undefined}
        aria-label={alt || undefined}
      >
        {mode === "editor" ? "Image : choisissez un média" : alt || ""}
      </div>
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={url}
      alt={element.accessibility.decorative ? "" : alt}
      draggable={false}
      className="h-full w-full"
      style={{ objectFit: fit, borderRadius: radius, display: "block" }}
    />
  );
}

function ShapeView({ element }: { element: CanvasElement }) {
  if (element.content.type !== "shape") return null;
  const { shape, fill, stroke, strokeWidth, radius, shadow } = element.content;
  const shadowCss = shadow ? "drop-shadow(0 6px 12px rgba(0,0,0,0.3))" : undefined;
  if (shape === "rectangle" || shape === "ellipse") {
    return (
      <div
        aria-hidden
        className="h-full w-full"
        style={{
          background: fill,
          border: strokeWidth ? `${strokeWidth}px solid ${stroke}` : undefined,
          borderRadius: shape === "ellipse" ? "9999px" : radius,
          filter: shadowCss,
        }}
      />
    );
  }
  const path = SHAPE_PATHS[shape];
  return (
    <svg aria-hidden className="h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none" style={{ display: "block", overflow: "visible", filter: shadowCss }}>
      <path d={path} fill={fill} stroke={strokeWidth ? stroke : "none"} strokeWidth={strokeWidth} strokeLinejoin="round" fillRule="evenodd" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

function IconView({ element }: { element: CanvasElement }) {
  if (element.content.type !== "icon") return null;
  const { name, color, background, backgroundShape, strokeWidth } = element.content;
  const size = Math.min(element.frame.width, element.frame.height);
  const iconSize = background ? size * 0.58 : size * 0.9;
  return (
    <div
      aria-hidden
      className="flex h-full w-full items-center justify-center"
      style={{ background: background ?? undefined, borderRadius: backgroundShape === "circle" ? "9999px" : backgroundShape === "rounded" ? Math.round(size * 0.2) : 0 }}
    >
      {renderIcon(name, { size: iconSize, color, strokeWidth }) ?? <span style={{ color, fontSize: iconSize * 0.6 }}>?</span>}
    </div>
  );
}

function ButtonView({ element }: { element: CanvasElement }) {
  if (element.content.type !== "button") return null;
  const { label, variant, shape, color, textColor, fontSize, icon } = element.content;
  const radius = shape === "pill" ? 9999 : shape === "rounded" ? 14 : 0;
  const style: CSSProperties =
    variant === "filled"
      ? { background: color, color: textColor, border: `2px solid ${color}` }
      : variant === "outline"
        ? { background: "transparent", color, border: `3px solid ${color}` }
        : { background: `${color}22`, color, border: `2px solid transparent` };
  return (
    <div
      aria-hidden
      className="flex h-full w-full items-center justify-center gap-2 px-4 font-extrabold shadow-[0_4px_14px_rgba(0,0,0,0.18)]"
      style={{ ...style, borderRadius: radius, fontSize }}
    >
      {renderIcon(icon, { size: fontSize * 1.1, strokeWidth: 2.5 })}
      <span className="truncate">{label}</span>
    </div>
  );
}

function LineView({ element }: { element: CanvasElement }) {
  if (element.content.type !== "line") return null;
  const { stroke, strokeWidth, dash, startArrow, endArrow } = element.content;
  const { width, height } = element.frame;
  const y = height / 2;
  const head = Math.max(8, strokeWidth * 3);
  const x1 = startArrow ? head : 0;
  const x2 = endArrow ? width - head : width;
  const dashArray = dash === "dashed" ? `${strokeWidth * 3} ${strokeWidth * 2}` : dash === "dotted" ? `${strokeWidth} ${strokeWidth * 2}` : undefined;
  return (
    <svg aria-hidden width={width} height={height} viewBox={`0 0 ${width} ${height}`} style={{ display: "block", overflow: "visible" }}>
      <line x1={x1} y1={y} x2={x2} y2={y} stroke={stroke} strokeWidth={strokeWidth} strokeLinecap={dash === "dotted" ? "round" : "butt"} strokeDasharray={dashArray} />
      {startArrow ? <polygon points={`0,${y} ${head},${y - head / 2} ${head},${y + head / 2}`} fill={stroke} /> : null}
      {endArrow ? <polygon points={`${width},${y} ${width - head},${y - head / 2} ${width - head},${y + head / 2}`} fill={stroke} /> : null}
    </svg>
  );
}

const HOTSPOT_ICONS: Record<Exclude<HotspotIcon, "number" | "none">, typeof Volume2> = {
  audio: Volume2,
  info: Info,
  question: HelpCircle,
  pin: MapPin,
  eye: Eye,
  arrow: ArrowRight,
  star: Star,
};

function HotspotView({ element, mode }: ElementNodeProps) {
  if (element.content.type !== "hotspot") return null;
  const { label, icon, number, color, transparent } = element.content;
  const { width, height } = element.frame;
  const round = Math.abs(width - height) < 4;
  const iconSize = Math.max(16, Math.min(width, height) * 0.5);
  const showLabel = !round && width > 110 && label.trim().length > 0;
  const Icon = icon !== "number" && icon !== "none" ? HOTSPOT_ICONS[icon] : null;

  if (transparent) {
    return (
      <div
        aria-hidden
        className={`h-full w-full ${mode === "editor" ? "border-2 border-dashed" : ""}`}
        style={{ borderColor: color, borderRadius: round ? "9999px" : 12, background: mode === "editor" ? `${color}22` : "transparent" }}
      />
    );
  }

  return (
    <div
      aria-hidden
      className="flex h-full w-full items-center justify-center gap-2 text-white shadow-[0_4px_16px_rgba(0,0,0,0.25)]"
      style={{ background: color, borderRadius: round ? "9999px" : 9999, fontSize: Math.max(14, Math.min(height * 0.42, 28)), fontWeight: 800, padding: showLabel ? "0 18px" : 0 }}
    >
      {icon === "number" ? (
        <span style={{ fontSize: Math.max(14, Math.min(width, height) * 0.5), lineHeight: 1 }}>{number ?? "•"}</span>
      ) : Icon ? (
        <Icon size={iconSize} strokeWidth={2.5} />
      ) : null}
      {showLabel ? <span className="truncate">{label}</span> : null}
    </div>
  );
}

function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds <= 0) return "0:00";
  const whole = Math.floor(seconds);
  return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, "0")}`;
}

export function AudioView({ element, audioState, onAudioToggle, onAudioReplay, mode, resolveAssetUrl }: ElementNodeProps) {
  const [transcriptOpen, setTranscriptOpen] = useState(false);
  if (element.content.type !== "audio") return null;
  const { label, transcript, showTranscript, assetId } = element.content;
  const mine = audioState?.elementId === element.id && audioState.assetId === assetId;
  const playing = mine && audioState?.status === "playing";
  const loading = mine && audioState?.status === "loading";
  const error = mine && audioState?.status === "error" ? audioState.message : null;
  const hasFile = Boolean(assetId && (mode === "editor" ? true : resolveAssetUrl(assetId)));
  const compact = element.frame.height < 120;
  const transcriptVisible = (showTranscript || transcriptOpen) && transcript.trim().length > 0 && !compact;

  return (
    <div className="flex h-full w-full flex-col rounded-2xl border border-slate-200 bg-white p-3 text-[#18282b] shadow-sm" style={{ fontSize: 20 }}>
      <div className="flex items-center gap-3">
        <button
          type="button"
          disabled={mode === "editor"}
          aria-label={playing ? `Pause : ${label}` : `Écouter : ${label}`}
          aria-pressed={playing}
          onClick={() => onAudioToggle?.(element)}
          className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-[#285d68] text-white shadow focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-[#d45b3f] disabled:opacity-80"
        >
          {playing ? <Pause size={26} /> : <Play size={26} className="ml-1" />}
        </button>
        <div className="min-w-0 flex-1">
          <p className="truncate font-extrabold">{label || "Audio"}</p>
          <p className="text-sm text-slate-500">
            {!hasFile ? "Aucun fichier audio" : error ? error : loading ? "Chargement…" : mine && audioState ? `${formatTime(audioState.progress)} / ${formatTime(audioState.duration)}` : "Appuyez pour écouter"}
          </p>
        </div>
        <button
          type="button"
          disabled={mode === "editor"}
          aria-label={`Réécouter : ${label}`}
          onClick={() => onAudioReplay?.(element)}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-slate-300 text-slate-700 focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-[#285d68]"
        >
          <RotateCcw size={20} />
        </button>
        {transcript.trim() && !showTranscript && !compact ? (
          <button
            type="button"
            disabled={mode === "editor"}
            aria-expanded={transcriptOpen}
            onClick={() => setTranscriptOpen((open) => !open)}
            className="rounded-full border border-slate-300 px-3 py-2 text-sm font-bold text-slate-700"
          >
            {transcriptOpen ? "Masquer le texte" : "Texte"}
          </button>
        ) : null}
      </div>
      {transcriptVisible ? (
        <p className="mt-3 overflow-auto whitespace-pre-wrap rounded-xl bg-[#f4f2eb] p-3 text-base leading-relaxed">{transcript}</p>
      ) : null}
    </div>
  );
}

export function SingleChoiceView({ element, answers, revealAnswers, onAnswer, onRetry, mode }: ElementNodeProps) {
  const [selected, setSelected] = useState<Id | null>(null);
  const [retrying, setRetrying] = useState(false);
  if (element.content.type !== "singleChoice") return null;
  const { prompt, options, correctOptionId, correctFeedback, retryFeedback, allowRetry } = element.content;
  const answer = answers?.[element.id];
  const locked = Boolean(answer && (answer.correct || !allowRetry));
  const shownSelection = retrying ? selected : answer?.selectedOptionId ?? selected;
  const showFeedback = Boolean(answer) && !retrying;
  const fontSize = element.frame.width < 420 ? 18 : 24;

  return (
    <div className="flex h-full w-full flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white p-4 text-[#18282b] shadow-sm" style={{ fontSize }}>
      <p className="font-extrabold leading-snug" id={`prompt-${element.id}`}>{prompt}</p>
      <div role="radiogroup" aria-labelledby={`prompt-${element.id}`} className="mt-3 flex flex-1 flex-col gap-2 overflow-auto">
        {options.map((option, index) => {
          const isSelected = shownSelection === option.id;
          const isCorrect = option.id === correctOptionId;
          const showCorrect = (showFeedback && answer?.correct && isSelected) || (revealAnswers && isCorrect);
          const showWrong = showFeedback && answer && isSelected && !answer.correct;
          return (
            <button
              key={option.id}
              type="button"
              role="radio"
              aria-checked={isSelected}
              disabled={mode === "editor" || locked}
              onClick={() => {
                setSelected(option.id);
                if (answer && !answer.correct) setRetrying(true);
              }}
              className={`flex min-h-11 items-center gap-3 rounded-xl border-2 px-3 py-2 text-left transition focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-[#285d68] ${
                showCorrect ? "border-emerald-600 bg-emerald-50" : showWrong ? "border-[#d45b3f] bg-orange-50" : isSelected ? "border-[#285d68] bg-[#e8f3f1]" : "border-slate-200 bg-white"
              }`}
            >
              <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 text-sm font-black ${showCorrect ? "border-emerald-600 bg-emerald-600 text-white" : showWrong ? "border-[#d45b3f] bg-[#d45b3f] text-white" : "border-slate-400"}`}>
                {showCorrect ? <Check size={16} /> : showWrong ? <X size={16} /> : String.fromCharCode(65 + index)}
              </span>
              <span>{option.label}</span>
            </button>
          );
        })}
      </div>
      <div className="mt-3 flex items-center gap-3">
        {!answer || (retrying && selected) ? (
          <button
            type="button"
            disabled={mode === "editor" || !selected}
            onClick={() => {
              if (!selected) return;
              setRetrying(false);
              onAnswer?.(element, selected);
            }}
            className="rounded-full bg-[#285d68] px-5 py-2 font-extrabold text-white disabled:opacity-40"
          >
            Check
          </button>
        ) : null}
        {showFeedback && answer ? (
          <p role="status" aria-live="polite" className={`flex-1 text-base font-semibold leading-snug ${answer.correct ? "text-emerald-800" : "text-[#a33d25]"}`}>
            {answer.correct ? correctFeedback : retryFeedback}
          </p>
        ) : null}
        {showFeedback && answer && !answer.correct && allowRetry ? (
          <button
            type="button"
            onClick={() => {
              setSelected(null);
              setRetrying(true);
              onRetry?.(element);
            }}
            className="rounded-full border border-slate-300 px-4 py-2 text-base font-bold text-slate-700"
          >
            Try again
          </button>
        ) : null}
      </div>
    </div>
  );
}
