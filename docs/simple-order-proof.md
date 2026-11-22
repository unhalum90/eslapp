# Simple Order

Simple Order is the third activity in `/tools/interactive`, alongside Matching Pairs and Group Assignment. Teachers use the same source-first theme/upload workflow and choose the activity before generation.

## Authoring and generation

Generation supports 3–20 distinct cards. The teacher can choose automatic selection of a suitable ordering rule, alphabetical A–Z, or a logical sequence. Uploads default to alphabetical ordering rather than imposing an arbitrary sequence on unrelated vocabulary. Uploaded activities use only extracted source terms. The server checks schema, counts, requested mode, source membership and duplicate card text. Alphabetical answers are sorted deterministically in English collation with numeric comparison; the model supplies the pedagogical wording. Logical sequences are model-authored and need teacher review for factual accuracy and ambiguity.

The editor explicitly displays the correct answer order and a separate ordering rule that is always shown to learners. Teachers can edit metadata, instructions, help, feedback, rule, card text and hints; reorder, duplicate, add or remove cards; sort A–Z; and choose manual/automatic checking and read-aloud. Up to 40 cards can be authored. Removing populated cards uses an in-page confirmation. Empty/incomplete drafts can be saved, while preview/publishing require a title, rule, at least three cards and distinct nonempty card text.

## Learner experience

Cards start shuffled and never already solved. The answer sequence is not visually rendered behind the start dialog. Learners drag whole cards to target positions, select a card and tap a destination, use the visible earlier/later arrows, or press arrow keys on a focused card. Dragging near viewport edges scrolls the board. Hints and browser read-aloud controls remain separate.

Manual checking evaluates all positions; moving any card clears previous evaluation because other positions may have changed. Automatic mode reevaluates the sequence after each move. Correct/incorrect feedback includes text and colors, sound feedback has a mute toggle, and full completion opens the authored feedback dialog. Replay clears evaluation and reshuffles. Learner state stays in memory and does not mutate the definition or write attempts to the server.

## Saving and delivery

Simple Order uses the shared activity validator, device/account library, authenticated teacher storage actions and anonymous learner publication reader. Device drafts and publication history use `esl-ordering-drafts-v1` and `esl-ordering-links-v1`. Published snapshots use `/play/ordering/<code>` and `/embed/ordering/<code>`, with link/embed copying, QR display and owner revocation.

The existing activity Supabase migration and teacher sign-in remain required for cloud saving/publishing. No extra database migration is needed for this template. Remote publication and external embeds have not been verified end to end in this checkout; the previously documented remote database setup is still outstanding.

## Verification

- Six ordering tests cover hydration/IDs, moving earlier and later without losing records, evaluated completion, invalid/duplicate/missing attempt IDs, never-solved shuffling, incomplete drafts, ambiguous duplicate text, requested generation counts/modes, source-only terms and deterministic alphabetical answers.
- The six grouping and seventeen matching/upload/audio/layout regression tests also pass: 29 tests total.
- TypeScript, targeted ESLint and production build pass.
- Real in-app browser: a days-of-week theme generated seven correct days with an explicit Monday-to-Sunday rule; shuffled answers produced both correct/incorrect position feedback; whole-card dragging and arrow-key reordering completed the exercise. Automatic checking also completed successfully.
- Teacher duplication produced a useful duplicate-text validation error; removing the duplicate through the in-page dialog restored a playable activity.
- A DOCX vocabulary upload led to the three-option chooser and generated a four-word A–Z activity using exactly the source vocabulary. Visible arrow buttons completed it. The draft survived a page reload, reopened from the shared library, and a teacher-edited ordering rule appeared correctly in preview.
- No browser console errors were observed. The in-app viewport override was clamped to an effective 500px width, which had no horizontal overflow; a true 375px viewport and real-device touch dragging remain unverified.

Browser speech availability and model-authored sequence quality depend on browser/provider behavior. Teachers should review the sequence and ordering rule before classroom delivery.
