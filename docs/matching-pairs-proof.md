# Matching Pairs proof

Matching Pairs is the first activity template. The sidebar now opens the shared **Interactive Activities** workflow at `/tools/interactive`, with Matching Pairs and Group Assignment as the two choices. The standalone matching editor remains at `/tools/matching`. See `interactive-activities.md` for the shared source-first flow. Existing Activity Builder and Interactive Studio features remain available.

## Teacher flow

Enter a topic, vocabulary list or lesson extract (up to 10,000 characters), choose A1–B2, content language and 2–16 pairs, then select **Generate with AI**. This uses the existing agent selector, model resolver, provider credentials and AI authorization policy. Generated JSON is checked against a Zod schema and hydrated into a fresh editable activity; the model never generates executable activity code. Generation has a 60-second timeout. No generation-time guarantee is claimed.

Teachers can also use **Extract & create matching** with a PNG/JPEG/WebP image, PDF (including scans), Word `.docx`, or UTF-8 `.txt`, `.csv`, or `.md` file up to 8 MB. The selected AI agent extracts up to 40 source terms and any supplied meanings, then the existing generation flow creates the draft. Extracted terms remain in the source box for review and correction. If fewer terms are available than the requested pair count, the activity uses the smaller count. Fewer than two readable terms produces an error. DOCX text is read with Mammoth; text documents are limited to 40,000 characters; DOCX expansion is capped at 24 MB. File extension/signature and size checks run server-side. Image/PDF content is sent to the selected AI provider. Originals are processed in memory and are not saved by this app. Legacy `.doc`, encrypted files, and unreadable sources should be exported or re-uploaded in a supported format.

Review the generated title, instructions, pairs, hints, decoys and feedback. All fields are editable. Manual authoring supports up to 50 pairs, duplication, movement, removal with confirmation and up to three decoys. Preview and publication require a title, at least two complete pairs and valid media. Incomplete drafts can be saved. Preview uses the same player component as published activities and never publishes automatically.

**Save draft** always saves a device copy first. Signed-in teachers can sync to their account after applying the migration below. The **Load cloud drafts** control fetches account drafts; device drafts can be reopened after reloading the browser. Save before navigating away; there is no continuous autosave. Device drafts are browser-profile storage, not account-isolated, so use separate profiles on shared teacher computers. Published-link history is currently stored on the publishing device.

## Player

Manual mode attaches tentative answers and checks them when requested. Automatic mode marks mistakes immediately and removes correct attachments after 850 milliseconds. Learners can separate mistakes, select cards with clicks/taps or keyboard activation, and drag directly from the card face. The card follows the pointer, the source dims, and the potential partner highlights with a release cue. Audio, video, speech and hint controls remain independently interactive. IDs determine correctness, including when visible text is duplicated. Decoys are never required for completion. Replay clears attempt state, reshuffles cards, and generates a fresh scattered arrangement. The board uses varied widths, positions and rotations with small margin overlaps. Remaining cards retain their positions when a pair is attached; resizing or expanding a hint recalculates the layout. A locally synthesized ascending chime indicates correct answers, and a short lower tone indicates incorrect answers. Manual mode sounds only when checking; automatic mode sounds on evaluation. The player includes a Sound on/off control and works visually if Web Audio is unavailable.

Task/help dialogs and completion feedback are accessible native dialogs. Card hints use expandable disclosure controls. Side letters and textual answer feedback accompany color cues. Attempts live only in component memory; no learner account, name, score history or attempt writes are added.

## Media in this proof

Text, browser speech synthesis, HTTPS images, HTTPS audio and direct HTTPS `.mp4` video are supported. Images require alt text; timed media require an accessible label and valid optional start/end times. Native media playback is subject to source availability, codec support and browser support for media fragments. Speech uses browser voices with visible text as a fallback. External media hosts may receive ordinary media requests; this is not a blanket privacy/compliance guarantee.

Card-media upload hosting, microphone recording, provider video embeds, image search, cloud speech, AI image generation, SCORM and the other activity templates are not implemented.

## Cloud setup and sharing

Apply `supabase/migrations/202611220001_matching_pairs.sql` to the app's Supabase database, using the Supabase SQL editor or an authenticated database migration connection. The transaction creates:

- `matching_activities`: private teacher drafts, protected by owner-based RLS.
- `matching_publications`: immutable unlisted published snapshots. Anonymous users can read snapshots; authenticated owners can insert or revoke their snapshots. There is no update policy.

The migration is safe to rerun. `SUPABASE_CONNECT` is not present in the current checkout, and the publication table was confirmed missing (`PGRST205`). The migration has **not** been applied to the remote database.

Sign in through the existing Teacher Account flow before syncing or publishing. Publication saves a validated snapshot under `/play/matching/<code>` and uses `/embed/matching/<code>` for embeds. The share panel contains a copyable learner link, iframe markup and a downloadable/enlargeable SVG QR code. Each publication gets a new link; earlier links keep their saved definition until explicitly revoked. Already loaded attempts can finish after revocation. Unlisted means anyone with the link can read it, not private or authenticated learner access. Answers are client-side practice content, not secure graded assessment data.

## Verification

- `npm run test:matching`: 17 passing tests for validation, pair identity, duplicate visible text, decoys, manual/automatic evaluation, exclusivity, shuffling and AI hydration/rejection.
- `npx tsc --noEmit`: passes.
- Targeted ESLint for new matching modules and navigation integration: passes.
- `npm run build`: passes with matching editor, play and embed routes.
- Real browser run: existing selected agent generated four animal/sound pairs, the draft saved locally and reopened after a page reload, preview retained authored content, wrong answers could be separated and corrected, keyboard and mouse selection worked, and both manual and automatic modes completed successfully. A 375px viewport had no horizontal overflow. Browser console had no errors. Whole-card mouse dragging was subsequently verified from the visible card text to its partner, along with Enter/Space keyboard matching and hint activation without accidental card selection.

Real AI extraction was tested directly through the server actions against PNG, text-based and scanned PDF, DOCX and text fixtures, preserving four supplied English–French pairs. Image extraction followed by matching generation succeeded. The complete image upload → vocabulary extraction → matching generation → learner preview → successful manual completion flow was verified in the in-app browser. A request for six pairs correctly reduced to four when the uploaded image contained four terms. Chrome extension automation lacked file-URL permissions, so the successful browser upload test used the in-app browser without changing extension settings.

The scattered board was verified with mouse dragging and keyboard matching, correct/incorrect feedback, the mute toggle, and a 375px viewport without horizontal overflow. Tone scheduling is unit-tested; speaker output was not measured.

Cloud publication, QR scanning, cross-origin embeds, card-media upload hosting, real-device touch dragging, and all media/browser combinations have not been verified end to end. Cloud verification must follow migration application and teacher sign-in.
