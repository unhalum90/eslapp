"use client";

import { useEffect, useState } from "react";
import { Bot, Image as ImageIcon, LockKeyhole } from "lucide-react";
import { getAiConfiguration } from "@/app/actions/aiConfig";
import {
  DEFAULT_TEXT_AGENT,
  TEXT_AGENTS,
  type TextAgentId,
} from "@/lib/ai/catalog";
import { useAiAgentStore } from "@/lib/store/useAiAgentStore";

type AiConfiguration = Awaited<ReturnType<typeof getAiConfiguration>>;

export function AgentSelector() {
  const { selectedAgent, setSelectedAgent } = useAiAgentStore();
  const [configuration, setConfiguration] = useState<AiConfiguration | null>(null);

  useEffect(() => {
    let active = true;
    void getAiConfiguration().then((result) => {
      if (!active) return;
      setConfiguration(result);
      if (
        !result.canSelectAgent &&
        useAiAgentStore.getState().selectedAgent !== DEFAULT_TEXT_AGENT
      ) {
        setSelectedAgent(DEFAULT_TEXT_AGENT);
      }
    });
    return () => {
      active = false;
    };
  }, [setSelectedAgent]);

  const selectedConfiguration = configuration?.agents[selectedAgent];
  const status = !configuration
    ? "Checking AI configuration…"
    : !configuration.authenticated
      ? "Sign in to use AI"
      : selectedConfiguration?.configured
        ? `${selectedConfiguration.provider} key ready`
        : `${selectedConfiguration?.requiredEnvironmentVariable ?? "API key"} missing`;

  return (
    <div className="flex items-center gap-1 md:gap-2">
      <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 shadow-sm">
        <Bot size={15} className="text-indigo-600" />
        <label className="sr-only" htmlFor="text-agent-selector">
          Text generation agent
        </label>
        {configuration?.canSelectAgent ? (
          <select
            id="text-agent-selector"
            value={selectedAgent}
            onChange={(event) => setSelectedAgent(event.target.value as TextAgentId)}
            className="max-w-36 bg-transparent text-xs font-bold text-slate-800 outline-none"
          >
            {(Object.keys(TEXT_AGENTS) as TextAgentId[]).map((agentId) => (
              <option
                key={agentId}
                value={agentId}
                disabled={!configuration.agents[agentId].configured}
              >
                {TEXT_AGENTS[agentId].label}
                {configuration.agents[agentId].configured ? "" : " — key missing"}
              </option>
            ))}
          </select>
        ) : (
          <span className="text-xs font-bold text-slate-800">
            {TEXT_AGENTS[selectedAgent].label}
          </span>
        )}
        {!configuration?.canSelectAgent ? <LockKeyhole size={12} className="text-slate-400" /> : null}
      </div>
      <div
        className={`hidden h-2 w-2 rounded-full sm:block ${selectedConfiguration?.configured ? "bg-emerald-500" : "bg-amber-400"}`}
        title={status}
        aria-label={status}
      />
      <div
        className={`hidden items-center gap-1 text-[10px] font-bold md:flex ${configuration?.imageAgent.configured ? "text-emerald-700" : "text-slate-400"}`}
        title={
          configuration?.imageAgent.configured
            ? "Nano Banana 2 image generation ready"
            : "GOOGLE_API_KEY missing for Nano Banana 2"
        }
      >
        <ImageIcon size={12} /> NB2
      </div>
    </div>
  );
}
