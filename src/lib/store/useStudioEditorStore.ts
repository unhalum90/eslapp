import { create } from "zustand";
import { clone } from "@/lib/studio/document";
import type { CanvasElement, Id, LessonRecord, PublicationInfo, StudioDocument } from "@/lib/studio/types";

export type SaveState = "idle" | "saving" | "saved" | "unsaved" | "offline" | "conflict" | "error";
export type InspectorTab = "content" | "interaction" | "appearance" | "accessibility";
export type ZoomSetting = "fit" | number;

const HISTORY_LIMIT = 120;

interface EditorState {
  lessonId: Id | null;
  document: StudioDocument | null;
  teacherNotes: string;
  revision: number;
  publication: PublicationInfo | null;
  past: StudioDocument[];
  future: StudioDocument[];
  transactionBase: StudioDocument | null;
  currentPageId: Id | null;
  selectedId: Id | null;
  zoom: ZoomSetting;
  saveState: SaveState;
  saveMessage: string | null;
  dirty: boolean;
  lastSavedAt: string | null;
  assetUrls: Record<Id, string>;
  inspectorTab: InspectorTab;
  drawerOpen: boolean;
  drawerPurpose: "browse" | "background" | "image" | "audio";
  drawerTarget: ((assetId: Id) => void) | null;
  previewOpen: boolean;
  shareOpen: boolean;
  publishOpen: boolean;
  clipboard: CanvasElement | null;
  showHidden: boolean;

  load: (record: LessonRecord, assetUrls: Record<Id, string>) => void;
  unload: () => void;
  update: (mutator: (doc: StudioDocument) => void, options?: { history?: boolean }) => void;
  beginTransaction: () => void;
  endTransaction: () => void;
  undo: () => void;
  redo: () => void;
  select: (id: Id | null) => void;
  setPage: (id: Id) => void;
  setZoom: (zoom: ZoomSetting) => void;
  setInspectorTab: (tab: InspectorTab) => void;
  setTeacherNotes: (notes: string) => void;
  setSaveState: (state: SaveState, message?: string | null) => void;
  markSaved: (revision: number, updatedAt: string) => void;
  setRevision: (revision: number) => void;
  mergeAssetUrls: (urls: Record<Id, string>) => void;
  setPublication: (publication: PublicationInfo | null) => void;
  openDrawer: (purpose?: EditorState["drawerPurpose"], target?: ((assetId: Id) => void) | null) => void;
  closeDrawer: () => void;
  setPreviewOpen: (open: boolean) => void;
  setShareOpen: (open: boolean) => void;
  setPublishOpen: (open: boolean) => void;
  setClipboard: (element: CanvasElement | null) => void;
  setShowHidden: (value: boolean) => void;
}

export const useStudioEditorStore = create<EditorState>((set, get) => ({
  lessonId: null,
  document: null,
  teacherNotes: "",
  revision: 0,
  publication: null,
  past: [],
  future: [],
  transactionBase: null,
  currentPageId: null,
  selectedId: null,
  zoom: "fit",
  saveState: "idle",
  saveMessage: null,
  dirty: false,
  lastSavedAt: null,
  assetUrls: {},
  inspectorTab: "content",
  drawerOpen: false,
  drawerPurpose: "browse",
  drawerTarget: null,
  previewOpen: false,
  shareOpen: false,
  publishOpen: false,
  clipboard: null,
  showHidden: true,

  load: (record, assetUrls) =>
    set({
      lessonId: record.id,
      document: record.document,
      teacherNotes: record.teacherNotes,
      revision: record.revision,
      publication: record.publication,
      past: [],
      future: [],
      transactionBase: null,
      currentPageId: record.document.pages[0]?.id ?? null,
      selectedId: null,
      saveState: "saved",
      saveMessage: null,
      dirty: false,
      lastSavedAt: record.updatedAt,
      assetUrls,
      previewOpen: false,
      shareOpen: false,
      publishOpen: false,
      drawerOpen: false,
    }),

  unload: () => set({ lessonId: null, document: null, past: [], future: [], selectedId: null, currentPageId: null }),

  update: (mutator, options) => {
    const { document, transactionBase, past } = get();
    if (!document) return;
    const next = clone(document);
    mutator(next);
    for (const page of next.pages) page.notes = page.notes.replace(/\n?\[studio-ai-review\]/g, "");
    const record = options?.history !== false && !transactionBase;
    set({
      document: next,
      past: record ? [...past.slice(-HISTORY_LIMIT + 1), document] : past,
      future: record ? [] : get().future,
      dirty: true,
      saveState: get().saveState === "conflict" ? "conflict" : "unsaved",
    });
  },

  beginTransaction: () => {
    const { document, transactionBase } = get();
    if (!document || transactionBase) return;
    set({ transactionBase: document });
  },

  endTransaction: () => {
    const { transactionBase, document, past } = get();
    if (!transactionBase || !document) {
      set({ transactionBase: null });
      return;
    }
    const changed = JSON.stringify(transactionBase) !== JSON.stringify(document);
    set({
      transactionBase: null,
      past: changed ? [...past.slice(-HISTORY_LIMIT + 1), transactionBase] : past,
      future: changed ? [] : get().future,
    });
  },

  undo: () => {
    const { past, future, document } = get();
    if (!document || past.length === 0) return;
    const previous = past[past.length - 1];
    set({
      document: previous,
      past: past.slice(0, -1),
      future: [document, ...future].slice(0, HISTORY_LIMIT),
      dirty: true,
      saveState: "unsaved",
      currentPageId: previous.pages.some((page) => page.id === get().currentPageId) ? get().currentPageId : previous.pages[0]?.id ?? null,
      selectedId: previous.pages.some((page) => page.elements.some((element) => element.id === get().selectedId)) ? get().selectedId : null,
    });
  },

  redo: () => {
    const { past, future, document } = get();
    if (!document || future.length === 0) return;
    const [next, ...rest] = future;
    set({
      document: next,
      past: [...past, document].slice(-HISTORY_LIMIT),
      future: rest,
      dirty: true,
      saveState: "unsaved",
      currentPageId: next.pages.some((page) => page.id === get().currentPageId) ? get().currentPageId : next.pages[0]?.id ?? null,
      selectedId: next.pages.some((page) => page.elements.some((element) => element.id === get().selectedId)) ? get().selectedId : null,
    });
  },

  select: (id) => set({ selectedId: id, inspectorTab: id ? get().inspectorTab : "content" }),
  setPage: (id) => set({ currentPageId: id, selectedId: null }),
  setZoom: (zoom) => set({ zoom }),
  setInspectorTab: (tab) => set({ inspectorTab: tab }),
  setTeacherNotes: (notes) => set({ teacherNotes: notes, dirty: true, saveState: "unsaved" }),
  setSaveState: (state, message = null) => set({ saveState: state, saveMessage: message }),
  markSaved: (revision, updatedAt) => set({ revision, lastSavedAt: updatedAt, saveState: "saved", saveMessage: null, dirty: false }),
  setRevision: (revision) => set({ revision }),
  mergeAssetUrls: (urls) => set({ assetUrls: { ...get().assetUrls, ...urls } }),
  setPublication: (publication) => set({ publication }),
  openDrawer: (purpose = "browse", target = null) => set({ drawerOpen: true, drawerPurpose: purpose, drawerTarget: target }),
  closeDrawer: () => set({ drawerOpen: false, drawerTarget: null, drawerPurpose: "browse" }),
  setPreviewOpen: (open) => set({ previewOpen: open }),
  setShareOpen: (open) => set({ shareOpen: open }),
  setPublishOpen: (open) => set({ publishOpen: open }),
  setClipboard: (element) => set({ clipboard: element }),
  setShowHidden: (value) => set({ showHidden: value }),
}));

export function selectCurrentPage(state: Pick<EditorState, "document" | "currentPageId">) {
  return state.document?.pages.find((page) => page.id === state.currentPageId) ?? state.document?.pages[0] ?? null;
}

export function selectSelectedElement(state: Pick<EditorState, "document" | "currentPageId" | "selectedId">) {
  const page = selectCurrentPage(state);
  return page?.elements.find((element) => element.id === state.selectedId) ?? null;
}
