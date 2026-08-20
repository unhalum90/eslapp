<!-- Self-contained repository review generated from code and verification evidence on 2026-08-20. -->

*Technical & Product Review*

# The ESL Architect

## Repository State Review

Current technical implementation, user capabilities, delivery health, and prioritized handoff actions

**Assessment date:** 20 August 2026

**Repository branch:** main, tracking origin/main

**Reviewed commit:** 38b8e74 — feat: Add 3 premium features - AI Activity Generator, Lesson Pack Export, AI Level Adjuster

**Audience:** Development team reviewing the product without repository access

**Scope:** Current working tree, including uncommitted audio-tool work

> **Bottom line**  This is a promising, feature-rich prototype—not a production-ready release. The canvas and printable-activity concepts are tangible, but the main ingest-to-edit-to-save workflow is disconnected, the local build is blocked by configuration mismatch, quality gates fail, and authentication/security controls are incomplete.

### What reviewers should know first

- Core product value is visible: teachers can compose worksheets on a free-form canvas, request AI-generated or CECRL-adjusted content, generate classroom activities, and export printable artifacts.
- The working tree is not clean. The audio trimmer and related dependency/sidebar changes are local, uncommitted additions and should be evaluated separately from the last shared commit.
- Static compilation succeeds, but the production build fails during prerendering because the Supabase client expects NEXT_PUBLIC_SUPABASE_ANON_KEY while the local environment provides a differently named publishable key.
- The current PDF ingest and recent-document load paths write to legacy Tiptap state; the active Fabric canvas reads a different canvasJSON state. Therefore, extracted or reloaded content does not enter the visible editor as intended.
- No automated tests or CI configuration were found. ESLint reports 50 errors. The production dependency audit reports 14 vulnerabilities: 3 moderate, 9 high, and 2 critical.

---

## 1. Executive summary

The ESL Architect is an early-stage Next.js application aimed at French secondary-school ESL teachers. Its product direction is strong: reduce worksheet preparation time by combining document ingestion, a spatial worksheet canvas, generative AI, CECRL adaptation, printable classroom games, and lightweight media tools. The current repository demonstrates most of these ideas individually, but several are not yet connected into a reliable end-to-end teacher workflow.

### Readiness scorecard

| **Dimension** | **State** | **Evidence-based interpretation** |
| --- | --- | --- |
| **Product concept** | Strong | Clear target user, concrete classroom workflows, and differentiated CECRL/print focus. |
| **UI prototype** | Moderate | Six implemented routes and substantial interactive UI; three sidebar routes are placeholders. |
| **Core workflow** | Low | Ingest/load use legacy editor state and do not populate the active Fabric canvas. |
| **Persistence** | Low | Schema and client calls exist, but auth UI/provisioning and env naming are incomplete. |
| **Build/release** | Blocked | Compilation passes; production prerender fails on missing Supabase client key. |
| **Quality assurance** | Low | No tests or CI; lint fails with 50 errors. |
| **Security posture** | Low | Critical/high dependency findings, public profile reads, and unguarded paid AI actions. |
| **Operational readiness** | Low | No observability, rate limiting, support diagnostics, or documented deployment procedure. |

> **Recommended classification**  Pre-production product prototype / internal alpha. Suitable for design validation and focused developer continuation; not suitable for open user access or dependable classroom use until the P0 items in Section 9 are resolved.

### Most valuable assets to preserve

- A clear pedagogical niche: French ESL teaching, mixed ability levels, CECRL adaptation, and photocopier-ready output.
- A substantial Fabric.js canvas implementation with text, shapes, lists, worksheet templates, image handling, history, keyboard shortcuts, and PDF export.
- Six distinct printable activity formats backed by either default content or AI-generated topic/level data.
- Well-separated server actions for text generation, level adjustment, image generation, activity generation, and PDF extraction.
- A Supabase schema with ownership-based document policies, which is a reasonable starting point once auth and profile lifecycle are completed.

## 2. Review basis and repository snapshot

This report reflects the repository and local working tree inspected on 20 August 2026. It is designed to stand alone; paths are included as evidence references but reviewers do not need repository access to understand the findings.

### Evidence collected

- Static inspection of all application routes, server actions, state management, editor/layout components, activity components, schema, configuration, scripts, PRD, and dependency manifests.
- Git inspection of branch, commit history, tracked changes, and untracked additions.
- Locked dependency restoration with npm ci.
- Execution of npm run lint, npm run build, and npm audit --omit=dev.
- No live AI calls or production database mutations were performed. End-user behavior marked ‘conditional’ relies on code-path evidence and required external configuration.

### Repository facts

| **Area** | **Observed state** |
| --- | --- |
| **Git** | main tracks origin/main; HEAD 38b8e747003aac013a6a8ec3cf78d6889b76391b. |
| **History** | Two commits. The latest shared commit is dated 19 January 2026. |
| **Tracked footprint** | 51 tracked files; 33 tracked source files under src/. |
| **Application size** | Approximately 3,634 lines across TypeScript, TSX, JavaScript, and CSS in src/ and scripts/. |
| **Working tree** | 3 modified tracked files and 5 untracked path entries at review time. |
| **Documentation** | README is the default create-next-app text; prd.md describes the intended product but is not an operational setup guide. |
| **Tests / CI** | No test files, test script, or CI workflow found. |

### Uncommitted local scope

The following work is present locally but is not part of origin/main. An outside team receiving only the remote branch will not see it.

| **State** | **Path** | **Meaning** |
| --- | --- | --- |
| **Modified** | package.json / package-lock.json | Adds Wavesurfer and WAV encoding; updates Supabase JS version. |
| **Modified** | src/components/layout/Sidebar.tsx | Adds Audio Trimmer navigation. |
| **Untracked** | src/app/tools/audio/page.tsx | Audio tool route. |
| **Untracked** | src/components/audio/AudioTrimmer.tsx | Client-side waveform selection, preview, and WAV export. |
| **Untracked** | src/types/audiobuffer-to-wav.d.ts | Local type declaration. |
| **Untracked** | audio.md | Feature planning notes. |
| **Untracked** | supabase/ | Local Supabase CLI temporary metadata; not a formal migration set. |

---

## 3. User capabilities: what a teacher can do today

Capability labels are intentionally strict: ‘Available’ means the UI and core code path exist; ‘Conditional’ requires external service configuration; ‘Partial’ means part of the experience exists but the end-to-end outcome is incomplete; ‘Placeholder’ is navigable but has no route implementation; ‘Local only’ is uncommitted work.

| **Capability** | **State** | **User outcome** | **Important limits** |
| --- | --- | --- | --- |
| **Dashboard** | Available | Open blank editor, PDF ingest, or activity builder from landing cards. | Static route; generic demo identity. |
| **Free-form worksheet canvas** | Available | Add, move, resize, edit, copy, duplicate, and delete objects on an 800 × 1000 canvas. | Single-page canvas; browser-memory state. |
| **Text formatting** | Available | Bold, italic, alignment, font size, font family, and direct text editing. | Formatting is object-level; no collaborative editing. |
| **Worksheet elements** | Available | Add rectangles, circles, solid/dashed lines, answer lines, tables, bullets, numbers, and checkbox lists. | Tables are visual Fabric groups, not semantic editable tables. |
| **Starter worksheet blocks** | Available | Insert vocabulary-matching and fill-in-the-blank layouts. | Fixed starter content must be manually edited. |
| **Undo/redo & clipboard** | Available | Use buttons and common keyboard shortcuts; history is limited to 50 states. | Canvas lifecycle likely resets history after state updates; browser validation needed. |
| **AI text creation** | Conditional | Describe content and add the returned text as a new canvas text box. | Requires GOOGLE_API_KEY and Gemini model availability. |
| **AI selected-text editing** | Conditional | Select a text box, describe changes, and replace its text. | No preview/diff or rollback beyond canvas history. |
| **CECRL level adjustment** | Conditional | Estimate source level and rewrite selected text for A1, A2, B1, or B2. | Prompt-driven result; no pedagogical validation tests. |
| **AI image generation** | Conditional | Generate an educational illustration and place it on the canvas. | Requires Imagen access; no safety/cost guardrails in app. |
| **Canvas PDF export** | Available | Download the single canvas as an A4 PDF image. | Rasterized one-page output; no selectable text or multipage flow. |
| **PDF/resource ingest** | Partial | Upload a file and run raw PDF text extraction. | Output enters legacy Tiptap state, not the active canvas; JPG/PNG are accepted but parsed as PDF. |
| **Save snapshot** | Partial | Attempt to store title and canvas state in Supabase. | No sign-in UI; env mismatch blocks client; JSON is double-encoded; each upsert lacks a stable document id. |
| **Recent files** | Partial | List up to five document titles and select one. | Load writes legacy content state rather than canvasJSON, so visible canvas restore is not completed. |
| **Library / Templates / Settings** | Placeholder | Sidebar links are visible. | No corresponding routes; users reach a 404 page. |
| **Audio trimming** | Local only | Upload audio, select/preview a region, export that region as WAV locally. | Uncommitted; browser-memory processing; no size enforcement or automated verification. |

### Activity Builder

The activity area is the most complete standalone teacher-facing module. It can render default house/furniture/food/party content without AI and can substitute a generated topic/level pack when the AI action succeeds.

| **Format** | **Generated/rendered content** | **Output path** |
| --- | --- | --- |
| **I Have, Who Has?** | 16 linked speaking cards | Per-view browser print |
| **Word-picture dominoes** | 24 vocabulary-chain pieces | Per-view browser print |
| **Vocabulary board game** | 24 prompt squares | Per-view browser print |
| **Category sorting** | Category cards plus sorting guidance | Per-view browser print |
| **Snakes & Ladders Q&A** | 23 content squares with ladders/snakes | Per-view browser print |
| **Roll-a-Sentence grid** | 36 positive/negative/question prompts | Per-view browser print |

> **Export caveat**  The ‘Export Lesson Pack’ button creates a single cover page that lists the six activities; it does not include the activity pages themselves. Each activity can be printed separately through its own window.print() flow.

## 4. Current user journeys and breakpoints

### Journey A — Create a worksheet from scratch

1. Open New Document from the dashboard.
1. Build a worksheet with canvas objects or ask AI to create text/images.
1. Format and position objects; optionally use worksheet starter blocks.
1. Export the canvas to a one-page A4 PDF.
1. Attempt Save Snapshot; this only succeeds when a valid Supabase session and matching environment keys already exist outside the visible app.

> **Assessment**  The create-and-export portion is the strongest end-to-end workflow. Persistence is not yet self-contained for a real teacher.

### Journey B — Turn an existing resource into a worksheet

1. Choose Ingest PDF and select or drag a PDF/JPG/PNG.
1. The server action reads the upload with pdf2json and returns raw text.
1. The page converts line breaks to HTML and writes that HTML into the legacy content field in Zustand.
1. Navigation continues to /editor, whose active Fabric canvas reads canvasJSON—not content.
1. Result: the document title changes, but extracted text is not converted into visible canvas objects.

> **Assessment**  This product-defining path is currently disconnected and should be treated as a P0 integration defect.

### Journey C — Generate printable classroom games

1. Open Activity Builder and use default activities immediately, or enter a topic and CECRL level.
1. The AI action requests exactly 48 vocabulary items across four categories and 36 grid prompts.
1. Navigate across six activity tabs; each reuses the generated pack.
1. Print one activity at a time using browser print CSS.
1. The pack-level PDF button exports only a cover sheet, so a consolidated six-activity download is not yet delivered.

### Journey D — Reopen previous work

1. Recent Files queries the documents table and displays the five latest rows allowed by RLS.
1. Selecting a row fetches the full record.
1. The stored content is assigned to legacy content rather than canvasJSON.
1. The active canvas therefore does not restore the saved Fabric document.

> **Assessment**  The schema, list UI, and save/load calls exist, but the serialization contract and state target need to be unified before documents are dependable.

---

## 5. Technical architecture

The application is a single Next.js App Router project. Most UI is client-rendered, while five server actions encapsulate AI and PDF-processing calls. Supabase is accessed directly from browser components for session lookup and document CRUD.

| **Layer** | **Current implementation** |
| --- | --- |
| **Framework** | Next.js 16.1.3, React 19.2.3, App Router, React Compiler enabled |
| **Language / styling** | TypeScript 5, Tailwind CSS 4, Lucide React |
| **Primary editor** | Fabric.js 7.1.0 spatial canvas |
| **Legacy editor** | Tiptap 3.15.3 components remain but are not mounted by the active editor route |
| **Client state** | Zustand 5; in-memory only, with legacy content and active canvasJSON side by side |
| **Database / auth** | Supabase SSR and Supabase JS; browser client; PostgreSQL schema with RLS |
| **Text AI** | @google/generative-ai; Gemini 3 Flash Preview for chat, Gemini 2.0 Flash for activities and level adjustment |
| **Image AI** | @google/genai; Imagen 4 generation |
| **PDF input** | pdf2json raw text extraction; 10 MB server-action request limit |
| **PDF output** | jsPDF; canvas export as raster image, activity-pack cover as drawn text |
| **Audio — local work** | Wavesurfer.js regions + Web Audio API + audiobuffer-to-wav |

### Runtime flow

| **User surface** | **Client-side coordination** | **Server/external dependency** |
| --- | --- | --- |
| **Canvas editor** | Fabric canvas ↔ Zustand canvasJSON | Supabase documents on explicit save |
| **AI sidebar** | Selected Fabric object + global window.canvasEditor bridge | Next server actions → Gemini / Imagen |
| **Resource ingest** | Upload → Zustand legacy content | Next server action → pdf2json |
| **Activities** | React state → six renderers | Optional server action → Gemini |
| **Audio tool** | Wavesurfer region + Web Audio decode/trim | None; local browser processing |

### Implemented routes

| **Route** | **Purpose** | **Notes** |
| --- | --- | --- |
| **/** | Dashboard | Entry cards for editor, ingest, and activities |
| **/editor** | Worksheet canvas | Fabric editor plus AI sidebar and save action |
| **/ingest** | Resource upload | Upload UI and PDF raw-text extraction |
| **/activities** | Activity Builder | Six printable formats and optional AI generator |
| **/tools/audio** | Audio Trimmer | Uncommitted local route |
| **/_not-found** | Framework-generated | Currently encounters Supabase client construction during build |

**Linked but unimplemented: /library, /templates, and /settings.**

### State-model decision that must be made

The repository retains two editor models: HTML content for Tiptap and Fabric canvas JSON for the active worksheet editor. Ingest and document load still target the former; save targets the latter. The development team should select one canonical document contract and write explicit import/export adapters rather than maintain two loosely related state fields.

> **Additional canvas risk**  The Fabric initialization effect depends on canvasJSON, while every history save updates canvasJSON. React will clean up and re-run that effect on dependency changes, disposing and rebuilding the canvas. This is likely to reset selection/history and cause unstable editing. Confirm in browser, then initialize the canvas once and synchronize state through dedicated load/save paths.

## 6. Data, authentication, and security

### Database model

| **Table** | **Fields** | **Policy posture** |
| --- | --- | --- |
| **profiles** | id → auth.users; email; full_name; updated_at | RLS enabled; SELECT policy currently allows everyone to read all profiles. |
| **documents** | id; owner_id; title; content jsonb; timestamps | RLS limits select/insert/update/delete to auth.uid() = owner_id. |

- No profile-creation trigger or visible onboarding flow was found. Because documents.owner_id references profiles(id), a newly authenticated user may be unable to save until a profile row exists.
- The save call JSON.stringify()s Fabric JSON before writing it to a jsonb column, producing a JSON string rather than a JSON object. Load should use a typed, versioned canvas object.
- The upsert payload does not include a document id or conflict key. Each ‘Save Snapshot’ is expected to insert another row, which may be intentional for snapshots but does not support editing a stable document record.
- The database SQL is a standalone schema file, not a versioned Supabase migration history. The untracked supabase/ directory contains CLI temporary metadata only.

### Configuration defects

| **Service** | **Code contract** | **Observed local state** |
| --- | --- | --- |
| **Supabase URL** | NEXT_PUBLIC_SUPABASE_URL | Present by name locally; value redacted from this report. |
| **Supabase browser key** | Client expects NEXT_PUBLIC_SUPABASE_ANON_KEY | Local environment instead defines NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY; build fails. |
| **Google AI** | GOOGLE_API_KEY | Referenced by all AI server actions; not present in the inspected local environment. |
| **Database migration** | SUPABASE_CONNECT | Required by scripts/migrate.js; not present in the inspected local environment. |

### Security and cost-control risks

| **Priority** | **Risk** | **Why it matters** |
| --- | --- | --- |
| **Critical** | Dependency exposure | Production audit: 14 findings, including critical issues through jsPDF and protobufjs; direct high findings include Fabric and Next.js. |
| **High** | Unauthenticated AI invocation | Server actions do not perform an application-level user/role check, quota check, or rate limit before calling paid AI APIs. |
| **High** | Personal-data visibility | The profiles SELECT policy is public and includes email/full_name columns. |
| **High** | Upload validation | The UI advertises a 10 MB limit but does not enforce size; accepts images even though the backend parser is PDF-specific; no content signature validation was found. |
| **Medium** | Prompt/data governance | Selected text and teacher prompts are sent to external AI services; there is no consent notice, retention disclosure, or sensitive-data filtering in the UI. |
| **Medium** | Error handling | Most failures collapse to generic alerts/messages; no structured logging, correlation id, or support diagnostics were found. |

---

## 7. Engineering quality and release health

### Executed checks

| **Check** | **Result** | **Observed evidence** |
| --- | --- | --- |
| **npm ci** | Pass | 619 packages installed from package-lock; install reported 19 total audit findings including dev dependencies. |
| **TypeScript / compile phase** | Pass | Next production compilation completed successfully in approximately 4.6 seconds. |
| **npm run build** | Fail | Prerender of /_not-found fails when the root layout constructs a Supabase browser client without the expected API key. |
| **npm run lint -- --quiet** | Fail | 50 errors. Main groups: explicit any, CommonJS scripts, impure Math.random during render, and state update inside effect. |
| **npm audit --omit=dev** | Fail | 14 production findings: 3 moderate, 9 high, 2 critical. |
| **Automated tests** | Absent | No unit, component, integration, or end-to-end test suite is configured. |
| **Continuous integration** | Absent | No checked-in workflow enforces install, lint, typecheck, build, test, or audit gates. |

### Lint failure profile

- Editor and chat bridge: extensive use of any and window.canvasEditor; the 987-line CanvasEditor component concentrates state, rendering, history, object factories, formatting, and export.
- React purity: Flashcards, Dominoes, and Snakes & Ladders randomize with Math.random() during render/memo calculation, producing non-deterministic output and React rule failures.
- Effects: CanvasEditor sets state synchronously during initialization and couples its lifecycle to canvasJSON changes.
- Scripts: CommonJS require() conflicts with the repository’s TypeScript ESLint rules.
- PDF parser and custom declarations: loose any types mask the external library contract.

### Maintainability observations

| **Signal** | **Area** | **Interpretation** |
| --- | --- | --- |
| **Positive** | Feature separation | AI/PDF work is split into small server-action modules; printable activities are separate components. |
| **Positive** | Shared visual data | Activity constants/types/visual helpers are separated from renderers. |
| **Concern** | Oversized editor | CanvasEditor is 987 lines and should be split into canvas lifecycle, object factories, history, formatting, serialization, and export modules. |
| **Concern** | Global imperative bridge | ChatSidebar calls canvas behavior through window.canvasEditor rather than typed context/actions. |
| **Concern** | Documentation drift | README is boilerplate; PRD describes Tiptap, OCR, RAG, storage, toggles, and snapshots more fully than the code implements. |
| **Concern** | Dependency duplication | Both @google/generative-ai and @google/genai are used, and Tiptap remains installed despite the active Fabric editor path. |

## 8. Gap analysis against the product brief

| **PRD capability** | **Current state** | **Evidence / consequence** |
| --- | --- | --- |
| **Layout-aware OCR and image preservation** | Not implemented | Raw text extraction with pdf2json; no OCR for scans, reading-order reconstruction, table/image placement, or asset storage. |
| **PDF/JPG/PNG ingestion** | Partial/misleading | Picker accepts all three; parser handles PDF only. |
| **Hybrid Tiptap editor** | Architecture changed | Tiptap remains as unused legacy code; Fabric is the active free-form editor. |
| **Real-time Supabase sync** | Not implemented | State is in memory; persistence occurs only on manual snapshot attempt. |
| **Chat with full canvas read/write** | Partial | AI can add text/image or replace selected text; it does not reason over the full canvas document structure. |
| **Student/teacher version toggle** | Not implemented | No gap-fill transform, answer-key state, or variant export. |
| **CECRL adaptation** | Implemented conditionally | Selected text can be rewritten via Gemini with A1–B2 prompt guidance. |
| **Classroom activity generation** | Implemented conditionally | Six renderers plus generated vocabulary/prompts; consolidated pack PDF incomplete. |
| **High-fidelity PDF export** | Partial | Fabric canvas is rasterized into one A4 page; no React-PDF, multipage document flow, or semantic text. |
| **Version control / snapshots** | Prototype only | Rows can be inserted, but no authenticated document lifecycle, version browser, restore, or stable document id. |
| **Supabase Storage / pgvector RAG** | Not implemented | No storage buckets, embeddings, retrieval pipeline, or source-grounded generation. |
| **Future YouTube/sharing** | Not implemented | No transcript ingest, organization/school model, sharing UI, or permissions beyond owner-only documents. |

---

## 9. Product and technical recommendations

The fastest route to a reviewable alpha is to stabilize one coherent teacher journey before expanding feature breadth. The recommended target is: sign in → ingest or create → edit in Fabric → save → reopen → export.

### P0 — release blockers

| **Action** | **Implementation intent** | **Acceptance signal** |
| --- | --- | --- |
| **Fix configuration contract** | Standardize env names, add .env.example, validate required variables at startup, and keep browser/public keys separate from server secrets. | Build passes in a clean environment. |
| **Unify document state** | Choose Fabric JSON as the canonical document model or implement explicit Tiptap↔Fabric adapters. Route ingest and recent-file load into canvasJSON. | Ingested and saved documents visibly restore. |
| **Stabilize Fabric lifecycle** | Initialize the canvas once; decouple React effect cleanup from every canvasJSON update; move serialization/history into dedicated hooks. | Edits do not recreate the canvas or reset selection/history. |
| **Complete auth/profile lifecycle** | Add sign-in/sign-out UI, create profiles automatically, handle unauthenticated state, and verify all RLS flows. | A new teacher can save and reopen a document. |
| **Patch dependency vulnerabilities** | Upgrade Next.js, jsPDF, Fabric/transitives, and protobuf-related dependencies; review advisory applicability and lock the resolved versions. | No critical/high production audit findings, or documented accepted exceptions. |
| **Protect paid AI actions** | Require authenticated users, enforce quotas/rate limits/input caps, add model timeouts, and record usage/error metadata without storing unnecessary content. | Public callers cannot create unbounded AI cost. |

### P1 — alpha completeness

| **Action** | **Expected result** |
| --- | --- |
| **Add quality gates** | Introduce unit tests for serialization and AI parsing; component tests for editor actions; E2E tests for create/save/reopen/export; CI for lint/typecheck/build/test/audit. |
| **Finish consolidated activity export** | Render all six activity pages into a deterministic multipage PDF or provide an explicit print-all workflow. |
| **Harden uploads** | Accept only implemented formats, validate MIME/signature/size, support scanned PDFs through OCR, and return structured errors. |
| **Version document schema** | Store a JSON object with schemaVersion, canvas, title, page settings, and source metadata; separate documents from snapshots/versions. |
| **Operational documentation** | Replace boilerplate README with setup, env contract, migration, local development, verification, deployment, and troubleshooting steps. |
| **Remove broken navigation** | Implement Library/Templates/Settings or hide those destinations until they are functional. |

### P2 — scale and product depth

- Add source-aware OCR with page/block provenance, extracted assets, and confidence reporting.
- Introduce teacher/student variants, answer-key separation, gap-fill transforms, and multipage page management.
- Add observability: structured server-action logs, AI latency/cost/model metrics, upload failure reasons, and client error reporting.
- Establish accessibility and print QA across browsers, page sizes, contrast, keyboard operation, and screen-reader labeling.
- Only then add RAG, school sharing, YouTube ingest, and broader template/library features.

## 10. Suggested stabilization sequence

| **Phase** | **Indicative effort** | **Outcome** |
| --- | --- | --- |
| **1. Baseline** | 1–2 days | Clean branch strategy; document env; make install/lint/build reproducible; upgrade vulnerable packages; add CI skeleton. |
| **2. Canonical data model** | 2–4 days | Define versioned Fabric document JSON; repair save/load; fix canvas lifecycle and typed command API. |
| **3. Authentication & data** | 2–4 days | Add auth UI, profile trigger/onboarding, RLS integration tests, and document/version tables. |
| **4. Core workflow** | 3–5 days | Convert PDF extraction into canvas text objects, enforce upload rules, add failure states, and verify export. |
| **5. Activity delivery** | 2–4 days | Make randomization deterministic, test generated schemas, and produce a real multipage lesson pack. |
| **6. Alpha hardening** | 3–5 days | E2E coverage, AI rate limits, observability, accessibility/print QA, README, and deployment runbook. |

*Effort is directional and assumes one experienced full-stack developer with access to Supabase and Google AI configuration. Discovery may change estimates, especially around Fabric lifecycle and PDF/OCR fidelity.*

### External handoff checklist

- Share the exact commit/branch plus a patch or branch containing the uncommitted audio work if it should be reviewed.
- Provide a sanitized .env.example and service-access matrix; never send live secret values in the handoff document.
- Export the current Supabase schema as versioned migrations and document how user profiles are created.
- State which Google models are approved and available in the target project; replace preview model assumptions with a supported model policy.
- Provide three acceptance fixtures: a text PDF, a scanned PDF, and a representative worksheet expected output.
- Agree on the canonical editor architecture and whether Tiptap remains in scope.
- Define the alpha acceptance journey and do not count placeholder navigation or cover-only exports as complete capabilities.

> **Recommended first milestone**  A new teacher can authenticate, ingest a text PDF, see the extracted text on the Fabric canvas, edit it manually and with CECRL AI, save it, reopen it from the library, and export a correct A4 PDF—under automated end-to-end test.

---

## Appendix A — Evidence map

| **Topic** | **Primary evidence** | **Supports** |
| --- | --- | --- |
| **Product intent** | prd.md | Target user, desired ingestion/editor/AI/export architecture, and roadmap. |
| **Dependencies and scripts** | package.json / package-lock.json | Framework versions, editor/AI/PDF/audio libraries, build/lint scripts. |
| **Routes** | src/app/\*\*/page.tsx | Dashboard, editor, ingest, activities, and local audio page. |
| **Canvas** | src/components/editor/CanvasEditor.tsx | Fabric lifecycle, object tools, history, templates, AI commands, PDF export. |
| **State** | src/lib/store/useEditorStore.ts | Legacy HTML content and active canvasJSON coexistence. |
| **AI UI** | src/components/layout/ChatSidebar.tsx | Text/edit/image/level modes and global canvas command bridge. |
| **Server actions** | src/app/actions/\*.ts | Gemini/Imagen calls, activity generation, CECRL rewrite, raw PDF extraction. |
| **Activities** | src/components/activities/\*.tsx | Six printable classroom renderers. |
| **Persistence** | src/lib/supabase/client.ts; editor page; DocumentList.tsx | Client construction, save snapshot, recent-file list/load. |
| **Database** | supabase_schema.sql | profiles/documents tables and RLS policies. |
| **Audio — local** | src/components/audio/AudioTrimmer.tsx | Waveform region selection, playback, Web Audio trimming, WAV export. |
| **Configuration** | .env.local names; next.config.ts | Required variable names and 10 MB server-action body limit. |

## Appendix B — Status definitions

| **Label** | **Meaning** |
| --- | --- |
| **Available** | Implemented UI and core code path exist without an identified structural break. |
| **Conditional** | Implementation exists but requires external credentials/model/service state not verified in this review. |
| **Partial** | Some implementation exists, but the promised end-user outcome is incomplete or disconnected. |
| **Placeholder** | Visible navigation or presentation exists without the destination capability. |
| **Local only** | Present in the inspected working tree but not committed to the shared main branch. |
| **Not implemented** | Described in the product brief but no meaningful code path was found. |

## Appendix C — Assessment limits

- No production deployment, production logs, live database content, or analytics were inspected.
- No live Google AI request was made because GOOGLE_API_KEY was not present locally and model access/cost behavior was outside the review’s mutation scope.
- No end-to-end browser test was run because the production build and root layout are blocked by the Supabase key-name mismatch. UI capability claims are based on code-path review and are qualified accordingly.
- Dependency advisory counts are time-sensitive and reflect the npm registry response on 20 August 2026.

*End of report*
