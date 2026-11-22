"use client";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { Volume2, VolumeX } from "lucide-react";
import { ScatteredBoard } from "./ScatteredBoard";
import { useMatchingSounds } from "./useMatchingSounds";
import {
  attach,
  cards,
  completed,
  evaluate,
  shuffle,
  type Attachment,
  type MatchingActivity,
  type MatchingCard,
} from "@/lib/matching/domain";

export function MatchingDialog({
  title,
  children,
  onClose,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current;
    dialog?.showModal();
    return () => dialog?.close();
  }, []);
  return (
    <dialog
      ref={ref}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      aria-label={title}
      className="m-auto max-h-[85vh] w-[min(92vw,30rem)] overflow-auto rounded-3xl border border-slate-200 bg-white p-7 text-slate-800 shadow-2xl backdrop:bg-slate-950/40"
    >
      <h2 className="mb-4 text-xl font-bold">{title}</h2>
      <div className="whitespace-pre-wrap break-words">{children}</div>
      <button
        autoFocus
        className="mt-6 rounded-xl bg-indigo-600 px-5 py-2.5 font-semibold text-white"
        onClick={onClose}
      >
        Continue
      </button>
    </dialog>
  );
}

function MediaContent({ card }: { card: MatchingCard }) {
  const [error, setError] = useState("");
  if (card.type === "text")
    return (
      <p className="whitespace-pre-wrap break-words text-lg font-semibold">
        {card.text}
      </p>
    );
  if (card.type === "speech")
    return (
      <div className="space-y-2">
        <p className="whitespace-pre-wrap break-words text-lg font-semibold">
          {card.text}
        </p>
        <button
          className="rounded-lg border bg-white px-3 py-2 text-sm"
          onClick={() => {
            if (!("speechSynthesis" in window)) {
              setError(
                "Read-aloud is unavailable in this browser. Read the text instead.",
              );
              return;
            }
            const speech = new SpeechSynthesisUtterance(card.text);
            speech.lang = card.locale;
            if (card.voice)
              speech.voice =
                speechSynthesis
                  .getVoices()
                  .find((v) => v.name === card.voice) ?? null;
            speech.onerror = () =>
              setError("Read-aloud could not play. Read the text instead.");
            speechSynthesis.cancel();
            speechSynthesis.speak(speech);
          }}
        >
          ▶ Listen
        </button>
        {error ? (
          <p role="status" className="text-xs">
            {error}
          </p>
        ) : null}
      </div>
    );
  const fragment = `#t=${card.media.startSeconds ?? 0}${card.media.endSeconds !== undefined ? `,${card.media.endSeconds}` : ""}`;
  return (
    <div className="space-y-2">
      {card.type ===
      "image" /* eslint-disable-next-line @next/next/no-img-element -- Teacher-supplied HTTPS images, no image proxy. */ ? (
        <img
          src={card.media.url}
          draggable={false}
          alt={card.media.label}
          referrerPolicy="no-referrer"
          className="mx-auto max-h-44 max-w-full rounded-lg object-contain"
          onError={() => setError("Image unavailable")}
        />
      ) : card.type === "audio" ? (
        <audio
          className="w-full min-w-0"
          aria-label={card.media.label}
          controls
          preload="none"
          src={card.media.url + fragment}
          onError={() => setError("Audio unavailable")}
          onTimeUpdate={(e) => {
            if (
              card.media.endSeconds !== undefined &&
              e.currentTarget.currentTime >= card.media.endSeconds
            )
              e.currentTarget.pause();
          }}
        />
      ) : (
        <video
          aria-label={card.media.label}
          controls
          preload="none"
          muted={card.media.muted}
          src={card.media.url + fragment}
          className="max-h-44 w-full rounded-lg"
          onError={() => setError("Video unavailable")}
          onTimeUpdate={(e) => {
            if (
              card.media.endSeconds !== undefined &&
              e.currentTarget.currentTime >= card.media.endSeconds
            )
              e.currentTarget.pause();
          }}
        />
      )}
      {card.type !== "image" ? (
        <p className="text-sm">{card.media.label}</p>
      ) : null}
      {error ? (
        <p role="status" className="text-sm text-rose-700">
          {error}. {card.media.label}
        </p>
      ) : null}
    </div>
  );
}

export function MatchingPlayer({ activity }: { activity: MatchingActivity }) {
  const [order, setOrder] = useState(() => cards(activity));
  const [scatterSeed, setScatterSeed] = useState(1);
  const sounds = useMatchingSounds();
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [hidden, setHidden] = useState<string[]>([]);
  const [started, setStarted] = useState(false);
  const [dialog, setDialog] = useState<{ title: string; text: string } | null>(
    null,
  );
  const [dismissedCompletion, setDismissedCompletion] = useState(false);
  const [announcement, setAnnouncement] = useState("");
  const board = useRef<HTMLDivElement>(null);
  const instructionsId = useId();
  const drag = useRef<{
    id: string;
    pointerId: number;
    x: number;
    y: number;
    left: number;
    top: number;
    width: number;
    height: number;
    moved: boolean;
  } | null>(null);
  const [dragging, setDragging] = useState<{
    id: string;
    left: number;
    top: number;
    width: number;
    height: number;
    over: string | null;
  } | null>(null);
  const draggedCard = dragging
    ? order.find((item) => item.card.id === dragging.id)
    : null;
  const done = completed(activity, attachments);
  const paired = new Set(attachments.flatMap((a) => [a.first, a.second]));
  const correctCount = attachments.filter((a) => a.result === "correct").length;

  useEffect(() => {
    if (activity.config.checkMode !== "automatic") return;
    const ids = attachments
      .filter((a) => a.result === "correct")
      .flatMap((a) => [a.first, a.second]);
    const timer = setTimeout(() => setHidden(ids), 850);
    return () => clearTimeout(timer);
  }, [attachments, activity.config.checkMode]);
  useEffect(
    () => () => {
      if ("speechSynthesis" in window) speechSynthesis.cancel();
    },
    [],
  );

  function connect(first: string, second: string) {
    const next = attach(activity, attachments, first, second);
    if (next === attachments) return;
    setAttachments(next);
    setSelected(null);
    const last = next[next.length - 1];
    if (last.result !== "pending") sounds.play(last.result === "correct");
    setAnnouncement(
      last.result === "correct"
        ? "Correct match!"
        : last.result === "incorrect"
          ? "Not a match. Separate the cards and try again."
          : "Cards attached. Check your answers when ready.",
    );
  }
  function choose(id: string) {
    if (selected && selected !== id) connect(selected, id);
    else {
      setSelected(selected === id ? null : id);
      setAnnouncement(
        selected === id
          ? "Selection cleared."
          : "Card selected. Select another card to attach it.",
      );
    }
  }
  function reset() {
    drag.current = null;
    setDragging(null);
    setOrder(shuffle(cards(activity)));
    setScatterSeed(Math.floor(Math.random() * 1000000000));
    setAttachments([]);
    setSelected(null);
    setHidden([]);
    setDismissedCompletion(false);
    setAnnouncement("New attempt. Cards shuffled.");
  }
  function renderCard(id: string, free: boolean) {
    const item = order.find((x) => x.card.id === id);
    if (!item) return null;
    const { card, side } = item;
    const color = activity.config.colorSides
      ? side === "A"
        ? "bg-sky-50"
        : side === "B"
          ? "bg-amber-50"
          : "bg-white"
      : "bg-white";
    const dropTarget = dragging?.over === id;
    return (
      <div
        key={id}
        data-match-card={free ? id : undefined}
        data-match-drop-target={dropTarget ? "true" : undefined}
        className={`relative min-w-0 rounded-2xl border p-5 transition-[box-shadow,opacity,transform,border-color] duration-150 ${color} ${
          dragging?.id === id ? "opacity-30" : "shadow-sm"
        } ${dropTarget ? "scale-[1.02] border-indigo-500 ring-4 ring-indigo-200 shadow-lg" : selected === id ? "border-indigo-600 ring-2 ring-indigo-300" : "border-slate-200"} ${free && !dragging ? "hover:-translate-y-0.5 hover:shadow-md" : ""}`}
      >
        {free ? (
          <button
            type="button"
            aria-pressed={selected === id}
            aria-label={`${selected === id ? "Deselect" : "Select"} ${card.text || card.media.label}`}
            aria-describedby={instructionsId}
            className={`absolute inset-0 z-0 touch-none rounded-2xl border-0 bg-transparent focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-indigo-600 ${dragging?.id === id ? "cursor-grabbing" : "cursor-grab"}`}
            onClick={(e) => {
              if (e.detail === 0) choose(id);
            }}
            onKeyDown={(e) => {
              if (e.key === "Escape") {
                drag.current = null;
                setDragging(null);
                setSelected(null);
                setAnnouncement("Selection cleared.");
              }
            }}
            onPointerDown={(e) => {
              if (e.button !== 0 || !e.isPrimary) return;
              sounds.unlock();
              const rect = e.currentTarget.getBoundingClientRect();
              drag.current = {
                id,
                pointerId: e.pointerId,
                x: e.clientX,
                y: e.clientY,
                left: rect.left,
                top: rect.top,
                width: rect.width,
                height: rect.height,
                moved: false,
              };
              e.currentTarget.setPointerCapture(e.pointerId);
            }}
            onPointerMove={(e) => {
              const origin = drag.current;
              if (!origin || origin.pointerId !== e.pointerId) return;
              const dx = e.clientX - origin.x,
                dy = e.clientY - origin.y;
              if (!origin.moved && Math.hypot(dx, dy) < 8) return;
              if (!origin.moved) {
                origin.moved = true;
                setSelected(null);
                setAnnouncement("Dragging card. Drop it onto its partner.");
              }
              const target = document
                .elementFromPoint(e.clientX, e.clientY)
                ?.closest<HTMLElement>("[data-match-card]")?.dataset.matchCard;
              setDragging({
                id,
                left: origin.left + dx,
                top: origin.top + dy,
                width: origin.width,
                height: origin.height,
                over: target && target !== id ? target : null,
              });
            }}
            onPointerCancel={() => {
              drag.current = null;
              setDragging(null);
            }}
            onLostPointerCapture={() => {
              drag.current = null;
              setDragging(null);
            }}
            onPointerUp={(e) => {
              const origin = drag.current;
              if (!origin || origin.pointerId !== e.pointerId) return;
              drag.current = null;
              setDragging(null);
              if (!origin.moved) {
                choose(id);
                return;
              }
              const target = document
                .elementFromPoint(e.clientX, e.clientY)
                ?.closest<HTMLElement>("[data-match-card]")?.dataset.matchCard;
              if (target && target !== id) connect(id, target);
              else
                setAnnouncement(
                  "Card returned. Drop it onto another card to make a pair.",
                );
            }}
          />
        ) : null}
        <div className="pointer-events-none relative z-10 [&_button]:pointer-events-auto [&_details]:pointer-events-auto [&_audio]:pointer-events-auto [&_video]:pointer-events-auto">
          <span className="mb-3 block text-[10px] font-bold uppercase tracking-wider text-slate-500">
            {side === "Extra" ? "Card" : `Side ${side}`}
          </span>
          <MediaContent card={card} />
          {card.hint ? (
            <details className="mt-3 text-sm">
              <summary className="cursor-pointer text-slate-600">Hint</summary>
              <p className="mt-1 whitespace-pre-wrap">{card.hint}</p>
            </details>
          ) : null}
        </div>
        {dropTarget ? (
          <span
            aria-hidden="true"
            className="pointer-events-none absolute -bottom-3 left-1/2 z-20 -translate-x-1/2 whitespace-nowrap rounded-full bg-indigo-600 px-3 py-1 text-xs font-semibold text-white shadow-sm"
          >
            Release to pair
          </span>
        ) : null}
      </div>
    );
  }

  return (
    <div
      ref={board}
      lang="en"
      className="mx-auto min-h-full w-full max-w-6xl p-4 sm:p-7"
    >
      <header className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[.2em] text-indigo-600">
            Matching Pairs
          </p>
          <h1 className="mt-2 break-words text-2xl font-bold text-slate-900 sm:text-3xl">
            {activity.title}
          </h1>
          <p id={instructionsId} className="mt-2 text-sm text-slate-600">
            Drag a card onto its partner, or tap two cards to connect them.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            aria-pressed={sounds.enabled}
            aria-label={
              sounds.enabled ? "Mute feedback sounds" : "Enable feedback sounds"
            }
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
            onClick={sounds.toggle}
          >
            {sounds.enabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
            {sounds.enabled ? "Sound on" : "Sound off"}
          </button>
          {activity.taskDescription ? (
            <button
              className="rounded-xl border bg-white px-3 py-2 text-sm"
              onClick={() =>
                setDialog({
                  title: "Your task",
                  text: activity.taskDescription,
                })
              }
            >
              Task
            </button>
          ) : null}
          {activity.help ? (
            <button
              className="rounded-xl border bg-white px-3 py-2 text-sm"
              onClick={() => setDialog({ title: "Help", text: activity.help })}
            >
              ? Help
            </button>
          ) : null}
          <button
            className="rounded-xl border bg-white px-3 py-2 text-sm"
            onClick={() => {
              if (document.fullscreenElement) void document.exitFullscreen();
              else if (board.current?.requestFullscreen)
                void board.current
                  .requestFullscreen()
                  .catch(() =>
                    setAnnouncement(
                      "Fullscreen is unavailable in this browser.",
                    ),
                  );
              else
                setAnnouncement("Fullscreen is unavailable in this browser.");
            }}
          >
            Fullscreen
          </button>
          <button
            className="rounded-xl border bg-white px-3 py-2 text-sm"
            onClick={reset}
          >
            Replay
          </button>
        </div>
      </header>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-indigo-100 bg-white px-5 py-3">
        <span className="text-sm font-semibold">
          {correctCount} / {activity.config.pairs.length} pairs matched
        </span>
        <span className="text-xs text-slate-500">
          {activity.config.checkMode === "manual"
            ? "Manual checking"
            : "Automatic checking"}
        </span>
      </div>
      <p
        role="status"
        aria-live="polite"
        className="mb-4 min-h-6 text-sm font-medium text-indigo-800"
      >
        {announcement ||
          (selected ? "Choose a second card." : "Ready when you are.")}
      </p>
      <ScatteredBoard
        seed={scatterSeed}
        items={order.map((item) => ({
          id: item.card.id,
          content: renderCard(item.card.id, true),
          hidden: paired.has(item.card.id),
        }))}
      />
      {attachments.some((a) => !hidden.includes(a.first)) ? (
        <section
          aria-label="Attached pairs"
          className="mt-6 grid gap-4 sm:grid-cols-2"
        >
          {attachments
            .filter((a) => !hidden.includes(a.first))
            .map((a) => (
              <div
                key={a.first}
                className={`min-w-0 rounded-2xl border-2 p-3 ${a.result === "correct" ? "border-emerald-500 bg-emerald-50" : a.result === "incorrect" ? "border-rose-500 bg-rose-50" : "border-slate-300 bg-slate-100"}`}
              >
                <div
                  className={`grid gap-2 ${activity.config.attachment === "horizontal" ? "grid-cols-2" : "grid-cols-1"}`}
                >
                  {renderCard(a.first, false)}
                  {renderCard(a.second, false)}
                </div>
                <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-sm">
                  <span className="font-semibold">
                    {a.result === "correct"
                      ? "✓ Correct match"
                      : a.result === "incorrect"
                        ? "✕ Try again"
                        : "Attached · not checked"}
                  </span>
                  <button
                    disabled={
                      activity.config.checkMode === "automatic" &&
                      a.result === "correct"
                    }
                    className="rounded-lg border bg-white px-3 py-2 disabled:opacity-40"
                    onClick={() => {
                      setAttachments((previous) =>
                        previous.filter((p) => p !== a),
                      );
                      setAnnouncement("Cards separated. Try another partner.");
                    }}
                  >
                    Separate
                  </button>
                </div>
              </div>
            ))}
        </section>
      ) : null}
      {activity.config.checkMode === "manual" ? (
        <button
          className="mt-6 rounded-xl bg-indigo-600 px-6 py-3 font-semibold text-white disabled:opacity-40"
          disabled={!attachments.length}
          onClick={() => {
            const next = evaluate(activity, attachments);
            setAttachments(next);
            if (next.length)
              sounds.play(!next.some((pair) => pair.result === "incorrect"));
            setAnnouncement(
              `${next.filter((a) => a.result === "correct").length} correct pairs. ${next.filter((a) => a.result === "incorrect").length} pairs to try again.`,
            );
          }}
        >
          Check answers
        </button>
      ) : null}
      {done ? (
        <div className="mt-5 rounded-xl bg-emerald-100 p-4 font-semibold text-emerald-900">
          ✓ {activity.feedback || "You matched every pair!"}
        </div>
      ) : null}
      {dragging && draggedCard ? (
        <div
          aria-hidden="true"
          inert
          className={`pointer-events-none fixed z-[100] overflow-hidden rounded-2xl border-2 border-indigo-400 p-5 shadow-2xl ${activity.config.colorSides ? (draggedCard.side === "A" ? "bg-sky-50" : draggedCard.side === "B" ? "bg-amber-50" : "bg-white") : "bg-white"}`}
          style={{
            left: dragging.left,
            top: dragging.top,
            width: dragging.width,
            height: dragging.height,
            transform: "rotate(-2deg) scale(1.03)",
          }}
        >
          <span className="mb-3 block text-[10px] font-bold uppercase tracking-wider text-slate-500">
            {draggedCard.side === "Extra" ? "Card" : `Side ${draggedCard.side}`}
          </span>
          <MediaContent card={draggedCard.card} />
          {draggedCard.card.hint ? (
            <span className="mt-3 block text-sm text-slate-600">▸ Hint</span>
          ) : null}
        </div>
      ) : null}
      {!started ? (
        <MatchingDialog
          title={activity.taskDescription ? "Your task" : "Ready to match?"}
          onClose={() => {
            sounds.unlock();
            setStarted(true);
            setScatterSeed(Math.floor(Math.random() * 1000000000));
            setOrder(shuffle(cards(activity)));
          }}
        >
          {activity.taskDescription ||
            "Drag a card onto its partner, or tap two cards to connect them. With a keyboard, use Tab to focus a card and Enter or Space to select it. No timer—take your time."}
        </MatchingDialog>
      ) : dialog ? (
        <MatchingDialog title={dialog.title} onClose={() => setDialog(null)}>
          {dialog.text}
        </MatchingDialog>
      ) : done && !dismissedCompletion ? (
        <MatchingDialog
          title="All pairs matched!"
          onClose={() => setDismissedCompletion(true)}
        >
          {activity.feedback || "You matched every pair!"}
        </MatchingDialog>
      ) : null}
    </div>
  );
}
