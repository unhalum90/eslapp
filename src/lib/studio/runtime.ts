import { resolveNavigateTarget } from "./document";
import type { Id, PlayerSession, StudioAction, StudioDocument } from "./types";

/**
 * Bounded, deterministic action interpreter shared by preview and player.
 *
 * - Actions run in authored order.
 * - `navigate` ends the sequence.
 * - `modal` suspends the sequence until the dialog closes.
 * - Any page change invalidates in-flight sequences via the generation token.
 */

export interface RuntimeHost {
  getDocument(): StudioDocument;
  getSession(): PlayerSession;
  generation(): number;
  navigate(pageId: Id): void;
  showTooltip(anchorElementId: Id, action: Extract<StudioAction, { type: "tooltip" }>): void;
  openModal(action: Extract<StudioAction, { type: "modal" }>, anchorElementId: Id): Promise<void>;
  playAudio(assetId: Id, ownerElementId: Id | null): Promise<boolean>;
  stopAudio(): void;
  setVisibility(elementIds: Id[], mode: "show" | "hide" | "toggle"): void;
  openExternal(url: string): void;
  reportProblem(message: string): void;
}

export const MAX_ACTIONS_PER_RUN = 12;

export async function runActions(actions: StudioAction[], anchorElementId: Id, host: RuntimeHost): Promise<void> {
  const startGeneration = host.generation();
  const bounded = actions.slice(0, MAX_ACTIONS_PER_RUN);
  for (const action of bounded) {
    if (host.generation() !== startGeneration) return;
    switch (action.type) {
      case "tooltip":
        host.showTooltip(anchorElementId, action);
        break;
      case "modal":
        await host.openModal(action, anchorElementId);
        break;
      case "navigate": {
        const target = resolveNavigateTarget(host.getDocument(), host.getSession().currentPageId, action.target);
        if (!target) {
          host.reportProblem("Cette page n'existe pas.");
          return;
        }
        host.navigate(target);
        return;
      }
      case "playAudio": {
        if (!action.assetId) {
          host.reportProblem("Aucun fichier audio n'est attaché.");
          return;
        }
        const started = await host.playAudio(action.assetId, anchorElementId);
        if (!started) return;
        break;
      }
      case "stopAudio":
        host.stopAudio();
        break;
      case "setVisibility":
        host.setVisibility(action.elementIds, action.mode);
        break;
      case "externalLink":
        if (!/^https:\/\//.test(action.url)) {
          host.reportProblem("Lien non autorisé.");
          return;
        }
        host.openExternal(action.url);
        break;
      default:
        host.reportProblem("Action non prise en charge.");
        return;
    }
  }
}

// ---------------------------------------------------------------------------
// Session reducer: learner state never touches authored data.
// ---------------------------------------------------------------------------

export type SessionEvent =
  | { type: "navigate"; pageId: Id }
  | { type: "visitElement"; elementId: Id }
  | { type: "setVisibility"; elementIds: Id[]; mode: "show" | "hide" | "toggle"; initial: Record<Id, boolean> }
  | { type: "answer"; elementId: Id; optionId: Id; correct: boolean }
  | { type: "complete"; activityId: Id }
  | { type: "finish" }
  | { type: "reset"; session: PlayerSession };

export function reduceSession(session: PlayerSession, event: SessionEvent): PlayerSession {
  switch (event.type) {
    case "navigate":
      if (session.currentPageId === event.pageId) return session;
      return {
        ...session,
        currentPageId: event.pageId,
        visitedPageIds: session.visitedPageIds.includes(event.pageId) ? session.visitedPageIds : [...session.visitedPageIds, event.pageId],
      };
    case "visitElement":
      if (session.visitedElementIds.includes(event.elementId)) return session;
      return { ...session, visitedElementIds: [...session.visitedElementIds, event.elementId] };
    case "setVisibility": {
      const overrides = { ...session.visibilityOverrides };
      for (const id of event.elementIds) {
        const current = overrides[id] ?? event.initial[id] ?? true;
        overrides[id] = event.mode === "show" ? true : event.mode === "hide" ? false : !current;
      }
      return { ...session, visibilityOverrides: overrides };
    }
    case "answer": {
      const previous = session.answers[event.elementId];
      const answers = {
        ...session.answers,
        [event.elementId]: {
          selectedOptionId: event.optionId,
          correct: event.correct,
          attempts: (previous?.attempts ?? 0) + 1,
        },
      };
      const completed = event.correct && !session.completedActivityIds.includes(event.elementId)
        ? [...session.completedActivityIds, event.elementId]
        : session.completedActivityIds;
      return { ...session, answers, completedActivityIds: completed };
    }
    case "complete":
      if (session.completedActivityIds.includes(event.activityId)) return session;
      return { ...session, completedActivityIds: [...session.completedActivityIds, event.activityId] };
    case "finish":
      return { ...session, finished: true };
    case "reset":
      return event.session;
  }
}

export function initialVisibilityMap(doc: StudioDocument): Record<Id, boolean> {
  const map: Record<Id, boolean> = {};
  for (const page of doc.pages) for (const element of page.elements) map[element.id] = element.initiallyVisible;
  return map;
}
