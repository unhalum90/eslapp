"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { DEFAULT_TEXT_AGENT, type TextAgentId } from "@/lib/ai/catalog";

interface AiAgentStore {
  selectedAgent: TextAgentId;
  setSelectedAgent: (agent: TextAgentId) => void;
}

export const useAiAgentStore = create<AiAgentStore>()(
  persist(
    (set) => ({
      selectedAgent: DEFAULT_TEXT_AGENT,
      setSelectedAgent: (selectedAgent) => set({ selectedAgent }),
    }),
    { name: "esl-architect-ai-agent", version: 1 },
  ),
);
