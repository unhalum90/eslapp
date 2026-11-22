# Interactive Studio — Genially Parity PRD

**Version:** 1.0 · **Date:** 12 November 2026
**Host:** *Atelier de séquences — Anglais · Collège* (`/studio`, `/play/[code]`)
**Supersedes:** "Interactive Studio PRD v2.0" (the founding spec). That document defined the P0 core; this one records what was built, measures the gap to Genially, and specifies the work that would close it.
**Audience:** the product owner, whoever implements the next phase, and the teacher who uses it.

> **Purpose of this document.** The Studio already replaces Genially for the lesson types the teacher actually makes (image-backed pages, hotspots, tooltips, audio, menus, single-choice checks). This PRD is the reference for *going beyond that foundation*: a feature-by-feature parity matrix, detailed requirements for each remaining epic, the data-model changes each one needs, acceptance tests, and a recommended order. Nothing here is committed work; each epic is independently scoped so it can be picked up later without re-deriving context.

---

## 1. Where the foundation stands

### 1.1 Built and verified (as of this version)

| Area | What exists |
|---|---|
| Document model | Versioned JSON (`schemaVersion: 1`), zod validation at save/publish/load, hard limits (40 pages, 80 elements/page), lint with blocking errors and warnings |
| Canvas | 1280×720 logical page; DOM renderer shared by editor, thumbnails, preview and player; proportional scaling; phone zoom |
| Elements | Text (6 font stacks, shadow, line height, vertical align), Image, Shape (22 kinds), Icon (220 curated icons), Emoji stickers, Button (3 variants), Line (arrowheads, dashes), Hotspot (visible or transparent), Audio player (transcript), Single-choice question |
| Interactions | Triggers: click/Enter, hover/focus (never the only path). Actions: tooltip, modal, navigate, play audio, stop audio, show/hide/toggle, external https link. Ordered action lists, bounded interpreter, page change cancels sequences |
| Editor | Filmstrip with live thumbnails, layers panel, drag/resize with snap guides, 8 handles, keyboard nudge/duplicate/copy/paste/delete/reorder, undo/redo (120 steps), four-tab inspector, media drawer with direct-to-storage upload, autosave (2 s) with Saved/Unsaved/Offline/Conflict/Error states, real-player preview |
| Backgrounds | Colour, 12 gradient presets with custom colours/angle, image (contain/cover/fill), dots/grid/lines overlay, apply to all pages |
| Player | Anonymous, no account. Linear or exploration navigation (hidden pages skipped), tooltips, focus-managed modals, one narration channel, question feedback and retry, completion screen, reset with confirmation, 44 px minimum hit areas, text route ("Version texte"), teacher-only classroom mode (highlight zones, reveal answers, large controls, audio test, fullscreen) |
| Publishing | Immutable versioned snapshots, only referenced media copied to a public bucket, stable link + pinned-version link, QR code, unpublish revokes public copies, "Published v3 · draft modified" status |
| Storage | Supabase Storage only (no SQL): `studio-library` (private) and `studio-public`; buckets auto-created |
| Import | Genially HTML zip importer: slides, texts, images, hotspot areas, tooltips (with images), page links, pop-up slides (as hidden pages with Back), audio, external links; YouTube and Google Drive embeds become link buttons; import report; fuzzy media matching for inconsistent export names; images downscaled to 1600 px WebP |
| Templates | Listen → locate → respond (town map), Explore → read → check, Notice → predict → reveal, Read → choose → explain, Blank |
| Tests | Converter and zip-matcher unit tests (`npm run test:studio`); type-check, lint and production build clean |

### 1.2 Known limitations carried forward

- No rich text (bold/italic runs inside one text block). Text is plain text with per-element styling. This is a deliberate security choice (no HTML sanitizer in the player).
- No multi-select or grouping in the editor.
- No embeds of any kind (video, iframes). By design in P0.
- Single-choice is the only question type.
- Teacher-only controls rely on the player page checking the signed-in user against the publication owner; answer keys are inspectable client-side (formative use only).
- Local development bypass: `STUDIO_DEV_OWNER_ID` in `.env.development.local` makes the Studio act as a fixed fake owner under `next dev`. It must never be set in production.

---

## 2. Parity matrix

Legend: ✅ built · 🟡 partial · 🔲 planned (specified in §3) · ⛔ out of scope by design

### 2.1 Resources (Genially "All resources")

| Genially | Studio | Notes |
|---|---|---|
| Images and GIFs | ✅ images, 🟡 GIFs | GIF upload works; no GIF search library. Giphy/Unsplash search is **E7** |
| Sounds | ✅ upload, 🔲 library | Audio Trimmer bridge and sound-effects library in **E5** |
| Shapes and connectors | ✅ shapes, 🟡 connectors | Straight lines with arrowheads exist. Elbow/curved connectors that follow elements: **E2.4** |
| Buttons | ✅ | Three variants, three corner styles, icon |
| Effect stickers | 🟡 | Emoji stickers exist. Animated stickers: **E7** (optional) |
| Icons | ✅ | 220 curated icons; expandable registry |
| Illustrations | ⛔ / 🔲 | No free equivalent library. Teacher uploads; optional open-license pack in **E7** |
| Characters | ⛔ / 🔲 | Same as illustrations |
| Graphics (charts) | 🔲 | Simple bar/pie from a table: **E7** (low priority for ESL) |
| Compositions | 🔲 | Saved element groups ("blocks"): **E1.3** |
| My resources / Team | 🟡 | Per-lesson media only. Cross-lesson library: **E5.1** |
| Generate (AI) | 🔲 | AI image generation exists elsewhere in the host app; bridge in **E5.4** |

### 2.2 Backgrounds (Genially "Canvas / Base")

| Genially | Studio | Notes |
|---|---|---|
| Colour, palette, recent, brand colours | 🟡 | Colour picker yes; recent/brand palettes: **E1.5** |
| Gradients | ✅ | 12 presets + custom |
| Effects (noise, dots, rays, stars, lines) | 🟡 | dots/grid/lines; rays/stars/noise: **E1.5** |
| Scenes / Designs / Images | 🟡 | Image backgrounds yes; curated scene pack: **E7** |
| Apply to all pages | ✅ | |
| Base (master) layer shared across pages | 🔲 | **E1.4** |

### 2.3 Interactivities

| Genially | Studio | Notes |
|---|---|---|
| Open window | ✅ modal | Plain text + image + audio. Rich layout windows (a page as a modal): **E3.1** |
| Show tooltip | ✅ | |
| Play audio | ✅ | |
| Drag and drop | 🔲 | **E4.3** (with keyboard alternative) |
| Go to page | ✅ | |
| Web link | ✅ | https only, new tab |
| Scroll to element | ⛔ | Pages are fixed-size; no scrolling canvas |
| Effects (enter/exit animations) | 🔲 | **E3.3**, reduced-motion aware |
| Full screen | ✅ | Player control, not per-element action |
| Reveal / Hide | ✅ | show/hide/toggle |
| Interactive area (invisible zone) | ✅ | Transparent hotspot |
| Hover trigger | ✅ | Allowed only as a supplement to click |
| Sequencing / parallel actions | ✅ | Ordered list; "parallel" flattened |
| Zoom / spotlight | 🔲 | **E3.2** |

### 2.4 Assessment (Genially "Question banks")

| Genially | Studio | Notes |
|---|---|---|
| Single choice | ✅ | |
| Multiple choice | 🔲 | **E4.1** |
| True or false | 🔲 | **E4.1** |
| Fill in the blanks | 🔲 | **E4.2** |
| Short answer | 🔲 | **E4.2** |
| Image selection | 🔲 | **E4.1** |
| Sort / Arrange in order | 🔲 | **E4.3** |
| Match concepts | 🔲 | **E4.3** |
| Locate in image | 🔲 | **E4.4** |
| Swipe and hit | ⛔ | Gesture-only mechanic; no accessible equivalent worth building |
| Random question / question banks | 🔲 | **E4.5** |
| Branching scenarios / decision points | 🔲 | **E6.1** |
| Scores, results summary | 🟡 | Correct count on completion only. Per-lesson summary and optional export: **E4.6** |

### 2.5 Editor and workflow

| Genially | Studio | Notes |
|---|---|---|
| Page list (list/grid), add, duplicate, reorder, cover | ✅ list | Grid view: trivial, **E1.6** |
| Multi-select, group, align/distribute | 🔲 | **E1.1**, **E1.2** |
| Rich text (bold runs, lists, links) | 🔲 | **E1.7** with a strict allowlist format |
| Custom fonts (OpenDyslexic etc.) | 🔲 | **E1.8** |
| Page transitions | 🔲 | **E3.3** |
| Collaboration / comments | ⛔ | Single teacher |
| Analytics | ⛔ | No learner tracking by design |
| HTML / PDF / video export | 🔲 PDF | Printable PDF of pages: **E8.1**. HTML package: **E8.2** (P2 in founding PRD) |
| Import from Genially | ✅ HTML zip | PDF import as fallback: **E8.3** |
| Offline playback | 🔲 | **E8.4** |

---

## 3. Epics

Each epic lists: goal, scope, data-model changes, editor UX, player behaviour, accessibility, import impact, and acceptance tests. "Schema" lines say whether `schemaVersion` must bump. Rule: adding optional fields keeps v1; changing meaning of existing fields bumps to v2 with a tested migration.

### E1 — Editor power features

#### E1.1 Multi-select and alignment
- **Goal:** select several elements, move them together, align and distribute.
- **Scope:** shift-click and marquee selection; group move/nudge/delete/duplicate; align left/center/right/top/middle/bottom; distribute horizontally/vertically; "match width/height".
- **Schema:** none.
- **Editor UX:** selection store becomes `selectedIds: Id[]`; inspector shows a "N elements" panel with alignment buttons; snapping uses the selection's bounding box.
- **Acceptance:** AT-E1.1 marquee selects only fully/partly enclosed (choose: partly) elements; align applies within selection bounds; undo reverts the whole operation as one step.

#### E1.2 Groups
- **Goal:** keep related elements together (e.g. a label and its icon).
- **Schema:** optional `groupId?: Id` on `CanvasElement` (v1-compatible).
- **Behaviour:** clicking a grouped element selects the group; double-click enters the group; group bounds resize scales children proportionally; interactions remain per element.
- **Acceptance:** duplicate a group → new group ids; delete group → confirm.

#### E1.3 Compositions (saved blocks)
- **Goal:** teacher-saved reusable blocks ("title + instruction bar", "vocabulary card").
- **Storage:** `{owner}/blocks/{id}.json` containing a `CanvasElement[]` plus thumbnail; media references copied on insert.
- **Editor UX:** "Enregistrer comme bloc" on a selection; "Blocs" tab in the insert popover.
- **Acceptance:** inserting a block into another lesson copies media into that lesson's folder (publish verification must pass).

#### E1.4 Master layer ("Base")
- **Goal:** elements shown on every page (logo, page number, home button).
- **Schema:** `document.master?: { elements: CanvasElement[] }` (v1-compatible, optional).
- **Player:** master elements render below page elements; interactions allowed (home button).
- **Editor:** a "Base" toggle in the filmstrip header edits the master layer; master elements show greyed on pages.
- **Acceptance:** a master "Home" button navigates from any page; hidden on completion screen.

#### E1.5 Palettes and background effects
- **Scope:** recent colours (localStorage, per device), lesson palette (5 colours in `document.settings.palette`), extra overlays: rays, stars, noise (CSS/SVG, no images).
- **Schema:** `settings.palette?: string[]`; `BackgroundPattern` enum extended.

#### E1.6 Grid view of pages and page cover
- **Scope:** grid/list toggle for the filmstrip; mark page 1 as cover in the lesson list card (already uses page 1 thumbnail — just label it).

#### E1.7 Rich text (constrained)
- **Goal:** bold/italic/underline runs, bullet lists, line breaks inside one text element.
- **Format:** not HTML. A small structured format: `{ format: "runs-v1", paragraphs: { align?, list?: "bullet"|"number", runs: { text, bold?, italic?, underline?, color? }[] }[] }`. Rendered to DOM by the Studio, never via `innerHTML`.
- **Editor:** inline contentEditable restricted to those marks, serialised to runs; or a toolbar on the textarea with markdown-like markers (`**bold**`). Recommendation: contentEditable with a strict serializer.
- **Schema:** text content gains `rich?: RichRuns`; `text` stays as the plain fallback (v1-compatible).
- **Import:** the Genially converter can map `<strong>`, `<em>`, `<u>`, `<li>` to runs.
- **Acceptance:** pasting HTML never produces anything outside the allowlist; text route reads the plain text.

#### E1.8 Custom fonts
- **Scope:** bundle OpenDyslexic (teacher used it) and 2–3 open-licence classroom fonts (e.g. Andika, Lexend) as self-hosted `woff2`; add to `FontFamily`.
- **Note:** licence files must be committed with the fonts; fonts load only when used.

### E2 — Drawing and connectors

#### E2.1 Freeform polygon hotspots
- **Goal:** irregular clickable zones over maps and pictures.
- **Schema:** hotspot content gains `polygon?: { x: number; y: number }[]` in element-local coordinates (v1-compatible). Rendered as SVG path; hit testing via SVG `pointer-events`.
- **Editor:** point-by-point drawing mode; drag vertices.
- **Accessibility:** unchanged (the element is a button; hit area is the polygon plus the 44 px rule on its bounding box).

#### E2.2 Image cropping and frames
- **Scope:** crop rectangle stored as `crop?: { x, y, width, height }` fractions; frame shapes (circle, rounded, hexagon) using the shape paths as `clip-path`.
- **Schema:** optional fields on image content.

#### E2.3 Ink / annotation layer (P2 in founding PRD)
- **Scope:** classroom-mode freehand pen over the page, transient by default, "save as image on this page" explicit.
- **Player:** canvas overlay; disabled for learners unless the teacher enables "paintable page".

#### E2.4 Connectors
- **Scope:** lines attached to two elements, re-routed on move; straight or elbow.
- **Schema:** line content gains `from?: Id; to?: Id; routing?: "straight"|"elbow"`.

### E3 — Richer interactions

#### E3.1 Page-as-window (rich modals)
- **Goal:** Genially pop-up slides with full layout, instead of text+image modals.
- **Schema:** new action `{ type: "openPage"; pageId: Id; size: "small"|"medium"|"large"|"full" }`. The target page must be `hiddenFromNavigation`.
- **Player:** renders the target page inside the modal shell with its own scale; focus trap and Escape as today; nested openPage limited to depth 1.
- **Import:** `slidePopup` maps to `openPage` instead of navigate + Back; the imported "Retour" hotspot is no longer needed.
- **Acceptance:** AT-E3.1 interactions inside the window work; audio stops on close; reset clears window state.

#### E3.2 Zoom / spotlight
- **Schema:** action `{ type: "spotlight"; elementId: Id; scale: number }` and `{ type: "resetView" }`.
- **Player:** animates the stage transform to the element (respects reduced motion by jumping without animation); a persistent "Vue d'ensemble" control appears while zoomed; controls remain reachable.

#### E3.3 Enter/exit effects and page transitions
- **Schema:** element `effects?: { in?: "fade"|"slideUp"|"slideLeft"|"pop"; delayMs?: number }`; page `transition?: "none"|"fade"|"slide"`.
- **Rules:** effects never gate interaction; with `prefers-reduced-motion` everything renders in its final state immediately; max total delay per page 3 s.

#### E3.4 Hover previews for images (lightbox)
- **Scope:** image action "open full size" (modal with pinch-zoom on phone).

#### E3.5 Timed and conditional actions (foundation for E6)
- **Schema:** action `{ type: "wait"; ms: number }` (max 5000) and `{ type: "setFlag"; flag: string; value: boolean }`; element `visibleIf?: { flag: string; equals: boolean }`.
- **Session:** `flags: Record<string, boolean>` in `PlayerSession` (runtime only).

### E4 — Assessment types

Shared rules for all question types: prompt, teacher-written correct and retry feedback, retry policy, optional `onCorrect` actions, answers stored only in session memory, keyboard-complete, visible focus, no colour-only feedback (icons + text), announced via `aria-live`. Classroom "reveal answers" shows the key. Lint requires a correct answer and ≥2 options where applicable.

#### E4.1 Multiple choice, true/false, image selection
- **Schema:** `multipleChoice { options, correctOptionIds: Id[], requireAll: boolean }`, `trueFalse { statement, answer: boolean }`, `imageChoice { options: { id, assetId, alt }[], correctOptionId }` (image options must have alt text; lint error otherwise).
- **Import:** Genially `Activities` collection (currently skipped) can map single/multiple/true-false once its structure is sampled.

#### E4.2 Fill in the blanks and short answer
- **Schema:** `fillBlanks { text: string /* with {{blank-id}} markers */, blanks: { id, accepted: string[], caseSensitive: boolean, ignoreAccents: boolean, ignorePunctuation: boolean }[] , mode: "type"|"choose", choices?: string[] }`, `shortAnswer { prompt, accepted: string[], normalization: { caseSensitive, ignoreAccents, ignorePunctuation, trimSpaces } }`.
- **Rules:** normalisation is explicit and visible in the inspector; "ignore spelling differences" is **not** offered (language-learning integrity, per founding PRD §7.1).
- **Player:** blanks as labelled inputs (`aria-label` = "blank 1 of 3"), check button, per-blank feedback.

#### E4.3 Sort, arrange in order, match concepts (drag with keyboard alternative)
- **Schema:** `ordering { items: { id, label, assetId? }[], correctOrder: Id[] }`, `matching { left: {id,label,assetId?}[], right: {id,label,assetId?}[], pairs: [Id,Id][], allowManyToOne: boolean }`, `sortIntoBoxes { boxes: {id,label}[], items: {id,label,boxId}[] }`.
- **Interaction model:** drag-and-drop **and** "select item → select destination" with the same visual state; move with arrow keys when focused; drop targets ≥ 44 px; feedback per item.
- **Acceptance:** AT-E4.3 a keyboard-only user completes each type without a pointer; a tablet user completes with touch; pan does not start a drag (long-press or handle).

#### E4.4 Locate in image
- **Schema:** `locate { assetId, alt, targets: { id, shape: "rect"|"circle"|"polygon", frame|points, label }[], tolerancePx }`.
- **Keyboard alternative:** list of named regions as buttons (the text route already lists them).

#### E4.5 Question banks and random questions
- **Storage:** `{owner}/banks/{id}.json` with tagged questions; a `questionRef` element draws N random questions from a bank at session start (seeded per session so reset reshuffles).
- **Publication:** the snapshot embeds the referenced bank content (no runtime lookup).

#### E4.6 Results summary (formative)
- **Player:** completion screen lists each question with ✓/✗ and attempts; "Copier le résumé" copies plain text; optional "Télécharger en PDF" (client-side).
- **Privacy:** nothing leaves the device; no names collected.

### E5 — Media and libraries

#### E5.1 Cross-lesson media library
- **Storage:** `{owner}/library/{assetId}.ext` + `{owner}/library/_index.json`; "Insérer depuis ma bibliothèque" copies the file into the lesson folder (publication safety unchanged).
#### E5.2 Audio Trimmer bridge
- Replace the download-only export with "Envoyer vers le Studio" (writes to the library with duration and a provenance note).
#### E5.3 Teacher microphone recording
- In-browser recorder (MediaRecorder → WebM/Opus, converted to MP3 server-side or kept as WebM with MP3 fallback); 5-minute cap; transcript field prefilled by the existing speech-to-text if available.
#### E5.4 AI image generation bridge
- Reuse the host's image generation action; generated images land in the library with a "generated" tag; usage reminder about rights and classroom suitability.
#### E5.5 Dialogue Builder bridge (founding PRD P2)
- Insert a saved dialogue as an audio element with its transcript, or as a two-column text block; read-only adapter, no iframe.

### E6 — Branching, missions, escape games

#### E6.1 Decision points and branching
- Built on E3.5 flags: a `decision` element renders 2–4 choices, each with actions (typically `setFlag` + `navigate`).
- **Lint:** unreachable pages, dead ends (page with no outgoing navigation that is not the last), circular locks.
#### E6.2 Mission tracker
- `document.missions?: { id, label, condition: { all|any: [ {visited: Id} | {completed: Id} | {flag: string} ] } }[]`; player shows "3 / 5 indices" progress; monotonic within a session.
#### E6.3 Code / keyword gates
- `gate` element with accepted codes (same normalisation UI as short answer), unlocks via `setFlag`; documented as a puzzle device, not security.
#### E6.4 Escape-game template
- "Find clues → unlock" starter with 4 rooms, tracker, final gate; ships only when E6.1–E6.3 pass accessibility checks.

### E7 — Content packs and discovery (optional)

- Open-licence illustration/character packs (e.g. CC0 sets) curated per theme (school, town, food, animals), stored as public static assets with attribution file.
- Stock image search (Unsplash/Pexels/Openverse) behind an API key, results imported into the library with attribution saved in asset metadata.
- Simple charts (bar/pie) from a 2-column table for CLIL-style lessons. Low priority.

### E8 — Export, import, offline

#### E8.1 Printable PDF of a lesson
- Client-side render of each page to an image at 2× then to PDF (jsPDF already in the host); hidden pages optional; appendix listing tooltips and transcripts so the paper version keeps the content.
#### E8.2 Standalone HTML package (founding PRD P2)
- Player runtime + snapshot + media zipped; `file://` tested on the frozen browser matrix; unsupported features blocked or listed.
#### E8.3 PDF import (fallback)
- pdf.js in the browser: page → background image, link annotations → navigate hotspots, text layer → page notes. For lessons where only a PDF survives.
#### E8.4 Prepared offline playback (founding PRD P1)
- Service worker + versioned cache per publication; "Préparer pour la classe" with size, progress, integrity check, "Prêt hors ligne" state; tested by disconnecting and reopening.

---

## 4. Cross-cutting requirements

### 4.1 Accessibility (unchanged gates, extended)
- Every new element type: keyboard operable, visible focus, accessible name, text-route representation.
- Every drag interaction has a select-then-place equivalent with identical outcomes.
- Animations respect `prefers-reduced-motion`; nothing essential is conveyed by motion, colour, hover or sound alone.
- Screen-reader pass on at least one lesson per new question type before it is marked done.

### 4.2 Data-model governance
- `schemaVersion` stays 1 while only optional fields are added. Any semantic change bumps the version and ships with: a migration function, fixtures for old documents, and a publish-time check that old snapshots keep playing unchanged.
- Runtime actions remain a closed discriminated union validated by zod; the interpreter rejects unknown types.
- Published snapshots continue to strip teacher-only data (notes, question banks' unused items, flags' debug names).

### 4.3 Security and privacy
- No author-supplied HTML anywhere (E1.7 uses structured runs).
- External links https only; no embeds unless a provider allowlist, CSP and explicit-load UI are added together.
- Learner state stays in session memory; E4.6 export is user-initiated and local.
- Recording (E5.3) is **teacher** microphone only; student recording remains out of scope here (see host app's Speaking module and its consent flow).

### 4.4 Performance budgets
- Player initial JS ≤ 250 KB gzipped; icon registry stays curated (no `import * from lucide`).
- Imported images ≤ 1600 px and WebP by default; audio ≤ 25 MB per file; warn above 50 MB per publication.
- Editor remains responsive at 80 elements/page; measure drag frame time when adding E1.1.

### 4.5 Localisation
- Editor UI in French; learner content in English by default; player chrome strings centralised (`FR` object in `StudioPlayer.tsx`) and ready for an `en` variant if a student-facing English UI is wanted.

---

## 5. Recommended sequencing

Ordered by classroom value per unit of work, respecting dependencies.

| Phase | Epics | Why first |
|---|---|---|
| 1 | E4.1 (multiple choice, true/false, image selection), E1.6, E1.5 | Most-used Genially question types; cheap; reuse the single-choice component |
| 2 | E3.1 (page-as-window), E1.1 (multi-select), E1.7 (rich text) | Closes the biggest visible gaps versus her existing Genially decks; improves import fidelity |
| 3 | E4.2 (blanks, short answer), E4.3 (ordering, matching) | Core ESL exercise types; needs the keyboard-alternative pattern done once and reused |
| 4 | E5.1–E5.3 (library, trimmer bridge, recording) | Removes the remaining tool-switching for audio |
| 5 | E3.2–E3.3 (spotlight, effects), E1.4 (master layer), E1.8 (fonts) | Polish that makes lessons feel finished |
| 6 | E6 (branching, missions, escape) | Depends on flags (E3.5) and lint; high fun value, medium effort |
| 7 | E8.1, E8.3, E8.4 (PDF print, PDF import, offline) | Resilience and migration completeness |
| Later | E2.3 (ink), E2.4 (connectors), E7 packs, E8.2 (HTML export) | Nice-to-have; evaluate demand after a term of use |

Rough sizes (one experienced developer, including tests and browser verification): Phase 1 ≈ 2–3 days; Phase 2 ≈ 5–7 days; Phase 3 ≈ 5–6 days; Phase 4 ≈ 3–4 days; Phase 5 ≈ 4–5 days; Phase 6 ≈ 5–7 days; Phase 7 ≈ 5–8 days. These are planning ranges, not commitments.

---

## 6. Acceptance test additions

| ID | Scenario | Pass condition |
|---|---|---|
| AT-20 | Multi-select | Marquee + shift-click select; align/distribute correct; single undo step |
| AT-21 | Page-as-window | Opens hidden page in a focus-trapped modal; interactions inside work; Escape closes; audio stops; reset clears |
| AT-22 | Rich text safety | Pasting arbitrary HTML yields only allowlisted runs; player never injects HTML |
| AT-23 | Question types | Each new type: keyboard-only completion, screen-reader announcement of feedback, reveal-answers in classroom mode, lint blocks missing keys |
| AT-24 | Drag alternatives | Ordering and matching completed by select-then-place and by arrow keys; touch pan never starts a drag |
| AT-25 | Flags and branching | Dead-end lint fires; tracker counts monotonic; reset clears flags |
| AT-26 | Library copy semantics | Inserting library media copies into the lesson; publish verification sees the file; deleting the library original does not break a publication |
| AT-27 | Effects | With reduced motion, final state renders immediately; effects never block activation |
| AT-28 | PDF print | Every page exported at readable resolution with the tooltip/transcript appendix |
| AT-29 | Offline | Prepared lesson plays with network disabled after close/reopen; interrupted preparation is not marked ready |
| AT-30 | Import fidelity (E3.1) | Genially pop-up slides import as page-windows; sample export plays identically to Genially for links, tooltips, pop-ups and audio |

---

## 7. Decisions needed before each phase

1. **Rich text (E1.7):** contentEditable with serializer, or markdown-lite markers? Recommendation: contentEditable; markers confuse teachers.
2. **Recording format (E5.3):** store WebM/Opus as-is (smaller, Safari now supports it) or transcode to MP3 server-side (cost, latency)? Recommendation: store WebM with MP3 fallback only if a target device fails playback in testing.
3. **Fonts (E1.8):** which licences are acceptable to self-host? OpenDyslexic (SIL-like), Andika and Lexend (OFL) are safe.
4. **Stock search (E7):** which provider and whose API key; attribution display requirements.
5. **Offline (E8.4):** is it needed on school tablets (managed, often no service-worker persistence) or only on the teacher laptop?

---

## 8. Out of scope (reaffirmed)

- Student accounts, gradebooks, analytics, leaderboards, live multiplayer.
- Arbitrary iframes/embeds and author JavaScript.
- Collaborative editing and comments.
- Automatic lossless Genially conversion of animations, effects or embedded third-party players.
- Any claim of WCAG conformance without a formal audit; the Studio targets WCAG 2.2 AA behaviours and verifies them with keyboard and screen-reader passes.

---

## Appendix A — File map of the current implementation

| Path | Role |
|---|---|
| `src/lib/studio/types.ts` | Document, element, action, session types; limits |
| `src/lib/studio/schema.ts` | zod validation, version gate |
| `src/lib/studio/document.ts` | Factories, duplication, lint, navigation resolution, geometry |
| `src/lib/studio/runtime.ts` | Action interpreter, session reducer |
| `src/lib/studio/audio.ts` | Narration channel, test tone |
| `src/lib/studio/shapes.ts` | Shape paths, gradient presets, pattern CSS |
| `src/lib/studio/icons.ts` | Curated icon registry, font stacks |
| `src/lib/studio/emoji.ts` | Emoji groups |
| `src/lib/studio/media.ts` | Client media probing and downscaling |
| `src/lib/studio/templates.ts` | Starter templates |
| `src/lib/studio/storage.ts` | Storage-backed persistence, publication, public lookup (server only) |
| `src/lib/studio/genially/*` | Genially JSON extraction, conversion, zip matching, tests |
| `src/app/actions/studio.ts` | Server actions |
| `src/components/studio/renderer/StudioStage.tsx` | Shared page renderer and element views |
| `src/components/studio/player/StudioPlayer.tsx` | Player, classroom mode, modal, tooltip, text route |
| `src/components/studio/editor/*` | Editor shell, canvas, filmstrip, inspector, pickers, drawer, top bar |
| `src/components/studio/StudioHome.tsx`, `GeniallyImportDialog.tsx` | Lesson list and importer |
| `src/app/studio/*`, `src/app/play/[code]/page.tsx` | Routes |
| `src/lib/store/useStudioEditorStore.ts` | Editor state and history |

## Appendix B — Genially export format notes (for future importer work)

- `genially.html` embeds `window.dataBase64`, a base64 JSON with `Slides`, `Texts`, `Images`, `Areas`, `Videos`, `RichContents`, `Audios`, `Svgs`, `Groups`, `Activities`, `interactivityActions` (map id → action) and `version` (24 at time of writing).
- Element interactivities are `{ click: actionId, hover: actionId }`; `parallel` actions nest inline action objects.
- Media paths in the JSON can differ from the stored file names by content-hash suffix and by a narrow no-break space (U+202F) in screenshot names; match by folder + normalised base name (implemented).
- Slide size is 1200×675 px; the importer scales to 1280×720.
- Not yet sampled: `Activities` (question structures), `Groups`, `Svgs`, drag-and-drop configuration. Sample a lesson that uses them before building E4 import.
