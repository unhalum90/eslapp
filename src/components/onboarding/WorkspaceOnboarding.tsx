"use client";

import { useEffect, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Lightbulb,
  Sparkles,
  X,
} from "lucide-react";

interface TourStep {
  title: string;
  description: string;
  bestPractice: string;
  target?: string;
}

const TOUR_STEPS: TourStep[] = [
  {
    title: "Welcome to your teaching workspace",
    description:
      "This is where an idea becomes a complete unit. You can begin with a blank page, answer a few guided questions, and let Unit Architect help build the rest.",
    bestPractice: "Start with what you know. A theme, class level, or final activity is enough.",
  },
  {
    title: "Create and organize units here",
    description:
      "Choose a class, then press + beside Units. The short setup walks you through the title, level, objectives, final task, and teaching context before opening the workspace.",
    bestPractice: "Create one unit around one meaningful student outcome. You can refine its name later.",
    target: "#workspace-navigation",
  },
  {
    title: "Plan backward from the final task",
    description:
      "The final task is the destination. Sessions, vocabulary, grammar, and materials should all help students reach it. Your edits save automatically; Save snapshot creates a named version you can return to.",
    bestPractice: "Describe what students will produce or perform—not only what they will study.",
    target: '[data-onboarding="unit-plan"]',
  },
  {
    title: "Talk to Unit Architect",
    description:
      "You do not need to complete every box first. Tell the agent what you know, ask it to question you one step at a time, or ask for a complete proposal. It can create plans, vocabulary, images, and classroom materials.",
    bestPractice: "Ask for options, then approve only the sections you want. Nothing changes without your review.",
    target: '[data-onboarding="unit-architect"]',
  },
  {
    title: "Everything stays organized by purpose",
    description:
      "Use these tabs to move between the unit plan, vocabulary, classroom-ready materials, sources, decisions, and delivery. Materials appear as rich documents and can be sent to Google Drive when connected.",
    bestPractice: "Check Materials after the agent creates a worksheet, activity, or teacher guide.",
    target: '[data-onboarding="workspace-tabs"]',
  },
  {
    title: "Make room and ask for help anytime",
    description:
      "Use the sidebar button to give the workspace the full screen. The Help button restarts this tour whenever you want a refresher.",
    bestPractice: "There is no wrong starting point—the workspace and agent share the same unit context.",
    target: '[data-onboarding="onboarding-help"]',
  },
];

interface HighlightRect {
  top: number;
  left: number;
  width: number;
  height: number;
  cardSide: "left" | "right";
}

export function WorkspaceOnboarding({
  onDismiss,
}: {
  onDismiss: () => void;
}) {
  const [stepIndex, setStepIndex] = useState(0);
  const [highlight, setHighlight] = useState<HighlightRect | null>(null);
  const step = TOUR_STEPS[stepIndex];
  const isLastStep = stepIndex === TOUR_STEPS.length - 1;

  useEffect(() => {
    if (!step.target) return;

    const target = document.querySelector<HTMLElement>(step.target);
    if (!target) return;

    target.scrollIntoView({ behavior: "smooth", block: "center", inline: "nearest" });

    const measure = () => {
      const rect = target.getBoundingClientRect();
      const padding = 8;
      setHighlight({
        top: Math.max(8, rect.top - padding),
        left: Math.max(8, rect.left - padding),
        width: Math.min(window.innerWidth - 16, rect.width + padding * 2),
        height: Math.min(window.innerHeight - 16, rect.height + padding * 2),
        cardSide: rect.left + rect.width / 2 > window.innerWidth / 2 ? "left" : "right",
      });
    };

    const frame = window.requestAnimationFrame(measure);
    const settleTimer = window.setTimeout(measure, 350);
    window.addEventListener("resize", measure);
    window.addEventListener("scroll", measure, true);

    return () => {
      window.cancelAnimationFrame(frame);
      window.clearTimeout(settleTimer);
      window.removeEventListener("resize", measure);
      window.removeEventListener("scroll", measure, true);
    };
  }, [step.target]);

  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") onDismiss();
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [onDismiss]);

  const moveToStep = (nextStep: number) => {
    setHighlight(null);
    setStepIndex(nextStep);
  };

  const goForward = () => {
    if (isLastStep) {
      onDismiss();
      return;
    }
    moveToStep(stepIndex + 1);
  };

  const highlightStyle = highlight
    ? {
        top: highlight.top,
        left: highlight.left,
        width: highlight.width,
        height: highlight.height,
      }
    : undefined;

  return (
    <div className="fixed inset-0 z-[200]" role="dialog" aria-modal="true" aria-labelledby="onboarding-title">
      {highlight ? (
        <div
          aria-hidden="true"
          className="pointer-events-none fixed rounded-2xl border-2 border-white shadow-[0_0_0_9999px_rgba(2,6,23,0.72),0_0_0_6px_rgba(99,102,241,0.45)] transition-all duration-200"
          style={highlightStyle}
        />
      ) : (
        <div aria-hidden="true" className="fixed inset-0 bg-slate-950/72" />
      )}

      <section
        className={`fixed z-10 w-[calc(100%-2rem)] max-w-md overflow-hidden rounded-3xl border border-white/20 bg-white shadow-2xl ${
          highlight
            ? highlight.cardSide === "left"
              ? "bottom-4 left-4 sm:bottom-6 sm:left-6"
              : "bottom-4 right-4 sm:bottom-6 sm:right-6"
            : "left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
        }`}
      >
        <div className="bg-gradient-to-r from-indigo-600 to-violet-600 px-5 py-4 text-white">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2 text-sm font-black">
              <Sparkles size={18} /> Quick tour
            </div>
            <button
              type="button"
              onClick={onDismiss}
              aria-label="Close onboarding tour"
              title="Close tour"
              className="rounded-lg p-1.5 text-indigo-100 hover:bg-white/15 hover:text-white"
            >
              <X size={18} />
            </button>
          </div>
          <div className="mt-3 flex gap-1.5" aria-label={`Step ${stepIndex + 1} of ${TOUR_STEPS.length}`}>
            {TOUR_STEPS.map((item, index) => (
              <span
                key={item.title}
                className={`h-1.5 flex-1 rounded-full ${index <= stepIndex ? "bg-white" : "bg-white/30"}`}
              />
            ))}
          </div>
        </div>

        <div className="p-5 sm:p-6">
          <p className="text-xs font-black uppercase tracking-[0.16em] text-indigo-600">
            Step {stepIndex + 1} of {TOUR_STEPS.length}
          </p>
          <h2 id="onboarding-title" className="mt-2 text-2xl font-black tracking-tight text-slate-950">
            {step.title}
          </h2>
          <p className="mt-3 text-sm leading-6 text-slate-600">{step.description}</p>

          <div className="mt-4 flex gap-3 rounded-2xl bg-amber-50 p-3.5 text-amber-950">
            <Lightbulb size={19} className="mt-0.5 shrink-0 text-amber-600" />
            <div>
              <p className="text-xs font-black uppercase tracking-wide text-amber-700">Best practice</p>
              <p className="mt-1 text-sm leading-5">{step.bestPractice}</p>
            </div>
          </div>

          <div className="mt-6 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={onDismiss}
              className="text-sm font-bold text-slate-500 hover:text-slate-900"
            >
              Skip tour
            </button>
            <div className="flex gap-2">
              {stepIndex > 0 ? (
                <button
                  type="button"
                  onClick={() => moveToStep(stepIndex - 1)}
                  className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50"
                >
                  <ArrowLeft size={16} /> Back
                </button>
              ) : null}
              <button
                type="button"
                autoFocus
                onClick={goForward}
                className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-black text-white hover:bg-indigo-700"
              >
                {isLastStep ? (
                  <>
                    <Check size={16} /> Start planning
                  </>
                ) : (
                  <>
                    Next <ArrowRight size={16} />
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
