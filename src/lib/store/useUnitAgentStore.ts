"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type {
  UnitAgentMessage,
  UnitAgentProposalStatus,
  UnitAgentSection,
} from "@/lib/unit-agent/types";
import type { ImageGenerationMode } from "@/lib/image-generation/types";

interface UnitAgentState {
  messagesByUnit: Record<string, UnitAgentMessage[]>;
  panelOpen: boolean;
  defaultImageMode: ImageGenerationMode;
  appendMessage: (unitId: string, message: UnitAgentMessage) => void;
  setProposalStatus: (
    unitId: string,
    messageId: string,
    status: UnitAgentProposalStatus,
    appliedSections?: UnitAgentSection[],
  ) => void;
  clearConversation: (unitId: string) => void;
  clearFailedAttempts: (unitId: string) => void;
  setPanelOpen: (open: boolean) => void;
  setDefaultImageMode: (mode: ImageGenerationMode) => void;
}

export const useUnitAgentStore = create<UnitAgentState>()(
  persist(
    (set) => ({
      messagesByUnit: {},
      panelOpen: true,
      defaultImageMode: "compare",
      appendMessage: (unitId, message) =>
        set((state) => ({
          messagesByUnit: {
            ...state.messagesByUnit,
            [unitId]: [...(state.messagesByUnit[unitId] ?? []), message].slice(-80),
          },
        })),
      setProposalStatus: (unitId, messageId, status, appliedSections = []) =>
        set((state) => ({
          messagesByUnit: {
            ...state.messagesByUnit,
            [unitId]: (state.messagesByUnit[unitId] ?? []).map((message) =>
              message.id === messageId && message.proposal
                ? {
                    ...message,
                    proposal: { ...message.proposal, status, appliedSections },
                  }
                : message,
            ),
          },
        })),
      clearConversation: (unitId) =>
        set((state) => {
          const messagesByUnit = { ...state.messagesByUnit };
          delete messagesByUnit[unitId];
          return { messagesByUnit };
        }),
      clearFailedAttempts: (unitId) =>
        set((state) => {
          const messages = state.messagesByUnit[unitId] ?? [];
          const failedIndexes = new Set<number>();
          messages.forEach((message, index) => {
            const legacyFailure =
              message.content === "I couldn’t complete that request. Check the selected agent configuration and try again." ||
              message.content === "Sign in with a teacher account before using Unit Architect." ||
              message.content === "The selected text agent is not configured on this server." ||
              message.content === "Unit Architect’s planning connection is not ready. Restart the app and try again.";
            if (!message.errorCode && !legacyFailure) return;
            failedIndexes.add(index);
            if (messages[index - 1]?.role === "user") failedIndexes.add(index - 1);
          });
          if (failedIndexes.size === 0) return state;
          return {
            messagesByUnit: {
              ...state.messagesByUnit,
              [unitId]: messages.filter((_, index) => !failedIndexes.has(index)),
            },
          };
        }),
      setPanelOpen: (panelOpen) => set({ panelOpen }),
      setDefaultImageMode: (defaultImageMode) => set({ defaultImageMode }),
    }),
    {
      name: "esl-architect-unit-agent",
      version: 1,
      partialize: (state) => ({
        messagesByUnit: state.messagesByUnit,
        panelOpen: state.panelOpen,
        defaultImageMode: state.defaultImageMode,
      }),
    },
  ),
);
