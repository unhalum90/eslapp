import type { SpeakingTranscription, SpeakingTurn } from "./types";

const AUPHONIC_CREDIT_PATTERN = /\b(?:auphonic|alphonic|biophonic|audio post[\s-]*production)\b/i;

function trimTurn(turn: SpeakingTurn): SpeakingTurn {
  return { ...turn, text: turn.text.trim() };
}

/**
 * Auphonic's free audio cleanup can prepend a two-line spoken credit. Remove
 * that pair only when one of the first two recognized lines identifies it.
 */
export function stripLeadingAuphonicCredit(transcription: SpeakingTranscription): SpeakingTranscription {
  const turns = transcription.turns.map(trimTurn).filter((turn) => turn.text);
  const firstTurnLines = turns[0]?.text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean) ?? [];

  let cleanedTurns = turns;
  if (firstTurnLines.length >= 2 && firstTurnLines.slice(0, 2).some((line) => AUPHONIC_CREDIT_PATTERN.test(line))) {
    const remainingText = firstTurnLines.slice(2).join("\n");
    cleanedTurns = remainingText
      ? [{ ...turns[0], text: remainingText }, ...turns.slice(1)]
      : turns.slice(1);
  } else if (turns.slice(0, 2).some((turn) => AUPHONIC_CREDIT_PATTERN.test(turn.text))) {
    cleanedTurns = turns.slice(Math.min(2, turns.length));
  }

  return {
    ...transcription,
    text: cleanedTurns.map((turn) => turn.text).join(" "),
    turns: cleanedTurns,
    diarized: cleanedTurns.some((turn) => turn.speakerId !== null),
  };
}

export function transcriptTurnsWithoutLeadingCredit(turns: SpeakingTurn[]): SpeakingTurn[] {
  return stripLeadingAuphonicCredit({ text: "", language: null, turns, diarized: false }).turns;
}
