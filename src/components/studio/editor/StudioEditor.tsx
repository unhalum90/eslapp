"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { getStudioAssetUrls, loadStudioLesson, saveStudioLesson } from "@/app/actions/studio";
import { duplicateElement } from "@/lib/studio/document";
import { selectCurrentPage, selectSelectedElement, useStudioEditorStore } from "@/lib/store/useStudioEditorStore";
import { StudioPlayer } from "../player/StudioPlayer";
import { AssetDrawer } from "./AssetDrawer";
import { EditorCanvas } from "./EditorCanvas";
import { Filmstrip } from "./Filmstrip";
import { Inspector } from "./Inspector";
import { EditorAiTools } from "../ai/EditorAiTools";
import { TopBar } from "./TopBar";

const AUTOSAVE_DELAY = 2000;
const URL_REFRESH_MS = 50 * 60 * 1000;

export function StudioEditor({ lessonId }: { lessonId: string }) {
  const [loadError, setLoadError] = useState<{ message: string; needsSignIn?: boolean } | null>(null);
  const loaded = useStudioEditorStore((state) => state.lessonId === lessonId && Boolean(state.document));
  const previewOpen = useStudioEditorStore((state) => state.previewOpen);
  const saveTimer = useRef<number | null>(null);
  const saving = useRef<Promise<boolean> | null>(null);

  useEffect(() => {
    let cancelled = false;
    void loadStudioLesson(lessonId).then((result) => {
      if (cancelled) return;
      if (!result.ok) {
        setLoadError({ message: result.message, needsSignIn: result.needsSignIn });
        return;
      }
      setLoadError(null);
      useStudioEditorStore.getState().load(result.lesson, result.assetUrls);
    });
    return () => {
      cancelled = true;
      useStudioEditorStore.getState().unload();
    };
  }, [lessonId]);

  const saveNow = useCallback(async (): Promise<boolean> => {
    if (saving.current) return saving.current;
    const run = (async () => {
      const state = useStudioEditorStore.getState();
      if (!state.document || state.lessonId !== lessonId) return false;
      if (!state.dirty && state.saveState !== "error" && state.saveState !== "offline") return true;
      if (state.saveState === "conflict") return false;
      if (typeof navigator !== "undefined" && !navigator.onLine) {
        state.setSaveState("offline");
        return false;
      }
      const snapshot = state.document;
      const notes = state.teacherNotes;
      const baseRevision = state.revision;
      state.setSaveState("saving");
      try {
        const result = await saveStudioLesson(lessonId, snapshot, notes, baseRevision);
        const current = useStudioEditorStore.getState();
        if (!result.ok) {
          if ("conflict" in result && result.conflict) {
            current.setSaveState("conflict", `Version serveur ${result.serverRevision}. Rechargez la page pour récupérer la dernière version ; vos modifications locales seront perdues.`);
            return false;
          }
          current.setSaveState("error", "message" in result ? result.message : undefined);
          return false;
        }
        // Later edits during the request keep the draft dirty.
        const stillDirty = current.document !== snapshot || current.teacherNotes !== notes;
        current.markSaved(result.revision, result.updatedAt);
        if (stillDirty) current.setSaveState("unsaved");
        if (stillDirty) useStudioEditorStore.setState({ dirty: true });
        return !stillDirty;
      } catch {
        useStudioEditorStore.getState().setSaveState(typeof navigator !== "undefined" && !navigator.onLine ? "offline" : "error", "Le serveur n'a pas répondu.");
        return false;
      }
    })();
    saving.current = run;
    const outcome = await run;
    saving.current = null;
    return outcome;
  }, [lessonId]);

  // Autosave with idle debounce.
  useEffect(() => {
    const unsubscribe = useStudioEditorStore.subscribe((state, previous) => {
      if (state.lessonId !== lessonId) return;
      if (state.document === previous.document && state.teacherNotes === previous.teacherNotes) return;
      if (!state.dirty) return;
      if (saveTimer.current) window.clearTimeout(saveTimer.current);
      saveTimer.current = window.setTimeout(() => {
        saveTimer.current = null;
        void saveNow();
      }, AUTOSAVE_DELAY);
    });
    return () => {
      unsubscribe();
      if (saveTimer.current) window.clearTimeout(saveTimer.current);
    };
  }, [lessonId, saveNow]);

  // Warn before leaving with unsaved work; retry when back online.
  useEffect(() => {
    const beforeUnload = (event: BeforeUnloadEvent) => {
      const state = useStudioEditorStore.getState();
      if (state.dirty || state.saveState === "saving") {
        event.preventDefault();
        event.returnValue = "";
      }
    };
    const online = () => void saveNow();
    window.addEventListener("beforeunload", beforeUnload);
    window.addEventListener("online", online);
    return () => {
      window.removeEventListener("beforeunload", beforeUnload);
      window.removeEventListener("online", online);
    };
  }, [saveNow]);

  // Refresh signed media URLs before they expire.
  useEffect(() => {
    const timer = window.setInterval(() => {
      const state = useStudioEditorStore.getState();
      if (!state.document) return;
      const assets = Object.values(state.document.assets).map((asset) => ({ id: asset.id, path: asset.path }));
      if (assets.length === 0) return;
      void getStudioAssetUrls(assets).then((result) => {
        if (result.ok) useStudioEditorStore.getState().mergeAssetUrls(result.urls);
      });
    }, URL_REFRESH_MS);
    return () => window.clearInterval(timer);
  }, []);

  // Keyboard shortcuts.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const typing = Boolean(target && (/^(input|textarea|select)$/i.test(target.tagName) || target.isContentEditable));
      const state = useStudioEditorStore.getState();
      if (!state.document || state.previewOpen || state.drawerOpen || state.publishOpen || state.shareOpen) return;
      const meta = event.metaKey || event.ctrlKey;
      if (meta && event.key.toLowerCase() === "z") {
        if (typing) return;
        event.preventDefault();
        if (event.shiftKey) state.redo();
        else state.undo();
        return;
      }
      if (meta && event.key.toLowerCase() === "s") {
        event.preventDefault();
        void saveNow();
        return;
      }
      if (typing) return;
      const page = selectCurrentPage(state);
      const element = selectSelectedElement(state);
      if (!page) return;
      if (meta && event.key.toLowerCase() === "d" && element) {
        event.preventDefault();
        const copy = duplicateElement(element);
        state.update((doc) => { doc.pages.find((candidate) => candidate.id === page.id)?.elements.push(copy); });
        state.select(copy.id);
        return;
      }
      if (meta && event.key.toLowerCase() === "c" && element) {
        state.setClipboard(element);
        return;
      }
      if (meta && event.key.toLowerCase() === "v" && state.clipboard) {
        event.preventDefault();
        const copy = duplicateElement(state.clipboard);
        state.update((doc) => { doc.pages.find((candidate) => candidate.id === page.id)?.elements.push(copy); });
        state.select(copy.id);
        return;
      }
      if (!element) return;
      if (event.key === "Escape") {
        state.select(null);
        return;
      }
      if ((event.key === "Delete" || event.key === "Backspace") && !element.lockedInEditor) {
        event.preventDefault();
        state.update((doc) => {
          const found = doc.pages.find((candidate) => candidate.id === page.id);
          if (found) found.elements = found.elements.filter((candidate) => candidate.id !== element.id);
        });
        state.select(null);
        return;
      }
      const step = event.shiftKey ? 10 : 1;
      const delta: Record<string, [number, number]> = { ArrowUp: [0, -step], ArrowDown: [0, step], ArrowLeft: [-step, 0], ArrowRight: [step, 0] };
      if (delta[event.key] && !element.lockedInEditor) {
        event.preventDefault();
        const [dx, dy] = delta[event.key];
        state.update((doc) => {
          const found = doc.pages.flatMap((candidate) => candidate.elements).find((candidate) => candidate.id === element.id);
          if (found) {
            found.frame.x += dx;
            found.frame.y += dy;
          }
        });
        return;
      }
      if (meta && (event.key === "]" || event.key === "[")) {
        event.preventDefault();
        state.update((doc) => {
          const found = doc.pages.find((candidate) => candidate.id === page.id);
          if (!found) return;
          const index = found.elements.findIndex((candidate) => candidate.id === element.id);
          const next = event.key === "]" ? Math.min(found.elements.length - 1, index + 1) : Math.max(0, index - 1);
          const [moved] = found.elements.splice(index, 1);
          found.elements.splice(next, 0, moved);
        });
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [saveNow]);

  if (loadError) {
    return (
      <div className="mx-auto mt-16 max-w-md rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <p className="text-lg font-black text-[#18282b]">{loadError.needsSignIn ? "Connexion requise" : "Leçon indisponible"}</p>
        <p className="mt-2 text-sm text-slate-600">{loadError.message}</p>
        <div className="mt-5 flex justify-center gap-2">
          {loadError.needsSignIn ? <Link href="/account" className="rounded-lg bg-[#285d68] px-4 py-2 text-sm font-bold text-white">Se connecter</Link> : null}
          <Link href="/studio" className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-bold">Retour aux leçons</Link>
        </div>
      </div>
    );
  }

  if (!loaded) {
    return (
      <div className="flex h-full items-center justify-center text-slate-500">
        <Loader2 className="mr-2 animate-spin" /> Chargement de la leçon…
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col bg-[#f4f2eb]">
      <TopBar onSaveNow={saveNow} />
      <EditorAiTools />
      <div className="flex min-h-0 flex-1">
        <Filmstrip />
        <EditorCanvas />
        <Inspector />
      </div>
      <AssetDrawer />
      {previewOpen ? <PreviewOverlay /> : null}
    </div>
  );
}

function PreviewOverlay() {
  const document = useStudioEditorStore((state) => state.document);
  const assetUrls = useStudioEditorStore((state) => state.assetUrls);
  const setPreviewOpen = useStudioEditorStore((state) => state.setPreviewOpen);
  if (!document) return null;
  return (
    <div className="fixed inset-0 z-50 bg-[#f4f2eb]">
      <StudioPlayer document={document} mode="preview" teacher resolveAssetUrl={(assetId) => (assetId ? assetUrls[assetId] : undefined)} onExit={() => setPreviewOpen(false)} />
    </div>
  );
}
