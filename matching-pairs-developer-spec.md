# Matching Pairs — developer specification

## What to build

Build a web-based activity creator and learner player inspired by [LearningApps Matching Pairs](https://learningapps.org/createApp.php), as the first trial for Eric’s own educational activity platform. An educator creates related pairs of cards; a learner matches them. This is **Matching Pairs**, not the separate memory/pairing game where cards are turned face down.

The first implementation should be usable end to end: create an activity, add and edit pairs, preview it, save it, share it, and play it on desktop or mobile. Structure the activity engine so the other seven templates can be added later without rewriting common authoring, media, saving, sharing, and player infrastructure. This document covers **only Matching Pairs**; it is not a specification for the other seven.

Use the reference for functional inspiration, not its source code, logo, illustrations, branding, exact wording, or copyrighted media. Give the new product its own visual identity.

## The reference flow, in plain English

1. Open [Create an App](https://learningapps.org/createApp.php), choose **Matching Pairs**, and select **Create new App**. The [reference editor](https://learningapps.org/create?new=71) opens with one empty pair.
2. Set a title and optional task description. For each pair, choose the media type separately for each side and enter or select the content. Add further pairs and, optionally, extra wrong cards.
3. Choose whether correct matches disappear immediately, whether the two sides have different colors, and whether attached cards sit vertically or horizontally. Set completion feedback and optional help.
4. Choose **Finish editing and show preview**. The preview has **Edit again** and **Save App** controls. In a test with a task description, it opened in a dialog with an OK button; a task icon reopened it and a fullscreen icon was available.
5. Learners drag a card onto another card; they snap together. In the tested manual mode, a check button showed a correct pair with a green outline, while incomplete pairs remained available. When both test pairs were matched correctly and checked, the author’s completion message appeared. In the tested automatic mode, an incorrect match was marked red immediately; the editor explains that correct matches are automatically checked and disappear.

**Evidence limits:** The reference editor and a two-pair, text-only preview were inspected directly. The automatic mode’s wrong-answer feedback was observed; a complete correct automatic-mode run, saved/published/share flow, exact validation limits, every media player, all combinations of decoys, and all mobile/keyboard behavior were not fully tested. Requirements below identify where a product decision is proposed rather than claiming reference behavior.

## Authoring screen

### General fields

| Field | What the reference exposes | Build requirement |
|---|---|---|
| Display language | Language selector for interface labels; English, German, Spanish, French, Italian and Russian icons appeared. | Separate interface locale from authored content. Start with English; design for translations. Do not translate authored content automatically. |
| Title | Defaults to “Untitled”. | Editable title; propose requiring a nonblank title before publishing. |
| Task description | Optional; displayed on startup. | Multiline text; display in a dismissible start dialog when present, and provide a way to reopen it. |
| Help | Optional hints, accessed from an icon at the upper left. | Show a separate Help control only when help text exists. |
| Completion feedback | Editable text, initially “Great, you've found the solution!” on the reference. | Editable text with a product-owned default; display when the activity is complete. |

### Pairs

- Start with one empty pair. Each pair contains exactly two independent card slots, left/first and right/second. Both must be populated for a playable pair.
- Each slot can contain **Text**, **Image**, **Text to speech**, **Audio**, or **Video**. Different types may be mixed within a pair: for example, image + word or audio + text.
- Add another pair. The reference also shows move-up/move-down and copy-style icons on pair rows; their complete behavior was not tested. For the new product, implement clearly labeled **Duplicate**, **Move up**, **Move down**, and **Remove pair**. Reordering must not change the answer relationship. Confirm before discarding populated content.
- Each configured card in the reference exposes an optional **Hint** field; text and image cards also showed a Text2Speech control. Preserve a per-card hint in the data model. Its exact display and speech behavior were not verified; choose and document a consistent accessible interaction before release.
- The reference offers **Additional, but wrong elements**, with up to **three** extra cards which are not part of a solution. Allow 0–3 decoys, using the same media types. An empty optional decoy placeholder should not block preview or publishing; a partially configured decoy should produce a clear error. Decoys must never count as required correct pairs.

### Media options

The following describes controls visible in the reference, not a promise that every provider or upload can be reused. Implementation choices should respect media rights and provider rules.

| Card type | Observed editor | Suggested implementation |
|---|---|---|
| Text | Text entry, optional hint, Text2Speech control. | Store plain text; render safely with wrapping. Optional read-aloud. |
| Image | Select image, display size, edit, hint. Image chooser offered web search on Pixabay/Wikipedia/Flickr, a direct image URL, and upload/drag-and-drop, with a displayed **10 MB** upload limit. | First support user uploads and HTTPS image URLs, with alt text and validation. Add third-party search only with the relevant APIs/rights; do not assume it is free or available. |
| Text to speech | Text input, language selector, preview, and hint. | Save text plus voice/language; provide preview and playback. Specify service, cost and fallback before choosing a provider. |
| Audio | Select audio, time range, hint. Chooser displayed YouTube/MP3 URL or microphone recording, with a **2:00** recording indicator. | Support a validated source and playback; store start/end boundaries. Treat recording and provider integrations as separately testable features. |
| Video | Select video, time range, audio control, hint. Chooser accepted a YouTube link or .mp4 URL. | Embed approved providers or compatible files; store start/end and mute setting, subject to provider restrictions. |

The 10 MB and 2:00 figures above are observations of the reference interface, **not** a decision that the new platform must use those limits. Define supported file types, size/duration limits, provider policies, storage budget, and error handling before implementation.

### Activity settings

1. **Check mode**: manual checking or automatic checking with correct pairs disappearing. The initial test opened in manual mode; the player included a check control. Provide an explicit setting with understandable labels.
2. **Color the two sides**: the reference describes blue and orange for the two groups; the initial preview showed blue and orange markers. This identifies a card’s side, not the specific correct pair. Offer an on/off option and a non-color-only cue.
3. **Attachment orientation**: choose **one above the other** or **alongside one another**. The reference editor initially displayed the vertical option. On narrow screens, ensure both arrangements remain usable.
4. **Feedback and help**: as above; keep these independent from any per-card hint.

### Validation and preview — product decisions

- Proposed publish rule: a nonblank title, at least **two complete pairs**, valid media references, no incomplete configured card and no more than three decoys. Two pairs are recommended for a meaningful exercise; the reference’s exact minimum was not established.
- Identify each error beside the relevant field and provide an error summary. Save incomplete work as a draft rather than losing it.
- **Preview** uses the same player and settings as the published version. Returning to the editor preserves all inputs. Reset/replay produces a fresh attempt and randomized card positions. Preview must not publish or expose the activity.

## Learner experience and rules

### Start and layout

- Render a responsive board containing both cards of every complete pair plus any decoys, initially shuffled. Give each card a stable internal ID; never match based only on its displayed text.
- Show the optional task description at the start. Learners can dismiss and reopen it. Provide help when authored and a fullscreen control when supported.
- Learners can play content within each card without accidentally moving it. Images retain their aspect ratio and expose alt text; audio and video expose playback controls; speech cards can be played again.
- Provide mouse and touch drag-and-drop. **Improvement for the new product:** also provide a keyboard and click/tap-to-select alternative; do not require dragging or a specific color to play.

### Matching

- Drag or select one free card and attach it to another; visually snap the pair into the chosen orientation. Each card may belong to at most one learner-created attachment at a time. Allow a player to detach and re-pair cards.
- Correctness is based on the authored pair ID, regardless of order or media type. Two different cards with identical visible text remain separate records. A decoy never has a correct partner.
- **Manual mode:** attaching cards records a tentative answer; no immediate success is implied. A visible Check control evaluates current attachments. Mark correct and incorrect pairs distinctly; keep them available for correction. In the tested reference a correct pair remained attached and received a green outline; completing every correct pair and checking displayed the feedback dialog.
- **Automatic mode:** evaluate each newly attached pair. The reference immediately marked a wrong pair with a red outline, and the settings say correct matches disappear. For the new product, implement a brief accessible success indication followed by removal of both correct cards; keep a wrong pair visible and allow it to be separated and tried again. Trigger completion when all authored pairs are correct, even if decoys remain.
- Neither mode should reveal the correct partner merely because a wrong attempt was made. Show completion feedback once per attempt and provide replay. These are proposed product rules, not all verified behaviors of the reference.

## Data contract for the development team

Use an activity envelope shared by future template types and a versioned, template-specific configuration. Example JSON (illustrative, not copied from the reference):

```json
{
  "schemaVersion": 1,
  "id": "activity_123",
  "template": "matching_pairs",
  "title": "Animals and sounds",
  "locale": "en",
  "taskDescription": "Match each animal with its sound.",
  "help": "Think about pets you know.",
  "feedback": "Well done!",
  "status": "draft",
  "config": {
    "checkMode": "manual",
    "colorSides": true,
    "attachment": "vertical",
    "pairs": [
      {
        "id": "pair_1",
        "first": {"id": "card_1", "type": "text", "text": "Cat", "hint": "A pet"},
        "second": {"id": "card_2", "type": "text", "text": "Meow", "hint": ""}
      },
      {
        "id": "pair_2",
        "first": {"id": "card_3", "type": "text", "text": "Dog"},
        "second": {"id": "card_4", "type": "text", "text": "Woof"}
      }
    ],
    "decoys": [{"id": "card_5", "type": "text", "text": "Moo"}]
  }
}
```

For image/audio/video, use a typed media object containing a controlled asset ID or approved URL, accessibility label, optional attribution/license metadata and, for timed media, optional `startSeconds` and `endSeconds`. For speech, store text and locale/voice. Do not put an API key or private storage credential in the activity payload. Validate IDs, allowed types, required content and time ranges on the server as well as the client. Define a migration strategy for future schema versions.

Keep **activity definition**, **draft edits**, **published version**, and **learner attempt state** separate. The attempt stores current attachments, evaluated states and completion for that session; it should not mutate the author’s activity. Server-side scoring and secure answer handling are design decisions if this becomes a graded assessment; a client-side practice app cannot guarantee that answers remain secret.

## Saving, ownership and sharing

These are **proposed requirements**, not verified details of the reference’s save flow:

- An author can save a draft, reopen it, edit it, preview it, and deliberately publish a validated version. Drafts are private to the owner. Confirm before deleting or replacing published content.
- A published activity receives a stable learner-facing link. Owners can copy it; an embed option can be added if desired. Public, unlisted and private access are distinct policy choices: decide which to support before launch and do not promise access restrictions unless enforced server-side.
- Publishing a revision should not unexpectedly destroy an existing learner session; version the definition. Authors can unpublish and revoke access if the chosen sharing model supports it.
- Protect author endpoints by authentication and authorization. Validate uploads, verify media types and size, sanitize rendered content, restrict unsafe URLs/embeds, and provide appropriate child-privacy and data-retention controls. Avoid storing identifiable learner data unless it is needed and permitted.

## Suggested architecture

- **Shared platform layer:** accounts/ownership, template gallery, author shell, draft/published versioning, media library, validation, sharing and localization.
- **Matching Pairs module:** editor for pair rows and settings; validator; versioned JSON schema; player renderer; matching/checking state machine.
- **Player state:** shuffled cards → zero or more tentative attachments → evaluation states → completed. Automatic mode additionally removes correct pairs. Keep the game logic independent of visual components so it can be tested without a browser.
- **Storage:** relational tables or equivalent for activities, versions, assets and ownership; object storage for approved uploads. Build accessible browser UI with touch and keyboard support. A specific frontend framework, backend stack and speech provider are team choices, not dictated by this specification.

## Acceptance tests

1. Author opens Matching Pairs, fills title/task and two text pairs, previews, returns to edit and finds all content intact.
2. Add, duplicate, reorder and remove a pair; each surviving card retains the right partner. Removing populated content asks for confirmation.
3. A pair can mix text with image, audio, video or speech as those integrations are delivered; broken or disallowed media produces a useful error.
4. A draft with a missing pair side can be saved, but cannot be published; validation identifies the missing side. No more than three decoys can be configured.
5. With manual checking, attach Cat–Meow and Dog–Woof; checking highlights correct attachments and displays the configured completion message only when all required pairs are correct.
6. Attach a wrong pair or a decoy; checking flags it as incorrect and allows correction. Unpaired decoys do not prevent completion.
7. With automatic checking, a wrong attachment is visibly and accessibly marked; a correct attachment is acknowledged and both cards disappear. Complete all real pairs to show the configured feedback.
8. Test both vertical and horizontal attachment settings and side-color toggle; correctness never depends on color or card position.
9. Mouse, touch and keyboard users can select, attach, detach, check and replay without a drag-only requirement. Screen readers can identify card content and result; feedback is not conveyed by color alone.
10. Task and help appear only when supplied; task can be reopened. Test readable layouts on a phone, tablet and desktop, plus long text and slow or unavailable media.
11. Publish, open the learner link in a separate browser session, and verify that the saved version—not the author’s unsaved draft—plays. The author can reopen the saved activity, and a learner cannot modify it.
12. Duplicate visible text on two cards does not confuse scoring; resetting an attempt clears old attachments and rerandomizes the board.

## Decisions to settle before the wider build

- Is the first deliverable a functional prototype or a production-ready platform with accounts, moderation and sharing permissions? This specification describes the full intended flow, but those platform services need separate estimates.
- Which media types must be in the first release, and who pays for hosting, transcription/speech and third-party integrations?
- Which sharing/privacy modes, learner analytics, accessibility standard and languages are required?
- Should authors be able to import their own existing content? If so, agree an import format and rights requirements; do not assume the reference offers an export.
- Confirm the exact behavior of per-card hints, speech, attachment/detachment, automatic correct-match timing, decoys, edge-case validation and the source site’s published/share workflow before requiring exact parity.

Reference: [LearningApps activity gallery](https://learningapps.org/createApp.php) and [Matching Pairs creation editor](https://learningapps.org/create?new=71). The tested sample was a temporary preview and was not saved or published on the reference site.
