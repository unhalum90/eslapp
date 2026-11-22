"use client";
import { useEffect, useRef, useState } from "react";
import { Volume2, VolumeX } from "lucide-react";
import { MatchingDialog } from "@/components/matching/MatchingPlayer";
import { useMatchingSounds } from "@/components/matching/useMatchingSounds";
import { shuffle } from "@/lib/matching/domain";
import {
  evaluateGroups,
  groupsComplete,
  moveToGroup,
  type GroupingActivity,
  type GroupAssignments,
  type GroupResults,
  type GroupingItem,
} from "@/lib/grouping/domain";

const colors = [
  "border-sky-200 bg-sky-50/70",
  "border-amber-200 bg-amber-50/70",
  "border-violet-200 bg-violet-50/70",
  "border-emerald-200 bg-emerald-50/70",
  "border-rose-200 bg-rose-50/70",
  "border-cyan-200 bg-cyan-50/70",
];
export function GroupingPlayer({ activity }: { activity: GroupingActivity }) {
  const [order, setOrder] = useState(activity.config.items);
  const [placements, setPlacements] = useState<GroupAssignments>({});
  const [results, setResults] = useState<GroupResults>({});
  const [selected, setSelected] = useState<string | null>(null);
  const [started, setStarted] = useState(false);
  const [dialog, setDialog] = useState<{ title: string; text: string } | null>(
    null,
  );
  const [dismissed, setDismissed] = useState(false);
  const [announcement, setAnnouncement] = useState(
    "Choose a card, then its group. You can also drag cards into groups.",
  );
  const [dragging, setDragging] = useState<{
    id: string;
    x: number;
    y: number;
    over: string | null;
  } | null>(null);
  const pointer = useRef<{
    id: string;
    pointerId: number;
    x: number;
    y: number;
    moved: boolean;
    lastX: number;
    lastY: number;
  } | null>(null);
  const ref = useRef<HTMLDivElement>(null);
  const sounds = useMatchingSounds();
  const dragActive = dragging !== null;
  useEffect(() => {
    if (!dragActive) return;
    let frame = 0;
    const tick = () => {
      const point = pointer.current;
      if (!point) return;
      const main = ref.current?.closest<HTMLElement>("main");
      const scrollElement =
        main && main.scrollHeight > main.clientHeight
          ? main
          : document.scrollingElement;
      const bounds =
        scrollElement === main
          ? main!.getBoundingClientRect()
          : { top: 0, bottom: window.innerHeight };
      const dy =
        point.lastY < bounds.top + 55
          ? -15
          : point.lastY > Math.min(bounds.bottom, window.innerHeight) - 55
            ? 15
            : 0;
      if (dy && scrollElement) {
        scrollElement.scrollBy(0, dy);
        const over =
          document
            .elementFromPoint(point.lastX, point.lastY)
            ?.closest<HTMLElement>("[data-group-zone]")?.dataset.groupZone ??
          null;
        setDragging((previous) =>
          previous && previous.over !== over ? { ...previous, over } : previous,
        );
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [dragActive]);
  const done = groupsComplete(activity, placements, results);
  const correct = Object.values(results).filter((r) => r === "correct").length;
  useEffect(
    () => () => {
      if ("speechSynthesis" in window) speechSynthesis.cancel();
    },
    [],
  );
  function place(cardId: string, groupId: string) {
    if (
      activity.config.checkMode === "automatic" &&
      results[cardId] === "correct"
    )
      return;
    const next = moveToGroup(activity, placements, cardId, groupId);
    if (next === placements) return;
    setPlacements(next);
    setSelected(null);
    if (activity.config.checkMode === "automatic" && groupId) {
      const result = evaluateGroups(activity, next)[cardId];
      setResults((previous) => ({ ...previous, [cardId]: result }));
      sounds.play(result === "correct");
      setAnnouncement(
        result === "correct"
          ? "Correct group!"
          : "Try another group. You can move this card again.",
      );
    } else {
      setResults((previous) => {
        const next = { ...previous };
        delete next[cardId];
        return next;
      });
      setAnnouncement(
        groupId
          ? "Card placed. Check your answers when ready."
          : "Card returned to the word bank.",
      );
    }
  }
  function reset() {
    setOrder(shuffle(activity.config.items));
    setPlacements({});
    setResults({});
    setSelected(null);
    setDismissed(false);
    setAnnouncement("New attempt. Cards shuffled.");
  }
  function renderCard(item: GroupingItem, index: number) {
    const locked =
      activity.config.checkMode === "automatic" &&
      results[item.id] === "correct";
    return (
      <div
        key={item.id}
        data-sort-card={item.id}
        className={`relative min-w-0 rounded-2xl border bg-white p-4 shadow-sm ${selected === item.id ? "border-indigo-600 ring-2 ring-indigo-300" : results[item.id] === "correct" ? "border-emerald-500" : results[item.id] === "incorrect" ? "border-rose-500" : "border-slate-200"} ${dragging?.id === item.id ? "opacity-30" : ""}`}
        style={
          !placements[item.id]
            ? { transform: `rotate(${((index % 5) - 2) * 1.2}deg)` }
            : undefined
        }
      >
        {!locked ? (
          <button
            type="button"
            aria-label={`Select ${item.text}`}
            aria-pressed={selected === item.id}
            className="absolute inset-0 touch-none cursor-grab rounded-2xl bg-transparent focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-indigo-600 active:cursor-grabbing"
            onClick={(e) => {
              if (e.detail === 0) {
                setSelected(selected === item.id ? null : item.id);
                setAnnouncement(`Choose a group for ${item.text}.`);
              }
            }}
            onKeyDown={(e) => {
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
                id: item.id,
                pointerId: e.pointerId,
                x: e.clientX,
                y: e.clientY,
                moved: false,
                lastX: e.clientX,
                lastY: e.clientY,
              };
              e.currentTarget.setPointerCapture(e.pointerId);
            }}
            onPointerMove={(e) => {
              const origin = pointer.current;
              if (!origin || origin.pointerId !== e.pointerId) return;
              if (
                !origin.moved &&
                Math.hypot(e.clientX - origin.x, e.clientY - origin.y) < 8
              )
                return;
              origin.moved = true;
              origin.lastX = e.clientX;
              origin.lastY = e.clientY;
              setSelected(null);
              const over =
                document
                  .elementFromPoint(e.clientX, e.clientY)
                  ?.closest<HTMLElement>("[data-group-zone]")?.dataset
                  .groupZone ?? null;
              setDragging({ id: item.id, x: e.clientX, y: e.clientY, over });
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
              const origin = pointer.current;
              if (!origin || origin.pointerId !== e.pointerId) return;
              pointer.current = null;
              setDragging(null);
              if (!origin.moved) {
                setSelected(selected === item.id ? null : item.id);
                setAnnouncement(`Choose a group for ${item.text}.`);
                return;
              }
              const over = document
                .elementFromPoint(e.clientX, e.clientY)
                ?.closest<HTMLElement>("[data-group-zone]")?.dataset.groupZone;
              if (over) place(item.id, over === "bank" ? "" : over);
              else setAnnouncement("Card returned. Drop it inside a group.");
            }}
          />
        ) : null}
        <div className="pointer-events-none relative [&_button]:pointer-events-auto [&_details]:pointer-events-auto">
          <p className="break-words font-semibold">{item.text}</p>
          {activity.config.speech ? (
            <button
              className="mt-2 rounded-lg border border-slate-200 px-2 py-1 text-xs"
              onClick={() => {
                if (!("speechSynthesis" in window)) {
                  setAnnouncement("Read-aloud is unavailable in this browser.");
                  return;
                }
                const speech = new SpeechSynthesisUtterance(item.text);
                speech.lang = activity.config.speechLocale;
                speechSynthesis.cancel();
                speechSynthesis.speak(speech);
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
          {results[item.id] ? (
            <p
              className={`mt-2 text-xs font-bold ${results[item.id] === "correct" ? "text-emerald-700" : "text-rose-700"}`}
            >
              {results[item.id] === "correct"
                ? "✓ Correct"
                : "✕ Try another group"}
            </p>
          ) : null}
        </div>
      </div>
    );
  }
  return (
    <div ref={ref} lang="en" className="mx-auto max-w-6xl p-4 sm:p-7">
      <header className="mb-5 flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-indigo-600">
            Group Assignment
          </p>
          <h1 className="mt-2 text-2xl font-bold">{activity.title}</h1>
          <p className="mt-2 text-sm text-slate-500">
            Drag each card into a group, or select a card and then a group.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            aria-pressed={sounds.enabled}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
            onClick={sounds.toggle}
          >
            {sounds.enabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
            <span className="sr-only">
              {sounds.enabled
                ? "Mute feedback sounds"
                : "Enable feedback sounds"}
            </span>
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
              else if (ref.current?.requestFullscreen)
                void ref.current
                  .requestFullscreen()
                  .catch(() => setAnnouncement("Fullscreen unavailable."));
            }}
          >
            Fullscreen
          </button>
        </div>
      </header>
      <div className="mb-3 rounded-xl border border-indigo-100 bg-white px-4 py-3 text-sm font-semibold">
        {correct} / {activity.config.items.length} cards sorted correctly ·{" "}
        {activity.config.checkMode === "automatic"
          ? "Automatic checking"
          : "Manual checking"}
      </div>
      <p role="status" className="mb-5 min-h-6 text-sm text-indigo-700">
        {announcement}
      </p>
      <div className="grid items-start gap-5 lg:grid-cols-[.85fr_1.15fr]">
        <section
          data-group-zone="bank"
          aria-label="Word bank"
          className={`rounded-2xl border border-dashed p-4 ${dragging?.over === "bank" ? "border-indigo-500 ring-2 ring-indigo-200" : "border-slate-300"}`}
        >
          <h2 className="mb-4 font-bold">Word bank</h2>
          <button
            disabled={!selected}
            className="mb-3 text-xs text-indigo-700 underline disabled:hidden"
            onClick={() => {
              if (selected) place(selected, "");
            }}
          >
            Return selected card here
          </button>
          <div className="grid grid-cols-2 gap-3">
            {order.filter((i) => !placements[i.id]).map(renderCard)}
          </div>
          {order.every((i) => placements[i.id]) ? (
            <p className="py-6 text-center text-sm text-slate-500">
              All cards placed
            </p>
          ) : null}
        </section>
        <div className="grid gap-4 sm:grid-cols-2">
          {activity.config.groups.map((group, index) => (
            <section
              key={group.id}
              data-group-zone={group.id}
              aria-label={`${group.title} group`}
              className={`relative min-h-44 rounded-2xl border-2 p-4 transition-shadow ${colors[index % colors.length]} ${dragging?.over === group.id ? "ring-4 ring-indigo-300" : ""}`}
            >
              <h2 className="mb-3 break-words font-bold">
                <button
                  className="w-full rounded-lg py-1 text-left focus-visible:outline-2 focus-visible:outline-indigo-600"
                  aria-label={`Place selected card in ${group.title}`}
                  onClick={() => {
                    if (selected) place(selected, group.id);
                    else
                      setAnnouncement(
                        "Select a card first, then choose its group.",
                      );
                  }}
                >
                  {group.title}
                  <span className="ml-2 text-xs font-normal text-slate-500">
                    {order.filter((i) => placements[i.id] === group.id).length}
                  </span>
                </button>
              </h2>
              <div className="grid gap-3">
                {order
                  .filter((i) => placements[i.id] === group.id)
                  .map(renderCard)}
              </div>
              {!order.some((i) => placements[i.id] === group.id) ? (
                <button
                  className="w-full rounded-xl border border-dashed border-slate-300 p-5 text-sm text-slate-500"
                  aria-label={`Drop or place card in ${group.title}`}
                  onClick={() => {
                    if (selected) place(selected, group.id);
                    else
                      setAnnouncement(
                        "Select a card first, then choose its group.",
                      );
                  }}
                >
                  Drop cards here
                </button>
              ) : null}
            </section>
          ))}
        </div>
      </div>
      {activity.config.checkMode === "manual" ? (
        <button
          disabled={!Object.keys(placements).length}
          className="mt-5 rounded-xl bg-indigo-600 px-5 py-3 font-semibold text-white disabled:opacity-40"
          onClick={() => {
            const next = evaluateGroups(activity, placements);
            setResults(next);
            sounds.play(!Object.values(next).includes("incorrect"));
            setSelected(null);
            setAnnouncement(
              `${Object.values(next).filter((r) => r === "correct").length} correct. Move any incorrect cards and check again.`,
            );
          }}
        >
          Check answers
        </button>
      ) : null}
      {done ? (
        <p className="mt-5 rounded-xl bg-emerald-50 p-4 font-semibold text-emerald-800">
          ✓ {activity.feedback || "Every card is in the right group!"}
        </p>
      ) : null}
      {dragging ? (
        <div
          aria-hidden="true"
          className="pointer-events-none fixed z-[100] max-w-56 -rotate-3 rounded-2xl border-2 border-indigo-300 bg-white p-4 font-semibold shadow-xl"
          style={{ left: dragging.x - 40, top: dragging.y - 30 }}
        >
          {activity.config.items.find((i) => i.id === dragging.id)?.text}
        </div>
      ) : null}
      {!started ? (
        <MatchingDialog
          title={activity.taskDescription ? "Your task" : "Ready to sort?"}
          onClose={() => {
            sounds.unlock();
            setStarted(true);
            setOrder(shuffle(activity.config.items));
          }}
        >
          {activity.taskDescription ||
            "Sort each vocabulary card into the correct group. You can drag, tap, or use Tab and Enter."}
        </MatchingDialog>
      ) : dialog ? (
        <MatchingDialog title={dialog.title} onClose={() => setDialog(null)}>
          {dialog.text}
        </MatchingDialog>
      ) : done && !dismissed ? (
        <MatchingDialog
          title="All cards sorted!"
          onClose={() => setDismissed(true)}
        >
          {activity.feedback || "Every card is in the right group!"}
        </MatchingDialog>
      ) : null}
    </div>
  );
}
