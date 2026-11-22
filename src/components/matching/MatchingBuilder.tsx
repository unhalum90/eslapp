"use client";
import { useEffect, useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  Copy,
  Link2,
  Plus,
  Puzzle,
  Sparkles,
  Trash2,
} from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { AgentSelector } from "@/components/ai/AgentSelector";
import { useAiAgentStore } from "@/lib/store/useAiAgentStore";
import { extractMatchingVocabulary } from "@/app/actions/matchingUpload";
import { VocabularyUpload } from "./VocabularyUpload";
import { generateMatchingActivity } from "@/app/actions/matchingAi";
import {
  listMatchingDrafts,
  publishMatching,
  saveMatchingDraft,
  unpublishMatching,
} from "@/app/actions/matching";
import {
  activitySchema,
  cardErrors,
  configured,
  exampleActivity,
  newActivity,
  newCard,
  newPair,
  uid,
  validationErrors,
  type MatchingActivity,
  type MatchingCard,
} from "@/lib/matching/domain";
import { MatchingDialog, MatchingPlayer } from "./MatchingPlayer";

const inputClass =
  "mt-1 w-full min-w-0 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 focus:border-indigo-500 focus:outline-2 focus:outline-indigo-200";
const buttonClass =
  "inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40";
const STORAGE = "esl-matching-drafts-v1";
type Publication = { code: string; activityId: string; title: string };

function CardEditor({
  card,
  onChange,
  errors,
  label,
}: {
  card: MatchingCard;
  onChange: (card: MatchingCard) => void;
  errors: boolean;
  label: string;
}) {
  const patch = (value: Partial<MatchingCard>) =>
    onChange({ ...card, ...value });
  const issues = errors ? cardErrors(card) : [];
  return (
    <fieldset className="min-w-0 rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <legend className="px-1 text-xs font-bold uppercase tracking-wide text-slate-500">
        {label}
      </legend>
      <label className="block text-xs font-semibold">
        Card type
        <select
          className={inputClass}
          value={card.type}
          onChange={(e) => {
            const type = e.target.value as MatchingCard["type"];
            if (
              type !== card.type &&
              configured(card) &&
              !confirm(
                "Change this card’s type? Its existing content will be kept in the draft.",
              )
            )
              return;
            patch({ type });
          }}
        >
          <option value="text">Text</option>
          <option value="speech">Text to speech</option>
          <option value="image">Image URL</option>
          <option value="audio">Audio URL</option>
          <option value="video">Video URL (.mp4)</option>
        </select>
      </label>
      {card.type === "text" || card.type === "speech" ? (
        <label className="mt-3 block text-xs font-semibold">
          Text
          <textarea
            aria-invalid={issues.length > 0}
            maxLength={4000}
            rows={2}
            className={inputClass}
            value={card.text}
            onChange={(e) => patch({ text: e.target.value })}
          />
        </label>
      ) : (
        <>
          <label className="mt-3 block text-xs font-semibold">
            Public HTTPS {card.type} URL
            <input
              type="url"
              maxLength={2000}
              className={inputClass}
              value={card.media.url}
              onChange={(e) =>
                patch({ media: { ...card.media, url: e.target.value } })
              }
            />
          </label>
          <label className="mt-3 block text-xs font-semibold">
            {card.type === "image"
              ? "Image description (alt text)"
              : "Accessible description"}
            <input
              maxLength={300}
              className={inputClass}
              value={card.media.label}
              onChange={(e) =>
                patch({ media: { ...card.media, label: e.target.value } })
              }
            />
          </label>
          {card.type !== "image" ? (
            <div className="mt-3 grid grid-cols-2 gap-3">
              {(["startSeconds", "endSeconds"] as const).map((key) => (
                <label key={key} className="text-xs font-semibold">
                  {key === "startSeconds" ? "Start (seconds)" : "End (seconds)"}
                  <input
                    type="number"
                    min={0}
                    max={86400}
                    step="0.1"
                    className={inputClass}
                    value={card.media[key] ?? ""}
                    onChange={(e) =>
                      patch({
                        media: {
                          ...card.media,
                          [key]:
                            e.target.value === ""
                              ? undefined
                              : Math.max(0, Number(e.target.value)),
                        },
                      })
                    }
                  />
                </label>
              ))}
            </div>
          ) : null}
          {card.type === "video" ? (
            <label className="mt-3 flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={card.media.muted ?? false}
                onChange={(e) =>
                  patch({ media: { ...card.media, muted: e.target.checked } })
                }
              />
              Start muted
            </label>
          ) : null}
        </>
      )}
      {card.type === "speech" ? (
        <label className="mt-3 block text-xs font-semibold">
          Speech language
          <select
            value={card.locale}
            className={inputClass}
            onChange={(e) => patch({ locale: e.target.value })}
          >
            {[
              ...new Set([
                card.locale,
                "en-GB",
                "en-US",
                "fr-FR",
                "es-ES",
                "de-DE",
                "it-IT",
              ]),
            ].map((locale) => (
              <option key={locale}>{locale}</option>
            ))}
          </select>
          <span className="mt-1 block font-normal text-slate-500">
            Uses the learner’s browser voices; no paid speech service.
          </span>
        </label>
      ) : null}
      <label className="mt-3 block text-xs font-semibold">
        Hint (optional)
        <input
          className={inputClass}
          maxLength={4000}
          value={card.hint}
          onChange={(e) => patch({ hint: e.target.value })}
        />
      </label>
      {issues.map((issue) => (
        <p key={issue} className="mt-2 text-xs text-rose-700">
          {issue}
        </p>
      ))}
    </fieldset>
  );
}

export function MatchingBuilder({
  initialActivity,
  embedded = false,
  initiallySaved = false,
  onDirtyChange,
}: {
  initialActivity?: MatchingActivity;
  embedded?: boolean;
  initiallySaved?: boolean;
  onDirtyChange?: (dirty: boolean) => void;
}) {
  const [activity, setActivity] = useState<MatchingActivity | null>(
    initialActivity ?? null,
  );
  const [library, setLibrary] = useState<MatchingActivity[]>([]);
  const [publications, setPublications] = useState<Publication[]>([]);
  const [source, setSource] = useState("");
  const [level, setLevel] = useState("A1");
  const [language, setLanguage] = useState("English");
  const [pairCount, setPairCount] = useState(6);
  const [speech, setSpeech] = useState(false);
  const [busy, setBusy] = useState("");
  const [notice, setNotice] = useState("");
  const [showErrors, setShowErrors] = useState(false);
  const [preview, setPreview] = useState(false);
  const [dirty, setDirty] = useState(
    Boolean(initialActivity) && !initiallySaved,
  );
  useEffect(() => {
    onDirtyChange?.(dirty);
  }, [dirty, onDirtyChange]);
  const [share, setShare] = useState<Publication | null>(null);
  const [qr, setQr] = useState(false);
  const selectedAgent = useAiAgentStore((s) => s.selectedAgent);
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE) || "[]");
      if (Array.isArray(saved)) {
        const valid = saved.flatMap((item) => {
          const result = activitySchema.safeParse(item);
          return result.success ? [result.data] : [];
        });
        // Initial browser-only draft hydration; never runs during server rendering.
        setLibrary(valid);
      }
      const links = JSON.parse(
        localStorage.getItem(STORAGE + "-links") || "[]",
      );
      if (Array.isArray(links))
        setPublications(
          links.filter(
            (p) =>
              typeof p.code === "string" &&
              /^[a-f0-9]{32}$/.test(p.code) &&
              typeof p.activityId === "string" &&
              typeof p.title === "string",
          ),
        );
    } catch {
      setNotice(
        "Device drafts could not be read. You can still create a new activity.",
      );
    }
  }, []);
  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => {
      e.preventDefault();
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);
  function change(next: MatchingActivity) {
    setActivity(next);
    setDirty(true);
  }
  function open(next: MatchingActivity) {
    if (
      dirty &&
      !confirm("Discard your unsaved changes and open this activity?")
    )
      return;
    setActivity(next);
    setDirty(false);
    setPreview(false);
    setShowErrors(false);
    setShare(null);
    setNotice("");
  }
  function saveDevice(value: MatchingActivity) {
    const parsed = activitySchema.parse(value);
    const next = [parsed, ...library.filter((a) => a.id !== parsed.id)];
    localStorage.setItem(STORAGE, JSON.stringify(next));
    setLibrary(next);
    setDirty(false);
  }
  async function save() {
    if (!activity) return;
    setBusy("save");
    try {
      saveDevice(activity);
      const result = await saveMatchingDraft(activity);
      setNotice(
        result.ok
          ? "Draft saved on this device and synced to your account."
          : `Saved on this device. ${result.message}`,
      );
    } catch {
      setNotice(
        "The draft could not be saved. Device storage may be full or unavailable.",
      );
    } finally {
      setBusy("");
    }
  }
  async function generate() {
    if (dirty && !confirm("Generate a new draft and replace unsaved edits?"))
      return;
    setBusy("generate");
    setNotice("");
    try {
      const result = await generateMatchingActivity({
        source,
        level,
        language,
        pairCount,
        speech,
        agent: selectedAgent,
      });
      if (!result.ok) {
        setNotice(result.message);
        return;
      }
      setActivity(result.activity);
      setDirty(true);
      setPreview(false);
      setShowErrors(false);
      setShare(null);
      setNotice(
        "Your AI draft is ready. Review the pairs, then preview and publish.",
      );
    } catch {
      setNotice(
        "The agent could not be reached. Your existing draft is intact.",
      );
    } finally {
      setBusy("");
    }
  }
  async function generateFromFile(file: File) {
    if (
      !Number.isInteger(pairCount) ||
      pairCount < 2 ||
      pairCount > 16 ||
      language.trim().length < 2
    ) {
      setNotice(
        "Choose 2–16 pairs and a content language before creating from a file.",
      );
      return;
    }
    if (dirty && !confirm("Create from this file and replace unsaved edits?"))
      return;
    setBusy("extract");
    setNotice("");
    try {
      const form = new FormData();
      form.set("file", file);
      form.set("agent", selectedAgent);
      const extracted = await extractMatchingVocabulary(form);
      if (!extracted.ok) {
        setNotice(extracted.message);
        return;
      }
      setSource(extracted.source);
      const count = Math.min(pairCount, extracted.vocabulary.length);
      setBusy("file-generate");
      setNotice(
        `Found ${extracted.vocabulary.length} vocabulary terms. Creating ${count} matching pairs…`,
      );
      const result = await generateMatchingActivity({
        source: `Use only the following extracted vocabulary terms for the first cards. Preserve any supplied meanings or translations; supply suitable definitions only where a meaning is missing. Do not invent additional vocabulary terms.\n\n${extracted.source}`,
        level,
        language,
        pairCount: count,
        speech,
        agent: selectedAgent,
      });
      if (!result.ok) {
        setNotice(
          `Vocabulary extracted and kept in the source box. ${result.message}`,
        );
        return;
      }
      setActivity(result.activity);
      setPairCount(count);
      setDirty(true);
      setPreview(false);
      setShowErrors(false);
      setShare(null);
      setNotice(
        `Created ${count} pairs from “${file.name}”. Review the extracted vocabulary above and edit the activity below.${count < pairCount ? " Fewer source terms were available, so the pair count was reduced." : ""}${extracted.note ? ` ${extracted.note}` : ""}`,
      );
    } catch {
      setNotice(
        "Could not finish creating from the file. Any extracted vocabulary is kept in the source box; your previous draft is intact.",
      );
    } finally {
      setBusy("");
    }
  }
  async function publish() {
    if (!activity) return;
    setShowErrors(true);
    if (validationErrors(activity).length) {
      setNotice("Fix the highlighted fields before publishing.");
      return;
    }
    setBusy("publish");
    try {
      saveDevice(activity);
      const saved = await saveMatchingDraft(activity);
      if (!saved.ok) {
        setNotice(saved.message);
        return;
      }
      const result = await publishMatching(activity);
      if (!result.ok) {
        setNotice(result.message);
        return;
      }
      const publication = {
        code: result.code,
        activityId: activity.id,
        title: activity.title,
      };
      const next = [publication, ...publications];
      setPublications(next);
      setShare(publication);
      try {
        localStorage.setItem(STORAGE + "-links", JSON.stringify(next));
      } catch {
        /* Published link remains visible for copying. */
      }
      setNotice(
        "Published an unlisted snapshot. Anyone with its link can play. Later edits do not change this link.",
      );
    } catch {
      setNotice("Publishing failed. Save your draft and try again.");
    } finally {
      setBusy("");
    }
  }
  async function copy(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setNotice("Copied to clipboard.");
    } catch {
      setNotice("Clipboard unavailable. Select and copy the text manually.");
    }
  }
  const errors = activity && showErrors ? validationErrors(activity) : [];
  const shareUrl =
    share && typeof window !== "undefined"
      ? `${window.location.origin}/play/matching/${share.code}`
      : "";
  const embed =
    share && typeof window !== "undefined"
      ? `<iframe src="${window.location.origin}/embed/matching/${share.code}" title="Matching Pairs" width="100%" height="760" style="border:0" allow="fullscreen" loading="lazy"></iframe>`
      : "";

  return (
    <div lang="en" className="mx-auto max-w-6xl pb-12">
      {!embedded ? (
        <header className="mb-7 flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1 text-xs font-bold text-indigo-700">
              <Puzzle size={14} />
              Interactive activities · First proof
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900">
              Matching Pairs
            </h1>
            <p className="mt-2 max-w-xl text-slate-500">
              A small connection. A little discovery. Let your AI agent turn
              lesson ideas into pairs your learners can play.
            </p>
          </div>
          <AgentSelector />
        </header>
      ) : null}
      {notice ? (
        <p
          role="status"
          className="mb-5 rounded-xl border border-indigo-200 bg-indigo-50 p-4 text-sm text-indigo-900"
        >
          {notice}
        </p>
      ) : null}
      {!embedded ? (
        <>
          <section
            aria-label="Create with AI"
            className="mb-7 rounded-3xl border border-indigo-200 bg-gradient-to-br from-white to-indigo-50 p-5 sm:p-7"
          >
            <h2 className="flex items-center gap-2 text-lg font-bold text-slate-900">
              <Sparkles size={20} className="text-indigo-600" />
              Start with your lesson idea
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Paste vocabulary, a topic, or a lesson extract. The agent creates
              a draft; you make it classroom-ready.
            </p>
            <label className="mt-4 block text-sm font-semibold">
              Topic or source material
              <textarea
                rows={3}
                maxLength={10000}
                className={inputClass}
                value={source}
                onChange={(e) => setSource(e.target.value)}
                placeholder="e.g. A1 food vocabulary: match apple, bread, milk… with simple definitions in English."
              />
            </label>
            <div className="mt-4 flex flex-wrap items-end gap-4">
              <label className="text-xs font-semibold">
                Level
                <select
                  className={inputClass}
                  value={level}
                  onChange={(e) => setLevel(e.target.value)}
                >
                  {["A1", "A2", "B1", "B2"].map((l) => (
                    <option key={l}>{l}</option>
                  ))}
                </select>
              </label>
              <label className="text-xs font-semibold">
                Content language
                <input
                  maxLength={80}
                  className={inputClass}
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                />
              </label>
              <label className="text-xs font-semibold">
                Pairs
                <input
                  type="number"
                  min={2}
                  max={16}
                  className={inputClass + " max-w-24"}
                  value={pairCount}
                  onChange={(e) => setPairCount(Number(e.target.value))}
                />
              </label>
              <label className="flex items-center gap-2 py-2 text-sm">
                <input
                  type="checkbox"
                  checked={speech}
                  onChange={(e) => setSpeech(e.target.checked)}
                />
                Read-aloud first cards
              </label>
              <button
                className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
                disabled={
                  Boolean(busy) ||
                  !source.trim() ||
                  !language.trim() ||
                  pairCount < 2 ||
                  pairCount > 16
                }
                onClick={generate}
              >
                <Sparkles size={16} />
                {busy === "generate"
                  ? "Agent is creating pairs…"
                  : "Generate with AI"}
              </button>
            </div>
            <VocabularyUpload busy={busy} onCreate={generateFromFile} />
          </section>
          <div className="mb-6 flex flex-wrap items-center gap-3">
            <button
              disabled={Boolean(busy)}
              className={buttonClass}
              onClick={() => open(newActivity())}
            >
              <Plus size={16} />
              Create manually
            </button>
            <button
              disabled={Boolean(busy)}
              className={buttonClass}
              onClick={() => {
                open(exampleActivity());
              }}
            >
              Try animals example
            </button>
            <button
              disabled={Boolean(busy)}
              className={buttonClass}
              onClick={() => open(exampleActivity(1))}
            >
              Try opposites example
            </button>
            <button
              disabled={Boolean(busy)}
              className={buttonClass}
              onClick={async () => {
                setBusy("load");
                try {
                  const result = await listMatchingDrafts();
                  if (!result.ok) setNotice(result.message);
                  else {
                    const merged = [
                      ...result.activities,
                      ...library.filter(
                        (a) => !result.activities.some((b) => a.id === b.id),
                      ),
                    ];
                    setLibrary(merged);
                    setNotice(
                      "Cloud drafts loaded. Select a draft below to open it.",
                    );
                  }
                } catch {
                  setNotice("Could not load cloud drafts.");
                } finally {
                  setBusy("");
                }
              }}
            >
              Load cloud drafts
            </button>
          </div>
          {library.length ? (
            <section aria-label="Saved drafts" className="mb-7">
              <h2 className="mb-3 text-sm font-bold text-slate-500">
                YOUR DRAFTS
              </h2>
              <div className="flex flex-wrap gap-2">
                {library.map((a) => (
                  <button
                    key={a.id}
                    disabled={Boolean(busy)}
                    className={buttonClass}
                    onClick={() => open(a)}
                  >
                    {a.title || "Untitled draft"}
                    <span className="text-xs font-normal text-slate-400">
                      {a.config.pairs.length} pairs
                    </span>
                  </button>
                ))}
              </div>
            </section>
          ) : null}
        </>
      ) : null}
      {activity ? (
        <fieldset
          aria-label="Activity editor"
          disabled={Boolean(busy)}
          className="min-w-0 rounded-3xl border border-slate-200 bg-white shadow-sm"
        >
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 p-5">
            <div>
              <h2 className="font-bold">
                {preview ? "Learner preview" : "Edit your activity"}
              </h2>
              <p className="mt-1 text-xs text-slate-500">
                {dirty ? "Unsaved changes" : "Draft"} · Preview stays private
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                disabled={Boolean(busy)}
                className={buttonClass}
                onClick={save}
              >
                {busy === "save" ? "Saving…" : "Save draft"}
              </button>
              <button
                disabled={Boolean(busy)}
                className={buttonClass}
                onClick={() => {
                  if (!preview) {
                    setShowErrors(true);
                    if (validationErrors(activity).length) {
                      setNotice(
                        "Complete the highlighted fields to preview. Incomplete drafts can still be saved.",
                      );
                      return;
                    }
                  }
                  setPreview(!preview);
                }}
              >
                {preview ? "Edit again" : "Preview"}
              </button>
              <button
                disabled={Boolean(busy)}
                className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-40"
                onClick={publish}
              >
                {busy === "publish" ? "Publishing…" : "Publish & share"}
              </button>
            </div>
          </div>
          {errors.length ? (
            <div
              role="alert"
              className="m-5 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800"
            >
              <p className="font-bold">Before previewing or publishing:</p>
              <ul className="mt-2 list-inside list-disc">
                {errors.map((error, i) => (
                  <li key={i}>
                    <a className="underline" href={`#${error.path}`}>
                      {error.message}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
          {preview ? (
            <MatchingPlayer key={activity.id} activity={activity} />
          ) : (
            <div className="space-y-7 p-5 sm:p-7">
              <div className="grid gap-4 sm:grid-cols-2">
                <label
                  id="title"
                  className="text-sm font-semibold sm:col-span-2"
                >
                  Activity title
                  <input
                    aria-invalid={showErrors && !activity.title.trim()}
                    maxLength={200}
                    className={inputClass}
                    value={activity.title}
                    onChange={(e) =>
                      change({ ...activity, title: e.target.value })
                    }
                  />
                </label>
                {(["taskDescription", "help", "feedback"] as const).map(
                  (key) => (
                    <label key={key} className="text-sm font-semibold">
                      {key === "taskDescription"
                        ? "Task instructions (optional)"
                        : key === "help"
                          ? "Activity help (optional)"
                          : "Completion feedback"}
                      <textarea
                        maxLength={4000}
                        rows={2}
                        className={inputClass}
                        value={activity[key]}
                        onChange={(e) =>
                          change({ ...activity, [key]: e.target.value })
                        }
                      />
                    </label>
                  ),
                )}
              </div>
              <section id="pairs">
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="font-bold">
                    Your pairs{" "}
                    <span className="ml-1 text-slate-400">
                      {activity.config.pairs.length}
                    </span>
                  </h3>
                  <span className="text-xs text-slate-500">2–50 pairs</span>
                </div>
                <div className="space-y-4">
                  {activity.config.pairs.map((pair, index) => (
                    <section
                      key={pair.id}
                      className="rounded-2xl border border-slate-200 p-4"
                    >
                      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                        <h4 className="text-sm font-bold">Pair {index + 1}</h4>
                        <div className="flex flex-wrap gap-1">
                          {([-1, 1] as const).map((offset) => (
                            <button
                              key={offset}
                              title={
                                offset < 0 ? "Move pair up" : "Move pair down"
                              }
                              aria-label={`${offset < 0 ? "Move up" : "Move down"} pair ${index + 1}`}
                              disabled={
                                index + offset < 0 ||
                                index + offset >= activity.config.pairs.length
                              }
                              className="rounded-lg border p-2 disabled:opacity-25"
                              onClick={() => {
                                const pairs = [...activity.config.pairs];
                                [pairs[index], pairs[index + offset]] = [
                                  pairs[index + offset],
                                  pairs[index],
                                ];
                                change({
                                  ...activity,
                                  config: { ...activity.config, pairs },
                                });
                              }}
                            >
                              {offset < 0 ? (
                                <ArrowUp size={14} />
                              ) : (
                                <ArrowDown size={14} />
                              )}
                            </button>
                          ))}
                          <button
                            disabled={activity.config.pairs.length >= 50}
                            className={buttonClass}
                            onClick={() => {
                              const copy = {
                                ...pair,
                                id: uid(),
                                first: { ...pair.first, id: uid() },
                                second: { ...pair.second, id: uid() },
                              };
                              const pairs = [...activity.config.pairs];
                              pairs.splice(index + 1, 0, copy);
                              change({
                                ...activity,
                                config: { ...activity.config, pairs },
                              });
                            }}
                          >
                            <Copy size={14} />
                            Duplicate
                          </button>
                          <button
                            aria-label={`Remove pair ${index + 1}`}
                            className="rounded-lg border p-2 text-rose-600 disabled:opacity-25"
                            disabled={activity.config.pairs.length <= 1}
                            onClick={() => {
                              if (
                                (configured(pair.first) ||
                                  configured(pair.second)) &&
                                !confirm(
                                  `Remove pair ${index + 1} and its content?`,
                                )
                              )
                                return;
                              change({
                                ...activity,
                                config: {
                                  ...activity.config,
                                  pairs: activity.config.pairs.filter(
                                    (p) => p.id !== pair.id,
                                  ),
                                },
                              });
                            }}
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                      <div className="grid gap-4 md:grid-cols-2">
                        {(["first", "second"] as const).map((side) => (
                          <div key={side} id={`pair-${index}-${side}`}>
                            <CardEditor
                              card={pair[side]}
                              label={side === "first" ? "Side A" : "Side B"}
                              errors={showErrors}
                              onChange={(card) =>
                                change({
                                  ...activity,
                                  config: {
                                    ...activity.config,
                                    pairs: activity.config.pairs.map((p) =>
                                      p.id === pair.id
                                        ? { ...p, [side]: card }
                                        : p,
                                    ),
                                  },
                                })
                              }
                            />
                          </div>
                        ))}
                      </div>
                    </section>
                  ))}
                </div>
                <button
                  className={buttonClass + " mt-4"}
                  disabled={activity.config.pairs.length >= 50}
                  onClick={() =>
                    change({
                      ...activity,
                      config: {
                        ...activity.config,
                        pairs: [...activity.config.pairs, newPair()],
                      },
                    })
                  }
                >
                  <Plus size={16} />
                  Add pair
                </button>
              </section>
              <section>
                <h3 className="font-bold">Extra cards</h3>
                <p className="mt-1 text-sm text-slate-500">
                  Up to three distractors with no correct partner. Empty extras
                  are ignored.
                </p>
                <div className="mt-4 grid gap-4 md:grid-cols-3">
                  {activity.config.decoys.map((card, i) => (
                    <div key={card.id} id={`decoy-${i}`}>
                      <CardEditor
                        card={card}
                        label={`Extra ${i + 1}`}
                        errors={showErrors && configured(card)}
                        onChange={(next) =>
                          change({
                            ...activity,
                            config: {
                              ...activity.config,
                              decoys: activity.config.decoys.map((c) =>
                                c.id === card.id ? next : c,
                              ),
                            },
                          })
                        }
                      />
                      <button
                        className="mt-2 text-sm text-rose-700 underline"
                        onClick={() => {
                          if (
                            configured(card) &&
                            !confirm("Remove this extra card?")
                          )
                            return;
                          change({
                            ...activity,
                            config: {
                              ...activity.config,
                              decoys: activity.config.decoys.filter(
                                (c) => c.id !== card.id,
                              ),
                            },
                          });
                        }}
                      >
                        Remove extra card
                      </button>
                    </div>
                  ))}
                </div>
                <button
                  className={buttonClass + " mt-4"}
                  disabled={activity.config.decoys.length >= 3}
                  onClick={() =>
                    change({
                      ...activity,
                      config: {
                        ...activity.config,
                        decoys: [...activity.config.decoys, newCard()],
                      },
                    })
                  }
                >
                  <Plus size={16} />
                  Add extra card
                </button>
              </section>
              <section className="rounded-2xl bg-slate-50 p-5">
                <h3 className="mb-4 font-bold">How it plays</h3>
                <div className="grid gap-4 sm:grid-cols-3">
                  <label className="text-sm font-semibold">
                    Checking
                    <select
                      className={inputClass}
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
                      <option value="manual">
                        Manual · Check answers button
                      </option>
                      <option value="automatic">
                        Automatic · correct pairs disappear
                      </option>
                    </select>
                  </label>
                  <label className="text-sm font-semibold">
                    Attached cards
                    <select
                      className={inputClass}
                      value={activity.config.attachment}
                      onChange={(e) =>
                        change({
                          ...activity,
                          config: {
                            ...activity.config,
                            attachment: e.target.value as
                              "vertical" | "horizontal",
                          },
                        })
                      }
                    >
                      <option value="vertical">One above the other</option>
                      <option value="horizontal">Alongside one another</option>
                    </select>
                  </label>
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={activity.config.colorSides}
                      onChange={(e) =>
                        change({
                          ...activity,
                          config: {
                            ...activity.config,
                            colorSides: e.target.checked,
                          },
                        })
                      }
                    />
                    Color the two sides
                  </label>
                </div>
              </section>
            </div>
          )}
        </fieldset>
      ) : (
        <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-10 text-center">
          <Puzzle className="mx-auto mb-3 text-indigo-400" size={32} />
          <h2 className="font-bold text-slate-800">
            Build your first connection
          </h2>
          <p className="mt-2 text-sm text-slate-500">
            Generate a draft above, create manually, or open a playable example.
          </p>
        </div>
      )}
      {publications.filter((p) => p.activityId === activity?.id).length ? (
        <section className="mt-6 rounded-2xl border bg-white p-5">
          <h2 className="mb-3 font-bold">Published snapshots</h2>
          <p className="mb-3 text-sm text-slate-500">
            Each publication keeps its own stable link. Revoke old links when
            you no longer need them.
          </p>
          <div className="flex flex-wrap gap-2">
            {publications
              .filter((p) => p.activityId === activity?.id)
              .map((p, i) => (
                <button
                  key={p.code}
                  className={buttonClass}
                  onClick={() => setShare(p)}
                >
                  <Link2 size={14} />
                  {i === 0 ? "Latest snapshot" : `Earlier snapshot ${i}`}
                </button>
              ))}
          </div>
        </section>
      ) : null}
      {share ? (
        <section
          aria-label="Share activity"
          className="mt-6 rounded-3xl border border-emerald-200 bg-emerald-50 p-6"
        >
          <h2 className="text-lg font-bold">Share “{share.title}”</h2>
          <p className="mt-1 text-sm text-slate-600">
            Unlisted · no learner account · attempts stay in the browser
          </p>
          <div className="mt-5 grid gap-6 md:grid-cols-[1fr_auto]">
            <div className="min-w-0">
              <label className="text-xs font-bold">
                Learner link
                <input
                  readOnly
                  className={inputClass}
                  value={shareUrl}
                  onFocus={(e) => e.target.select()}
                />
              </label>
              <div className="mt-2 flex flex-wrap gap-2">
                <button className={buttonClass} onClick={() => copy(shareUrl)}>
                  Copy link
                </button>
                <a
                  className={buttonClass}
                  href={shareUrl}
                  target="_blank"
                  rel="noreferrer"
                >
                  Open learner view
                </a>
              </div>
              <label className="mt-5 block text-xs font-bold">
                Embed in your classroom page
                <textarea
                  readOnly
                  rows={3}
                  className={inputClass}
                  value={embed}
                  onFocus={(e) => e.target.select()}
                />
              </label>
              <button
                className={buttonClass + " mt-2"}
                onClick={() => copy(embed)}
              >
                Copy embed
              </button>
            </div>
            <div className="text-center">
              <div
                id="matching-qr"
                className="inline-block rounded-2xl bg-white p-4"
              >
                <QRCodeSVG value={shareUrl} size={160} marginSize={2} />
              </div>
              <div className="mt-3 flex flex-wrap justify-center gap-2">
                <button className={buttonClass} onClick={() => setQr(true)}>
                  Enlarge QR
                </button>
                <button
                  className={buttonClass}
                  onClick={() => {
                    const svg = document.querySelector("#matching-qr svg");
                    if (!svg) return;
                    const url = URL.createObjectURL(
                      new Blob([new XMLSerializer().serializeToString(svg)], {
                        type: "image/svg+xml",
                      }),
                    );
                    const a = document.createElement("a");
                    a.href = url;
                    a.download = "matching-pairs-qr.svg";
                    a.click();
                    setTimeout(() => URL.revokeObjectURL(url), 1000);
                  }}
                >
                  Download QR
                </button>
              </div>
            </div>
          </div>
          <button
            disabled={Boolean(busy)}
            className="mt-5 text-sm font-semibold text-rose-700 underline"
            onClick={async () => {
              if (
                !confirm(
                  "Revoke this published link? Anyone using it will no longer be able to open a new attempt.",
                )
              )
                return;
              setBusy("revoke");
              try {
                const result = await unpublishMatching(share.code);
                if (!result.ok) {
                  setNotice(result.message);
                  return;
                }
                const next = publications.filter((p) => p.code !== share.code);
                setPublications(next);
                setShare(null);
                try {
                  localStorage.setItem(
                    STORAGE + "-links",
                    JSON.stringify(next),
                  );
                } catch {
                  /* Revocation succeeded remotely. */
                }
                setNotice(
                  "Published link revoked. Existing loaded attempts can finish.",
                );
              } catch {
                setNotice("Could not revoke this link. Try again.");
              } finally {
                setBusy("");
              }
            }}
          >
            Revoke this link
          </button>
        </section>
      ) : null}
      {qr && share ? (
        <MatchingDialog title="Scan to play" onClose={() => setQr(false)}>
          <div className="flex justify-center">
            <QRCodeSVG
              value={shareUrl}
              size={320}
              marginSize={3}
              className="h-auto max-w-full"
            />
          </div>
          <p className="mt-3 break-all text-center text-sm">{shareUrl}</p>
        </MatchingDialog>
      ) : null}
    </div>
  );
}
