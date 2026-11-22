"use client";
import { useEffect, useRef, useState } from "react";
import { ArrowDown, ArrowUp, Copy, Plus, Trash2 } from "lucide-react";
import {
  orderingSchema,
  orderingErrors,
  type OrderingActivity,
} from "@/lib/ordering/domain";
import { saveDeviceActivity } from "@/lib/interactive/drafts";
import {
  saveInteractiveDraft,
  publishInteractive,
} from "@/app/actions/interactive";
import { ActivitySharePanel } from "@/components/interactive/ActivitySharePanel";
import { OrderingPlayer } from "./OrderingPlayer";
const field =
  "mt-1 w-full min-w-0 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm";
const button =
  "inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold disabled:opacity-40";
type LinkRecord = { code: string; activityId: string; title: string };
function RemoveCardDialog({
  text,
  onCancel,
  onRemove,
}: {
  text: string;
  onCancel: () => void;
  onRemove: () => void;
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
      aria-label="Remove this card?"
      onCancel={(e) => {
        e.preventDefault();
        onCancel();
      }}
      className="m-auto w-[min(92vw,28rem)] rounded-3xl border border-slate-200 bg-white p-7 shadow-2xl backdrop:bg-slate-950/40"
    >
      <h2 className="text-xl font-bold">Remove this card?</h2>
      <p className="mt-3 break-words text-sm text-slate-500">{text}</p>
      <div className="mt-5 flex gap-3">
        <button autoFocus className={button} onClick={onCancel}>
          Keep card
        </button>
        <button
          className="rounded-xl bg-rose-600 px-4 py-2 font-semibold text-white"
          onClick={onRemove}
        >
          Remove card
        </button>
      </div>
    </dialog>
  );
}
export function OrderingBuilder({
  initialActivity,
  initiallySaved = false,
  onDirtyChange,
}: {
  initialActivity: OrderingActivity;
  initiallySaved?: boolean;
  onDirtyChange?: (dirty: boolean) => void;
}) {
  const [activity, setActivity] = useState(initialActivity);
  const [dirty, setDirty] = useState(!initiallySaved);
  const [preview, setPreview] = useState(false);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [showErrors, setShowErrors] = useState(false);
  const [links, setLinks] = useState<LinkRecord[]>([]);
  const [share, setShare] = useState<LinkRecord | null>(null);
  const [removeId, setRemoveId] = useState<string | null>(null);
  useEffect(() => {
    onDirtyChange?.(dirty);
  }, [dirty, onDirtyChange]);
  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);
  useEffect(() => {
    try {
      const entries: unknown = JSON.parse(
        localStorage.getItem("esl-ordering-links-v1") || "[]",
      );
      if (Array.isArray(entries))
        setLinks(
          entries.filter(
            (e): e is LinkRecord =>
              Boolean(e) &&
              typeof e.code === "string" &&
              /^[a-f0-9]{32}$/.test(e.code) &&
              typeof e.activityId === "string" &&
              typeof e.title === "string",
          ),
        );
    } catch {
      /* Optional link history. */
    }
  }, []);
  function change(next: OrderingActivity) {
    setActivity(next);
    setDirty(true);
  }
  function move(index: number, offset: number) {
    const items = [...activity.config.items];
    if (index + offset < 0 || index + offset >= items.length) return;
    [items[index], items[index + offset]] = [
      items[index + offset],
      items[index],
    ];
    change({ ...activity, config: { ...activity.config, items } });
  }
  async function save() {
    setBusy(true);
    try {
      saveDeviceActivity(orderingSchema.parse(activity));
      setDirty(false);
      const result = await saveInteractiveDraft(activity);
      setNotice(
        result.ok
          ? "Saved on this device and synced to your account."
          : `Saved on this device. ${result.message}`,
      );
    } catch {
      setNotice(
        "Could not save the draft. Check device storage and card fields.",
      );
    } finally {
      setBusy(false);
    }
  }
  async function publish() {
    setShowErrors(true);
    if (orderingErrors(activity).length) return;
    setBusy(true);
    try {
      saveDeviceActivity(activity);
      setDirty(false);
      const saved = await saveInteractiveDraft(activity);
      if (!saved.ok) {
        setNotice(saved.message);
        return;
      }
      const result = await publishInteractive(activity);
      if (!result.ok) {
        setNotice(result.message);
        return;
      }
      const link = {
        code: result.code,
        activityId: activity.id,
        title: activity.title,
      };
      const next = [link, ...links];
      setLinks(next);
      setShare(link);
      try {
        localStorage.setItem("esl-ordering-links-v1", JSON.stringify(next));
      } catch {
        /* Link remains visible. */
      }
      setNotice(
        "Published an unlisted snapshot. Later edits do not change this link.",
      );
    } catch {
      setNotice("Publishing failed. Your device draft is available.");
    } finally {
      setBusy(false);
    }
  }
  const errors = showErrors ? orderingErrors(activity) : [];
  return (
    <div lang="en">
      <fieldset
        disabled={busy}
        className="min-w-0 rounded-3xl border border-slate-200 bg-white shadow-sm"
      >
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 p-5">
          <div>
            <h2 className="font-bold">
              {preview ? "Simple Order · Learner preview" : "Edit Simple Order"}
            </h2>
            <p className="mt-1 text-xs text-slate-500">
              {dirty ? "Unsaved changes" : "Draft saved"}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button className={button} onClick={save}>
              {busy ? "Working…" : "Save draft"}
            </button>
            <button
              className={button}
              onClick={() => {
                if (!preview) {
                  setShowErrors(true);
                  if (orderingErrors(activity).length) return;
                }
                setPreview(!preview);
              }}
            >
              {preview ? "Edit again" : "Preview"}
            </button>
            <button
              className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white"
              onClick={publish}
            >
              Publish & share
            </button>
          </div>
        </header>
        {notice ? (
          <p
            role="status"
            className="m-5 rounded-xl bg-indigo-50 p-4 text-sm text-indigo-800"
          >
            {notice}
          </p>
        ) : null}
        {errors.length ? (
          <div
            role="alert"
            className="m-5 rounded-xl bg-rose-50 p-4 text-sm text-rose-800"
          >
            <p className="font-bold">Before previewing or publishing:</p>
            <ul className="mt-2 list-inside list-disc">
              {errors.map((e) => (
                <li key={e}>{e}</li>
              ))}
            </ul>
          </div>
        ) : null}
        {preview ? (
          <OrderingPlayer activity={activity} />
        ) : (
          <div className="space-y-6 p-5 sm:p-7">
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="text-sm font-semibold sm:col-span-2">
                Title
                <input
                  className={field}
                  maxLength={200}
                  value={activity.title}
                  onChange={(e) =>
                    change({ ...activity, title: e.target.value })
                  }
                />
              </label>
              <label className="text-sm font-semibold sm:col-span-2">
                Ordering rule shown to learners
                <textarea
                  rows={2}
                  className={field}
                  maxLength={1000}
                  value={activity.config.orderingRule}
                  onChange={(e) =>
                    change({
                      ...activity,
                      config: {
                        ...activity.config,
                        orderingRule: e.target.value,
                      },
                    })
                  }
                />
              </label>
              {(["taskDescription", "help", "feedback"] as const).map((key) => (
                <label key={key} className="text-sm font-semibold">
                  {key === "taskDescription"
                    ? "Task instructions"
                    : key === "help"
                      ? "Optional help"
                      : "Completion feedback"}
                  <textarea
                    className={field}
                    rows={2}
                    maxLength={4000}
                    value={activity[key]}
                    onChange={(e) =>
                      change({ ...activity, [key]: e.target.value })
                    }
                  />
                </label>
              ))}
            </div>
            <section>
              <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="font-bold">
                    Correct answer order · {activity.config.items.length} cards
                  </h3>
                  <p className="mt-1 text-sm text-slate-500">
                    Arrange the teacher’s answer here, from first to last.
                    Learners get shuffled cards.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    className={button}
                    onClick={() =>
                      change({
                        ...activity,
                        config: {
                          ...activity.config,
                          items: [...activity.config.items].sort((a, b) =>
                            a.text.localeCompare(b.text, "en", {
                              sensitivity: "base",
                              numeric: true,
                            }),
                          ),
                          orderingRule:
                            "Put the cards in English alphabetical order (A–Z), comparing numbers numerically.",
                        },
                      })
                    }
                  >
                    Sort A–Z
                  </button>
                  <button
                    className={button}
                    disabled={activity.config.items.length >= 40}
                    onClick={() =>
                      change({
                        ...activity,
                        config: {
                          ...activity.config,
                          items: [
                            ...activity.config.items,
                            { id: crypto.randomUUID(), text: "", hint: "" },
                          ],
                        },
                      })
                    }
                  >
                    <Plus size={15} />
                    Add card
                  </button>
                </div>
              </div>
              <ol className="space-y-3">
                {activity.config.items.map((item, index) => (
                  <li
                    key={item.id}
                    className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-3"
                  >
                    <span className="mt-2 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-xs font-bold text-indigo-700">
                      {index + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <label className="text-xs font-semibold">
                        Card {index + 1}
                        <textarea
                          className={field}
                          rows={2}
                          maxLength={500}
                          value={item.text}
                          onChange={(e) =>
                            change({
                              ...activity,
                              config: {
                                ...activity.config,
                                items: activity.config.items.map((i) =>
                                  i.id === item.id
                                    ? { ...i, text: e.target.value }
                                    : i,
                                ),
                              },
                            })
                          }
                        />
                      </label>
                      <label className="mt-2 block text-xs text-slate-500">
                        Optional hint
                        <input
                          className={field}
                          maxLength={300}
                          value={item.hint}
                          onChange={(e) =>
                            change({
                              ...activity,
                              config: {
                                ...activity.config,
                                items: activity.config.items.map((i) =>
                                  i.id === item.id
                                    ? { ...i, hint: e.target.value }
                                    : i,
                                ),
                              },
                            })
                          }
                        />
                      </label>
                    </div>
                    <div className="mt-4 flex shrink-0 flex-col gap-1">
                      <button
                        className="rounded-lg border border-slate-200 bg-white p-2 disabled:opacity-25"
                        aria-label={`Move card ${index + 1} up`}
                        disabled={index === 0}
                        onClick={() => move(index, -1)}
                      >
                        <ArrowUp size={14} />
                      </button>
                      <button
                        className="rounded-lg border border-slate-200 bg-white p-2 disabled:opacity-25"
                        aria-label={`Move card ${index + 1} down`}
                        disabled={index === activity.config.items.length - 1}
                        onClick={() => move(index, 1)}
                      >
                        <ArrowDown size={14} />
                      </button>
                      <button
                        className="rounded-lg border border-slate-200 bg-white p-2 disabled:opacity-25"
                        aria-label={`Duplicate card ${index + 1}`}
                        disabled={activity.config.items.length >= 40}
                        onClick={() => {
                          const items = [...activity.config.items];
                          items.splice(index + 1, 0, {
                            ...item,
                            id: crypto.randomUUID(),
                          });
                          change({
                            ...activity,
                            config: { ...activity.config, items },
                          });
                        }}
                      >
                        <Copy size={14} />
                      </button>
                      <button
                        className="rounded-lg border border-slate-200 bg-white p-2 text-rose-600"
                        aria-label={`Remove card ${index + 1}`}
                        onClick={() => {
                          if (item.text.trim()) setRemoveId(item.id);
                          else
                            change({
                              ...activity,
                              config: {
                                ...activity.config,
                                items: activity.config.items.filter(
                                  (i) => i.id !== item.id,
                                ),
                              },
                            });
                        }}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </li>
                ))}
              </ol>
            </section>
            <section className="grid gap-4 rounded-2xl bg-slate-50 p-4 sm:grid-cols-3">
              <label className="text-sm font-semibold">
                Checking
                <select
                  className={field}
                  value={activity.config.checkMode}
                  onChange={(e) =>
                    change({
                      ...activity,
                      config: {
                        ...activity.config,
                        checkMode: e.target.value as "manual" | "automatic",
                      },
                    })
                  }
                >
                  <option value="manual">Manual · Check answers</option>
                  <option value="automatic">
                    Automatic · immediate feedback
                  </option>
                </select>
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={activity.config.speech}
                  onChange={(e) =>
                    change({
                      ...activity,
                      config: { ...activity.config, speech: e.target.checked },
                    })
                  }
                />
                Read-aloud cards
              </label>
              <label className="text-sm font-semibold">
                Speech locale
                <input
                  className={field}
                  maxLength={40}
                  value={activity.config.speechLocale}
                  onChange={(e) =>
                    change({
                      ...activity,
                      config: {
                        ...activity.config,
                        speechLocale: e.target.value,
                      },
                    })
                  }
                />
              </label>
            </section>
          </div>
        )}
      </fieldset>
      {links.some((l) => l.activityId === activity.id) ? (
        <div
          className="mt-4 flex flex-wrap gap-2"
          aria-label="Published snapshots"
        >
          {links
            .filter((l) => l.activityId === activity.id)
            .map((link, index) => (
              <button
                key={link.code}
                className={button}
                onClick={() => setShare(link)}
              >
                {index === 0
                  ? "Latest published snapshot"
                  : `Earlier snapshot ${index}`}
              </button>
            ))}
        </div>
      ) : null}
      {share ? (
        <ActivitySharePanel
          code={share.code}
          title={share.title}
          path="ordering"
          onRevoked={() => {
            const next = links.filter((l) => l.code !== share.code);
            setLinks(next);
            setShare(null);
            try {
              localStorage.setItem(
                "esl-ordering-links-v1",
                JSON.stringify(next),
              );
            } catch {
              /* Revoked remotely. */
            }
          }}
        />
      ) : null}
      {removeId ? (
        <RemoveCardDialog
          text={
            activity.config.items.find((i) => i.id === removeId)?.text || ""
          }
          onCancel={() => setRemoveId(null)}
          onRemove={() => {
            change({
              ...activity,
              config: {
                ...activity.config,
                items: activity.config.items.filter((i) => i.id !== removeId),
              },
            });
            setRemoveId(null);
          }}
        />
      ) : null}
    </div>
  );
}
