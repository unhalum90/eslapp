import { z } from "zod";
export const extractedVocabularySchema = z.object({
  vocabulary: z
    .array(
      z.object({
        term: z.string().trim().min(1).max(100),
        meaning: z.string().trim().max(140),
      }),
    )
    .max(40),
  note: z.string().max(500),
});
export function vocabularySource(input: unknown) {
  const result = extractedVocabularySchema.parse(input);
  const seen = new Set<string>();
  const vocabulary = result.vocabulary.filter((item) => {
    const key = item.term.toLocaleLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  if (vocabulary.length < 2)
    throw new Error(
      "Fewer than two readable vocabulary terms were found. Try a clearer image or a document with a word list.",
    );
  return {
    source: vocabulary
      .map((item) =>
        item.meaning ? `${item.term} — ${item.meaning}` : item.term,
      )
      .join("\n"),
    vocabulary,
    note: result.note,
  };
}
