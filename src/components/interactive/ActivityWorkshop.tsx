"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  Layers3,
  ListOrdered,
  Puzzle,
  Sparkles,
} from "lucide-react";
import { ConfirmActivityChange } from "./ConfirmActivityChange";
import { AgentSelector } from "@/components/ai/AgentSelector";
import { useAiAgentStore } from "@/lib/store/useAiAgentStore";
import { VocabularyUpload } from "@/components/matching/VocabularyUpload";
import { MatchingBuilder } from "@/components/matching/MatchingBuilder";
import { OrderingBuilder } from "@/components/ordering/OrderingBuilder";
import {
  ACTIVITY_LABELS,
  ACTIVITY_MINIMUMS,
  ACTIVITY_MAXIMUMS,
} from "@/lib/interactive/catalog";
import { generateOrderingActivity } from "@/app/actions/orderingAi";
import { GroupingBuilder } from "@/components/grouping/GroupingBuilder";
import { extractMatchingVocabulary } from "@/app/actions/matchingUpload";
import { generateMatchingActivity } from "@/app/actions/matchingAi";
import { generateGroupingActivity } from "@/app/actions/groupingAi";
import { listInteractiveDrafts } from "@/app/actions/interactive";
import { readDeviceActivities } from "@/lib/interactive/drafts";
import type { InteractiveActivity } from "@/lib/interactive/schema";
const field =
  "mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm";
const button =
  "inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold disabled:opacity-40";
export function ActivityWorkshop() {
  const [source, setSource] = useState("");
  const [stage, setStage] = useState<"source" | "choose" | "editor">("source");
  const [template, setTemplate] =
    useState<InteractiveActivity["template"]>("matching_pairs");
  const [level, setLevel] = useState("A1");
  const [language, setLanguage] = useState("English");
  const [speech, setSpeech] = useState(false);
  const [count, setCount] = useState(6);
  const [groupCount, setGroupCount] = useState(3);
  const [orderMode, setOrderMode] = useState<
    "auto" | "alphabetical" | "sequence"
  >("auto");
  const [upload, setUpload] = useState<{
    name: string;
    count: number;
    note: string;
  } | null>(null);
  const [busy, setBusy] = useState("");
  const [notice, setNotice] = useState("");
  const [activity, setActivity] = useState<InteractiveActivity | null>(null);
  const [initiallySaved, setInitiallySaved] = useState(false);
  const [editorSession, setEditorSession] = useState(0);
  const [editorDirty, setEditorDirty] = useState(false);
  const [pendingChange, setPendingChange] = useState<
    "generate" | InteractiveActivity | null
  >(null);
  const [drafts, setDrafts] = useState<InteractiveActivity[]>([]);
  const agent = useAiAgentStore((s) => s.selectedAgent);
  useEffect(() => {
    try {
      setDrafts(readDeviceActivities());
    } catch {
      setNotice(
        "Some device drafts could not be read. Existing activity editors remain available.",
      );
    }
  }, []);
  function goSource() {
    try {
      setDrafts(readDeviceActivities());
    } catch {
      /* Keep loaded drafts. */
    }
    setStage("source");
    setNotice("");
  }
  async function readFile(file: File) {
    setBusy("extract");
    setNotice("");
    try {
      const form = new FormData();
      form.set("file", file);
      form.set("agent", agent);
      const result = await extractMatchingVocabulary(form);
      if (!result.ok) {
        setNotice(result.message);
        return;
      }
      setSource(result.source);
      setOrderMode("alphabetical");
      setUpload({
        name: file.name,
        count: result.vocabulary.length,
        note: result.note,
      });
      setCount(Math.min(12, result.vocabulary.length));
      setGroupCount(
        Math.min(3, Math.max(2, Math.floor(result.vocabulary.length / 2))),
      );
      setStage("choose");
      setNotice(
        `Read ${result.vocabulary.length} vocabulary terms from “${file.name}”. Choose how learners will practise them.${result.note ? ` ${result.note}` : ""}`,
      );
    } catch {
      setNotice(
        "The file could not be read. Try a clearer image or a shorter document.",
      );
    } finally {
      setBusy("");
    }
  }
  async function create() {
    setBusy("generate");
    setNotice("");
    try {
      const max = upload?.count ?? 24;
      const actualCount = Math.min(count, max);
      if (template === "group_assignment" && actualCount < 4) {
        setNotice(
          "Group Assignment needs at least four source terms. Add vocabulary or choose Matching Pairs.",
        );
        return;
      }
      const result =
        template === "matching_pairs"
          ? await generateMatchingActivity({
              source: upload
                ? `Use only these extracted vocabulary terms for the first cards; preserve supplied meanings and translations.\n${source}`
                : source,
              level,
              language,
              pairCount: Math.min(actualCount, 16),
              speech,
              agent,
            })
          : template === "group_assignment"
            ? await generateGroupingActivity({
                source,
                level,
                language,
                groupCount,
                itemCount: actualCount,
                speech,
                sourceOnly: Boolean(upload),
                agent,
              })
            : await generateOrderingActivity({
                source,
                level,
                language,
                itemCount: actualCount,
                speech,
                sourceOnly: Boolean(upload),
                orderMode,
                agent,
              });
      if (!result.ok) {
        setNotice(result.message);
        return;
      }
      setActivity(result.activity);
      setInitiallySaved(false);
      setEditorSession((previous) => previous + 1);
      setStage("editor");
      setNotice(
        "Your AI draft is ready. Review the content, preview it, and save when ready.",
      );
    } catch {
      setNotice(
        "The agent could not be reached. Your source and current activity are intact.",
      );
    } finally {
      setBusy("");
    }
  }
  const sourceValid =
    Boolean(source.trim()) &&
    source.length <= 10000 &&
    language.trim().length >= 2;
  const maxCount = ACTIVITY_MAXIMUMS[template];
  const actual = Math.min(count, upload?.count ?? maxCount);
  const validCount =
    Number.isInteger(count) &&
    count >= ACTIVITY_MINIMUMS[template] &&
    count <= Math.min(maxCount, upload?.count ?? maxCount) &&
    (template !== "group_assignment" ||
      (Number.isInteger(groupCount) &&
        groupCount >= 2 &&
        groupCount <= 6 &&
        groupCount <= actual));
  return (
    <div lang="en" className="mx-auto max-w-6xl pb-12">
      <header className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="mb-2 text-xs font-bold uppercase tracking-[.18em] text-indigo-600">
            Your source. Your classroom.
          </p>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">
            Interactive activities
          </h1>
          <p className="mt-2 max-w-2xl text-slate-500">
            Start with a theme or teaching material. Choose an activity, then
            let your AI agent build a draft you can make your own.
          </p>
        </div>
        <AgentSelector />
      </header>
      <ol
        aria-label="Creation steps"
        className="mb-6 flex flex-wrap gap-3 text-sm"
      >
        {(["source", "choose", "editor"] as const).map((step, index) => (
          <li
            key={step}
            aria-current={stage === step ? "step" : undefined}
            className={`rounded-full px-4 py-2 font-semibold ${stage === step ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-500"}`}
          >
            {index + 1}.{" "}
            {step === "source"
              ? "Theme or upload"
              : step === "choose"
                ? "Choose activity"
                : "Review & play"}
          </li>
        ))}
      </ol>
      {notice ? (
        <p
          role="status"
          className="mb-5 rounded-xl border border-indigo-100 bg-indigo-50 p-4 text-sm text-indigo-800"
        >
          {notice}
        </p>
      ) : null}
      {stage === "source" ? (
        <>
          <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
            <h2 className="text-xl font-bold">What are you teaching?</h2>
            <label className="mt-4 block text-sm font-semibold">
              Theme, vocabulary or lesson material
              <textarea
                rows={4}
                maxLength={10000}
                className={field}
                value={source}
                onChange={(e) => {
                  setSource(e.target.value);
                  setUpload(null);
                }}
                placeholder="e.g. Food and drink for A1 learners, or paste a vocabulary list…"
              />
            </label>
            <div className="mt-4 grid gap-4 sm:grid-cols-3">
              <label className="text-sm font-semibold">
                Level
                <select
                  className={field}
                  value={level}
                  onChange={(e) => setLevel(e.target.value)}
                >
                  {["A1", "A2", "B1", "B2"].map((l) => (
                    <option key={l}>{l}</option>
                  ))}
                </select>
              </label>
              <label className="text-sm font-semibold">
                Content language
                <input
                  className={field}
                  maxLength={80}
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                />
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={speech}
                  onChange={(e) => setSpeech(e.target.checked)}
                />
                Read-aloud cards
              </label>
            </div>
            <button
              disabled={Boolean(busy) || !sourceValid}
              className="mt-5 inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-3 font-semibold text-white disabled:opacity-40"
              onClick={() => {
                setStage("choose");
                setNotice("");
              }}
            >
              Choose an activity
              <ArrowRight size={17} />
            </button>
            <VocabularyUpload
              busy={busy}
              onCreate={readFile}
              purpose="choose"
            />
          </section>
          {activity ? (
            <button
              className={button + " mt-4"}
              onClick={() => setStage("editor")}
            >
              Return to current activity
              <ArrowRight size={16} />
            </button>
          ) : null}
          <section className="mt-7">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
              <h2 className="font-bold">Your saved activities</h2>
              <button
                disabled={Boolean(busy)}
                className={button}
                onClick={async () => {
                  setBusy("load");
                  try {
                    const result = await listInteractiveDrafts();
                    if (!result.ok) setNotice(result.message);
                    else {
                      const local = readDeviceActivities();
                      setDrafts([
                        ...result.activities,
                        ...local.filter(
                          (d) => !result.activities.some((r) => r.id === d.id),
                        ),
                      ]);
                      setNotice("Account drafts loaded.");
                    }
                  } catch {
                    setNotice("Could not load account drafts.");
                  } finally {
                    setBusy("");
                  }
                }}
              >
                Load account drafts
              </button>
            </div>
            {drafts.length ? (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {drafts.map((d) => (
                  <button
                    key={d.id}
                    className="rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-sm hover:border-indigo-300"
                    onClick={() => {
                      if (activity && editorDirty) {
                        setPendingChange(d);
                        return;
                      }
                      setActivity(d);
                      setInitiallySaved(true);
                      setEditorSession((previous) => previous + 1);
                      setStage("editor");
                      setNotice("");
                    }}
                  >
                    <p className="break-words font-semibold">
                      {d.title || "Untitled draft"}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      {ACTIVITY_LABELS[d.template]}
                    </p>
                  </button>
                ))}
              </div>
            ) : (
              <p className="text-sm text-slate-500">
                Saved drafts from your activity types will appear here.
              </p>
            )}
            <Link
              className="mt-4 inline-block text-sm text-indigo-700 underline"
              href="/tools/matching"
            >
              Open the original Matching Pairs editor
            </Link>
          </section>
        </>
      ) : null}
      {stage === "choose" ? (
        <section>
          <button
            disabled={Boolean(busy)}
            className={button + " mb-5"}
            onClick={goSource}
          >
            <ArrowLeft size={16} />
            Edit source
          </button>
          <div className="mb-5 rounded-2xl border border-slate-200 bg-white p-4">
            <p className="break-words text-xs font-bold uppercase tracking-wide text-slate-400">
              {upload
                ? `${upload.name} · ${upload.count} extracted terms`
                : "Your teaching material"}
            </p>
            <p className="mt-2 line-clamp-3 whitespace-pre-wrap break-words text-sm text-slate-700">
              {source}
            </p>
            <p className="mt-2 text-xs text-slate-500">
              {level} · {language} ·{" "}
              {speech ? "Read-aloud enabled" : "Text cards"}
            </p>
          </div>
          <h2 className="mb-4 text-2xl font-bold">
            How should learners practise?
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {(
              [
                {
                  id: "matching_pairs",
                  title: "Matching Pairs",
                  description:
                    "Connect words with definitions, translations, or related ideas.",
                  icon: Puzzle,
                  example: "apple ↔ une pomme",
                  goal: "Build connections",
                },
                {
                  id: "group_assignment",
                  title: "Group Assignment",
                  description:
                    "Sort vocabulary into categories. The agent proposes clear groups and assigns every card.",
                  icon: Layers3,
                  example: "Fruit: apple, banana · Drinks: tea, milk",
                  goal: "Spot patterns & categorise",
                },
                {
                  id: "simple_order",
                  title: "Simple Order",
                  description:
                    "Arrange words, events, or steps into the right sequence. A clear ordering rule guides learners.",
                  icon: ListOrdered,
                  example: "Monday → Tuesday → Wednesday",
                  goal: "Build a sequence",
                },
              ] as const
            ).map((option) => (
              <button
                key={option.id}
                disabled={
                  Boolean(busy) ||
                  (Boolean(upload) &&
                    upload!.count < ACTIVITY_MINIMUMS[option.id])
                }
                aria-pressed={template === option.id}
                className={`rounded-3xl border-2 bg-white p-6 text-left shadow-sm transition-colors disabled:opacity-40 ${template === option.id ? "border-indigo-600 ring-2 ring-indigo-100" : "border-slate-200 hover:border-indigo-300"}`}
                onClick={() => {
                  setTemplate(option.id);
                  setCount(
                    option.id !== "group_assignment"
                      ? Math.min(6, upload?.count ?? 6)
                      : Math.min(12, upload?.count ?? 12),
                  );
                  setNotice("");
                }}
              >
                <option.icon size={30} className="mb-4 text-indigo-600" />
                <p className="text-xs font-bold uppercase tracking-wider text-indigo-500">
                  {option.goal}
                </p>
                <h3 className="mt-2 text-xl font-bold">{option.title}</h3>
                <p className="mt-2 text-sm text-slate-500">
                  {option.description}
                </p>
                <p className="mt-4 rounded-xl bg-slate-50 p-3 text-xs font-medium text-slate-600">
                  {option.example}
                </p>
                <span className="mt-4 block text-sm font-semibold text-indigo-700">
                  {template === option.id ? "✓ Selected" : "Choose activity"}
                </span>
              </button>
            ))}
          </div>
          {upload && upload.count < 4 ? (
            <p className="mt-3 text-sm text-slate-500">
              Simple Order needs at least three terms; Group Assignment needs at
              least four.
            </p>
          ) : null}
          <div className="mt-5 flex flex-wrap items-end gap-4 rounded-2xl border border-slate-200 bg-white p-5">
            <label className="text-sm font-semibold">
              {template === "matching_pairs"
                ? "Pairs"
                : template === "simple_order"
                  ? "Sequence cards"
                  : "Vocabulary cards"}
              <input
                type="number"
                min={ACTIVITY_MINIMUMS[template]}
                max={Math.min(maxCount, upload?.count ?? maxCount)}
                className={field + " max-w-32"}
                value={count}
                onChange={(e) => setCount(Number(e.target.value))}
              />
            </label>
            {template === "group_assignment" ? (
              <label className="text-sm font-semibold">
                Groups
                <input
                  type="number"
                  min={2}
                  max={Math.min(6, actual)}
                  className={field + " max-w-24"}
                  value={groupCount}
                  onChange={(e) => setGroupCount(Number(e.target.value))}
                />
              </label>
            ) : null}
            {template === "simple_order" ? (
              <label className="text-sm font-semibold">
                Order by
                <select
                  className={field}
                  value={orderMode}
                  onChange={(e) =>
                    setOrderMode(e.target.value as typeof orderMode)
                  }
                >
                  <option value="auto">Let the agent choose</option>
                  <option value="alphabetical">Alphabetical A–Z</option>
                  <option value="sequence">Logical sequence</option>
                </select>
              </label>
            ) : null}
            <button
              disabled={Boolean(busy) || !sourceValid || !validCount}
              className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-3 font-semibold text-white disabled:opacity-40"
              onClick={() => {
                if (activity && editorDirty) setPendingChange("generate");
                else void create();
              }}
            >
              <Sparkles size={17} />
              {busy === "generate"
                ? "Agent is building your activity…"
                : `Create ${ACTIVITY_LABELS[template]}`}
            </button>
          </div>
        </section>
      ) : null}
      {activity ? (
        <section hidden={stage !== "editor"}>
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <button
              className={button}
              onClick={() => {
                if (sourceValid) setStage("choose");
                else goSource();
              }}
            >
              <ArrowLeft size={16} />
              Activity options
            </button>
            <button className={button} onClick={goSource}>
              Start with another source
            </button>
          </div>
          {activity.template === "matching_pairs" ? (
            <MatchingBuilder
              key={`${activity.id}-${editorSession}`}
              initialActivity={activity}
              initiallySaved={initiallySaved}
              onDirtyChange={setEditorDirty}
              embedded
            />
          ) : activity.template === "group_assignment" ? (
            <GroupingBuilder
              key={`${activity.id}-${editorSession}`}
              initialActivity={activity}
              initiallySaved={initiallySaved}
              onDirtyChange={setEditorDirty}
            />
          ) : (
            <OrderingBuilder
              key={`${activity.id}-${editorSession}`}
              initialActivity={activity}
              initiallySaved={initiallySaved}
              onDirtyChange={setEditorDirty}
            />
          )}
        </section>
      ) : null}
      {pendingChange ? (
        <ConfirmActivityChange
          onCancel={() => {
            setPendingChange(null);
            setStage("editor");
          }}
          onConfirm={() => {
            const pending = pendingChange;
            setPendingChange(null);
            if (pending === "generate") void create();
            else {
              setActivity(pending);
              setInitiallySaved(true);
              setEditorSession((previous) => previous + 1);
              setStage("editor");
              setNotice("");
            }
          }}
        />
      ) : null}
    </div>
  );
}
