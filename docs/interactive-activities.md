# Interactive activities

The sidebar entry **Interactive Activities** opens `/tools/interactive`. The teacher starts with teaching material, then chooses between Matching Pairs, Group Assignment and Simple Order.

## Source first

1. Enter a theme, vocabulary list or lesson extract, or upload an image, PDF, DOCX or UTF-8 text file using the existing extraction service. Set level, content language and optional read-aloud.
2. Continue to the activity cards. Uploads are extracted once and stop at this choice screen; they no longer force creation of Matching Pairs. The source remains available when switching choices.
3. Choose a template and its size, then generate. The same selected agent and authorization rules apply to both templates.
4. Review and edit the draft, preview with the learner player, save, and optionally publish after cloud setup.

The editor remains mounted when returning to the choice/source stages so back navigation preserves edits. Replacing an editor with unsaved changes uses an in-page confirmation. Saved activities can be reopened from the combined device/account draft list. The original standalone Matching Pairs editor remains available at `/tools/matching`.

## Group Assignment

The agent generates 2–6 clearly named categories and 4–24 distinct vocabulary cards, each with exactly one category. Generation uses a Zod schema and checks requested counts, unique terms, category names and stable IDs. For uploaded vocabulary, generated card texts must come from the extracted source terms. At least four source terms are needed to offer Group Assignment. Teachers can edit titles, instructions, help, feedback, categories, card text, hints and correct category; the editor supports up to 40 cards. Incomplete drafts can be saved but cannot be previewed or published.

Learners drag whole cards into category zones, or select a card with a click/tap/keyboard activation and choose a category. Cards can be returned to the bank or moved between groups. Pointer dragging scrolls near the viewport edges. Categories have labels as well as color cues. Hints and read-aloud controls work independently of selection.

Manual mode evaluates on **Check answers** and allows correction. Automatic mode evaluates each placement immediately and locks correct cards in place. All authored cards must be correctly assigned and evaluated before completion. Replay resets assignments and reshuffles the word bank. Task/help/completion dialogs, local sound feedback with mute, and browser speech reuse the existing runtime components. Learner attempts remain in memory and do not write results to the backend.

## Simple Order

The third option arranges visible cards into a sequence. Teachers can choose alphabetical order or a meaningful logical sequence, and review/edit the rule and correct answer order. Learners use whole-card dragging, tap-to-place, arrow buttons or keyboard arrows. It shares source extraction, draft storage, checking feedback and sound controls with the other activities. See `simple-order-proof.md` for limits and verification.

## Data and sharing

A shared activity validator accepts the three version-1 template envelopes. Drafts, published snapshots and learner attempt state remain separate. Matching keeps its existing storage keys and authoring endpoints; Group Assignment uses `esl-grouping-drafts-v1` locally. The combined library reads all three definitions with schema validation. Invalid records are never loaded as activities.

The existing Supabase JSON payload tables `matching_activities` and `matching_publications` are reused for all three templates through generic validated server actions. Their legacy names do not constrain the stored template. The existing owner-based RLS migration remains required; no additional migration is needed for Group Assignment. Server actions authenticate teacher writes and validate definitions. Public learner reads use an anonymous client, without student accounts or attempt storage.

Group Assignment publication uses immutable unlisted snapshots at `/play/grouping/<code>` and `/embed/grouping/<code>`. The share panel offers link and iframe copying, a QR code, snapshot history on the publishing device and owner revocation. As with Matching Pairs, cloud publication requires teacher sign-in and application of `supabase/migrations/202611220001_matching_pairs.sql`; those remote setup steps have not been performed in this checkout. Group Assignment cloud publication and embeds have not been tested end to end. Client-side answers are practice data, not secure graded-assessment answers.

## Verification

- Six new grouping tests cover hydration, stable category relationships, required evaluation/completion, incorrect assignments and correction, moving back to the bank, invalid IDs/references, incomplete drafts, generation counts, duplicate vocabulary and source-only constraints.
- All 17 matching/upload/scatter/audio regression tests pass.
- TypeScript, targeted ESLint and production build pass.
- In-app browser: a typed food-and-drink theme led to both choices, then real AI generation of eight cards in two groups. Manual checking showed a wrong assignment, mouse dragging corrected it, and all cards were completed with keyboard/click placement. Automatic mode also showed an incorrect assignment, accepted corrections, and completed successfully.
- The grouping draft was saved locally, the page reloaded, and the same eight cards, groups and automatic setting reopened from the shared library.
- A DOCX upload extracted four terms and presented both activity options. Choosing Matching Pairs generated an editable four-pair activity with the supplied translations and opened the existing scattered-card learner preview. Both template drafts appeared in the combined library.
- A native browser confirmation interrupted a later automated replacement check; the chooser now uses an in-page dialog only for actual unsaved changes. This final confirmation refinement was type/lint/build checked. No extension permissions were changed.

Real-device touch dragging, cross-browser speech/audio combinations, and full remote publishing/embedding still require classroom/deployment QA. Source-entry state is kept during the current creation session; saving an activity does not archive the original uploaded file or persist the source wizard across reloads.
