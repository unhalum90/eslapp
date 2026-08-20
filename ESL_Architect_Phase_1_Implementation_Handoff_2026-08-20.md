# The ESL Architect — Phase 1 Implementation Handoff

**Date:** 20 August 2026  
**Audience:** Development team reviewing the work without prior repository context  
**Status:** Implemented locally and verified; database migration is included but not applied by this change  
**Scope:** Phase 1 / Phase A teacher authoring and anonymous practice distribution

## Executive summary

Phase 1 establishes the data and interaction foundation beneath the existing worksheet canvas and activity tools. A teacher can now plan a unit from its final task, organize it into up to eight sessions, reuse vocabulary from a global registry, preserve an editable decision record with restorable versions, track delivery manually by class, fork shared content for one class, create a linked year-over-year descendant, and publish anonymous practice under a permanent code and QR link.

The implementation deliberately excludes student identities, results, scores, error tracking, and AI remediation. Pair use is presented as practice rather than assessment.

The application runs in local-first mode today. Authoring data persists in versioned browser storage. A normalized Supabase migration and teacher magic-link screen are included; remote publication works after that migration is applied and an authenticated teacher session exists. Full authoring synchronization to Supabase is not yet wired.

## Delivered user capabilities

| Capability | Delivered behavior |
| --- | --- |
| Teacher workspace | A dedicated `/workspace` route is the primary dashboard action. |
| Class hierarchy | Seeded 5e A, 5e B, and SEGPA classes; teachers can add classes by level and school year. |
| Shared units | Units are visible to matching classes without duplicating content. |
| Class forks | A shared unit can be forked for one class. The fork keeps lineage, receives a new permanent code, and only exposes its linked class. |
| Year reuse | A linked descendant can be created for a new school year without carrying class progress. |
| Backward design | Each unit starts with a final task, performance type, student brief, and success criteria. |
| Session planning | Up to eight sessions, each with an objective, duration, notes, and explicit reactivation target. |
| Language planning | Unit theme and grammar requirements are editable. |
| Global vocabulary | Vocabulary is stored once and attached to units as new content or deliberate reactivation. |
| Duplicate prevention | Normalized matching blocks exact duplicates and warns about reusable or similar items. |
| Vocabulary completeness | Image, audio, French translation, and phonetic transcription produce a visible completeness percentage. |
| Accent metadata | Audio references support GB, US, AU, IE, CA, NZ, IN, and ZA accents. Audio generation itself is not part of this phase. |
| Source provenance | URLs, videos, PDFs, images, textbooks, pasted text, and official curriculum references can be recorded without copying third-party content. |
| Decision history | Constraints, choices, rejections, and notes are directly editable and can be deactivated or reactivated. |
| Time travel | Named unit checkpoints can be restored. A safety checkpoint is created before restore. |
| Manual delivery | Each linked class has independent session progress and class-only delivery notes. No student analytics are inferred. |
| Permanent distribution | Every unit owns a stable code. Publishing can be toggled off without deleting or changing that code. |
| QR distribution | The Delivery tab renders a QR code and copyable practice URL. |
| Anonymous practice | `/practice/[code]` reveals French translations on demand, supports cached audio URLs, records no identity or result, and omits teacher-only notes and decisions. |
| Teacher sign-in | `/account` offers Supabase email magic-link authentication for cross-device publishing. |

## Explicitly outside Phase 1

- Student accounts, rosters, profiles, or personal data
- Completion events, scores, assessment records, or error-pattern analysis
- Automatic class or individual remediation
- AI-generated final-task proposals or session plans
- OCR, source extraction, or editable source-to-canvas conversion
- Text-to-speech generation and audio asset hosting
- A4 worksheet generation from the new unit model
- Full Supabase synchronization of classes, units, vocabulary, runs, and revisions
- Multi-user collaboration, sharing, permissions, and audit administration

These belong to later work. Phase B should not begin until the legal and institutional approach to minors' data is approved.

## Primary routes

| Route | Purpose | Access model |
| --- | --- | --- |
| `/` | Product dashboard with Phase 1 workspace as the primary action | Teacher-facing |
| `/workspace` | Unit authoring, vocabulary, sources, history, class delivery, and publication | Teacher-facing; local-first |
| `/account` | Email magic-link sign-in for remote publication | Teacher-facing |
| `/practice/[code]` | Distraction-free vocabulary practice | Anonymous; no teacher navigation |
| `/api/practice/[code]` | Reads an active publication payload by permanent code | Anonymous read, protected by publication RLS |
| `/editor` | Existing Fabric worksheet canvas | Existing feature |
| `/activities` | Existing printable activity builder | Existing feature |
| `/ingest` | Existing resource-ingestion prototype | Existing feature; still disconnected from Fabric |
| `/tools/audio` | Separate local audio-trimmer work already present in the working tree | Existing uncommitted work |

## Technical design

### Domain model

The Phase 1 contract is defined in `src/lib/phase-one/types.ts` and covers:

- teacher classes;
- unit content and lineage;
- final tasks and session plans;
- editable decisions;
- source and curriculum references;
- a global vocabulary registry and unit links;
- class-specific delivery runs;
- restorable unit revisions; and
- a deliberately reduced anonymous-publication payload.

The public payload is built explicitly rather than serializing the authoring object. It contains the unit title/theme/level, final-task direction, session titles/objectives, and attached vocabulary. It excludes decisions, source references, curriculum notes, teacher session notes, class notes, and class progress.

### Client persistence

`src/lib/store/usePhaseOneStore.ts` uses Zustand persistence under the versioned key `esl-architect-phase-one`.

- Schema version: `1`
- Storage: browser local storage
- Revision retention: newest 150 snapshots
- Unit limit: eight sessions
- New forks and year descendants receive independent distribution codes
- Restore creates a `Before restore` checkpoint to preserve reversibility

This makes Phase 1 usable without a configured backend, but it is single-browser state. Clearing site data removes local authoring state.

### Supabase persistence contract

Migration: `supabase/migrations/202608200001_phase_one_authoring.sql`

Tables:

- `teacher_classes`
- `authoring_units`
- `class_unit_runs`
- `vocabulary_items`
- `unit_vocabulary`
- `unit_revisions`
- `unit_publications`

All authoring tables use owner-based row-level security. `unit_publications` adds a public read policy only for rows where `published = true`. The anonymous API returns only the stored reduced payload and uses `Cache-Control: no-store` so unpublishing takes effect without a stale application cache.

Only publication upsert/read is connected to Supabase in the current UI. The remaining normalized tables define the next synchronization contract and are not yet populated by the application.

### Authentication and configuration

The browser client accepts either:

- `NEXT_PUBLIC_SUPABASE_ANON_KEY`, or
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY`.

`NEXT_PUBLIC_SUPABASE_URL` is also required. If the URL or key is absent, Supabase-backed UI degrades to local-only behavior instead of crashing the production build.

### AI agent selection

Text generation now uses two explicitly selectable production agents:

- Codex Terra 5.6 (`gpt-5.6-terra`) through the OpenAI Responses API; and
- Claude Opus 4.8 (`claude-opus-4-8`) through the Anthropic Messages API.

Codex Terra is the default. The selected agent is stored per browser and is passed into each text creation, CEFR rewrite, and activity-generation request. The server verifies every request and allows only an authenticated email listed in `APP_OWNER_EMAILS` to select Claude. This protects the paid provider choice even if a client request is modified manually.

Image creation is independent of the text-agent selection. It uses Nano Banana 2 (`gemini-3.1-flash-image`) through the Google GenAI API. Google is therefore required only for image generation, not for text generation.

Required server-only variables:

- `OPENAI_API_KEY`
- `ANTHROPIC_API_KEY`
- `GOOGLE_API_KEY` (only when image generation is enabled; `GEMINI_API_KEY` is accepted as a legacy alias)
- `APP_OWNER_EMAILS` (comma-separated authenticated owner emails)

No provider key may use the `NEXT_PUBLIC_` prefix. The repository contains variable names and examples only; it does not contain live credentials.

## Verification evidence

### Automated checks

| Check | Result |
| --- | --- |
| `npm run test:phase-one` | Pass: 7 tests |
| `npm run test:ai` | Pass: 4 tests covering the default, exact model IDs, image provider, and owner-email normalization |
| Focused ESLint over all new and touched Phase 1 files | Pass: no errors or warnings |
| `npx tsc --noEmit` | Pass |
| `npm run build` | Pass; all 10 application routes generated |

The seven Phase 1 tests cover vocabulary normalization, duplicate rejection, deliberate reactivation, bounded manual progress, four-facet completeness, distribution-code format, and removal of private authoring data from the public payload.

### Live provider smoke tests

On 20 August 2026, minimal authenticated `curl` generations were run against all three configured production models. No credential values or generated image bytes were printed.

| Provider | Model | Result |
| --- | --- | --- |
| OpenAI | `gpt-5.6-terra` | HTTP 200; text output present |
| Anthropic | `claude-opus-4-8` | HTTP 200; text output present |
| Google | `gemini-3.1-flash-image` | HTTP 200; image output present |

The Google response used the current Interactions API `steps[].content[]` image shape. The server action accepts this shape as well as the SDK's documented `outputs[]` shape.

### Browser verification

The following flow was exercised against the local Next.js development server:

1. Opened `/workspace`; meaningful content rendered with no Next.js error overlay or browser console warnings/errors.
2. Saved a named unit version; the checkpoint appeared with a Restore action.
3. Entered an existing vocabulary term; the duplicate warning appeared and creation remained disabled.
4. Opened Delivery; the permanent code and QR URL rendered.
5. Confirmed no teacher session, then enabled local publication; the UI reported local-only publication.
6. Opened `/practice/LONDON`; the local publication rendered despite the unavailable remote publication table.
7. Revealed a French translation and reset the practice state.
8. Confirmed teacher decisions and notes were absent from the anonymous page.
9. Confirmed the anonymous route had no teacher sidebar or account navigation.
10. Forked the unit for 5e B; the source remained intact and the fork showed only the linked 5e B delivery record.

## Known limitations and risks

### Phase 1 limitations

1. Authoring remains local-only. Sign-in currently enables remote publication, not cross-device authoring sync.
2. The migration is checked in but was not applied to a live database during this implementation.
3. Permanent codes are randomly generated and database uniqueness is enforced only when remotely published. A rare collision is surfaced as a remote publication error and should later trigger automatic code regeneration.
4. Sources are references only; ingestion and provenance-preserving extraction are future work.
5. Audio entries accept stable cached URLs and accent metadata, but generation/storage are not implemented.
6. Practice currently consists of vocabulary reveal and audio playback; it intentionally has no scoring.
7. Local storage has no import/export or disaster-recovery workflow yet.

### Repository-wide debt outside this phase

`npm run lint` still fails with **49 errors and 6 warnings** in pre-existing code. The largest groups are legacy Fabric canvas `any` types, impure randomization in existing activity renderers, CommonJS scripts under TypeScript ESLint rules, and a synchronous state update in the canvas initialization effect. One error belongs to the separate uncommitted audio-trimmer work. None are in the new or touched Phase 1 implementation files.

The existing PDF ingest-to-Fabric path, stable canvas save/reopen contract, consolidated lesson-pack export, AI rate limits and cost controls, dependency audit findings, and CI remain unresolved from the earlier repository review. Paid AI requests now require Supabase authentication, and Claude selection additionally requires app-owner authorization.

## Run and review

```bash
npm install
npm run test:phase-one
npm run build
npm run dev
```

Review the teacher journey at `http://localhost:3000/workspace`. Use the seeded `Getting around London` unit, publish it in local mode, and open `http://localhost:3000/practice/LONDON` in the same browser.

For cross-device publication, configure Supabase, apply the included migration, enable email magic-link authentication, sign in at `/account`, and publish from the unit's Delivery tab.

## Recommended next implementation slice

1. Wire authenticated hydration and mutation of the normalized authoring tables, with an explicit local-to-remote migration strategy.
2. Add JSON export/import before relying on local storage for real teacher content.
3. Connect source ingestion to the unit model and active Fabric canvas with clear PDF/image validation.
4. Render teacher/student A4 outputs and audio QR targets from the same unit data.
5. Add CI for Phase 1 tests, typecheck, build, and scoped lint while separately paying down the legacy lint baseline.

Do not begin student tracking or remediation as an implicit extension of anonymous practice. That is Phase B and requires a separate product, legal, and institutional decision.
