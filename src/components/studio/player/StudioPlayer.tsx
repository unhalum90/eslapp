"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import {
  AlignLeft,
  ChevronLeft,
  ChevronRight,
  Eye,
  EyeOff,
  Flag,
  Highlighter,
  List,
  Maximize2,
  Minimize2,
  Pause,
  Play,
  Presentation,
  RotateCcw,
  Sparkles,
  Volume2,
  X,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import { NarrationChannel, playTestTone } from "@/lib/studio/audio";
import { createSession, elementAccessibleName, isInteractive, resolveNavigateTarget, sortedByReadingOrder } from "@/lib/studio/document";
import { initialVisibilityMap, reduceSession, runActions, type RuntimeHost } from "@/lib/studio/runtime";
import type { CanvasElement, Id, PlayerSession, StudioAction, StudioDocument } from "@/lib/studio/types";
import { AudioView, SingleChoiceView, StudioStage } from "../renderer/StudioStage";

export interface StudioPlayerProps {
  document: StudioDocument;
  mode: "player" | "preview";
  resolveAssetUrl?: (assetId: Id | null | undefined) => string | undefined;
  teacher?: boolean;
  initialClassroom?: boolean;
  code?: string;
  version?: number;
  pinned?: boolean;
  onExit?: () => void;
}

type TooltipState = { elementId: Id; action: Extract<StudioAction, { type: "tooltip" }>; sticky: boolean } | null;
type ModalState = { action: Extract<StudioAction, { type: "modal" }>; anchorId: Id; resolve: () => void } | null;

const FR = {
  page: "Page",
  previous: "Précédent",
  next: "Suivant",
  finish: "Terminer",
  restart: "Recommencer",
  textView: "Version texte",
  hints: "Indices",
  classroom: "Mode classe",
  reset: "Réinitialiser",
  fullscreen: "Plein écran",
  exitFullscreen: "Quitter le plein écran",
  close: "Fermer",
  pages: "Pages",
  highlight: "Surligner les zones interactives",
  reveal: "Afficher les réponses",
  testAudio: "Tester le son",
  large: "Grands contrôles",
  resetConfirm: "Réinitialiser l'activité ? Les réponses de cette session seront effacées.",
  external: "Lien externe (nouvel onglet)",
  start: "Commencer",
};

export function StudioPlayer({ document: doc, mode, resolveAssetUrl, teacher = false, initialClassroom = false, version, pinned, onExit }: StudioPlayerProps) {
  const resolve = useCallback(
    (assetId: Id | null | undefined) => {
      if (!assetId) return undefined;
      if (resolveAssetUrl) return resolveAssetUrl(assetId);
      return doc.assets[assetId]?.url;
    },
    [doc.assets, resolveAssetUrl],
  );

  const [session, dispatch] = useReducer(reduceSession, doc, createSession);
  const sessionRef = useRef<PlayerSession>(session);
  useEffect(() => {
    sessionRef.current = session;
  }, [session]);
  const generationRef = useRef(0);
  const initialVisibility = useMemo(() => initialVisibilityMap(doc), [doc]);

  const [channel] = useState(() => new NarrationChannel());
  const audioState = useSyncExternalStore(channel.subscribe, channel.getState, channel.getState);
  useEffect(() => () => channel.dispose(), [channel]);

  const [tooltip, setTooltip] = useState<TooltipState>(null);
  const [modal, setModal] = useState<ModalState>(null);
  const [problem, setProblem] = useState<string | null>(null);
  const [hints, setHints] = useState(doc.settings.showInteractiveHints);
  const [textView, setTextView] = useState(false);
  const [classroom, setClassroom] = useState(teacher && initialClassroom);
  const [highlight, setHighlight] = useState(false);
  const [reveal, setReveal] = useState(false);
  const [large, setLarge] = useState(initialClassroom);
  const [fullscreen, setFullscreen] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [showIntro, setShowIntro] = useState(Boolean(doc.settings.instructions.trim()));
  const [pageMenuOpen, setPageMenuOpen] = useState(false);

  const rootRef = useRef<HTMLDivElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const [fitScale, setFitScale] = useState(0.5);
  const [narrow, setNarrow] = useState(false);

  useLayoutEffect(() => {
    const node = viewportRef.current;
    if (!node) return;
    const update = () => {
      const rect = node.getBoundingClientRect();
      const padding = 16;
      const scale = Math.min((rect.width - padding) / doc.logicalSize.width, (rect.height - padding) / doc.logicalSize.height);
      setFitScale(Math.max(0.05, scale));
      setNarrow(rect.width < 700);
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(node);
    return () => observer.disconnect();
  }, [doc.logicalSize.height, doc.logicalSize.width, textView, classroom]);

  useEffect(() => {
    const onChange = () => setFullscreen(Boolean(window.document.fullscreenElement));
    window.document.addEventListener("fullscreenchange", onChange);
    return () => window.document.removeEventListener("fullscreenchange", onChange);
  }, []);

  useEffect(() => {
    if (!problem) return;
    const timer = window.setTimeout(() => setProblem(null), 4000);
    return () => window.clearTimeout(timer);
  }, [problem]);

  const pageIndex = Math.max(0, doc.pages.findIndex((page) => page.id === session.currentPageId));
  const page = doc.pages[pageIndex] ?? doc.pages[0];
  const navigablePages = doc.pages.filter((candidate) => !candidate.hiddenFromNavigation);
  const linear = doc.settings.navigationMode === "linear";
  const nextPageId = resolveNavigateTarget(doc, page.id, "next");
  const previousPageId = resolveNavigateTarget(doc, page.id, "previous");
  const isLast = linear ? nextPageId === null : navigablePages[navigablePages.length - 1]?.id === page.id;

  const navigate = useCallback(
    (pageId: Id) => {
      generationRef.current += 1;
      channel.stop();
      setTooltip(null);
      setPageMenuOpen(false);
      dispatch({ type: "navigate", pageId });
      window.setTimeout(() => headingRef.current?.focus(), 30);
    },
    [channel],
  );

  const host = useMemo<RuntimeHost>(
    () => ({
      getDocument: () => doc,
      getSession: () => sessionRef.current,
      generation: () => generationRef.current,
      navigate,
      showTooltip: (elementId, action) => setTooltip({ elementId, action, sticky: true }),
      openModal: (action, anchorId) =>
        new Promise<void>((resolveModal) => {
          setTooltip(null);
          setModal({ action, anchorId, resolve: resolveModal });
        }),
      playAudio: (assetId, elementId) => channel.play(assetId, resolve(assetId), elementId),
      stopAudio: () => channel.stop(),
      setVisibility: (elementIds, visibilityMode) => dispatch({ type: "setVisibility", elementIds, mode: visibilityMode, initial: initialVisibility }),
      openExternal: (url) => {
        const opened = window.open(url, "_blank", "noopener,noreferrer");
        if (!opened) setProblem("Le navigateur a bloqué l'ouverture du lien.");
      },
      reportProblem: (message) => setProblem(message),
    }),
    [channel, doc, initialVisibility, navigate, resolve],
  );

  const activate = useCallback(
    async (element: CanvasElement) => {
      dispatch({ type: "visitElement", elementId: element.id });
      if (tooltip && tooltip.elementId !== element.id) setTooltip(null);
      for (const interaction of element.interactions) {
        if (interaction.trigger !== "activate") continue;
        await runActions(interaction.actions, element.id, host);
      }
    },
    [host, tooltip],
  );

  const hoverChange = useCallback(
    (element: CanvasElement, hovering: boolean) => {
      const hoverInteractions = element.interactions.filter((interaction) => interaction.trigger === "hoverOrFocus");
      if (!hovering) {
        setTooltip((current) => (current && current.elementId === element.id && !current.sticky ? null : current));
        return;
      }
      for (const interaction of hoverInteractions) {
        for (const action of interaction.actions) {
          if (action.type === "tooltip") setTooltip({ elementId: element.id, action, sticky: false });
          if (action.type === "playAudio" && action.assetId) void channel.play(action.assetId, resolve(action.assetId), element.id);
          if (action.type === "setVisibility") host.setVisibility(action.elementIds, action.mode);
        }
      }
    },
    [channel, host, resolve],
  );

  const answer = useCallback(
    async (element: CanvasElement, optionId: Id) => {
      if (element.content.type !== "singleChoice") return;
      const correct = optionId === element.content.correctOptionId;
      dispatch({ type: "answer", elementId: element.id, optionId, correct });
      if (correct && element.content.onCorrect.length) await runActions(element.content.onCorrect, element.id, host);
    },
    [host],
  );

  const audioToggle = useCallback(
    (element: CanvasElement) => {
      if (element.content.type !== "audio" || !element.content.assetId) {
        setProblem("Aucun fichier audio n'est attaché.");
        return;
      }
      dispatch({ type: "visitElement", elementId: element.id });
      void channel.toggle(element.content.assetId, resolve(element.content.assetId), element.id);
    },
    [channel, resolve],
  );

  const audioReplay = useCallback(
    (element: CanvasElement) => {
      if (element.content.type !== "audio" || !element.content.assetId) return;
      if (audioState.elementId === element.id && audioState.assetId === element.content.assetId && audioState.status !== "idle") channel.replay();
      else void channel.play(element.content.assetId, resolve(element.content.assetId), element.id);
    },
    [audioState.assetId, audioState.elementId, audioState.status, channel, resolve],
  );

  const reset = useCallback(() => {
    const meaningful = Object.keys(session.answers).length > 0 || session.visitedPageIds.length > 1 || Object.keys(session.visibilityOverrides).length > 0;
    if (meaningful && !window.confirm(FR.resetConfirm)) return;
    generationRef.current += 1;
    channel.stop();
    setTooltip(null);
    setModal(null);
    dispatch({ type: "reset", session: createSession(doc) });
  }, [channel, doc, session]);

  const closeModal = useCallback(() => {
    setModal((current) => {
      if (current) {
        current.resolve();
        window.setTimeout(() => {
          const anchor = rootRef.current?.querySelector<HTMLElement>(`[data-element-id="${current.anchorId}"] button`);
          anchor?.focus();
        }, 20);
      }
      return null;
    });
  }, []);

  const toggleFullscreen = useCallback(() => {
    const root = rootRef.current;
    if (!root) return;
    if (window.document.fullscreenElement) void window.document.exitFullscreen();
    else void root.requestFullscreen?.().catch(() => setProblem("Le plein écran n'est pas disponible sur cet appareil."));
  }, []);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target && /^(input|textarea|select)$/i.test(target.tagName)) return;
      if (event.key === "Escape") {
        if (modal) {
          event.preventDefault();
          closeModal();
        } else if (tooltip) setTooltip(null);
        else if (pageMenuOpen) setPageMenuOpen(false);
        return;
      }
      if (modal || !linear) return;
      if (event.key === "ArrowRight" && nextPageId) navigate(nextPageId);
      if (event.key === "ArrowLeft" && previousPageId) navigate(previousPageId);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [closeModal, linear, modal, navigate, nextPageId, pageMenuOpen, previousPageId, tooltip]);

  const scale = fitScale * (narrow ? zoom : 1);
  const controlSize = large || classroom ? "min-h-14 px-5 text-lg" : "min-h-11 px-4 text-base";
  const iconButton = `inline-flex items-center justify-center gap-2 rounded-full border border-slate-300 bg-white font-bold text-[#18282b] shadow-sm transition hover:bg-[#e8f3f1] focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-[#285d68] disabled:opacity-40 ${controlSize}`;
  const primaryButton = `inline-flex items-center justify-center gap-2 rounded-full bg-[#285d68] font-extrabold text-white shadow focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-[#d45b3f] disabled:opacity-40 ${controlSize}`;

  const tooltipElement = tooltip ? page.elements.find((element) => element.id === tooltip.elementId) : null;

  return (
    <div ref={rootRef} className="flex h-full min-h-0 w-full flex-col bg-[#f4f2eb] text-[#18282b]" data-studio-player>
      <a href="#studio-stage-heading" className="sr-only focus:not-sr-only focus:absolute focus:left-2 focus:top-2 focus:z-50 focus:rounded focus:bg-white focus:px-3 focus:py-2">
        Aller à l&apos;activité
      </a>
      <header className="flex flex-wrap items-center gap-2 border-b border-[#d8d5ca] bg-white/90 px-3 py-2 sm:px-4">
        <div className="min-w-0 flex-1">
          <h1 ref={headingRef} id="studio-stage-heading" tabIndex={-1} className="truncate text-base font-black outline-none sm:text-lg">
            {doc.title}
          </h1>
          <p className="text-xs font-semibold text-slate-500">
            {FR.page} {pageIndex + 1} / {doc.pages.length} · {page.name}
            {mode === "preview" ? " · Aperçu" : ""}
            {pinned && version ? ` · v${version}` : ""}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" className={iconButton} aria-pressed={textView} onClick={() => setTextView((value) => !value)} title={FR.textView}>
            <AlignLeft size={18} />
            <span className="hidden sm:inline">{FR.textView}</span>
          </button>
          <button type="button" className={iconButton} aria-pressed={hints} onClick={() => setHints((value) => !value)} title={FR.hints}>
            <Sparkles size={18} />
            <span className="hidden sm:inline">{FR.hints}</span>
          </button>
          {teacher ? (
            <button type="button" className={`${iconButton} ${classroom ? "!bg-[#285d68] !text-white" : ""}`} aria-pressed={classroom} onClick={() => setClassroom((value) => !value)} title={FR.classroom}>
              <Presentation size={18} />
              <span className="hidden sm:inline">{FR.classroom}</span>
            </button>
          ) : null}
          <button type="button" className={iconButton} onClick={reset} title={FR.reset}>
            <RotateCcw size={18} />
            <span className="hidden sm:inline">{FR.reset}</span>
          </button>
          <button type="button" className={iconButton} onClick={toggleFullscreen} title={fullscreen ? FR.exitFullscreen : FR.fullscreen}>
            {fullscreen ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
          </button>
          {onExit ? (
            <button type="button" className={iconButton} onClick={onExit} title={FR.close}>
              <X size={18} />
              <span className="hidden sm:inline">{FR.close}</span>
            </button>
          ) : null}
        </div>
      </header>

      {classroom ? (
        <div className="flex flex-wrap items-center gap-2 border-b border-[#d8d5ca] bg-[#e8f3f1] px-3 py-2 text-sm sm:px-4" role="region" aria-label={FR.classroom}>
          <span className="mr-2 font-black uppercase tracking-wide text-[#285d68]">{FR.classroom}</span>
          <button type="button" className={`${iconButton} !min-h-10 !text-sm`} aria-pressed={highlight} onClick={() => setHighlight((value) => !value)}>
            <Highlighter size={16} /> {FR.highlight}
          </button>
          <button type="button" className={`${iconButton} !min-h-10 !text-sm`} aria-pressed={reveal} onClick={() => setReveal((value) => !value)}>
            {reveal ? <EyeOff size={16} /> : <Eye size={16} />} {FR.reveal}
          </button>
          <button type="button" className={`${iconButton} !min-h-10 !text-sm`} aria-pressed={large} onClick={() => setLarge((value) => !value)}>
            {FR.large}
          </button>
          <button
            type="button"
            className={`${iconButton} !min-h-10 !text-sm`}
            onClick={() => void playTestTone().then((ok) => setProblem(ok ? "Son de test joué." : "Le son de test n'a pas pu être joué."))}
          >
            <Volume2 size={16} /> {FR.testAudio}
          </button>
        </div>
      ) : null}

      <div className="flex min-h-0 flex-1">
        <div ref={viewportRef} className="relative flex min-h-0 min-w-0 flex-1 items-center justify-center overflow-auto p-2" onClick={() => tooltip && setTooltip(null)}>
          {session.finished ? (
            <div className="m-auto max-w-xl rounded-3xl bg-white p-8 text-center shadow" role="status">
              <Flag className="mx-auto text-[#285d68]" size={40} />
              <h2 className="mt-4 text-2xl font-black">{doc.settings.completionMessage || "Finished!"}</h2>
              <p className="mt-2 text-slate-600">
                {Object.values(session.answers).filter((entry) => entry.correct).length} / {doc.pages.reduce((count, candidate) => count + candidate.elements.filter((element) => element.content.type === "singleChoice").length, 0)} correct
              </p>
              <button type="button" className={`${primaryButton} mt-6`} onClick={() => { dispatch({ type: "reset", session: createSession(doc) }); channel.stop(); }}>
                <RotateCcw size={18} /> {FR.restart}
              </button>
            </div>
          ) : (
            <div className="relative m-auto shadow-[0_10px_40px_rgba(24,40,43,0.18)]" onClick={(event) => event.stopPropagation()}>
              <StudioStage
                document={doc}
                page={page}
                scale={scale}
                mode="player"
                visibility={session.visibilityOverrides}
                hintsVisible={hints}
                highlightInteractive={highlight && classroom}
                resolveAssetUrl={resolve}
                onActivate={(element) => void activate(element)}
                onHoverChange={hoverChange}
                answers={session.answers}
                revealAnswers={reveal && classroom}
                onAnswer={(element, optionId) => void answer(element, optionId)}
                audioState={audioState}
                onAudioToggle={audioToggle}
                onAudioReplay={audioReplay}
                className="rounded-lg"
              >
                {tooltip && tooltipElement ? (
                  <TooltipBubble element={tooltipElement} action={tooltip.action} logical={doc.logicalSize} resolve={resolve} onClose={() => setTooltip(null)} onPlay={(assetId) => void channel.play(assetId, resolve(assetId), tooltipElement.id)} />
                ) : null}
              </StudioStage>
              {showIntro && pageIndex === 0 ? (
                <div className="absolute inset-0 flex items-center justify-center rounded-lg bg-[#18282b]/55 p-4" role="dialog" aria-modal="false" aria-labelledby="studio-intro-title">
                  <div className="max-w-md rounded-2xl bg-white p-6 shadow-xl">
                    <h2 id="studio-intro-title" className="text-xl font-black">{doc.title}</h2>
                    <p className="mt-3 whitespace-pre-wrap text-lg leading-relaxed">{doc.settings.instructions}</p>
                    <button type="button" autoFocus className={`${primaryButton} mt-5`} onClick={() => setShowIntro(false)}>
                      <Play size={18} /> {FR.start}
                    </button>
                  </div>
                </div>
              ) : null}
            </div>
          )}
        </div>

        {textView ? (
          <aside className="w-full max-w-md shrink-0 overflow-auto border-l border-[#d8d5ca] bg-white p-4 sm:w-96" aria-label={FR.textView}>
            <TextRoute
              document={doc}
              elements={page.elements.filter((element) => (session.visibilityOverrides[element.id] ?? element.initiallyVisible) && !element.accessibility.decorative)}
              pageName={page.name}
              onActivate={(element) => void activate(element)}
              resolve={resolve}
              audioState={audioState}
              onAudioToggle={audioToggle}
              onAudioReplay={audioReplay}
              answers={session.answers}
              reveal={reveal && classroom}
              onAnswer={(element, optionId) => void answer(element, optionId)}
              scale={scale}
            />
          </aside>
        ) : null}
      </div>

      <footer className="flex flex-wrap items-center justify-between gap-2 border-t border-[#d8d5ca] bg-white/90 px-3 py-2 sm:px-4">
        <div className="flex items-center gap-2">
          {narrow ? (
            <>
              <button type="button" className={iconButton} aria-label="Zoom arrière" disabled={zoom <= 1} onClick={() => setZoom((value) => Math.max(1, value - 0.5))}>
                <ZoomOut size={18} />
              </button>
              <button type="button" className={iconButton} aria-label="Zoom avant" disabled={zoom >= 3} onClick={() => setZoom((value) => Math.min(3, value + 0.5))}>
                <ZoomIn size={18} />
              </button>
            </>
          ) : null}
          {!linear ? (
            <div className="relative">
              <button type="button" className={iconButton} aria-expanded={pageMenuOpen} aria-haspopup="menu" onClick={() => setPageMenuOpen((value) => !value)}>
                <List size={18} /> {FR.pages}
              </button>
              {pageMenuOpen ? (
                <ul role="menu" className="absolute bottom-full left-0 z-20 mb-2 max-h-72 w-64 overflow-auto rounded-2xl border border-slate-200 bg-white p-2 shadow-xl">
                  {navigablePages.map((candidate, index) => (
                    <li key={candidate.id} role="none">
                      <button type="button" role="menuitem" onClick={() => navigate(candidate.id)} className={`w-full rounded-lg px-3 py-2 text-left font-semibold hover:bg-[#e8f3f1] ${candidate.id === page.id ? "bg-[#e8f3f1] text-[#285d68]" : ""}`}>
                        {index + 1}. {candidate.name}
                      </button>
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          ) : null}
        </div>
        <div className="flex items-center gap-2">
          {linear ? (
            <>
              <button type="button" className={iconButton} disabled={!previousPageId || session.finished} onClick={() => previousPageId && navigate(previousPageId)}>
                <ChevronLeft size={20} /> {FR.previous}
              </button>
              {isLast || session.finished ? (
                <button type="button" className={primaryButton} disabled={session.finished} onClick={() => { channel.stop(); dispatch({ type: "finish" }); }}>
                  <Flag size={18} /> {FR.finish}
                </button>
              ) : (
                <button type="button" className={primaryButton} onClick={() => nextPageId && navigate(nextPageId)}>
                  {FR.next} <ChevronRight size={20} />
                </button>
              )}
            </>
          ) : (
            <button type="button" className={primaryButton} disabled={session.finished} onClick={() => { channel.stop(); dispatch({ type: "finish" }); }}>
              <Flag size={18} /> {FR.finish}
            </button>
          )}
        </div>
      </footer>

      {problem ? (
        <div role="status" aria-live="polite" className="pointer-events-none fixed bottom-20 left-1/2 z-40 -translate-x-1/2 rounded-full bg-[#18282b] px-5 py-3 text-sm font-bold text-white shadow-xl">
          {problem}
        </div>
      ) : null}

      {modal ? <ModalDialog action={modal.action} resolve={resolve} onClose={closeModal} onPlay={(assetId) => void channel.play(assetId, resolve(assetId), modal.anchorId)} audioState={audioState} /> : null}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Tooltip (positioned in logical coordinates inside the stage)
// ---------------------------------------------------------------------------

function TooltipBubble({
  element,
  action,
  logical,
  resolve,
  onClose,
  onPlay,
}: {
  element: CanvasElement;
  action: Extract<StudioAction, { type: "tooltip" }>;
  logical: { width: number; height: number };
  resolve: (assetId: Id | null | undefined) => string | undefined;
  onClose: () => void;
  onPlay: (assetId: Id) => void;
}) {
  const width = Math.min(420, logical.width - 40);
  const { frame } = element;
  const below = frame.y + frame.height + 300 < logical.height || frame.y < 300;
  const left = Math.max(16, Math.min(frame.x + frame.width / 2 - width / 2, logical.width - width - 16));
  const imageUrl = resolve(action.imageAssetId);
  return (
    <div
      role="dialog"
      aria-label={elementAccessibleName(element)}
      className="absolute z-30 rounded-2xl border border-[#d8d5ca] bg-white p-4 text-[#18282b] shadow-[0_12px_40px_rgba(24,40,43,0.3)]"
      style={{ width, left, ...(below ? { top: frame.y + frame.height + 14 } : { bottom: logical.height - frame.y + 14 }), fontSize: 22 }}
      onClick={(event) => event.stopPropagation()}
    >
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1 whitespace-pre-wrap leading-snug" aria-live="polite">
          {action.text}
        </div>
        <button type="button" aria-label={FR.close} onClick={onClose} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-slate-300 hover:bg-slate-100">
          <X size={18} />
        </button>
      </div>
      {imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={imageUrl} alt="" className="mt-3 max-h-56 w-full rounded-xl object-contain" />
      ) : null}
      {action.audioAssetId ? (
        <button type="button" onClick={() => action.audioAssetId && onPlay(action.audioAssetId)} className="mt-3 inline-flex min-h-11 items-center gap-2 rounded-full bg-[#285d68] px-4 font-bold text-white">
          <Volume2 size={18} /> Listen
        </button>
      ) : null}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Modal with managed focus
// ---------------------------------------------------------------------------

function ModalDialog({
  action,
  resolve,
  onClose,
  onPlay,
  audioState,
}: {
  action: Extract<StudioAction, { type: "modal" }>;
  resolve: (assetId: Id | null | undefined) => string | undefined;
  onClose: () => void;
  onPlay: (assetId: Id) => void;
  audioState: ReturnType<NarrationChannel["getState"]>;
}) {
  const dialogRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    const focusable = () => Array.from(dialog.querySelectorAll<HTMLElement>('button, [href], [tabindex]:not([tabindex="-1"])'));
    focusable()[0]?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Tab") return;
      const items = focusable();
      if (items.length === 0) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (event.shiftKey && window.document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && window.document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    dialog.addEventListener("keydown", onKey);
    return () => dialog.removeEventListener("keydown", onKey);
  }, []);

  const width = action.size === "small" ? "max-w-md" : action.size === "large" ? "max-w-4xl" : "max-w-2xl";
  const imageUrl = resolve(action.imageAssetId);
  const playing = audioState.assetId === action.audioAssetId && audioState.status === "playing";
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#18282b]/60 p-4" onClick={onClose}>
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="studio-modal-title"
        className={`max-h-full w-full ${width} overflow-auto rounded-3xl bg-white p-6 text-[#18282b] shadow-2xl`}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4">
          <h2 id="studio-modal-title" className="text-2xl font-black">{action.title || " "}</h2>
          <button type="button" aria-label={FR.close} onClick={onClose} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-slate-300 hover:bg-slate-100">
            <X size={20} />
          </button>
        </div>
        {imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={imageUrl} alt="" className="mt-4 max-h-[50vh] w-full rounded-2xl object-contain" />
        ) : null}
        {action.text ? <p className="mt-4 whitespace-pre-wrap text-xl leading-relaxed">{action.text}</p> : null}
        <div className="mt-6 flex flex-wrap gap-3">
          {action.audioAssetId ? (
            <button type="button" onClick={() => action.audioAssetId && onPlay(action.audioAssetId)} className="inline-flex min-h-12 items-center gap-2 rounded-full bg-[#285d68] px-5 text-lg font-bold text-white">
              {playing ? <Pause size={18} /> : <Volume2 size={18} />} Listen
            </button>
          ) : null}
          <button type="button" onClick={onClose} className="inline-flex min-h-12 items-center rounded-full border border-slate-300 px-5 text-lg font-bold">
            {FR.close}
          </button>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Linear text route (accessibility alternative to the spatial canvas)
// ---------------------------------------------------------------------------

function TextRoute({
  document: doc,
  elements,
  pageName,
  onActivate,
  resolve,
  audioState,
  onAudioToggle,
  onAudioReplay,
  answers,
  reveal,
  onAnswer,
  scale,
}: {
  document: StudioDocument;
  elements: CanvasElement[];
  pageName: string;
  onActivate: (element: CanvasElement) => void;
  resolve: (assetId: Id | null | undefined) => string | undefined;
  audioState: ReturnType<NarrationChannel["getState"]>;
  onAudioToggle: (element: CanvasElement) => void;
  onAudioReplay: (element: CanvasElement) => void;
  answers: PlayerSession["answers"];
  reveal: boolean;
  onAnswer: (element: CanvasElement, optionId: Id) => void;
  scale: number;
}) {
  const ordered = sortedByReadingOrder(elements);
  const page = doc.pages[0];
  const shared = { document: doc, page, scale, mode: "player" as const, resolveAssetUrl: resolve, visible: true };
  return (
    <div className="space-y-4 text-lg">
      <h2 className="text-xl font-black">{pageName}</h2>
      {ordered.length === 0 ? <p className="text-slate-500">Rien à afficher sur cette page.</p> : null}
      {ordered.map((element) => {
        const content = element.content;
        let body: ReactNode = null;
        if (content.type === "text") body = <p className="whitespace-pre-wrap leading-relaxed">{content.text}</p>;
        else if (content.type === "image") body = content.alt ? <p className="text-slate-700"><span className="font-bold">Image :</span> {content.alt}</p> : null;
        else if (content.type === "audio") {
          body = (
            <div style={{ height: 140 }}>
              <AudioView {...shared} element={{ ...element, frame: { ...element.frame, height: 140 } }} audioState={audioState} onAudioToggle={onAudioToggle} onAudioReplay={onAudioReplay} />
            </div>
          );
        } else if (content.type === "singleChoice") {
          body = (
            <div style={{ minHeight: 280 }}>
              <SingleChoiceView {...shared} element={element} answers={answers} revealAnswers={reveal} onAnswer={onAnswer} />
            </div>
          );
        }
        const interactive = isInteractive(element) && content.type !== "audio" && content.type !== "singleChoice";
        if (!body && !interactive) return null;
        return (
          <div key={element.id} className="rounded-2xl border border-slate-200 p-3">
            {body}
            {interactive ? (
              <button type="button" onClick={() => onActivate(element)} className="mt-2 inline-flex min-h-11 items-center gap-2 rounded-full bg-[#285d68] px-4 font-bold text-white">
                <Play size={16} /> {elementAccessibleName(element)}
              </button>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
