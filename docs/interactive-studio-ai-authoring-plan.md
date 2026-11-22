# Interactive Studio — AI Authoring Build Plan

**Version:** 1.0 · **Date:** 15 November 2026
**Scope:** let the teacher describe a lesson in a sentence or two, get a complete set of designed, accessible slides in the Studio, then add the interactions herself. Later, refine pages by chatting with an agent.
**Companion documents:** `interactive-studio-parity-prd.md` (this becomes its Epic 10), the founding Studio PRD.

> **Core principle.** The model writes a *slide plan*; the Studio draws it. The language model never emits coordinates, colours as free text, HTML, or raw Studio JSON. A deterministic layout engine turns the plan into a `StudioDocument`, lint validates it, and only then does it become a lesson. This keeps every generated lesson consistent, accessible and safe, and makes the feature testable with fixtures instead of prompts.

---

## 1. Outcome

A teacher opens **Nouvelle leçon → Générer avec l'IA**, fills five fields (topic, level, routine, number of pages, content language), waits 10–30 seconds, and lands in the editor on a finished-looking lesson: title page, menu, content pages with text, shapes, icons and optional images, a check page with questions, and an ending page. Menu navigation and Back buttons are already wired. Hotspots the model proposed sit on the pages, labelled, with no actions yet, listed in the layers panel as *À compléter*. She adds tooltips, audio and windows, previews, publishes.

Second milestone: inside the editor, **Ajouter une page avec l'IA**, **Régénérer cette page**, **Illustrer cette page** and **Reformuler** on a text element.

Third milestone: a side-panel assistant that edits the open lesson through tools, one undo step per turn.

---

## 2. What exists and is reused

| Existing piece | Reused for |
|---|---|
| `src/lib/ai/runtime.ts` → `resolveTextModel(agent)` | Picking Claude or OpenAI models with the owner/teacher rules already in place |
| `generateText` + `Output.object({ schema })` pattern in `src/app/actions/dialogue.ts` | Structured slide-plan generation with zod validation and the existing `NoObjectGeneratedError` handling |
| `src/app/actions/image.ts` → `generateImageVariants` / `generateImage` (Gemini and OpenAI, returns data URLs) | Per-page illustration |
| `src/lib/studio/document.ts` factories, `lintDocument`, `createId` | Building and checking the generated document |
| `src/lib/studio/icons.ts` registry and `shapes.ts` gradient presets | Visual vocabulary the model may choose from (by name only) |
| `importStudioLesson` server action and the media upload path from the Genially importer | Creating the lesson and uploading generated images |
| `AI_REQUIRE_AUTH`, `APP_OWNER_EMAILS` | Who may generate, and on which model |

No new infrastructure, no new tables, no new buckets.

---

## 3. Architecture

```
Teacher form ──► generateSlidePlan (server action)
                    │  generateText + Output.object(slidePlanSchema)
                    │  retries once on schema failure
                    ▼
               SlidePlan (validated JSON, ~2–6 KB)
                    │
                    ▼
            layoutEngine.buildDocument(plan, options)   ← pure TypeScript, unit-tested
                    │  places elements per layout type
                    │  wires menu/back navigation
                    │  adds "À compléter" hotspots
                    │  runs lintDocument; fails closed on errors
                    ▼
              StudioDocument ──► importStudioLesson ──► editor opens
                                        ▲
   "Illustrer cette page" ──► generateImage ──► upload to lesson media ──┘ (replaces placeholder)
```

Boundaries:
- `src/lib/studio/ai/plan.ts` — the SlidePlan zod schema and types (shared by server and client).
- `src/lib/studio/ai/layout.ts` — the layout engine (no imports from React or the AI SDK; node-testable like the Genially converter).
- `src/lib/studio/ai/prompts.ts` — system prompt builders, few-shot examples, level descriptors.
- `src/app/actions/studioAi.ts` — server actions: `generateSlidePlan`, `generatePagePlan`, `rewriteText`, `illustratePage`.
- `src/components/studio/ai/*` — the generation dialog, page-level menu items, later the assistant panel.

---

## 4. The slide plan (what the model produces)

```ts
// src/lib/studio/ai/plan.ts (zod; TypeScript shown for readability)
type Level = "6e" | "5e" | "4e" | "3e";
type Routine = "listen-locate-respond" | "explore-read-check" | "notice-predict-reveal" | "read-choose-explain" | "vocabulary" | "free";

interface SlidePlan {
  title: string;                       // ≤ 80 chars
  level: Level;
  contentLanguage: "en" | "fr";
  theme: "ocean" | "forest" | "sunset" | "slate" | "paper" | "night" | "candy";   // maps to palette + gradient
  instructions: string;                // learner-facing, ≤ 240 chars
  pages: PagePlan[];                   // 3–12
}

type PagePlan =
  | { layout: "title"; heading: string; subheading?: string; iconName?: IconName }
  | { layout: "menu"; heading: string; items: { label: string; targetPageIndex: number }[] }     // 2–8 items
  | { layout: "textImage"; heading: string; body: string; imagePrompt?: string; iconName?: IconName; imageSide: "left" | "right"; hotspots?: HotspotPlan[] }
  | { layout: "twoColumns"; heading: string; left: { title: string; lines: string[] }; right: { title: string; lines: string[] } }
  | { layout: "vocabulary"; heading: string; items: { word: string; translation?: string; iconName?: IconName }[] }   // 4–8
  | { layout: "question"; heading?: string; prompt: string; options: string[]; correctIndex: number; correctFeedback: string; retryFeedback: string }
  | { layout: "ending"; heading: string; body?: string };

interface HotspotPlan {
  label: string;                       // what the learner would click, e.g. "The kangaroo"
  purpose: "tooltip" | "audio" | "window" | "link";   // a hint for the teacher, not an action
  anchor: "topLeft" | "topRight" | "bottomLeft" | "bottomRight" | "center";   // coarse position only
}
```

Rules enforced by the schema and a post-parse check:
- `IconName` is a `z.enum` built from `ICON_NAMES` so the model can only pick icons that exist.
- `menu.items[].targetPageIndex` must point inside `pages` and not at another menu or the title page.
- Text lengths are capped per layout (heading ≤ 60, body ≤ 420, bullet ≤ 90) so the engine never has to shrink fonts below the level's minimum.
- Exactly one `question.correctIndex` within range; feedback non-empty.
- At most four hotspots per page.

Why coarse anchors instead of coordinates: the engine decides exact frames from the layout grid, so hotspots never overlap text and always meet the 44 px rule.

---

## 5. The layout engine

`buildDocument(plan: SlidePlan, options: { seed?: string }): { document: StudioDocument; todo: TodoItem[] }`

- **Grid:** 1280×720, 64 px outer margin, 12-column grid with 24 px gutters. Every layout places elements on the grid; no free coordinates.
- **Theme → palette:** each theme defines background (gradient preset or colour), heading colour, body colour, accent colour, card colour. Contrast is pre-verified (≥ 4.5:1 body, ≥ 3:1 large text) when the themes are authored; a unit test asserts it so a palette edit cannot regress.
- **Typography by level:** 6e/5e body 30 px, 4e/3e body 26 px; headings 56/48; minimum 24 px anywhere. Font stack `rounded` for 6e/5e, `sans` otherwise; text shadow on when the background is a photo.
- **Layouts:** one function per `layout`. Each returns `CanvasElement[]` built with the existing factories, with `accessibility.readingOrder` set in reading order and `decorative` set on shapes and icons.
- **Navigation wiring (deterministic):** menu items become `button` elements with `navigate(pageId)`; every non-menu page after a menu gets a *Menu* button (top-left, `navigate(menuPageId)`); linear mode remains on so Next/Previous also work. If the plan has no menu, nothing extra is added.
- **Hotspots:** each `HotspotPlan` becomes a transparent hotspot sized 96×96 at the anchor inside the image area (or the body area if no image), `showHint: true`, label from the plan, `interactions: []`, and a `name` prefixed `À compléter · `. The layers panel already lists names, so they are visible without new UI; a filter chip "À compléter" is a small addition.
- **Images:** `textImage` with an `imagePrompt` gets an image element with `assetId: null` and `alt` = a shortened prompt, rendered by the Studio as the dashed placeholder, plus the prompt stored in the page notes under `Illustration suggérée : …`. The teacher (or *Illustrer cette page*) fills it.
- **Questions:** map to the existing `singleChoice` element; the ending page shows the completion message from the plan.
- **Validation:** the engine calls `lintDocument`; any `error` makes generation fail with a readable message (should not happen given the schema; it is the safety net). Warnings are passed back as the generation report.
- **Determinism:** given the same plan the output is identical (ids come from a seeded generator in tests), so fixtures can snapshot documents.

---

## 6. Server actions

| Action | Input | Output | Notes |
|---|---|---|---|
| `generateSlidePlan` | `{ topic, level, routine, pageCount (3–12), contentLanguage, agent?, extraInstructions? }` | `{ ok, plan, report }` | Builds system prompt from `prompts.ts`; `generateText` with `Output.object(slidePlanSchema)`; one retry with the validation error appended; 60 s timeout; logs model + token usage, never the content |
| `createLessonFromPlan` | `{ plan }` | `{ ok, lessonId, todo }` | Runs the engine, then the same path as `importStudioLesson`; separate from generation so the preview step can show the plan first |
| `generatePagePlan` | `{ lessonSummary, layout?, brief, level, contentLanguage }` | `{ ok, page }` | One `PagePlan`; used by "Ajouter une page" and "Régénérer" |
| `rewriteText` | `{ text, intent: "simplify" | "shorten" | "expand" | "fix", level, contentLanguage }` | `{ ok, text }` | Plain text in, plain text out, length-capped |
| `illustratePage` | `{ lessonId, prompt, style: "photo" | "flat" | "sketch" }` | `{ ok, assetId, path, width, height }` | Calls `generateImage`, decodes the data URL server-side, uploads to the lesson's asset folder, returns an asset record the client merges into `document.assets` |

All actions call `requireAiIdentity()` and `requireStudioUser()`. Model choice follows the existing agent catalogue (default the teacher's selected agent; Opus owner-only).

---

## 7. Prompts

- **System prompt** (French instructions, English or French output as requested): the role (ESL teacher's assistant for French collège), the level descriptor (CEFR A1–A2 vocabulary and tense constraints per level, sentence length caps), the routine description, the layout vocabulary with one-line guidance each ("menu pages link to content pages; end with a question page then an ending page"), hard rules (no HTML, no emoji in body text unless asked, no student names, no copyrighted song lyrics, respect caps), and two compact few-shot examples (a town-map listening lesson and a culture page) as JSON.
- **Routine templates** steer page sequences: `listen-locate-respond` → title, textImage with 3 audio hotspots, question, question, ending; `vocabulary` → title, vocabulary ×2, question, ending; and so on. The model may deviate within `pageCount`.
- **Determinism aids:** temperature 0.4; a `seed` note in the user prompt is not relied upon.
- Prompts live in code with tests that assert the few-shot examples themselves pass `slidePlanSchema` and the engine (so examples can never drift from the schema).

---

## 8. Editor and UI work

1. **Generation dialog** (`GenerateLessonDialog.tsx`, opened from the template picker): fields topic (textarea, required), level (select, defaults to the workspace's last used level), routine (cards), pages (slider 3–12, default 6), content language, optional "précisions" textarea, agent selector reused from `AgentSelector.tsx`. Button *Générer le plan*.
2. **Plan preview step:** a compact outline (page number, layout, heading, first line) with per-page *Régénérer* and *Supprimer*, and *Créer la leçon*. Lets her fix an off-topic page before anything is created. Shows the warnings report.
3. **Progress and errors:** the same progress pattern as the Genially importer; a schema failure after retry shows "Le modèle n'a pas produit un plan valide. Réessayez ou simplifiez la consigne."
4. **Editor additions:** filmstrip "+" menu gains *Page avec l'IA…*; page settings gains *Régénérer cette page…* and *Illustrer cette page…*; text inspector gains a *Reformuler* split button (simplifier / raccourcir / développer / corriger). Each applies as one undo step and marks the draft unsaved so autosave runs.
5. **À compléter chip:** in the layers panel, a toggle that filters to hotspots with no actions; count shown in the top bar next to the save state ("3 zones à compléter").
6. **Rights reminder:** generated images carry `name: "IA · <prompt>"`; the publish dialog's acknowledgment text already covers rights.

---

## 9. Milestones

### M1 — One-shot lesson generation (≈ 3 days)
- Day 1: `plan.ts` schema, `prompts.ts`, `generateSlidePlan` action, fixtures of three valid plans, schema tests.
- Day 2: `layout.ts` with the seven layouts, navigation wiring, hotspots, theme palettes with the contrast test, snapshot tests of documents, `createLessonFromPlan`.
- Day 3: dialog with plan preview, progress and error states, à-compléter chip, browser verification on two generated lessons (one per routine family), phone-width check of a generated page.
- **Exit:** AT-AI-1…5 below pass; generation from a two-sentence brief produces a publishable lesson with at most warnings.

### M2 — Page-level tools and illustration (≈ 2 days)
- `generatePagePlan`, `rewriteText`, `illustratePage`; editor menu items; one undo step per operation; cost note per illustration.
- **Exit:** AT-AI-6…8 pass.

### M3 — Assistant panel (≈ 3–4 days, after M1/M2 have been used on real lessons)
- Side panel chat in the editor. The model gets a compact lesson summary (page headings, layouts, element names) and tools: `addPage(pagePlan)`, `replacePage(index, pagePlan)`, `rewriteElement(elementId, text)`, `setTheme(theme)`, `addHotspot(pageIndex, hotspotPlan)`, `removePage(index)`. Every tool call goes through the engine and lint, is applied as one undo step, and is echoed in the chat as a diff line ("Page 3 remplacée : …").
- Hard limits: 8 tool calls per turn, no tool that writes actions other than navigation, no media deletion.
- **Exit:** AT-AI-9…10 pass; a 10-turn session leaves a lint-clean document and a fully reversible history.

### M4 — Nice-to-haves (later)
- Generate from an uploaded worksheet (PDF/image → plan) using the existing ingest tools as the text source.
- Suggest tooltip text and audio scripts for each à-compléter hotspot ("Proposer un contenu"), still leaving the teacher to accept.
- Translate a finished lesson's text layer to the other content language as a duplicate lesson.

---

## 10. Acceptance tests

| ID | Scenario | Pass condition |
|---|---|---|
| AT-AI-1 | Schema fence | Any plan that violates caps, points a menu at a bad index, or names an unknown icon is rejected before layout; a model retry is attempted once |
| AT-AI-2 | Engine determinism | Same plan + seed → identical document; snapshot tests for every layout at every level |
| AT-AI-3 | Accessibility of output | Generated documents have zero lint errors; all interactive elements labelled; reading order set; contrast test on themes passes |
| AT-AI-4 | Navigation wiring | Menu buttons navigate to the right pages; Menu/Back buttons return; linear Next/Previous still work; no dead ends |
| AT-AI-5 | Teacher handoff | À-compléter hotspots are visible in layers, counted in the top bar, and publish warns (not blocks) while any remain without actions |
| AT-AI-6 | Page regenerate | Replaces one page, preserves its id and inbound navigation, single undo step |
| AT-AI-7 | Illustrate | Image uploaded to the lesson folder, alt text prefilled from the prompt, publish verification sees the file, cost shown before the call |
| AT-AI-8 | Rewrite | Text length never exceeds the layout cap after rewrite; plain text only |
| AT-AI-9 | Assistant safety | Tools cannot create actions other than navigate, cannot touch media, cap at 8 calls per turn; each turn is one undo step |
| AT-AI-10 | Privacy and logging | No lesson text or student data in server logs; only model id, token counts, duration and outcome |

---

## 11. Risks and mitigations

| Risk | Mitigation |
|---|---|
| Model output too long or off-level | Caps in the schema plus level descriptors in the prompt; retry with the validation error; preview step before creation |
| Layouts look samey | Seven layouts × seven themes × icon choice gives variety; images on demand; themes authored by hand, not by the model |
| Cost creep from images | Per-page, explicit button with a price note; no automatic generation; owner-only gate possible via the existing catalogue |
| Teacher trusts generated facts | Generated content pages show a one-time banner "Vérifiez les contenus générés" until first edit; the plan preview exists for that reason |
| Prompt and schema drift | Few-shot examples are run through the schema and engine in tests |
| Vendor variability | Everything model-facing is behind `generateSlidePlan`; swapping agents is a catalogue change |

---

## 12. Decisions to make before starting

1. **Default model for generation.** Recommendation: the catalogue's default OpenAI agent for teachers, Claude for the owner, same as today.
2. **Image default style.** Recommendation: "flat illustration" to avoid photoreal faces in class materials.
3. **Where generated lessons start.** Recommendation: always in the editor (never auto-published).
4. **Whether the assistant (M3) may modify text the teacher has already edited.** Recommendation: only on explicit mention of that page; otherwise refuse and say why.

---

## Appendix — File list for M1

```
src/lib/studio/ai/plan.ts            schema + types
src/lib/studio/ai/prompts.ts         system prompt, level descriptors, routine sequences, few-shots
src/lib/studio/ai/layout.ts          buildDocument + per-layout builders + themes
src/lib/studio/ai/layout.test.mjs    snapshot + contrast + wiring tests
src/lib/studio/ai/fixtures/*.json    valid plans (one per routine)
src/app/actions/studioAi.ts          generateSlidePlan, createLessonFromPlan
src/components/studio/ai/GenerateLessonDialog.tsx
src/components/studio/StudioHome.tsx (hook the dialog into the template picker)
src/components/studio/editor/Filmstrip.tsx (à-compléter filter chip)
src/components/studio/editor/TopBar.tsx (à-compléter count)
```
