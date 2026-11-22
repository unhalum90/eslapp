"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import {
  ArrowLeft,
  AudioLines,
  Check,
  Clipboard,
  Download,
  FileAudio,
  FolderPlus,
  LoaderCircle,
  Pencil,
  Printer,
  RefreshCw,
  Save,
  Sparkles,
  UploadCloud,
} from "lucide-react";
import { stripLeadingAuphonicCredit, transcriptTurnsWithoutLeadingCredit } from "@/lib/speaking/transcript";
import type { SavedSpeakingRecord, SavedSpeakingSummary, SpeakingFeedback, SpeakingFolder, SpeakingTranscription, SpeakingTurn } from "@/lib/speaking/types";

const MAX_SOURCE_BYTES = 50_000_000;
const LEVELS = ["A1", "A2", "B1", "B2", "C1"] as const;

function timeLabel(seconds: number | null): string {
  if (seconds === null) return "";
  const whole = Math.floor(seconds);
  return `${Math.floor(whole / 60).toString().padStart(2, "0")}:${(whole % 60).toString().padStart(2, "0")}`;
}

function defaultSpeakerName(id: string | null, order: string[]): string {
  if (!id) return "Locuteur non identifié";
  const index = order.indexOf(id);
  return `Locuteur ${index >= 0 ? index + 1 : 1}`;
}

function savedSpeakerLabel(record: SavedSpeakingRecord, id: string | null): string {
  if (!id) return "Locuteur non identifié";
  const order = [...new Set(record.transcription.turns.map((turn) => turn.speakerId).filter((speakerId): speakerId is string => !!speakerId))];
  return record.speakerNames[id]?.trim() || defaultSpeakerName(id, order);
}

async function readApiError(response: Response): Promise<string> {
  try {
    const payload = await response.json();
    return typeof payload.error === "string" ? payload.error : "Le traitement a échoué. Réessayez.";
  } catch {
    return response.status === 413
      ? "Le fichier dépasse la limite de 50 Mo."
      : "Le traitement a échoué. Réessayez.";
  }
}

export function SpeakingWorkspace() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [cleanedAudioUrl, setCleanedAudioUrl] = useState<string | null>(null);
  const [transcription, setTranscription] = useState<SpeakingTranscription | null>(null);
  const [turns, setTurns] = useState<SpeakingTurn[]>([]);
  const [speakerNames, setSpeakerNames] = useState<Record<string, string>>({});
  const [level, setLevel] = useState<(typeof LEVELS)[number]>("A2");
  const [task, setTask] = useState("");
  const [feedback, setFeedback] = useState<SpeakingFeedback | null>(null);
  const [busy, setBusy] = useState<"upload" | "clean" | "transcribe" | "feedback" | null>(null);
  const [transcriptionMode, setTranscriptionMode] = useState<"direct" | "cleanup" | null>(null);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [copiedLearner, setCopiedLearner] = useState(false);
  const [savedFilename, setSavedFilename] = useState("");
  const [recordId, setRecordId] = useState<string | null>(null);
  const [auphonicToken, setAuphonicToken] = useState<string | null>(null);
  const [sourceTicket, setSourceTicket] = useState<string | null>(null);
  const [savedRecords, setSavedRecords] = useState<SavedSpeakingSummary[]>([]);
  const [folders, setFolders] = useState<SpeakingFolder[]>([]);
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [recordFolderId, setRecordFolderId] = useState<string | null>(null);
  const [newFolderName, setNewFolderName] = useState("");
  const [editingFolderId, setEditingFolderId] = useState<string | null>(null);
  const [editingFolderName, setEditingFolderName] = useState("");
  const [folderBusy, setFolderBusy] = useState(false);
  const [folderError, setFolderError] = useState("");
  const [libraryState, setLibraryState] = useState<"loading" | "ready" | "sign-in" | "error">("loading");
  const [libraryHasMore, setLibraryHasMore] = useState(false);
  const [libraryOffset, setLibraryOffset] = useState(0);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "dirty">("idle");
  const [saveError, setSaveError] = useState("");
  const [selectedRecordIds, setSelectedRecordIds] = useState<Set<string>>(() => new Set());
  const [batchPrintRecords, setBatchPrintRecords] = useState<SavedSpeakingRecord[] | null>(null);
  const [batchPrintBusy, setBatchPrintBusy] = useState(false);
  const [batchPrintError, setBatchPrintError] = useState("");

  useEffect(() => {
    let active = true;
    void fetch("/api/speaking/library", { cache: "no-store" }).then(async (response) => {
      if (!active) return;
      if (response.status === 401) { setLibraryState("sign-in"); return; }
      if (!response.ok) { setLibraryState("error"); return; }
      const result = (await response.json()) as { records: SavedSpeakingSummary[]; hasMore: boolean; nextOffset: number };
      if (!active) return;
      setSavedRecords(result.records);
      void fetch("/api/speaking/library/folders", { cache: "no-store" }).then(async (foldersResponse) => {
        if (active && foldersResponse.ok) setFolders(((await foldersResponse.json()) as { folders: SpeakingFolder[] }).folders);
      });
      setLibraryHasMore(result.hasMore);
      setLibraryOffset(result.nextOffset);
      setLibraryState("ready");
    }).catch(() => { if (active) setLibraryState("error"); });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!file) return;
    const url = URL.createObjectURL(file);
    setAudioUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  useEffect(() => {
    return () => { if (cleanedAudioUrl) URL.revokeObjectURL(cleanedAudioUrl); };
  }, [cleanedAudioUrl]);

  useEffect(() => {
    if (!batchPrintRecords?.length) return;
    document.body.classList.add("speaking-batch-printing");
    let finished = false;
    const finish = () => {
      if (finished) return;
      finished = true;
      document.body.classList.remove("speaking-batch-printing");
      setBatchPrintRecords(null);
    };
    window.addEventListener("afterprint", finish, { once: true });
    const timer = window.setTimeout(() => {
      window.print();
    }, 0);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("afterprint", finish);
      document.body.classList.remove("speaking-batch-printing");
    };
  }, [batchPrintRecords]);

  const speakerIds = useMemo(
    () => [...new Set(turns.map((turn) => turn.speakerId).filter((id): id is string => !!id))],
    [turns],
  );
  const speakerLabel = (id: string | null) => id
    ? speakerNames[id]?.trim() || defaultSpeakerName(id, speakerIds)
    : "Locuteur non identifié";
  const displayFilename = file?.name || savedFilename || "oral";
  const transcriptText = turns.map((turn) =>
    `${timeLabel(turn.start) ? `[${timeLabel(turn.start)}] ` : ""}${speakerLabel(turn.speakerId)} : ${turn.text.trim()}`,
  ).join("\n\n");
  const learnerTranscriptText = transcription
    ? `${displayFilename}\n\nTRANSCRIPTION À CORRIGER\n${transcription.turns.map((turn) => `${speakerLabel(turn.speakerId)} : ${turn.text.trim()}`).join("\n")}\n`
    : "";
  const visibleRecords = savedRecords.filter((saved) => selectedFolderId === null ||
    (selectedFolderId === "unfiled" ? !saved.folderId : saved.folderId === selectedFolderId));
  const selectedVisibleCount = visibleRecords.filter((saved) => selectedRecordIds.has(saved.id)).length;
  const allVisibleRecordsSelected = visibleRecords.length > 0 && visibleRecords.every((saved) => selectedRecordIds.has(saved.id));

  function selectFolder(folderId: string | null) {
    setSelectedFolderId(folderId);
    setSelectedRecordIds(new Set());
    setBatchPrintError("");
  }

  function toggleRecordSelection(id: string) {
    setSelectedRecordIds((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
    setBatchPrintError("");
  }

  function toggleVisibleRecords() {
    setSelectedRecordIds((current) => {
      const next = new Set(current);
      if (allVisibleRecordsSelected) visibleRecords.forEach((saved) => next.delete(saved.id));
      else visibleRecords.forEach((saved) => next.add(saved.id));
      return next;
    });
    setBatchPrintError("");
  }

  async function printSelectedTranscripts() {
    const ids = visibleRecords.filter((saved) => selectedRecordIds.has(saved.id)).map((saved) => saved.id);
    if (!ids.length || batchPrintBusy) return;
    setBatchPrintBusy(true);
    setBatchPrintError("");
    try {
      const responses = await Promise.all(ids.map((id) => fetch(`/api/speaking/library?id=${encodeURIComponent(id)}&transcript=1`, { cache: "no-store" })));
      const failed = responses.find((response) => !response.ok);
      if (failed) throw new Error(await readApiError(failed));
      const records = await Promise.all(responses.map((response) => response.json() as Promise<SavedSpeakingRecord>));
      setBatchPrintRecords(records.map((record) => ({
        ...record,
        transcription: stripLeadingAuphonicCredit(record.transcription),
      })));
    } catch (cause) {
      setBatchPrintError(cause instanceof Error ? cause.message : "Les transcriptions n’ont pas pu être préparées pour l’impression.");
    } finally {
      setBatchPrintBusy(false);
    }
  }

  async function createFolder() {
    if (!newFolderName.trim() || folderBusy) return;
    setFolderBusy(true);
    setFolderError("");
    try {
      const response = await fetch("/api/speaking/library/folders", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newFolderName.trim() }),
      });
      if (!response.ok) throw new Error(await readApiError(response));
      const folder = (await response.json()) as SpeakingFolder;
      setFolders((current) => [...current, folder]);
      setSelectedFolderId(folder.id);
      setSelectedRecordIds(new Set());
      setNewFolderName("");
    } catch (cause) { setFolderError(cause instanceof Error ? cause.message : "Le dossier n’a pas pu être créé."); }
    finally { setFolderBusy(false); }
  }

  async function renameFolder() {
    if (!editingFolderId || !editingFolderName.trim() || folderBusy) return;
    setFolderBusy(true);
    setFolderError("");
    try {
      const response = await fetch("/api/speaking/library/folders", {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: editingFolderId, name: editingFolderName.trim() }),
      });
      if (!response.ok) throw new Error(await readApiError(response));
      const renamed = (await response.json()) as SpeakingFolder;
      setFolders((current) => current.map((folder) => folder.id === renamed.id ? renamed : folder));
      setEditingFolderId(null);
      setEditingFolderName("");
    } catch (cause) { setFolderError(cause instanceof Error ? cause.message : "Le dossier n’a pas pu être renommé."); }
    finally { setFolderBusy(false); }
  }

  async function moveRecord(id: string, folderId: string | null) {
    setFolderError("");
    const response = await fetch("/api/speaking/library", {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, folderId }),
    });
    if (!response.ok) { setFolderError(await readApiError(response)); return; }
    const saved = (await response.json()) as SavedSpeakingSummary;
    setSavedRecords((current) => current.map((item) => item.id === id ? saved : item));
    setSelectedRecordIds((current) => {
      const next = new Set(current);
      next.delete(id);
      return next;
    });
    if (recordId === id) setRecordFolderId(folderId);
  }

  async function loadMoreRecords() {
    const response = await fetch(`/api/speaking/library?offset=${libraryOffset}`, { cache: "no-store" });
    if (!response.ok) { setLibraryState("error"); return; }
    const result = (await response.json()) as { records: SavedSpeakingSummary[]; hasMore: boolean; nextOffset: number };
    setSavedRecords((current) => [...current, ...result.records.filter((record) => !current.some((item) => item.id === record.id))]);
    setLibraryHasMore(result.hasMore);
    setLibraryOffset(result.nextOffset);
  }

  async function refreshLibrary() {
    setLibraryState("loading");
    try {
      const response = await fetch("/api/speaking/library", { cache: "no-store" });
      if (response.status === 401) { setLibraryState("sign-in"); return; }
      if (!response.ok) { setLibraryState("error"); return; }
      const result = (await response.json()) as { records: SavedSpeakingSummary[]; hasMore: boolean; nextOffset: number };
      setSavedRecords(result.records);
      const foldersResponse = await fetch("/api/speaking/library/folders", { cache: "no-store" });
      if (foldersResponse.ok) setFolders(((await foldersResponse.json()) as { folders: SpeakingFolder[] }).folders);
      setLibraryHasMore(result.hasMore);
      setLibraryOffset(result.nextOffset);
      setSelectedRecordIds(new Set());
      setLibraryState("ready");
    } catch { setLibraryState("error"); }
  }

  async function openRecord(id: string) {
    if (busy) return;
    setError("");
    const response = await fetch(`/api/speaking/library?id=${encodeURIComponent(id)}`, { cache: "no-store" });
    if (!response.ok) { setError(await readApiError(response)); return; }
    const record = (await response.json()) as SavedSpeakingRecord & { audioUrl: string };
    setFile(null);
    setAudioUrl(null);
    setCleanedAudioUrl(record.audioUrl);
    setSavedFilename(record.filename);
    setRecordId(record.id);
    setRecordFolderId(record.folderId ?? null);
    setAuphonicToken(null);
    setSourceTicket(null);
    const cleanedTranscription = stripLeadingAuphonicCredit(record.transcription);
    setTranscription(cleanedTranscription);
    setTurns(transcriptTurnsWithoutLeadingCredit(record.turns));
    setSpeakerNames(record.speakerNames);
    setLevel(record.level);
    setTask(record.task);
    setFeedback(record.feedback);
    setSaveError("");
    setSaveState("saved");
  }

  async function saveAnalysis(input: {
    id?: string | null;
    token?: string | null;
    ticket?: string | null;
    filename: string;
    transcription: SpeakingTranscription;
    turns: SpeakingTurn[];
    speakerNames: Record<string, string>;
    level: (typeof LEVELS)[number];
    task: string;
    feedback: SpeakingFeedback | null;
    folderId: string | null;
  }) {
    setSaveState("saving");
    setSaveError("");
    const response = await fetch("/api/speaking/library", {
      method: input.id ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
    if (response.status === 401) {
      setLibraryState("sign-in");
      setSaveState("dirty");
      throw new Error("Connectez-vous au compte enseignant pour enregistrer cet oral.");
    }
    if (!response.ok) {
      setSaveState("dirty");
      throw new Error(await readApiError(response));
    }
    const saved = (await response.json()) as SavedSpeakingSummary;
    setRecordId(saved.id);
    setSaveState("saved");
    setLibraryState("ready");
    setSavedRecords((current) => [saved, ...current.filter((item) => item.id !== saved.id)]);
    if (!input.id) setLibraryOffset((current) => current + 2);
    return saved;
  }

  async function saveCurrent() {
    if (!transcription || busy || saveState === "saving") return;
    try {
      await saveAnalysis({
        id: recordId,
        token: auphonicToken,
        ticket: sourceTicket,
        filename: displayFilename,
        transcription,
        turns,
        speakerNames,
        level,
        task: task.trim(),
        feedback,
        folderId: recordFolderId,
      });
    } catch (cause) {
      setSaveError(cause instanceof Error ? cause.message : "L’enregistrement a échoué.");
    }
  }

  function chooseFile(next: File | null) {
    setError("");
    setFeedback(null);
    setTranscription(null);
    setTurns([]);
    setSpeakerNames({});
    setAudioUrl(null);
    setCleanedAudioUrl(null);
    setSavedFilename("");
    setRecordId(null);
    setRecordFolderId(selectedFolderId && selectedFolderId !== "unfiled" ? selectedFolderId : null);
    setAuphonicToken(null);
    setSourceTicket(null);
    setSaveState("idle");
    setSaveError("");
    if (!next) {
      setFile(null);
      return;
    }
    if (!next.name.toLowerCase().endsWith(".mp3") || next.size === 0 || next.size > MAX_SOURCE_BYTES) {
      setFile(null);
      setError("Choisissez un MP3 de moins de 50 Mo.");
      if (inputRef.current) inputRef.current.value = "";
      return;
    }
    setFile(next);
  }

  async function transcribe(withCleanup: boolean) {
    if (!file || busy) return;
    let pendingTicket: string | null = null;
    setTranscriptionMode(withCleanup ? "cleanup" : "direct");
    setBusy("upload");
    setError("");
    setFeedback(null);
    setCleanedAudioUrl(null);
    try {
      const firstBytes = new Uint8Array(await file.slice(0, 3).arrayBuffer());
      if (!((firstBytes[0] === 0x49 && firstBytes[1] === 0x44 && firstBytes[2] === 0x33) ||
        (firstBytes[0] === 0xff && (firstBytes[1] & 0xe0) === 0xe0))) {
        throw new Error("Ce fichier ne semble pas être un MP3.");
      }
      const setup = await fetch("/api/speaking/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ size: file.size }),
      });
      if (!setup.ok) throw new Error(await readApiError(setup));
      const upload = (await setup.json()) as { ticket: string; path: string; uploadToken: string };
      pendingTicket = upload.ticket;
      const storage = createClient();
      if (!storage) throw new Error("Le stockage audio n’est pas configuré.");
      const { error: uploadError } = await storage.storage.from("speaking-temp").uploadToSignedUrl(
        upload.path, upload.uploadToken, file, { contentType: "audio/mpeg" },
      );
      if (uploadError) throw new Error(`L’envoi du MP3 a échoué : ${uploadError.message}`);

      if (!withCleanup) {
        setBusy("transcribe");
        const response = await fetch("/api/speaking/transcribe", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ticket: upload.ticket }),
        });
        if (!response.ok) throw new Error(await readApiError(response));
        const result = stripLeadingAuphonicCredit((await response.json()) as SpeakingTranscription);
        setSourceTicket(upload.ticket);
        setAuphonicToken(null);
        pendingTicket = null;
        setTranscription(result);
        setTurns(result.turns);
        if (libraryState === "ready") {
          try {
            await saveAnalysis({
              ticket: upload.ticket,
              filename: file.name,
              transcription: result,
              turns: result.turns,
              speakerNames: {},
              level,
              task: task.trim(),
              feedback: null,
              folderId: recordFolderId,
            });
            setSourceTicket(null);
          } catch (cause) {
            setSaveError(cause instanceof Error ? cause.message : "L’enregistrement a échoué.");
          }
        } else {
          setSaveState("dirty");
        }
        return;
      }

      setBusy("clean");
      const started = await fetch("/api/speaking/transcribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ticket: upload.ticket }),
      });
      if (!started.ok) throw new Error(await readApiError(started));
      pendingTicket = null;
      const { token } = (await started.json()) as { token: string };
      if (!token) throw new Error("Auphonic n’a pas démarré le nettoyage audio.");
      setAuphonicToken(token);
      setSourceTicket(null);
      let complete = false;
      for (let attempt = 0; attempt < 90; attempt++) {
        await new Promise((resolve) => window.setTimeout(resolve, 5_000));
        const status = await fetch(`/api/speaking/transcribe?token=${encodeURIComponent(token)}`, { cache: "no-store" });
        if (!status.ok) throw new Error(await readApiError(status));
        const job = (await status.json()) as { done: boolean; failed: boolean };
        if (job.failed) throw new Error("Le nettoyage Auphonic a échoué. Essayez un autre extrait.");
        if (job.done) { complete = true; break; }
      }
      if (!complete) throw new Error("Le nettoyage audio prend trop de temps. Réessayez.");
      const cleanedResponse = await fetch(`/api/speaking/transcribe?token=${encodeURIComponent(token)}&audio=1`, { cache: "no-store" });
      if (!cleanedResponse.ok) throw new Error(await readApiError(cleanedResponse));
      setCleanedAudioUrl(URL.createObjectURL(await cleanedResponse.blob()));
      setBusy("transcribe");
      const response = await fetch("/api/speaking/transcribe", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      if (!response.ok) throw new Error(await readApiError(response));
      const result = stripLeadingAuphonicCredit((await response.json()) as SpeakingTranscription);
      setTranscription(result);
      setTurns(result.turns);
      if (libraryState === "ready") {
        try {
          await saveAnalysis({
            token,
            filename: file.name,
            transcription: result,
            turns: result.turns,
            speakerNames: {},
            level,
            task: task.trim(),
            feedback: null,
            folderId: recordFolderId,
          });
        } catch (cause) {
          setSaveError(cause instanceof Error ? cause.message : "L’enregistrement a échoué.");
        }
      } else {
        setSaveState("dirty");
      }
    } catch (cause) {
      if (pendingTicket) {
        void fetch("/api/speaking/upload", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ticket: pendingTicket }),
        });
      }
      setError(cause instanceof Error ? cause.message : "La transcription a échoué.");
    } finally {
      setBusy(null);
      setTranscriptionMode(null);
    }
  }

  async function analyze() {
    if (!transcription || busy || turns.some((turn) => !turn.text.trim())) return;
    setBusy("feedback");
    setError("");
    try {
      const response = await fetch("/api/speaking/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ turns, level, task: task.trim() }),
      });
      if (!response.ok) throw new Error(await readApiError(response));
      const result = (await response.json()) as SpeakingFeedback;
      setFeedback(result);
      if (libraryState === "ready") {
        try {
          await saveAnalysis({
            id: recordId,
            token: auphonicToken,
            filename: displayFilename,
            transcription,
            turns,
            speakerNames,
            level,
            task: task.trim(),
            feedback: result,
            folderId: recordFolderId,
          });
        } catch (cause) {
          setSaveError(cause instanceof Error ? cause.message : "Le retour n’a pas été enregistré.");
        }
      } else {
        setSaveState("dirty");
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Le retour linguistique a échoué.");
    } finally {
      setBusy(null);
    }
  }

  function updateTurn(index: number, text: string) {
    setTurns((current) => current.map((turn, turnIndex) => turnIndex === index ? { ...turn, text } : turn));
    setFeedback(null);
    setSaveState("dirty");
  }

  async function copyTranscript() {
    await navigator.clipboard.writeText(transcriptText);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  }

  function downloadText(contents: string, suffix: string) {
    const blob = new Blob([contents], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${displayFilename.replace(/\.mp3$/i, "")}-${suffix}.txt`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function downloadLearnerTranscript() {
    if (!transcription) return;
    // Use the original speech-to-text result, even if the teacher later edits a turn.
    downloadText(learnerTranscriptText, "transcription-eleves");
  }

  async function copyLearnerTranscript() {
    if (!transcription) return;
    await navigator.clipboard.writeText(learnerTranscriptText);
    setCopiedLearner(true);
    window.setTimeout(() => setCopiedLearner(false), 2000);
  }

  function downloadReport() {
    const lines = [
      "ORAL DES ÉLÈVES",
      `Fichier : ${displayFilename}`,
      `Niveau : ${level}`,
      ...(task.trim() ? [`Consigne : ${task.trim()}`] : []),
      "",
      "TRANSCRIPTION",
      transcriptText,
    ];
    if (feedback) {
      lines.push("", "RETOUR LINGUISTIQUE", feedback.overview, "", "Points positifs");
      lines.push(...feedback.strengths.map((strength) => `• ${strength}`));
      lines.push("", "Pistes de correction");
      lines.push(...feedback.items.map((item) =>
        `• ${speakerLabel(turns[item.turnIndex]?.speakerId ?? null)} [${item.category}] « ${item.quote} » → ${item.suggestion}\n  ${item.explanation}`,
      ));
    }
    downloadText(lines.join("\n"), "compte-rendu-enseignant");
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6 pb-16">
      <div>
        <Link href="/workspace" className="inline-flex items-center gap-2 text-xs font-bold text-[#285d68] hover:underline">
          <ArrowLeft size={15} /> Retour à mes séquences
        </Link>
        <div className="mt-5 flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="mb-2 flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.18em] text-[#a5523c]">
              <AudioLines size={16} /> Espace oral
            </div>
            <h1 className="font-serif text-3xl font-bold text-[#173b45] sm:text-4xl">Écouter, transcrire, accompagner</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-[#647376]">
              Déposez un échange entre élèves. Relisez la transcription par locuteur, puis obtenez des pistes de correction adaptées au niveau.
            </p>
          </div>
          <div className="rounded-full border border-[#d9e7e3] bg-[#e8f3f1] px-4 py-2 text-xs font-bold text-[#285d68]">
            MP3 original · jusqu’à 50 Mo
          </div>
        </div>
      </div>

      <section className="rounded-2xl border border-[#d8d5ca] bg-white p-5 shadow-sm sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-[11px] font-black uppercase tracking-[0.14em] text-[#a5523c]">Bibliothèque privée</div>
            <h2 className="mt-1 text-xl font-bold text-[#203337]">Mes oraux enregistrés</h2>
          </div>
          <span className="text-xs text-[#687477]">Audio nettoyé · transcription · retour linguistique</span>
        </div>
        {libraryState === "loading" ? <p className="mt-4 text-sm text-[#687477]">Chargement des oraux…</p> : null}
        {libraryState === "sign-in" ? (
          <div className="mt-4 rounded-xl bg-[#f2f8f5] p-4 text-sm leading-6 text-[#285d68]">
            <p><Link href="/account" target="_blank" rel="noopener noreferrer" className="font-bold underline">Connectez-vous au compte enseignant</Link> pour retrouver vos oraux sur cet appareil ou un autre. Revenez ensuite ici pour enregistrer l’oral en cours.</p>
            <button type="button" onClick={() => void refreshLibrary()} className="mt-2 text-xs font-bold underline">Actualiser après connexion</button>
          </div>
        ) : null}
        {libraryState === "error" ? <p className="mt-4 text-sm text-[#9a4434]">La bibliothèque n’a pas pu être chargée. Rechargez la page pour réessayer.</p> : null}
        {libraryState === "ready" ? (
          <div className="mt-4 space-y-3">
            <div className="flex flex-wrap gap-2" aria-label="Dossiers des oraux">
              {[{ id: null, name: "Tous les oraux" }, { id: "unfiled", name: "Sans dossier" }, ...folders].map((folder) => (
                <div key={folder.id ?? "all"} className="inline-flex items-center gap-1">
                  <button type="button" onClick={() => selectFolder(folder.id)}
                    aria-pressed={selectedFolderId === folder.id}
                    className={`rounded-full border px-3 py-1.5 text-xs font-bold ${selectedFolderId === folder.id ? "border-[#285d68] bg-[#285d68] text-white" : "border-[#bdd4d1] text-[#285d68] hover:bg-[#e8f3f1]"}`}>
                    {folder.name}
                  </button>
                  {folder.id && folder.id !== "unfiled" ? (
                    <button type="button" aria-label={`Renommer ${folder.name}`} title={`Renommer ${folder.name}`}
                      onClick={() => { setEditingFolderId(folder.id); setEditingFolderName(folder.name); setFolderError(""); }}
                      className="rounded-full p-1.5 text-[#285d68] hover:bg-[#e8f3f1]"><Pencil size={13} /></button>
                  ) : null}
                </div>
              ))}
            </div>
            {editingFolderId ? (
              <form onSubmit={(event) => { event.preventDefault(); void renameFolder(); }} className="flex max-w-sm gap-2">
                <label className="sr-only" htmlFor="speaking-folder-rename">Nouveau nom du dossier</label>
                <input id="speaking-folder-rename" autoFocus value={editingFolderName} onChange={(event) => setEditingFolderName(event.target.value)}
                  maxLength={80} className="min-w-0 flex-1 rounded-lg border border-[#bdd4d1] px-3 py-2 text-sm text-[#203337]" />
                <button type="submit" disabled={!editingFolderName.trim() || folderBusy}
                  className="rounded-lg bg-[#285d68] px-3 py-2 text-xs font-bold text-white disabled:opacity-50">Enregistrer</button>
                <button type="button" onClick={() => { setEditingFolderId(null); setFolderError(""); }}
                  className="rounded-lg border border-[#bdd4d1] px-3 py-2 text-xs font-bold text-[#285d68]">Annuler</button>
              </form>
            ) : null}
            <form onSubmit={(event) => { event.preventDefault(); void createFolder(); }} className="flex max-w-sm gap-2">
              <label className="sr-only" htmlFor="speaking-folder-name">Nom du nouveau dossier</label>
              <input id="speaking-folder-name" value={newFolderName} onChange={(event) => setNewFolderName(event.target.value)}
                maxLength={80} placeholder="Nouveau dossier" className="min-w-0 flex-1 rounded-lg border border-[#bdd4d1] px-3 py-2 text-sm text-[#203337]" />
              <button type="submit" disabled={!newFolderName.trim() || folderBusy}
                className="inline-flex items-center gap-1 rounded-lg bg-[#285d68] px-3 py-2 text-xs font-bold text-white disabled:opacity-50">
                <FolderPlus size={15} /> Créer
              </button>
            </form>
            {folderError ? <p role="alert" className="text-xs text-[#9a4434]">{folderError}</p> : null}
          </div>
        ) : null}
        {libraryState === "ready" && !visibleRecords.length ? <p className="mt-4 text-sm text-[#687477]">Aucun oral dans ce dossier.</p> : null}
        {libraryState === "ready" && visibleRecords.length ? (
          <div className="mt-4 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#bdd4d1] bg-[#f2f8f5] px-4 py-3">
              <label className="inline-flex cursor-pointer items-center gap-2 text-xs font-bold text-[#285d68]">
                <input type="checkbox" checked={allVisibleRecordsSelected} onChange={toggleVisibleRecords} className="h-4 w-4 accent-[#285d68]" />
                Tout sélectionner dans ce dossier
              </label>
              <button type="button" onClick={() => void printSelectedTranscripts()} disabled={!selectedVisibleCount || batchPrintBusy}
                className="inline-flex items-center gap-2 rounded-lg bg-[#285d68] px-3 py-2 text-xs font-bold text-white hover:bg-[#214d56] disabled:cursor-not-allowed disabled:opacity-50">
                {batchPrintBusy ? <LoaderCircle size={15} className="animate-spin" /> : <Printer size={15} />}
                {batchPrintBusy ? "Préparation…" : `Imprimer la sélection (${selectedVisibleCount})`}
              </button>
            </div>
            {batchPrintError ? <p role="alert" className="rounded-xl bg-[#fff2ef] p-3 text-xs text-[#9a4434]">{batchPrintError}</p> : null}
            <div className="max-h-64 space-y-2 overflow-y-auto">
              {visibleRecords.map((saved) => (
                <div key={saved.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#e3e5df] bg-[#fbfaf6] px-4 py-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <input id={`speaking-print-${saved.id}`} type="checkbox" checked={selectedRecordIds.has(saved.id)}
                      onChange={() => toggleRecordSelection(saved.id)} aria-label={`Sélectionner ${saved.filename} pour l’impression`}
                      className="h-4 w-4 shrink-0 accent-[#285d68]" />
                    <label htmlFor={`speaking-print-${saved.id}`} className="min-w-0 cursor-pointer">
                      <span className="block truncate text-sm font-bold text-[#203337]">{saved.filename}</span>
                      <span className="mt-0.5 block text-xs text-[#758184]">{new Date(saved.createdAt).toLocaleDateString("fr-FR")} · {folders.find((folder) => folder.id === saved.folderId)?.name ?? "Sans dossier"} · {saved.hasFeedback ? "Retour disponible" : "Transcription disponible"}</span>
                    </label>
                  </div>
                  <div className="flex items-center gap-2">
                    <label className="sr-only" htmlFor={`speaking-move-${saved.id}`}>Dossier de {saved.filename}</label>
                    <select id={`speaking-move-${saved.id}`} value={saved.folderId ?? ""} onChange={(event) => void moveRecord(saved.id, event.target.value || null)}
                      className="max-w-36 rounded-lg border border-[#bdd4d1] bg-white px-2 py-2 text-xs text-[#285d68]">
                      <option value="">Sans dossier</option>
                      {folders.map((folder) => <option key={folder.id} value={folder.id}>{folder.name}</option>)}
                    </select>
                    <button type="button" onClick={() => void openRecord(saved.id)} disabled={!!busy} className="rounded-lg border border-[#bdd4d1] px-3 py-2 text-xs font-bold text-[#285d68] hover:bg-[#e8f3f1] disabled:opacity-50">
                      Ouvrir
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : null}
        {libraryState === "ready" && libraryHasMore ? <button type="button" onClick={() => void loadMoreRecords()} className="mt-3 text-xs font-bold text-[#285d68] hover:underline">Afficher plus d’oraux</button> : null}
      </section>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
        <div className="space-y-6">
          <section className="rounded-2xl border border-[#d8d5ca] bg-white p-5 shadow-sm sm:p-6">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-[11px] font-black uppercase tracking-[0.14em] text-[#a5523c]">01 · Enregistrement</div>
                <h2 className="mt-1 text-xl font-bold text-[#203337]">Importer un échange</h2>
              </div>
              <FileAudio className="text-[#285d68]" size={25} />
            </div>
            <input
              ref={inputRef}
              type="file"
              accept=".mp3,audio/mpeg"
              className="sr-only"
              id="speaking-file"
              onChange={(event) => chooseFile(event.target.files?.[0] ?? null)}
            />
            <label
              htmlFor="speaking-file"
              onDragOver={(event) => event.preventDefault()}
              onDrop={(event) => { event.preventDefault(); chooseFile(event.dataTransfer.files[0] ?? null); }}
              className="mt-5 flex cursor-pointer flex-col items-center rounded-2xl border-2 border-dashed border-[#bdd4d1] bg-[#f7faf8] px-5 py-8 text-center transition-colors hover:border-[#285d68] hover:bg-[#eef6f3]"
            >
              <UploadCloud size={29} className="text-[#285d68]" />
              <span className="mt-2 text-sm font-bold text-[#203337]">{file ? file.name : "Choisir ou glisser un fichier MP3"}</span>
              <span className="mt-1 text-xs text-[#687477]">{file ? `${(file.size / 1_000_000).toFixed(2)} Mo · cliquer pour remplacer` : "Jusqu’à 50 Mo · durée complète conservée"}</span>
            </label>
            {busy === "upload" ? <p className="mt-4 text-xs font-bold text-[#285d68]">Envoi de l’enregistrement complet…</p> : null}
            {audioUrl ? <div className="mt-4"><p className="mb-1 text-xs font-bold text-[#536164]">Avant Auphonic</p><audio controls src={audioUrl} className="w-full" aria-label="Écouter l’enregistrement original" /></div> : null}
            {cleanedAudioUrl ? <div className="mt-4 rounded-xl border border-[#bdd4d1] bg-[#f2f8f5] p-3"><p className="mb-1 text-xs font-bold text-[#285d68]">Après Auphonic · {displayFilename}</p><audio controls src={cleanedAudioUrl} className="w-full" aria-label="Écouter l’enregistrement nettoyé par Auphonic" /><a href={cleanedAudioUrl} download={`${displayFilename.replace(/\.mp3$/i, "")}-auphonic.mp3`} className="mt-2 inline-flex items-center gap-1 text-xs font-bold text-[#285d68] hover:underline"><Download size={14} /> Télécharger l’audio nettoyé</a></div> : null}
            <div className="mt-5 flex flex-wrap items-end justify-between gap-3">
              <p className="max-w-md text-xs leading-5 text-[#687477]">Transcrivez directement le MP3 avec Mistral, ou utilisez Auphonic au préalable lorsque des crédits de nettoyage sont disponibles. Le fichier temporaire est supprimé après traitement ou enregistrement.</p>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={!file || !!busy}
                  onClick={() => void transcribe(false)}
                  className="inline-flex items-center gap-2 rounded-xl bg-[#285d68] px-4 py-2.5 text-sm font-bold text-white hover:bg-[#214d56] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {transcriptionMode === "direct" && busy ? <LoaderCircle size={17} className="animate-spin" /> : <AudioLines size={17} />}
                  {transcriptionMode === "direct" && busy === "upload" ? "Envoi du MP3…" : transcriptionMode === "direct" && busy === "transcribe" ? "Transcription Mistral…" : "Transcrire sans nettoyage"}
                </button>
                <button
                  type="button"
                  disabled={!file || !!busy}
                  onClick={() => void transcribe(true)}
                  className="inline-flex items-center gap-2 rounded-xl border border-[#bdd4d1] bg-white px-4 py-2.5 text-sm font-bold text-[#285d68] hover:bg-[#e8f3f1] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {transcriptionMode === "cleanup" && busy ? <LoaderCircle size={17} className="animate-spin" /> : <Sparkles size={17} />}
                  {transcriptionMode === "cleanup" && busy === "upload" ? "Envoi du MP3…" : transcriptionMode === "cleanup" && busy === "clean" ? "Nettoyage Auphonic…" : transcriptionMode === "cleanup" && busy === "transcribe" ? "Transcription Mistral…" : "Nettoyer puis transcrire"}
                </button>
              </div>
            </div>
          </section>

          {transcription ? (
            <section className="rounded-2xl border border-[#d8d5ca] bg-white p-5 shadow-sm sm:p-6">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="text-[11px] font-black uppercase tracking-[0.14em] text-[#a5523c]">02 · Transcription</div>
                  <h2 className="mt-1 text-xl font-bold text-[#203337]">Par locuteur</h2>
                  <p className="mt-1 text-xs text-[#687477]">Vérifiez les mots et les voix avant de demander un retour.</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button type="button" onClick={() => void saveCurrent()} disabled={!!busy || saveState === "saving"} className="inline-flex items-center gap-2 rounded-lg bg-[#285d68] px-3 py-2 text-xs font-bold text-white hover:bg-[#214d56] disabled:opacity-50">
                    {saveState === "saving" ? <LoaderCircle size={15} className="animate-spin" /> : saveState === "saved" ? <Check size={15} /> : <Save size={15} />}
                    {saveState === "saving" ? "Enregistrement…" : saveState === "saved" ? "Enregistré" : recordId ? "Enregistrer les modifications" : "Enregistrer l’oral"}
                  </button>
                  <button type="button" onClick={copyTranscript} className="inline-flex items-center gap-2 rounded-lg border border-[#d8d5ca] px-3 py-2 text-xs font-bold text-[#285d68] hover:bg-[#e8f3f1]">
                    {copied ? <Check size={15} /> : <Clipboard size={15} />}{copied ? "Copié" : "Copier"}
                  </button>
                </div>
              </div>
              {saveError ? <p className="mt-3 rounded-xl bg-[#fff2ef] p-3 text-xs text-[#9a4434]">{saveError}</p> : null}
              {!transcription.diarized ? (
                <p className="mt-5 rounded-xl border border-[#eedfc8] bg-[#fff9ed] p-3 text-xs leading-5 text-[#805f32]">
                  Mistral n’a pas attribué les voix dans cet extrait. Le texte est affiché sous « Locuteur non identifié » ; vérifiez-le avant l’analyse.
                </p>
              ) : null}
              {speakerIds.length ? (
                <div className="mt-5 flex flex-wrap gap-3">
                  {speakerIds.map((id) => (
                    <label key={id} className="text-xs font-bold text-[#536164]">
                      {defaultSpeakerName(id, speakerIds)}
                      <input
                        value={speakerNames[id] ?? ""}
                        onChange={(event) => { setSpeakerNames((current) => ({ ...current, [id]: event.target.value })); setFeedback(null); setSaveState("dirty"); }}
                        placeholder="Nom facultatif"
                        className="teacher-input block min-w-40"
                      />
                    </label>
                  ))}
                </div>
              ) : null}
              <div className="mt-5 space-y-3">
                {turns.map((turn, index) => (
                  <div key={index} className="rounded-xl border border-[#e3e5df] bg-[#fbfaf6] p-4">
                    <div className="mb-2 flex items-center gap-2 text-xs font-black text-[#285d68]">
                      <span className="rounded-full bg-[#e8f3f1] px-2 py-1">{speakerLabel(turn.speakerId)}</span>
                      {turn.start !== null ? <span className="font-mono font-normal text-[#758184]">{timeLabel(turn.start)}{turn.end !== null ? `–${timeLabel(turn.end)}` : ""}</span> : null}
                    </div>
                    <textarea
                      aria-label={`Transcription, ${speakerLabel(turn.speakerId)}, segment ${index + 1}`}
                      rows={Math.min(6, Math.max(2, Math.ceil(turn.text.length / 90)))}
                      value={turn.text}
                      onChange={(event) => updateTurn(index, event.target.value)}
                      className="w-full resize-y bg-transparent text-sm leading-6 text-[#203337] outline-none focus:ring-2 focus:ring-[#bdd4d1]"
                    />
                  </div>
                ))}
              </div>
            </section>
          ) : null}

          {feedback ? (
            <section className="rounded-2xl border border-[#d8d5ca] bg-white p-5 shadow-sm sm:p-6">
              <div className="text-[11px] font-black uppercase tracking-[0.14em] text-[#a5523c]">03 · Retour linguistique</div>
              <h2 className="mt-1 text-xl font-bold text-[#203337]">Pistes pour progresser</h2>
              <p className="mt-3 text-sm leading-6 text-[#536164]">{feedback.overview}</p>
              {feedback.strengths.length ? (
                <div className="mt-5 rounded-xl bg-[#eef6eb] p-4">
                  <h3 className="text-xs font-black uppercase tracking-wide text-[#347047]">Points positifs</h3>
                  <ul className="mt-2 list-inside list-disc space-y-1 text-sm text-[#315f42]">
                    {feedback.strengths.map((strength, index) => <li key={index}>{strength}</li>)}
                  </ul>
                </div>
              ) : null}
              <div className="mt-5 space-y-3">
                {feedback.items.length ? feedback.items.map((item, index) => (
                  <article key={index} className="rounded-xl border border-[#e5dfd3] p-4">
                    <div className="flex flex-wrap items-center gap-2 text-xs font-black text-[#285d68]">
                      <span>{speakerLabel(turns[item.turnIndex]?.speakerId ?? null)}</span>
                      <span className="rounded-full bg-[#f8eee6] px-2 py-1 font-bold text-[#a5523c]">{item.category}</span>
                    </div>
                    <div className="mt-3 grid gap-2 sm:grid-cols-2">
                      <div className="rounded-lg bg-[#faf4ef] p-3 text-sm text-[#784b3a]"><span className="block text-[10px] font-black uppercase tracking-wide">Extrait</span>“{item.quote}”</div>
                      <div className="rounded-lg bg-[#eef6eb] p-3 text-sm text-[#315f42]"><span className="block text-[10px] font-black uppercase tracking-wide">Proposition</span>{item.suggestion}</div>
                    </div>
                    <p className="mt-3 text-sm leading-6 text-[#536164]">{item.explanation}</p>
                  </article>
                )) : <p className="rounded-xl bg-[#eef6eb] p-4 text-sm text-[#315f42]">Aucune erreur linguistique claire à corriger dans cette transcription.</p>}
              </div>
              <p className="mt-5 text-xs leading-5 text-[#758184]">Ce retour est fondé sur le texte relu. Vérifiez chaque proposition avant de la partager avec les élèves.</p>
            </section>
          ) : null}
        </div>

        <aside className="space-y-5 lg:sticky lg:top-24 lg:self-start">
          <section className="rounded-2xl border border-[#d8d5ca] bg-white p-5 shadow-sm">
            <div className="text-[11px] font-black uppercase tracking-[0.14em] text-[#a5523c]">Pour l’analyse</div>
            <h2 className="mt-1 text-lg font-bold text-[#203337]">Contexte pédagogique</h2>
            <label className="field-label mt-5" htmlFor="speaking-level">Niveau visé</label>
            <select id="speaking-level" value={level} onChange={(event) => { setLevel(event.target.value as (typeof LEVELS)[number]); setFeedback(null); setSaveState("dirty"); }} className="teacher-input">
              {LEVELS.map((value) => <option key={value} value={value}>{value}</option>)}
            </select>
            <label className="field-label mt-4" htmlFor="speaking-task">Consigne ou situation (facultatif)</label>
            <textarea id="speaking-task" value={task} onChange={(event) => { setTask(event.target.value); setFeedback(null); setSaveState("dirty"); }} maxLength={500} rows={4} placeholder="Ex. Présenter son week-end au passé" className="teacher-input resize-y" />
            <button
              type="button"
              disabled={!transcription || !!busy || turns.some((turn) => !turn.text.trim())}
              onClick={analyze}
              className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#d45b3f] px-4 py-3 text-sm font-bold text-white hover:bg-[#bd4e35] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {busy === "feedback" ? <LoaderCircle size={17} className="animate-spin" /> : feedback ? <RefreshCw size={17} /> : <Sparkles size={17} />}
              {busy === "feedback" ? "Analyse en cours…" : feedback ? "Actualiser le retour" : "Analyser les erreurs"}
            </button>
            <p className="mt-3 text-xs leading-5 text-[#758184]">Grammaire, vocabulaire et formulation. La prononciation ne peut pas être évaluée à partir de la transcription seule.</p>
          </section>
          {transcription ? (
            <div className="space-y-2">
              <button type="button" onClick={downloadLearnerTranscript} className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-[#bdd4d1] bg-white px-4 py-3 text-sm font-bold text-[#285d68] hover:bg-[#e8f3f1]">
                <Download size={17} /> Transcription brute pour élèves
              </button>
              <button type="button" onClick={copyLearnerTranscript} className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-[#bdd4d1] bg-white px-4 py-2.5 text-xs font-bold text-[#285d68] hover:bg-[#e8f3f1]">
                {copiedLearner ? <Check size={15} /> : <Clipboard size={15} />}{copiedLearner ? "Texte copié" : "Copier la version élèves"}
              </button>
              <p className="px-1 text-xs leading-5 text-[#758184]">Texte transcrit d’origine, par locuteur, sans corrections ni retour IA.</p>
              <button type="button" onClick={downloadReport} className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-[#bdd4d1] bg-white px-4 py-3 text-sm font-bold text-[#285d68] hover:bg-[#e8f3f1]">
                <Download size={17} /> Compte rendu enseignant
              </button>
            </div>
          ) : null}
          <div className="rounded-xl border border-[#d8d5ca] bg-[#fbfaf6] p-4 text-xs leading-5 text-[#687477]">
            Les voix sont repérées automatiquement, mais peuvent être confondues si les élèves se coupent la parole ou si le son est peu clair.
          </div>
        </aside>
      </div>
      {error ? <div role="alert" className="fixed bottom-5 right-5 z-50 max-w-md rounded-xl border border-[#e6beb4] bg-[#fff2ef] p-4 text-sm font-bold text-[#9a4434] shadow-xl">{error}</div> : null}
      {batchPrintRecords ? (
        <section className="speaking-batch-print" aria-label="Transcriptions sélectionnées pour l’impression">
          {batchPrintRecords.map((record) => (
            <article key={record.id} className="speaking-batch-page">
              <h1>{record.filename}</h1>
              <h2>Transcription à corriger</h2>
              <div className="speaking-batch-transcript">
                {record.transcription.turns.map((turn, index) => (
                  <p key={index}><strong>{savedSpeakerLabel(record, turn.speakerId)} :</strong> {turn.text.trim()}</p>
                ))}
              </div>
            </article>
          ))}
        </section>
      ) : null}
    </div>
  );
}
