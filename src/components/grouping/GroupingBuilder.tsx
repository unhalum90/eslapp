"use client";
import { useEffect, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import {
  groupingSchema,
  groupingErrors,
  type GroupingActivity,
} from "@/lib/grouping/domain";
import { saveDeviceActivity } from "@/lib/interactive/drafts";
import {
  saveInteractiveDraft,
  publishInteractive,
} from "@/app/actions/interactive";
import { ActivitySharePanel } from "@/components/interactive/ActivitySharePanel";
import { GroupingPlayer } from "./GroupingPlayer";
const field =
  "mt-1 w-full min-w-0 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm";
const button =
  "inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold disabled:opacity-40";
type LinkRecord = { code: string; activityId: string; title: string };
export function GroupingBuilder({
  initialActivity,
  initiallySaved = false,
  onDirtyChange,
}: {
  initialActivity: GroupingActivity;
  initiallySaved?: boolean;
  onDirtyChange?: (dirty: boolean) => void;
}) {
  const [activity, setActivity] = useState(initialActivity);
  const [preview, setPreview] = useState(false);
  const [dirty, setDirty] = useState(!initiallySaved);
  useEffect(() => {
    onDirtyChange?.(dirty);
  }, [dirty, onDirtyChange]);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [showErrors, setShowErrors] = useState(false);
  const [links, setLinks] = useState<LinkRecord[]>([]);
  const [share, setShare] = useState<LinkRecord | null>(null);
  useEffect(() => {
    try {
      const records: unknown = JSON.parse(
        localStorage.getItem("esl-grouping-links-v1") || "[]",
      );
      if (Array.isArray(records))
        setLinks(
          records.filter(
            (r): r is LinkRecord =>
              Boolean(r) &&
              typeof r.code === "string" &&
              /^[a-f0-9]{32}$/.test(r.code) &&
              typeof r.activityId === "string" &&
              typeof r.title === "string",
          ),
        );
    } catch {
      /* Link history is optional. */
    }
  }, []);
  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);
  function change(next: GroupingActivity) {
    setActivity(next);
    setDirty(true);
  }
  async function save() {
    setBusy(true);
    try {
      saveDeviceActivity(groupingSchema.parse(activity));
      setDirty(false);
      const result = await saveInteractiveDraft(activity);
      setNotice(
        result.ok
          ? "Saved on this device and synced to your account."
          : `Saved on this device. ${result.message}`,
      );
    } catch {
      setNotice(
        "Could not save this draft. Check device storage and card fields.",
      );
    } finally {
      setBusy(false);
    }
  }
  async function publish() {
    setShowErrors(true);
    if (groupingErrors(activity).length) {
      setNotice("Fix the activity fields before publishing.");
      return;
    }
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
        localStorage.setItem("esl-grouping-links-v1", JSON.stringify(next));
      } catch {
        /* Published link is still visible. */
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
  const errors = showErrors ? groupingErrors(activity) : [];
  return (
    <div lang="en">
      <fieldset
        disabled={busy}
        className="min-w-0 rounded-3xl border border-slate-200 bg-white shadow-sm"
      >
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 p-5">
          <div>
            <h2 className="font-bold">
              {preview
                ? "Group Assignment · Learner preview"
                : "Edit Group Assignment"}
            </h2>
            <p className="mt-1 text-xs text-slate-500">
              {dirty ? "Unsaved edits" : "Review and save your draft"}
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
                  if (groupingErrors(activity).length) return;
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
        </div>
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
              {errors.map((error) => (
                <li key={error}>{error}</li>
              ))}
            </ul>
          </div>
        ) : null}
        {preview ? (
          <GroupingPlayer activity={activity} />
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
              {(["taskDescription", "help", "feedback"] as const).map((key) => (
                <label key={key} className="text-sm font-semibold">
                  {key === "taskDescription"
                    ? "Task instructions"
                    : key === "help"
                      ? "Optional help"
                      : "Completion feedback"}
                  <textarea
                    className={field}
                    maxLength={4000}
                    rows={2}
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
                <h3 className="font-bold">Groups</h3>
                <button
                  className={button}
                  disabled={activity.config.groups.length >= 6}
                  onClick={() =>
                    change({
                      ...activity,
                      config: {
                        ...activity.config,
                        groups: [
                          ...activity.config.groups,
                          { id: crypto.randomUUID(), title: "" },
                        ],
                      },
                    })
                  }
                >
                  <Plus size={15} />
                  Add group
                </button>
              </div>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {activity.config.groups.map((group, index) => (
                  <div
                    key={group.id}
                    className="rounded-xl border border-indigo-100 bg-indigo-50 p-3"
                  >
                    <label className="text-xs font-bold">
                      Group {index + 1}
                      <input
                        className={field}
                        maxLength={100}
                        value={group.title}
                        onChange={(e) =>
                          change({
                            ...activity,
                            config: {
                              ...activity.config,
                              groups: activity.config.groups.map((g) =>
                                g.id === group.id
                                  ? { ...g, title: e.target.value }
                                  : g,
                              ),
                            },
                          })
                        }
                      />
                    </label>
                    <button
                      disabled={activity.config.groups.length <= 2}
                      className="mt-2 text-xs text-rose-700 underline disabled:opacity-30"
                      onClick={() => {
                        if (
                          !confirm(
                            `Remove “${group.title || "this group"}” and its cards?`,
                          )
                        )
                          return;
                        change({
                          ...activity,
                          config: {
                            ...activity.config,
                            groups: activity.config.groups.filter(
                              (g) => g.id !== group.id,
                            ),
                            items: activity.config.items.filter(
                              (i) => i.groupId !== group.id,
                            ),
                          },
                        });
                      }}
                    >
                      Remove group and cards
                    </button>
                  </div>
                ))}
              </div>
            </section>
            <section>
              <div className="mb-3 flex items-center justify-between">
                <h3 className="font-bold">
                  Vocabulary cards · {activity.config.items.length}
                </h3>
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
                          {
                            id: crypto.randomUUID(),
                            text: "",
                            hint: "",
                            groupId: activity.config.groups[0].id,
                          },
                        ],
                      },
                    })
                  }
                >
                  <Plus size={15} />
                  Add card
                </button>
              </div>
              <div className="space-y-3">
                {activity.config.items.map((item, index) => (
                  <div
                    key={item.id}
                    className="grid items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3 sm:grid-cols-[1fr_1fr_auto]"
                  >
                    <div>
                      <label className="text-xs font-semibold">
                        Card {index + 1}
                        <input
                          className={field}
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
                      <details className="mt-2 text-xs text-slate-500">
                        <summary className="cursor-pointer">Hint</summary>
                        <input
                          aria-label={`Hint for card ${index + 1}`}
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
                      </details>
                    </div>
                    <label className="text-xs font-semibold">
                      Correct group
                      <select
                        className={field}
                        value={item.groupId}
                        onChange={(e) =>
                          change({
                            ...activity,
                            config: {
                              ...activity.config,
                              items: activity.config.items.map((i) =>
                                i.id === item.id
                                  ? { ...i, groupId: e.target.value }
                                  : i,
                              ),
                            },
                          })
                        }
                      >
                        {activity.config.groups.map((g) => (
                          <option key={g.id} value={g.id}>
                            {g.title || "Unnamed group"}
                          </option>
                        ))}
                      </select>
                    </label>
                    <button
                      aria-label={`Remove card ${index + 1}`}
                      className="mt-5 rounded-lg border border-slate-200 bg-white p-2 text-rose-600"
                      onClick={() => {
                        if (
                          item.text &&
                          !confirm(`Remove card “${item.text}”?`)
                        )
                          return;
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
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
              </div>
            </section>
            <section className="grid gap-4 rounded-xl bg-slate-50 p-4 sm:grid-cols-3">
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
        <section
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
        </section>
      ) : null}
      {share ? (
        <ActivitySharePanel
          code={share.code}
          title={share.title}
          path="grouping"
          onRevoked={() => {
            const next = links.filter((l) => l.code !== share.code);
            setLinks(next);
            setShare(null);
            try {
              localStorage.setItem(
                "esl-grouping-links-v1",
                JSON.stringify(next),
              );
            } catch {
              /* Revoked on server. */
            }
          }}
        />
      ) : null}
    </div>
  );
}
