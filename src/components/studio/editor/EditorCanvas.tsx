"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent, type ReactNode } from "react";
import { CircleDot, Image as ImageIcon, ListChecks, Lock, Minus, RectangleHorizontal, Shapes, Smile, Type, Volume2 } from "lucide-react";
import { clampFrame, createElement, DEFAULT_TEXT_STYLE } from "@/lib/studio/document";
import type { CanvasElement, ElementType, Frame, Id, ShapeKind } from "@/lib/studio/types";
import { selectCurrentPage, useStudioEditorStore } from "@/lib/store/useStudioEditorStore";
import { StudioStage } from "../renderer/StudioStage";
import { EmojiPicker, IconPicker, InsertPopover, ShapePicker } from "./InsertPickers";

type HandleId = "n" | "s" | "e" | "w" | "ne" | "nw" | "se" | "sw";
const HANDLES: { id: HandleId; cursor: string; x: number; y: number }[] = [
  { id: "nw", cursor: "nwse-resize", x: 0, y: 0 },
  { id: "n", cursor: "ns-resize", x: 0.5, y: 0 },
  { id: "ne", cursor: "nesw-resize", x: 1, y: 0 },
  { id: "e", cursor: "ew-resize", x: 1, y: 0.5 },
  { id: "se", cursor: "nwse-resize", x: 1, y: 1 },
  { id: "s", cursor: "ns-resize", x: 0.5, y: 1 },
  { id: "sw", cursor: "nesw-resize", x: 0, y: 1 },
  { id: "w", cursor: "ew-resize", x: 0, y: 0.5 },
];

const SNAP = 6;

interface Guide {
  axis: "x" | "y";
  position: number;
}

interface DragState {
  kind: "move" | "resize";
  handle?: HandleId;
  elementId: Id;
  startFrame: Frame;
  startClient: { x: number; y: number };
  aspect: boolean;
}

const ADD_TOOLS: { type: ElementType; label: string; icon: typeof Type }[] = [
  { type: "text", label: "Texte", icon: Type },
  { type: "image", label: "Image", icon: ImageIcon },
  { type: "button", label: "Bouton", icon: RectangleHorizontal },
  { type: "hotspot", label: "Zone cliquable", icon: CircleDot },
  { type: "audio", label: "Lecteur audio", icon: Volume2 },
  { type: "singleChoice", label: "Question", icon: ListChecks },
  { type: "line", label: "Ligne", icon: Minus },
];

export function EditorCanvas() {
  const document = useStudioEditorStore((state) => state.document);
  const page = useStudioEditorStore(selectCurrentPage);
  const selectedId = useStudioEditorStore((state) => state.selectedId);
  const zoom = useStudioEditorStore((state) => state.zoom);
  const assetUrls = useStudioEditorStore((state) => state.assetUrls);
  const showHidden = useStudioEditorStore((state) => state.showHidden);
  const { select, update, beginTransaction, endTransaction, openDrawer, setInspectorTab } = useStudioEditorStore.getState();

  const viewportRef = useRef<HTMLDivElement>(null);
  const [fitScale, setFitScale] = useState(0.5);
  const [guides, setGuides] = useState<Guide[]>([]);
  const [picker, setPicker] = useState<"shape" | "icon" | "emoji" | null>(null);
  const dragRef = useRef<DragState | null>(null);

  useLayoutEffect(() => {
    const node = viewportRef.current;
    if (!node || !document) return;
    const update = () => {
      const rect = node.getBoundingClientRect();
      setFitScale(Math.max(0.05, Math.min((rect.width - 48) / document.logicalSize.width, (rect.height - 48) / document.logicalSize.height)));
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(node);
    return () => observer.disconnect();
  }, [document]);

  const scale = zoom === "fit" ? fitScale : zoom;
  const resolveAssetUrl = useCallback((assetId: Id | null | undefined) => (assetId ? assetUrls[assetId] : undefined), [assetUrls]);

  const snapTargets = useMemo(() => {
    if (!document || !page) return { xs: [] as number[], ys: [] as number[] };
    const xs = [0, document.logicalSize.width / 2, document.logicalSize.width];
    const ys = [0, document.logicalSize.height / 2, document.logicalSize.height];
    for (const element of page.elements) {
      if (element.id === selectedId) continue;
      xs.push(element.frame.x, element.frame.x + element.frame.width / 2, element.frame.x + element.frame.width);
      ys.push(element.frame.y, element.frame.y + element.frame.height / 2, element.frame.y + element.frame.height);
    }
    return { xs, ys };
  }, [document, page, selectedId]);

  const applyFrame = useCallback(
    (elementId: Id, frame: Frame) => {
      update(
        (doc) => {
          for (const candidate of doc.pages) {
            const element = candidate.elements.find((item) => item.id === elementId);
            if (element) element.frame = clampFrame(frame, doc.logicalSize);
          }
        },
        { history: false },
      );
    },
    [update],
  );

  const onPointerMove = useCallback(
    (event: PointerEvent) => {
      const drag = dragRef.current;
      if (!drag) return;
      const dx = (event.clientX - drag.startClient.x) / scale;
      const dy = (event.clientY - drag.startClient.y) / scale;
      const start = drag.startFrame;
      const next: Frame = { ...start };
      const activeGuides: Guide[] = [];
      const snapValue = (value: number, targets: number[]) => {
        if (event.altKey) return { value, snapped: null as number | null };
        let best: number | null = null;
        let bestDistance = SNAP;
        for (const target of targets) {
          const distance = Math.abs(value - target);
          if (distance < bestDistance) {
            best = target;
            bestDistance = distance;
          }
        }
        return { value: best ?? value, snapped: best };
      };

      if (drag.kind === "move") {
        next.x = Math.round(start.x + dx);
        next.y = Math.round(start.y + dy);
        if (!event.shiftKey) {
          const left = snapValue(next.x, snapTargets.xs);
          const center = snapValue(next.x + start.width / 2, snapTargets.xs);
          const right = snapValue(next.x + start.width, snapTargets.xs);
          if (left.snapped !== null) {
            next.x = left.value;
            activeGuides.push({ axis: "x", position: left.value });
          } else if (center.snapped !== null) {
            next.x = center.value - start.width / 2;
            activeGuides.push({ axis: "x", position: center.value });
          } else if (right.snapped !== null) {
            next.x = right.value - start.width;
            activeGuides.push({ axis: "x", position: right.value });
          }
          const top = snapValue(next.y, snapTargets.ys);
          const middle = snapValue(next.y + start.height / 2, snapTargets.ys);
          const bottom = snapValue(next.y + start.height, snapTargets.ys);
          if (top.snapped !== null) {
            next.y = top.value;
            activeGuides.push({ axis: "y", position: top.value });
          } else if (middle.snapped !== null) {
            next.y = middle.value - start.height / 2;
            activeGuides.push({ axis: "y", position: middle.value });
          } else if (bottom.snapped !== null) {
            next.y = bottom.value - start.height;
            activeGuides.push({ axis: "y", position: bottom.value });
          }
        }
      } else if (drag.handle) {
        const handle = drag.handle;
        let left = start.x;
        let top = start.y;
        let right = start.x + start.width;
        let bottom = start.y + start.height;
        if (handle.includes("w")) left = Math.min(start.x + dx, right - 8);
        if (handle.includes("e")) right = Math.max(start.x + start.width + dx, left + 8);
        if (handle.includes("n")) top = Math.min(start.y + dy, bottom - 8);
        if (handle.includes("s")) bottom = Math.max(start.y + start.height + dy, top + 8);
        if (!event.altKey) {
          if (handle.includes("w")) {
            const snapped = snapValue(left, snapTargets.xs);
            if (snapped.snapped !== null) { left = snapped.value; activeGuides.push({ axis: "x", position: left }); }
          }
          if (handle.includes("e")) {
            const snapped = snapValue(right, snapTargets.xs);
            if (snapped.snapped !== null) { right = snapped.value; activeGuides.push({ axis: "x", position: right }); }
          }
          if (handle.includes("n")) {
            const snapped = snapValue(top, snapTargets.ys);
            if (snapped.snapped !== null) { top = snapped.value; activeGuides.push({ axis: "y", position: top }); }
          }
          if (handle.includes("s")) {
            const snapped = snapValue(bottom, snapTargets.ys);
            if (snapped.snapped !== null) { bottom = snapped.value; activeGuides.push({ axis: "y", position: bottom }); }
          }
        }
        if (drag.aspect || event.shiftKey) {
          const ratio = start.width / start.height;
          const width = right - left;
          const height = bottom - top;
          if (handle === "n" || handle === "s") {
            const newWidth = height * ratio;
            const centerX = start.x + start.width / 2;
            left = centerX - newWidth / 2;
            right = centerX + newWidth / 2;
          } else if (handle === "e" || handle === "w") {
            const newHeight = width / ratio;
            const centerY = start.y + start.height / 2;
            top = centerY - newHeight / 2;
            bottom = centerY + newHeight / 2;
          } else {
            const newHeight = width / ratio;
            if (handle.includes("n")) top = bottom - newHeight;
            else bottom = top + newHeight;
          }
        }
        next.x = Math.round(left);
        next.y = Math.round(top);
        next.width = Math.round(right - left);
        next.height = Math.round(bottom - top);
      }
      setGuides(activeGuides);
      applyFrame(drag.elementId, next);
    },
    [applyFrame, scale, snapTargets],
  );

  const onPointerUp = useCallback(() => {
    if (!dragRef.current) return;
    dragRef.current = null;
    setGuides([]);
    endTransaction();
  }, [endTransaction]);

  // Window listeners are registered once and delegate to the latest handlers,
  // so re-renders during a drag never detach them mid-gesture.
  const moveHandlerRef = useRef(onPointerMove);
  const upHandlerRef = useRef(onPointerUp);
  useEffect(() => {
    moveHandlerRef.current = onPointerMove;
    upHandlerRef.current = onPointerUp;
  }, [onPointerMove, onPointerUp]);

  useEffect(() => {
    const move = (event: PointerEvent) => moveHandlerRef.current(event);
    const up = () => upHandlerRef.current();
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", up);
    window.addEventListener("blur", up);
    return () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", up);
      window.removeEventListener("blur", up);
    };
  }, []);

  const startDrag = useCallback(
    (event: ReactPointerEvent, element: CanvasElement, kind: DragState["kind"], handle?: HandleId) => {
      if (element.lockedInEditor) return;
      event.preventDefault();
      event.stopPropagation();
      if (dragRef.current) upHandlerRef.current();
      beginTransaction();
      dragRef.current = {
        kind,
        handle,
        elementId: element.id,
        startFrame: { ...element.frame },
        startClient: { x: event.clientX, y: event.clientY },
        aspect: element.content.type === "image" || (element.content.type === "hotspot" && Math.abs(element.frame.width - element.frame.height) < 2),
      };
    },
    [beginTransaction],
  );

  const addElement = useCallback(
    (type: ElementType, customize?: (element: CanvasElement) => void) => {
      if (!document || !page) return;
      const next = createElement(type, { x: document.logicalSize.width / 2, y: document.logicalSize.height / 2 }, page.elements.length + 1);
      customize?.(next);
      const insert = () => {
        update((doc) => {
          const target = doc.pages.find((candidate) => candidate.id === page.id);
          target?.elements.push(next);
        });
        select(next.id);
        setInspectorTab("content");
      };
      if (type === "image" || type === "audio") {
        openDrawer(type, (assetId) => {
          if (next.content.type === "image") next.content.assetId = assetId;
          if (next.content.type === "audio") next.content.assetId = assetId;
          insert();
          const asset = useStudioEditorStore.getState().document?.assets[assetId];
          if (asset && next.content.type === "image" && asset.width && asset.height) {
            const ratio = asset.width / asset.height;
            const width = Math.min(640, asset.width);
            const height = width / ratio;
            applyFrame(next.id, { ...next.frame, width: Math.round(width), height: Math.round(height), x: Math.round(document.logicalSize.width / 2 - width / 2), y: Math.round(document.logicalSize.height / 2 - height / 2) });
          }
          if (asset && next.content.type === "audio") {
            update((doc) => {
              const found = doc.pages.flatMap((candidate) => candidate.elements).find((item) => item.id === next.id);
              if (found?.content.type === "audio") found.content.label = asset.name.replace(/\.[a-z0-9]+$/i, "");
            }, { history: false });
          }
        });
        return;
      }
      insert();
    },
    [applyFrame, document, openDrawer, page, select, setInspectorTab, update],
  );

  if (!document || !page) return null;

  const elementWrapper = (element: CanvasElement, node: ReactNode) => {
    const selected = element.id === selectedId;
    const { frame } = element;
    return (
      <div key={element.id} className="contents">
        {node}
        <div
          data-editor-hit={element.id}
          className={`absolute ${element.lockedInEditor ? "cursor-not-allowed" : "cursor-move"}`}
          style={{ left: frame.x, top: frame.y, width: frame.width, height: frame.height, transform: frame.rotation ? `rotate(${frame.rotation}deg)` : undefined }}
          onPointerDown={(event) => {
            if (event.button !== 0) return;
            select(element.id);
            startDrag(event, element, "move");
          }}
          onDoubleClick={() => setInspectorTab("content")}
        >
          {selected ? (
            <>
              <div className="pointer-events-none absolute inset-0 border-2 border-[#285d68]" style={{ borderWidth: Math.max(1.5, 2 / scale) }} />
              {element.lockedInEditor ? (
                <div className="pointer-events-none absolute -top-8 left-0 flex items-center gap-1 rounded bg-[#285d68] px-2 py-1 text-white" style={{ fontSize: 14 / scale, transform: `scale(${1 / scale})`, transformOrigin: "bottom left" }}>
                  <Lock size={14} /> Verrouillé
                </div>
              ) : (
                HANDLES.map((handle) => (
                  <div
                    key={handle.id}
                    role="presentation"
                    className="absolute rounded-sm border-2 border-[#285d68] bg-white"
                    style={{
                      width: 14 / scale,
                      height: 14 / scale,
                      left: `calc(${handle.x * 100}% - ${7 / scale}px)`,
                      top: `calc(${handle.y * 100}% - ${7 / scale}px)`,
                      cursor: handle.cursor,
                    }}
                    onPointerDown={(event) => {
                      if (event.button !== 0) return;
                      startDrag(event, element, "resize", handle.id);
                    }}
                  />
                ))
              )}
            </>
          ) : null}
        </div>
      </div>
    );
  };

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col">
      <div className="flex flex-wrap items-center gap-1 border-b border-[#d8d5ca] bg-white px-3 py-2" role="toolbar" aria-label="Ajouter un élément">
        <span className="mr-2 text-xs font-black uppercase tracking-wide text-slate-500">Ajouter</span>
        {ADD_TOOLS.slice(0, 2).map((tool) => (
          <button
            key={tool.type}
            type="button"
            onClick={() => addElement(tool.type)}
            className="inline-flex min-h-9 items-center gap-2 rounded-lg border border-slate-200 px-3 text-sm font-semibold text-[#18282b] hover:border-[#285d68] hover:bg-[#e8f3f1]"
          >
            <tool.icon size={16} /> {tool.label}
          </button>
        ))}
        <button type="button" aria-haspopup="dialog" aria-expanded={picker === "shape"} onClick={() => setPicker("shape")} className="inline-flex min-h-9 items-center gap-2 rounded-lg border border-slate-200 px-3 text-sm font-semibold text-[#18282b] hover:border-[#285d68] hover:bg-[#e8f3f1]">
          <Shapes size={16} /> Forme
        </button>
        <button type="button" aria-haspopup="dialog" aria-expanded={picker === "icon"} onClick={() => setPicker("icon")} className="inline-flex min-h-9 items-center gap-2 rounded-lg border border-slate-200 px-3 text-sm font-semibold text-[#18282b] hover:border-[#285d68] hover:bg-[#e8f3f1]">
          <Smile size={16} /> Icône / Emoji
        </button>
        {ADD_TOOLS.slice(2).map((tool) => (
          <button
            key={tool.type}
            type="button"
            onClick={() => addElement(tool.type)}
            className="inline-flex min-h-9 items-center gap-2 rounded-lg border border-slate-200 px-3 text-sm font-semibold text-[#18282b] hover:border-[#285d68] hover:bg-[#e8f3f1]"
          >
            <tool.icon size={16} /> {tool.label}
          </button>
        ))}
        <button
          type="button"
          onClick={() => openDrawer("background", (assetId) => update((doc) => {
            const target = doc.pages.find((candidate) => candidate.id === page.id);
            if (target) target.background = { type: "image", assetId, fit: "contain", color: target.background.type === "color" ? target.background.value : target.background.type === "image" ? target.background.color : "#ffffff" };
          }))}
          className="inline-flex min-h-9 items-center gap-2 rounded-lg border border-slate-200 px-3 text-sm font-semibold text-[#18282b] hover:border-[#285d68] hover:bg-[#e8f3f1]"
        >
          <ImageIcon size={16} /> Fond de page
        </button>
      </div>
      {picker === "shape" ? (
        <InsertPopover title="Formes" wide onClose={() => setPicker(null)}>
          <ShapePicker onPick={(kind: ShapeKind) => { addElement("shape", (element) => { if (element.content.type === "shape") { element.content.shape = kind; if (kind !== "rectangle" && kind !== "ellipse") { element.frame.width = 200; element.frame.height = 200; } } }); setPicker(null); }} />
        </InsertPopover>
      ) : null}
      {picker === "icon" || picker === "emoji" ? (
        <InsertPopover title={picker === "icon" ? "Icônes" : "Emoji"} wide onClose={() => setPicker(null)}>
          <div className="mb-2 flex gap-1">
            <button type="button" aria-pressed={picker === "icon"} onClick={() => setPicker("icon")} className={`rounded-lg px-3 py-1 text-xs font-bold ${picker === "icon" ? "bg-[#285d68] text-white" : "border border-slate-200"}`}>Icônes</button>
            <button type="button" aria-pressed={picker === "emoji"} onClick={() => setPicker("emoji")} className={`rounded-lg px-3 py-1 text-xs font-bold ${picker === "emoji" ? "bg-[#285d68] text-white" : "border border-slate-200"}`}>Emoji</button>
          </div>
          {picker === "icon" ? (
            <IconPicker onPick={(name) => { if (!name) return; addElement("icon", (element) => { if (element.content.type === "icon") element.content.name = name; }); setPicker(null); }} />
          ) : (
            <EmojiPicker onPick={(emoji) => { addElement("text", (element) => { element.name = `Emoji ${emoji}`; element.frame.width = 120; element.frame.height = 120; element.content = { type: "text", text: emoji, style: { ...DEFAULT_TEXT_STYLE, fontSize: 88, align: "center", padding: 0, verticalAlign: "middle" } }; element.accessibility.decorative = true; }); setPicker(null); }} />
          )}
        </InsertPopover>
      ) : null}
      <div
        ref={viewportRef}
        className="relative flex min-h-0 flex-1 items-center justify-center overflow-auto bg-[#e9e6dc] p-6"
        onPointerDown={(event) => {
          if (event.target === event.currentTarget) select(null);
        }}
      >
        <div className="shadow-[0_12px_40px_rgba(24,40,43,0.2)]" onPointerDown={(event) => {
          const target = event.target as HTMLElement;
          if (target.closest("[data-editor-hit]")) return;
          select(null);
        }}>
          <StudioStage
            document={document}
            page={page}
            scale={scale}
            mode="editor"
            resolveAssetUrl={resolveAssetUrl}
            elementWrapper={elementWrapper}
            showHiddenInEditor={showHidden}
            className="bg-white"
          >
            {guides.map((guide, index) => (
              <div
                key={`${guide.axis}-${guide.position}-${index}`}
                className="pointer-events-none absolute bg-[#d45b3f]"
                style={guide.axis === "x" ? { left: guide.position, top: 0, width: 1.5 / scale, height: document.logicalSize.height } : { top: guide.position, left: 0, height: 1.5 / scale, width: document.logicalSize.width }}
              />
            ))}
          </StudioStage>
        </div>
      </div>
    </div>
  );
}
