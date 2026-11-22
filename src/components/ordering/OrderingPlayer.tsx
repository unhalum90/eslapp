"use client";
import { useEffect, useRef, useState } from "react";
import { ArrowDown, ArrowUp, Volume2, VolumeX } from "lucide-react";
import { MatchingDialog } from "@/components/matching/MatchingPlayer";
import { useMatchingSounds } from "@/components/matching/useMatchingSounds";
import { useDragAutoScroll } from "@/components/interactive/useDragAutoScroll";
import {
  evaluateOrder,
  moveInOrder,
  orderComplete,
  shuffledOrder,
  type OrderingActivity,
  type OrderResult,
} from "@/lib/ordering/domain";
export function OrderingPlayer({ activity }: { activity: OrderingActivity }) {
  const [order, setOrder] = useState<string[]>([]);
  const [results, setResults] = useState<Record<string, OrderResult>>({});
  const [started, setStarted] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const [dialog, setDialog] = useState<{ title: string; text: string } | null>(
    null,
  );
  const [announcement, setAnnouncement] = useState(
    "Arrange the cards using drag, tap, or the move arrows.",
  );
  const [dragging, setDragging] = useState<{
    id: string;
    x: number;
    y: number;
    over: number | null;
  } | null>(null);
  const pointer = useRef<{
    id: string;
    pointerId: number;
    x: number;
    y: number;
    moved: boolean;
  } | null>(null);
  const root = useRef<HTMLDivElement>(null);
  const sounds = useMatchingSounds();
  useDragAutoScroll(dragging, root);
  const done = orderComplete(activity, order, results);
  const correct = Object.values(results).filter((r) => r === "correct").length;
  useEffect(
    () => () => {
      if ("speechSynthesis" in window) speechSynthesis.cancel();
    },
    [],
  );
  function move(id: string, index: number) {
    const next = moveInOrder(order, id, index);
    if (next === order) return;
    setOrder(next);
    setSelected(null);
    if (activity.config.checkMode === "automatic") {
      const checked = evaluateOrder(activity, next);
      setResults(checked);
      sounds.play(checked[id] === "correct");
      setAnnouncement(
        checked[id] === "correct"
          ? "This card is in the right position."
          : "Try another position for this card.",
      );
    } else {
      setResults({});
      setAnnouncement(
        `Card moved to position ${index + 1}. Check your order when ready.`,
      );
    }
  }
  function choose(id: string) {
    if (selected && selected !== id) move(selected, order.indexOf(id));
    else {
      setSelected(selected === id ? null : id);
      setAnnouncement(
        selected === id
          ? "Selection cleared."
          : "Card selected. Tap another position to move it there, or use the arrow keys.",
      );
    }
  }
  function reset() {
    setOrder(shuffledOrder(activity));
    setResults({});
    setSelected(null);
    setDismissed(false);
    pointer.current = null;
    setDragging(null);
    setAnnouncement("New attempt. Cards shuffled.");
  }
  function targetAt(x: number, y: number) {
    const value = document
      .elementFromPoint(x, y)
      ?.closest<HTMLElement>("[data-order-index]")?.dataset.orderIndex;
    return value === undefined ? null : Number(value);
  }
  return (
    <div ref={root} lang="en" className="mx-auto max-w-5xl p-4 sm:p-7">
      <header className="mb-5 flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-indigo-600">
            Simple Order
          </p>
          <h1 className="mt-2 break-words text-2xl font-bold">
            {activity.title}
          </h1>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
            aria-pressed={sounds.enabled}
            aria-label={
              sounds.enabled ? "Mute feedback sounds" : "Enable feedback sounds"
            }
            onClick={sounds.toggle}
          >
            {sounds.enabled ? <Volume2 size={16} /> : <VolumeX size={16} />}{" "}
            {sounds.enabled ? "Sound on" : "Sound off"}
          </button>
          {activity.taskDescription ? (
            <button
              className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
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
              className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
              onClick={() => setDialog({ title: "Help", text: activity.help })}
            >
              ? Help
            </button>
          ) : null}
          <button
            className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
            onClick={reset}
          >
            Replay
          </button>
          <button
            className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
            onClick={() => {
              if (document.fullscreenElement) void document.exitFullscreen();
              else if (root.current?.requestFullscreen)
                void root.current
                  .requestFullscreen()
                  .catch(() => setAnnouncement("Fullscreen is unavailable."));
            }}
          >
            Fullscreen
          </button>
        </div>
      </header>
      <div className="mb-4 rounded-2xl border border-indigo-100 bg-indigo-50 p-4">
        <p className="text-xs font-bold uppercase tracking-wide text-indigo-500">
          Your ordering rule
        </p>
        <p className="mt-1 whitespace-pre-wrap break-words font-semibold text-indigo-950">
          {activity.config.orderingRule}
        </p>
        <p className="mt-2 text-xs text-indigo-700">
          Drag a card to another position, tap two positions, or use the arrows.
          Keyboard: Tab to a card, then ↑ or ↓.
        </p>
      </div>
      <div className="mb-3 flex flex-wrap justify-between gap-2 text-sm">
        <span className="font-semibold">
          {correct} / {activity.config.items.length} positions correct
        </span>
        <span className="text-slate-500">
          {activity.config.checkMode === "manual"
            ? "Manual checking"
            : "Automatic checking"}
        </span>
      </div>
      <p role="status" className="mb-4 min-h-6 text-sm text-indigo-700">
        {announcement}
      </p>
      <ol aria-label="Sequence cards" className="space-y-3">
        {order.map((id, index) => {
          const item = activity.config.items.find((i) => i.id === id);
          if (!item) return null;
          return (
            <li
              key={id}
              data-order-index={index}
              data-order-card={id}
              className={`relative flex items-start gap-3 rounded-2xl border bg-white p-3 shadow-sm transition-shadow sm:p-4 ${dragging?.id === id ? "opacity-30" : ""} ${dragging?.over === index ? "border-indigo-500 ring-4 ring-indigo-100" : selected === id ? "border-indigo-500 ring-2 ring-indigo-200" : results[id] === "correct" ? "border-emerald-400" : results[id] === "incorrect" ? "border-rose-400" : "border-slate-200"}`}
            >
              <span
                aria-hidden="true"
                className="pointer-events-none mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100 text-sm font-bold text-slate-500"
              >
                {index + 1}
              </span>
              <button
                type="button"
                aria-label={`Move ${item.text}`}
                aria-pressed={selected === id}
                className="absolute inset-0 touch-none cursor-grab rounded-2xl bg-transparent focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-indigo-600 active:cursor-grabbing"
                onClick={(e) => {
                  if (e.detail === 0) choose(id);
                }}
                onKeyDown={(e) => {
                  if (e.key === "ArrowUp" || e.key === "ArrowDown") {
                    e.preventDefault();
                    move(id, index + (e.key === "ArrowUp" ? -1 : 1));
                  }
                  if (e.key === "Escape") {
                    pointer.current = null;
                    setDragging(null);
                    setSelected(null);
                  }
                }}
                onPointerDown={(e) => {
                  if (e.button !== 0 || !e.isPrimary) return;
                  sounds.unlock();
                  pointer.current = {
                    id,
                    pointerId: e.pointerId,
                    x: e.clientX,
                    y: e.clientY,
                    moved: false,
                  };
                  e.currentTarget.setPointerCapture(e.pointerId);
                }}
                onPointerMove={(e) => {
                  const p = pointer.current;
                  if (!p || p.pointerId !== e.pointerId) return;
                  if (
                    !p.moved &&
                    Math.hypot(e.clientX - p.x, e.clientY - p.y) < 8
                  )
                    return;
                  p.moved = true;
                  setSelected(null);
                  setDragging({
                    id,
                    x: e.clientX,
                    y: e.clientY,
                    over: targetAt(e.clientX, e.clientY),
                  });
                }}
                onPointerCancel={() => {
                  pointer.current = null;
                  setDragging(null);
                }}
                onLostPointerCapture={() => {
                  pointer.current = null;
                  setDragging(null);
                }}
                onPointerUp={(e) => {
                  const p = pointer.current;
                  if (!p || p.pointerId !== e.pointerId) return;
                  pointer.current = null;
                  setDragging(null);
                  if (!p.moved) {
                    choose(id);
                    return;
                  }
                  const target = targetAt(e.clientX, e.clientY);
                  if (target !== null) move(id, target);
                  else
                    setAnnouncement(
                      "Card returned. Drop it on another position.",
                    );
                }}
              />
              <div className="pointer-events-none relative min-w-0 flex-1 [&_button]:pointer-events-auto [&_details]:pointer-events-auto">
                <p className="whitespace-pre-wrap break-words font-semibold">
                  {item.text}
                </p>
                {activity.config.speech ? (
                  <button
                    className="mt-2 rounded-lg border border-slate-200 px-2 py-1 text-xs"
                    onClick={() => {
                      if (!("speechSynthesis" in window)) {
                        setAnnouncement("Read-aloud is unavailable.");
                        return;
                      }
                      const s = new SpeechSynthesisUtterance(item.text);
                      s.lang = activity.config.speechLocale;
                      s.onerror = () =>
                        setAnnouncement(
                          "Read-aloud could not play. Read the card text instead.",
                        );
                      speechSynthesis.cancel();
                      speechSynthesis.speak(s);
                    }}
                  >
                    ▶ Listen
                  </button>
                ) : null}
                {item.hint ? (
                  <details className="mt-2 text-xs text-slate-500">
                    <summary className="cursor-pointer">Hint</summary>
                    <p className="mt-1 whitespace-pre-wrap">{item.hint}</p>
                  </details>
                ) : null}
                {results[id] ? (
                  <p
                    className={`mt-2 text-xs font-bold ${results[id] === "correct" ? "text-emerald-700" : "text-rose-700"}`}
                  >
                    {results[id] === "correct"
                      ? "✓ Right position"
                      : "✕ Try another position"}
                  </p>
                ) : null}
              </div>
              <div className="relative flex shrink-0 flex-col gap-1">
                <button
                  className="rounded-lg border border-slate-200 bg-white p-2 disabled:opacity-25"
                  aria-label={`Move ${item.text} earlier`}
                  disabled={index === 0}
                  onClick={() => move(id, index - 1)}
                >
                  <ArrowUp size={15} />
                </button>
                <button
                  className="rounded-lg border border-slate-200 bg-white p-2 disabled:opacity-25"
                  aria-label={`Move ${item.text} later`}
                  disabled={index === order.length - 1}
                  onClick={() => move(id, index + 1)}
                >
                  <ArrowDown size={15} />
                </button>
              </div>
              {dragging?.over === index && dragging.id !== id ? (
                <span
                  aria-hidden="true"
                  className="pointer-events-none absolute -top-2 left-14 rounded-full bg-indigo-600 px-3 py-1 text-xs font-semibold text-white"
                >
                  Release at position {index + 1}
                </span>
              ) : null}
            </li>
          );
        })}
      </ol>
      {activity.config.checkMode === "manual" ? (
        <button
          disabled={!started}
          className="mt-5 rounded-xl bg-indigo-600 px-5 py-3 font-semibold text-white disabled:opacity-40"
          onClick={() => {
            const checked = evaluateOrder(activity, order);
            setResults(checked);
            const complete = orderComplete(activity, order, checked);
            sounds.play(complete);
            setSelected(null);
            setAnnouncement(
              complete
                ? "Every card is in the right position!"
                : `${Object.values(checked).filter((r) => r === "correct").length} correct positions. Move the other cards and try again.`,
            );
          }}
        >
          Check answers
        </button>
      ) : null}
      {done ? (
        <p className="mt-5 rounded-xl bg-emerald-50 p-4 font-semibold text-emerald-800">
          ✓ {activity.feedback || "You put every card in order!"}
        </p>
      ) : null}
      {dragging ? (
        <div
          aria-hidden="true"
          className="pointer-events-none fixed z-[100] w-56 -rotate-2 rounded-2xl border-2 border-indigo-300 bg-white p-4 font-semibold shadow-2xl"
          style={{
            left: Math.max(
              8,
              Math.min(dragging.x - 60, window.innerWidth - 232),
            ),
            top: dragging.y - 28,
          }}
        >
          {activity.config.items.find((i) => i.id === dragging.id)?.text}
        </div>
      ) : null}
      {!started ? (
        <MatchingDialog
          title={
            activity.taskDescription
              ? "Your task"
              : "Ready to put things in order?"
          }
          onClose={() => {
            sounds.unlock();
            setStarted(true);
            reset();
          }}
        >
          {activity.taskDescription || activity.config.orderingRule}
        </MatchingDialog>
      ) : dialog ? (
        <MatchingDialog title={dialog.title} onClose={() => setDialog(null)}>
          {dialog.text}
        </MatchingDialog>
      ) : done && !dismissed ? (
        <MatchingDialog
          title="All cards in order!"
          onClose={() => setDismissed(true)}
        >
          {activity.feedback || "You put every card in order!"}
        </MatchingDialog>
      ) : null}
    </div>
  );
}
