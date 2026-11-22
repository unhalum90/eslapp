# Interactive Studio
## Product Requirements Document — v2.0
### A classroom-first interactive lesson engine for *Atelier de séquences*

**Host platform:** *Atelier de séquences — Anglais · Collège* (`eslapp.vercel.app`)  
**Status:** Proposed product specification; platform assumptions require repository validation.  
**Primary audience:** Product owner, implementing developer, and pilot ESL teachers.  
**Document purpose:** Define a stronger, buildable replacement for the classroom workflows currently served by Genially—not reproduce its entire feature set.

> **Product promise:** Turn an existing lesson page, image, map, or audio clip into an accessible, interactive English activity; present it confidently in class; share it without student accounts; and reuse it without rebuilding it.

---

## 1. Executive Summary

Interactive Studio is a native authoring and playback environment inside *Atelier de séquences*. It connects lesson assets to classroom interactions: listening hotspots, vocabulary support, progressive reveals, short questions, and—after the core is proven—branching missions and escape games.

The strategic advantage is **workflow continuity**, not feature parity. Teachers should not need to download a trimmed clip, upload it into another platform, rebuild an activity, and manage a separate subscription. The Studio should bring existing assets into one reusable lesson document, while retaining a direct-upload fallback wherever an integration is unavailable.

The product must be strong in three places simultaneously:

1. **Preparation:** A teacher can create a useful activity quickly from materials they already have.
2. **Classroom delivery:** The same activity works on a laptop, supported tablet, and projected smartboard without fragile controls or unexplained failures.
3. **Reuse and distribution:** Drafts, published lessons, media, and student-session state remain separate, predictable, and recoverable.

“Zero license cost” means no additional mandatory third-party authoring subscription. It does **not** mean zero hosting, storage, maintenance, media-processing, or optional AI-generation cost.

### Product principles

- **Classroom reliability before visual novelty.** Saving, audio, sharing, and accessible interaction take priority over animation effects.
- **A complete teaching loop before more widgets.** Author → preview → publish → teach → adapt must work end to end.
- **Progressive disclosure in the editor.** Teachers begin with a guided template; advanced controls remain available without dominating the interface.
- **One source, two teaching contexts.** Projected teaching and independent student work use the same published content with different player controls.
- **Accessible alternatives are part of the activity.** Essential tasks cannot depend solely on hover, dragging, color, sound, or spatial layout.
- **Anonymous by default; deliberate publication.** No student identity or speech collection in the initial release.
- **Honest offline claims.** “Ready offline” is a verified package state, not a synonym for having opened a page once.

---

## 2. Outcomes, Positioning, and Non-Goals

### 2.1. The job to be done

> When I already have a textbook page, cultural image, or listening clip, help me turn it into a clear, scaffolded classroom activity in minutes, without switching tools or rebuilding assets.

The first release proves this job through a signature **Listen → locate → respond** workflow. A town map, for example, becomes a listening activity: students hear directions, identify a destination, receive a useful hint, replay the audio, and continue.

Teachers can attach an objective, success criterion, optional scaffold, and teacher notes. These guide authoring but do not become compulsory administrative fields. Teacher notes remain private and are excluded from public publication payloads.

### 2.2. Success measures

These are **provisional pilot targets**, not measured results or contractual service guarantees. Establish a baseline using comparable activities in the current workflow, and report participant count, device/network conditions, first-use versus experienced use, and whether prepared media was supplied.

| Outcome | Proposed measure | Initial target or evaluation rule |
|---|---|---|
| Faster preparation | Active time to create and publish a supplied page with two labelled audio hotspots and one question | Median ≤10 minutes after onboarding; report media preparation separately |
| Independent authoring | Pilot teachers completing that task without facilitator intervention | ≥80%; log the step at which assistance was needed |
| Classroom access | Attempted opens reaching a usable player on the supported test matrix | ≥95%; retain network failures in the reported denominator |
| Reliable preservation | Latest confirmed draft recovered after refresh | All save/recovery acceptance fixtures pass |
| Repeat value | Eligible pilot teachers reusing or adapting a lesson within four weeks | Measure before setting a numerical target |
| Accessibility | Completion of supported interactions using keyboard and the alternative content view | Required release gate, not an optional score |

Clicks, replays, puzzle completion, and time-on-task are not evidence of improved English attainment. Learning-effect claims require separate, aligned assessment and evaluation.

### 2.3. Explicit non-goals

The initial release is not a general design suite, LMS, collaborative whiteboard, high-stakes assessment system, student-recording platform, or full Genially importer.

It does not include arbitrary JavaScript, arbitrary website embeds, live multiplayer games, leaderboards, collaborative editing, unrestricted animation timelines, offline editing, or automatic reconstruction of existing Genially interactions.

---

## 3. Users and End-to-End Workflows

### 3.1. Teacher as creator

The primary creator teaches English in French *collège* (`6e`–`3e`), often with limited preparation time and mixed-proficiency classes. The editor defaults to French interface labels while allowing English or French instructional content.

**Core workflow:**

1. Choose a guided template or blank document.
2. Add a page image, supported PDF-derived background, or existing platform asset.
3. Place and label hotspots; attach audio, vocabulary support, or a short modal.
4. Add a response prompt and explanatory feedback where appropriate.
5. Preview using the actual player, including projected and narrow-screen views.
6. Resolve blocking publication issues; explicitly publish.
7. Copy the lesson link or display its QR code.
8. Duplicate and adapt the lesson for another class without altering the published original.

### 3.2. Teacher as classroom presenter

**Core workflow:** Open a published lesson → enter classroom mode → verify audio → present → reveal answers when ready → reset for the next group.

Classroom mode offers oversized player controls, fullscreen where supported, an audio test, interactive-element highlighting, and a clear reset action. It must distinguish **teacher preview/override** from ordinary student progression.

Teacher-only overrides require authenticated author access. Hiding an override button in an anonymous player is not authorization.

### 3.3. Student as anonymous player

**Core workflow:** Open the link or QR destination → read concise instructions → activate a labelled interaction → listen/read → respond → receive feedback and retry → continue → see an explicit completion state.

There is no student-account prompt, automatic microphone request, or assumption that a learner already understands hotspot conventions. Exploration and required responses are visually distinguishable.

The initial player does not report individual attainment to a teacher dashboard. Student responses and progression remain in session memory by default.

### 3.4. Adaptation rather than duplication of effort

A teacher can duplicate a lesson or page and change scaffolds, vocabulary, or question difficulty while retaining approved media references and accessibility content. Editing the duplicate must not mutate the source lesson or its published version.

---

## 4. Scope and Priority Contract

**P0 — Core release:** Required to ship a reliable author–publish–learn–reuse loop.  
**P1 — Classroom expansion:** Added after the core passes pilot and release gates.  
**P2 — Advanced capabilities:** Separate epics, requiring their own prototype, privacy/accessibility review, and estimate.

| Capability | Priority | Delivery boundary |
|---|---|---|
| Multi-page canvas; text, images, basic shapes, labelled hotspots | P0 | Fixed logical coordinates; constrained, predictable formatting |
| Selection, move/resize, layer ordering, lock, duplicate, alignment, undo/redo | P0 | No full graphic-design suite |
| Tooltip, modal, page navigation, audio, reveal/hide | P0 | Declarative actions; keyboard activation equivalent |
| Single-choice question with feedback and retry | P0 | Formative practice; no grades or server scorebook |
| Draft save/recovery, preview, immutable publish, unpublish, link/QR | P0 | Includes permissions and public-asset safety |
| Direct image/audio upload; shared asset interface | P0 | Existing module bridges enabled only after validation |
| Smartboard-compatible player, audio controls, hotspot hints | P0 | Freehand annotation is not required |
| Multi-select/grouping, richer layout presets, additional quiz types | P1 | Expand only on a stable document/runtime model |
| Audio Trimmer and Ingest PDF bridges | P0 target | Audit dependency; direct-upload fallback must preserve core usability |
| Branching missions, code gates, mission tracker | P1 | Puzzle mechanics, not protected access |
| Flashcards; keyboard-equivalent matching/dropzones | P1 | No essential drag-only interaction |
| Prepared offline playback | P1 | Supported snapshot/media bundle only |
| Live annotation, scratch reveal, timer/dice/spinner widgets | P2 | Classroom utility pack, independently testable |
| Dialogue Builder embed adapter | P2 | Read-only, allowlisted component contract |
| Student Speaking recording/submission | P2 | Separate consent, access, retention, deletion, and offline policy |
| Standalone HTML export; advanced animation; custom page sizes | P2 | Separate compatibility and distribution requirements |

**Scope rule:** If schedule pressure forces a cut, remove advanced widgets before reducing saving, permissions, publication isolation, accessibility, or audio reliability.

---

## 5. Authoring Experience

### 5.1. Editor structure

The editor uses five stable regions:

- **Left:** Page filmstrip with add, duplicate, reorder, and rename.
- **Center:** Canvas, zoom controls, and page boundary.
- **Right:** Contextual inspector with Content, Interaction, Appearance, and Accessibility tabs.
- **Top:** Title, save state, undo/redo, preview, publish, and classroom launch.
- **Asset drawer:** Uploads and validated platform integrations.

An object must have a discoverable layer name. Invisible hotspots remain visible and selectable in the editor, even when visually transparent in playback.

### 5.2. Canvas contract

The default page is **1280 × 720 logical units, 16:9**. Layout uses document coordinates, not the current browser viewport. Other presets, such as 4:3 and A4 portrait, are introduced after compatibility testing; custom dimensions are deferred.

The renderer scales proportionally without changing authored geometry. Narrow-screen playback also provides pan/zoom and an equivalent linear content view; shrinking the page alone is insufficient.

Required P0 controls:

- Move and resize supported objects; rotate appropriate images/shapes.
- Preserve aspect ratio when requested; align and snap with visible guides.
- Set stacking order, opacity, and editing locks.
- Duplicate/delete objects and pages; preserve action validity or flag broken references.
- Undo/redo completed editing transactions, not every pointer movement.
- Support keyboard selection and movement, including a layer-list route to otherwise hidden objects.

Canvas lock and gameplay behavior are separate properties. An editor-locked object is not automatically a player drop target or draggable object.

### 5.3. Save and recovery

Autosave starts shortly after an editing transaction; a two-second idle debounce is an initial tuning value. The UI explicitly displays **Saving**, **Saved**, **Unsaved**, **Offline**, **Conflict**, or **Save failed** as applicable.

The latest confirmed server revision is authoritative. Local recovery may preserve unsent changes, but it is not proof of a successful save. Multiple tabs or stale revisions must trigger conflict handling rather than silent overwrite.

Undo history is session-level authoring history, not a backup or publication-version system. Leaving with unconfirmed changes produces a warning where the browser supports it.

---

## 6. Interactivity and Player Behavior

### 6.1. Trigger model

The primary trigger is **Activate**: pointer tap/click or equivalent keyboard activation. Optional hover/focus previews can reveal supplementary hints, but cannot be the only path to essential content, navigation, or audio.

An element may have an ordered list of actions. This enables “stop narration → reveal feedback → navigate” without allowing author-supplied code.

### 6.2. Supported actions

| Action | Author controls | Runtime contract |
|---|---|---|
| Tooltip / `Étiquette` | Short rich text, optional image/audio | Works through activation and keyboard; dismissible |
| Modal / `Fenêtre` | Small/medium/large overlay, sanitized content | Focus enters the dialog, remains managed, and returns to the activating control |
| Navigate / `Aller à la page` | Explicit target page; editor conveniences for next/previous | Stable page IDs; respects configured progression rules |
| Audio / `Audio` | Asset, label, transcript, optional stop policy | User-initiated; play/pause/replay; one narration channel by default |
| Visibility / `Afficher–masquer` | Show, hide, or toggle selected targets | Changes session state only; reset restores the authored initial state |
| External link | Approved `https` destination | Clearly marked external; protected new-tab behavior; disallowed schemes rejected |
| Spotlight / zoom | Target region and optional return position | P1; respects reduced motion and provides a reset-view control |

External links may be implemented after the core five actions but must follow the same publication validation rules.

### 6.3. Deterministic runtime semantics

- Actions execute in authored order. Navigation terminates the current page's remaining action sequence.
- A modal-opening action suspends its action sequence until the modal closes; closing restores focus before later actions continue.
- Audio actions start playback without waiting for the clip to finish. Starting another narration clip stops the current one; leaving a page stops page-scoped audio.
- A failed required action produces a recoverable message and stops that sequence, rather than silently granting completion.
- Reveals, answers, attempts, and unlocked missions never modify authored document data.
- Page changes cancel page-scoped animations and pending interaction work.
- Reset clears the current learner session after confirmation when meaningful work would be lost.
- The interpreter has bounded action execution and rejects unsupported or malformed actions.

Preview uses the same renderer and interpreter as the published player. “Works in the editor” is not sufficient acceptance.

### 6.4. Navigation modes

**Linear:** Standard previous/next controls, with clear beginning and completion.  
**Exploration:** Learners navigate through explicit links; hidden pages are omitted from the filmstrip/navigation menu but may still be reachable by actions.  
**Mission:** P1 mode with explicit conditions, progress feedback, and a tested path to completion.

A hidden page is a navigation convention, not confidential content. Any public snapshot content may be inspected or copied.

### 6.5. Audio and text-to-speech

Audio is a first-class teaching interaction. Every instructional clip supports a meaningful label and transcript or an approved equivalent accessible route. Transcript visibility can be scaffolded, but an accommodation route must remain available.

Browser playback restrictions are handled through an explicit initial user action; audio must not depend on autoplay succeeding. A failed or unavailable clip displays a fallback rather than an inert button.

Quick teacher microphone recording and browser TTS are P1 candidates. Browser voice/accent availability must be tested and cannot be guaranteed across devices. Paid or network-generated AI voices are optional services, not an assumed zero-cost fallback.

Providing a transcript changes the conditions of a listening task; do not represent supported performance as unaided listening assessment.

---

## 7. Pedagogical and Gamification Expansion

### 7.1. Formative questions

P0 single-choice questions include a prompt, answer options, correct answer, teacher-written feedback, retry policy, and optional completion action. Incorrect responses should offer explanation or a scaffold, not merely a red state or punitive sound.

P1 adds true/false, short answer, image ordering, and matching when their accessible interaction equivalents are ready. Short-answer checking uses explicit accepted variants and teacher-configurable normalization. Case and whitespace rules must be visible; spelling or punctuation differences must not be ignored indiscriminately in a language-learning task.

Scoring is optional and formative. Completion does not imply mastery, and no initial student gradebook is promised.

### 7.2. Mission tracker and escape mechanics

Mission conditions use a constrained declarative model: `all`, `any`, element visited, activity completed, or gate solved. The teacher explicitly chooses what counts as progress.

Opening a clue is not automatically equivalent to answering a question correctly. Unlocks are monotonic within a session unless the teacher explicitly configures a resettable state.

Required mission UX:

- Visible progress such as “3 of 5 clues found.”
- Clear locked-button explanation rather than an unexplained disabled control.
- Author preview showing dependencies and possible dead ends.
- Warnings for missing targets, circular dependencies, and apparently unreachable pages; author testing remains necessary where static checks are inconclusive.
- Authenticated teacher preview bypass that cannot be invoked as a privileged action by public viewers.

PIN/keyword gates are puzzle devices only. Browser-visible codes and answers are not security controls or suitable protection for sensitive material.

### 7.3. Matching, flashcards, and classroom widgets

Matching/dropzones support multiple valid targets where authored, clear retry feedback, and a non-drag route such as select item → select destination. They cannot require precise motor control or color-only feedback.

Flashcards pair image/English/audio content with an example, definition, or translation. They support keyboard activation and a reduced-motion alternative to 3D flipping.

Scratch reveal, annotations, countdown timers, dice, and random topic spinners remain later utilities. Prefer topic/vocabulary lists over publishing student-name lists. Annotation is transient by default and is not silently saved into the source lesson.

### 7.4. Initial template set

Templates are small, editable teaching routines—not separate engines:

1. **Listen → locate → respond:** Town map and directions.
2. **Explore → read → check:** Cultural image or country map.
3. **Notice → predict → reveal:** Grammar or visual inference.
4. **Read → choose → explain:** Short reading and feedback.
5. **Find clues → unlock:** P1 escape-game starter.

Each template includes clear instructions, accessibility guidance, and editable scaffolds appropriate to `6e`–`3e`. It does not claim curriculum alignment without a separate review.

---

## 8. Ecosystem Integration Contracts

The named platform modules are **reported integration opportunities, not verified APIs**. Audit existing code, ownership, asset storage, authentication, and save conventions before selecting implementation paths.

| Integration | Desired handoff | Boundary and fallback |
|---|---|---|
| Audio Trimmer | Select a saved clip, duration, transcript, and provenance | Reference a stable media asset/version; upload a clip if the bridge is unavailable |
| Ingest PDF | Select a page or crop as a background | Preserve page/crop provenance; upload a prepared image if unavailable |
| Dialogue Builder | Reuse a supported read-only dialogue block or exported assets | Adapter contract; no arbitrary iframe or undocumented internal component dependency |
| Student Speaking | Offer a speaking task within an activity | Deferred until collection and privacy policies are approved |
| Recent Files | Show owned Studio drafts and publications with type/status | Reuse host navigation conventions after audit; never expose student sessions |

An asset picker must return structured identity and metadata, not just an expiring URL. Reusing a source asset does not automatically authorize it for public distribution.

Imported PDF pages are image-backed lesson surfaces. They do not become editable textbook text or automatically accessible reading material. Supply equivalent text/instructions for essential learning content.

---

## 9. Proposed Technical Architecture

### 9.1. Architecture boundaries

```text
Existing platform auth, navigation, and media services [validate]
                         │
                  Asset adapters
                         │
Studio editor ─── Versioned document schema ─── Validation
     │                    │                         │
Draft persistence   Shared page renderer     Publication service
+ local recovery          │                         │
                          └──── Action interpreter ─┤
                                                   │
                                  Anonymous published player
                                                   │
                                  Prepared offline package [P1]
```

Build one shared page renderer and a separate bounded action interpreter. The editor adds selection/manipulation overlays; the player adds navigation, accessible controls, and session state. Do not ship the full editor bundle to anonymous players.

### 9.2. Candidate stack, subject to a risk prototype

- **Rendering:** React DOM for semantic text, controls, and supported components; SVG for suitable shapes and visual overlays. Avoid treating an inaccessible flattened canvas as the only player surface.
- **Editor transforms:** A library such as `react-moveable` for resizing, rotation, and alignment. Verify text geometry, scaling, touch behavior, and library compatibility before adoption.
- **List and palette drag:** A library such as `dnd-kit` for page/layer ordering and selected interaction patterns. Do not let competing libraries own the same pointer gesture.
- **Client state:** Zustand or the host's established store. An undo middleware such as `zundo` is a candidate for authoring transactions, not persistence or version history.
- **Animation:** Declarative CSS or an animation library compatible with the repository. Begin with appear/fade and hotspot pulse; obey reduced-motion settings.
- **Storage:** Host database and object storage after audit. Supabase/Postgres is a candidate, not a confirmed existing dependency.
- **Local recovery/offline:** IndexedDB plus a versioned service worker where supported. Neither replaces server authorization or publication policy.

Media rendering/transcoding that exceeds the verified deployment environment's limits belongs in an asynchronous processing path, not a long-running request to the player or editor.

### 9.3. State separation

| State | Contents | Lifetime |
|---|---|---|
| Author document | Pages, content, assets, actions, authored defaults | Saved draft and explicit revisions |
| Editor UI | Selection, zoom, inspector, temporary gestures, undo stack | Editing session |
| Published snapshot | Validated learner-visible content and pinned assets | Immutable publication version |
| Player session | Answers, reveals, visited/completed IDs, gate state | Session memory by default |
| Local recovery | Unsent draft changes and last known revision | Controlled local recovery lifecycle |

Optional learner resume is later functionality, off by default on shared classroom devices. If enabled, it must be namespaced by publication version and have explicit reset/expiry behavior.

### 9.4. Document and runtime compatibility

Version both the document schema and runtime behavior. Validate at import, save, publish, and load. Test migrations with fixtures. Unsupported versions show a useful compatibility message rather than partially executing an activity.

Drafts may migrate through tested transformations. Existing publications must retain compatible behavior or be explicitly republished; a deployment must not silently change answers, navigation, or unlock semantics.

---

## 10. Domain Model and Schema Direction

Use stable IDs, typed content, asset references, and a discriminated action model. Avoid `Record<string, any>` as the primary document contract.

The following is an **illustrative P0 schema slice**, not drop-in implementation. Full schema validation, media metadata, migrations, animation properties, server authorization, and P1 widgets require separate definitions.

```typescript
type Id = string;
type Level = '6e' | '5e' | '4e' | '3e';

type RichText = {
  format: 'sanitized-rich-text-v1';
  value: string;
};

type AssetRef = {
  assetId: Id;
  version: string;
};

type Action =
  | { type: 'tooltip'; content: RichText }
  | { type: 'modal'; content: RichText; size: 'small' | 'medium' | 'large' }
  | { type: 'navigate'; pageId: Id }
  | { type: 'playAudio'; asset: AssetRef }
  | { type: 'stopAudio' }
  | { type: 'setVisibility'; elementIds: Id[]; mode: 'show' | 'hide' | 'toggle' }
  | { type: 'externalLink'; url: string };

type ElementContent =
  | { type: 'text'; content: RichText }
  | { type: 'image'; asset: AssetRef; alt: string }
  | { type: 'shape'; shape: 'rectangle' | 'ellipse'; fill: string }
  | { type: 'hotspot'; label: string; icon: string; showHint: boolean }
  | { type: 'audio'; asset: AssetRef; label: string; transcript: string }
  | {
      type: 'singleChoice';
      prompt: string;
      options: { id: Id; label: string }[];
      correctOptionId: Id;
      correctFeedback: string;
      retryFeedback: string;
      allowRetry: boolean;
    };

type CanvasElement = {
  id: Id;
  name: string;
  frame: {
    x: number; y: number; width: number; height: number;
    rotation: number; zIndex: number;
  };
  lockedInEditor: boolean;
  initiallyVisible: boolean;
  content: ElementContent;
  interactions: {
    trigger: 'activate' | 'hoverOrFocus';
    actions: Action[];
  }[];
  accessibility: {
    label: string;
    readingOrder: number;
    decorative: boolean;
  };
};

type StudioDocument = {
  schemaVersion: number;
  id: Id;
  title: string;
  level?: Level;
  sequenceId?: Id;
  logicalSize: { width: number; height: number };
  settings: {
    navigationMode: 'linear' | 'exploration';
    showInteractiveHints: boolean;
  };
  pages: {
    id: Id;
    name: string;
    hiddenFromNavigation: boolean;
    background:
      | { type: 'color'; value: string }
      | { type: 'image'; asset: AssetRef };
    elements: CanvasElement[];
  }[];
};

type DraftRecord = {
  ownerId: Id;
  revision: number;
  updatedAt: string;
  privateTeacherNotes?: string;
  document: StudioDocument;
};

type PublishedSnapshot = {
  publicationId: Id;
  version: number;
  schemaVersion: number;
  runtimeVersion: string;
  createdAt: string;
  document: StudioDocument; // learner-visible fields only
  assets: {
    ref: AssetRef;
    digest: string;
    mimeType: string;
    byteSize: number;
  }[];
};

type PlayerSession = {
  publicationId: Id;
  publicationVersion: number;
  currentPageId: Id;
  visitedElementIds: Id[];
  completedActivityIds: Id[];
  visibilityOverrides: Record<Id, boolean>;
  answers: Record<Id, string>;
};
```

Frame values, IDs, URLs, text size, action counts, and references require runtime validation. `RichText` is a declaration of permitted formatting, not permission to execute HTML. Essential hotspot audio also needs accessible text through the validated content model.

The published record excludes private notes, ownership internals, unused private assets, and editor-only recovery data. Answer keys included for client-side formative checking are inspectable; do not market them as secret.

---

## 11. Persistence, Publication, and Sharing

### 11.1. Publication lifecycle

1. A teacher edits a private draft.
2. Publish validates the document and resolves a complete asset manifest.
3. The publication service authorizes and pins only assets selected for that publication.
4. A new immutable snapshot becomes available only when both document and asset manifest are ready.
5. Draft edits do not alter the published snapshot.
6. Republish creates a new version. A stable lesson link resolves to the latest active version; a pinned-version link supports reproducible delivery.
7. Unpublish blocks new online loads according to the documented cache/revalidation policy.

Publication status and unsaved edits must be visible together: for example, **Published v3 · Draft has unpublished changes**.

The player checks active publication status on new online session loads. Do not store revocable publication responses in public caches without a tested revocation design.

### 11.2. Permissions

| Actor | Private drafts/assets | Publish/unpublish | Published lesson |
|---|---|---|---|
| Owner | Read/write owned content | Yes | Yes; authenticated classroom controls |
| Another teacher | No, unless a future explicit sharing grant exists | No | Public playback if the lesson is published |
| Anonymous viewer | No | No | Active published snapshots and their approved assets only |

Enforce this server-side and at database/storage boundaries. Apply the same restrictions to thumbnails, metadata, exports, and indirect asset endpoints.

A random or unlisted lesson URL is a convenience, not private access control. If restricted student access is required later, design it as a separate authenticated distribution mode.

### 11.3. Asset retention and deletion

Deleting or modifying a working asset must not break a retained publication. The implementation may pin immutable media versions or create publication-safe copies, provided access and retention remain explicit.

Unpublishing is not the same as deleting all retained media. Project deletion must disclose which drafts, publications, and shared asset references will be removed. Exports and already downloaded copies cannot be recalled.

---

## 12. Privacy, Security, and Accessibility

### 12.1. Student privacy defaults

- No names, accounts, microphone collection, advertising, or third-party behavioral tracking in P0.
- Responses stay in player memory by default; no learner-answer telemetry.
- Collect only minimal operational logs necessary to diagnose failures. Logging fields, access, and retention must be approved before release; redact lesson content and sensitive payloads.
- Public sharing requires an explicit reminder to check student information, copyrighted material, and distribution rights.
- Recording/submission features cannot launch without an approved consent or other appropriate legal-basis workflow, access control, retention, deletion, and safeguarding review.

This PRD establishes privacy requirements; it is not a claim of GDPR or other regulatory compliance. The relevant school/platform review remains a release dependency.

### 12.2. Untrusted content

Validate upload type, size, and decoding behavior. Sanitize supported rich text and reject executable HTML. Reject or safely process scriptable formats such as SVG; do not pass uploads directly into public rendering.

Reject unsafe URL schemes. Future embeds require a provider allowlist, constrained iframe permissions, content-security policy, explicit loading, and an unavailable/offline fallback. Arbitrary embeds are not P0.

No public response may contain private storage credentials, broad asset grants, unpublished teacher notes, or unrelated media references.

### 12.3. Accessibility contract

Target WCAG 2.2 AA for the supported player surface, subject to formal testing. Do not claim conformance solely from a DOM-based renderer or library selection.

Required behavior includes:

- Keyboard access and visible focus for all supported interactions.
- Meaningful labels, reading order, and managed modal focus.
- Equivalent linear content/task view for essential spatial information.
- Instructional audio transcripts or an approved equivalent route.
- No hover-only, drag-only, color-only, or sound-only completion requirement.
- Adequate contrast, readable controls, and reduced-motion behavior.
- At least 44 × 44 CSS-pixel activation targets in the scaled player, using an interaction hit area where the authored graphic is smaller. Avoid overlapping invisible hit areas.

Pan/zoom gestures must not accidentally activate hotspots. Player controls remain reachable during zoom. Screen-reader testing covers the content route and the activity, not only navigation chrome.

---

## 13. Offline Classroom Resilience and Export

### 13.1. Prepared offline playback — P1

“Prepare for class” downloads a validated publication snapshot and its supported media. The UI reports package size, progress, failures, and one of **Not prepared**, **Preparing**, **Ready offline**, or **Needs repair/update**.

Offline readiness requires successful storage and integrity checks for the complete supported asset manifest. The player must be tested by disconnecting, closing/reopening the app as supported, and replaying the prepared lesson—not just rendering a cached shell.

Required package behavior:

- Versioned manifests and cache names.
- Storage-budget checks and clear eviction behavior.
- Interrupted-download retry without falsely reporting readiness.
- Explicit identification of unavailable features.
- A way to remove downloaded lessons and local session data.
- Playback of a pinned version until the teacher deliberately updates it.

Offline support excludes remote embeds, uncached media, live submissions, network TTS, and other server-dependent features. Browser storage can be evicted; preparation cannot guarantee permanent availability.

Do not promise “0 ms audio.” A provisional performance target is ≤500 ms from activation to playback start for prepared local clips on the declared reference device; measure browser/media startup and handle failure.

### 13.2. Standalone HTML export — P2

Portable export is a separate product capability, not an automatic result of PWA support.

Before release, define and test a support matrix for `file://` playback, bundled runtime/fonts/media, maximum package size, browser media APIs, and restrictions on external components. Large Base64 payloads may be unsuitable; a ZIP package may be a better option if the tested distribution context supports it.

Unsupported features must block export or be explicitly omitted with a clear report. An exported file must not require hidden network calls to function as advertised.

Teachers are warned that exported copies are portable and non-revocable. ENT/Pronote upload and execution behavior must be tested in the actual target environment; those platforms may not accept or run active HTML packages.

---

## 14. Existing Genially Migration

The practical migration strategy is **preserve the visual source, then reconstruct selected high-value interactions**.

1. Inventory the lessons worth retaining; prioritize recurring classroom use rather than migrating everything at once.
2. Export source materials only through options available and permitted by the teacher's current plan and applicable rights.
3. Import supported PDF pages or images as locked Studio backgrounds.
4. Recreate labelled hotspots, audio, reveals, and navigation using a guided migration template.
5. Add text alternatives and transcripts where image-based source material lacks them.
6. Preview, validate, publish, and archive the source/provenance record.

A PDF or screenshot does not preserve original animations, hidden answers, action graphs, or accessible text. Existing HTML packages are not assumed to be editable or directly importable.

“Import to Studio” should report imported page count and unsupported content, rather than imply lossless conversion. Initial migration is assisted reconstruction, not an automatic Genially-to-Studio converter.

---

## 15. Performance, Compatibility, and Operations

### 15.1. Initial test envelope

These values are provisional engineering budgets to validate against real teaching materials, not proven platform capacity.

| Area | Initial reference envelope |
|---|---|
| Logical page | 1280 × 720, 16:9 |
| Lesson size | Up to 20 pages, 50 elements per page |
| Prepared media bundle | Target ≤50 MB; warn before unusually large publication/download |
| Individual image | Target ≤5 MB after optimization, preserving useful readability |
| First usable online page | Target ≤3 seconds with ≤2 MB initial page payload on a declared reference network/device |
| Editor responsiveness | Move/resize remains responsive at the reference element budget; measure frame stalls |
| Prepared local audio start | Target ≤500 ms on the reference device |

Exceeding a recommended budget must produce a warning, not silent corruption. Set hard validated limits for imports, uploads, and runtime action counts before launch.

### 15.2. Supported device matrix

Freeze specific browser/OS versions during Gate 0. The proposed minimum includes a representative Windows classroom laptop with a Chromium browser, a teacher desktop browser, and an iPad/Safari tablet.

Test touch, keyboard, modal focus, scaling, audio policies, fullscreen limitations, storage behavior, and offline reopening on actual target devices. Do not claim universal browser or smartboard support.

### 15.3. Operational readiness

Before production release, identify ownership for incident response, media failures, migrations, backups, and deletion requests. Exercise database/media restore procedures and deployment rollback.

Error reporting records safe technical context, not student answers, teacher notes, or full document payloads. Monitor editor-save failures, publish failures, missing assets, player load failures, and audio-start failures separately.

A failed publish leaves the prior publication intact. A failed deployment must have a tested rollback path compatible with persisted document versions.

---

## 16. Release Acceptance Tests

| ID | Scenario | Required pass condition |
|---|---|---|
| AT-01 | Complete authoring loop | Teacher creates a supplied page with two labelled audio hotspots and one question, previews, publishes, and opens the anonymous learner link |
| AT-02 | Save and recovery | Refresh restores the latest confirmed draft; failed saves remain visibly unsaved and recoverable |
| AT-03 | Concurrent editing | A stale tab cannot silently overwrite a newer server revision |
| AT-04 | Preview parity | Geometry, text layout, layers, and actions agree between preview and publication on the supported matrix |
| AT-05 | Publication isolation | Draft changes/deletion do not alter a retained snapshot; republishing produces a distinct version |
| AT-06 | Access control | Cross-owner draft reads/writes fail; anonymous viewers cannot retrieve private assets or teacher notes |
| AT-07 | Unpublish | New online loads are blocked within the documented revalidation boundary; limitations for loaded/offline copies are stated |
| AT-08 | Keyboard and screen reader | Learner completes supported tasks, audio controls, feedback, and navigation through the accessible route without a focus trap |
| AT-09 | Tablet interaction | Pan does not trigger a hotspot; tap does; zoom does not make navigation or targets unusable |
| AT-10 | Audio | Starting clip B stops clip A; page navigation stops page audio; failed media provides a visible fallback |
| AT-11 | Formative question | Incorrect answer shows authored guidance and permitted retry; correct answer sets only learner-session completion |
| AT-12 | Runtime isolation | Reveals, answers, resets, and attempts never mutate the saved document or another session |
| AT-13 | Malformed content | Unsafe markup/URLs, broken references, oversized documents, and unsupported versions are rejected or safely handled |
| AT-14 | Reuse | Duplication preserves media and accessibility content; editing the duplicate does not change the source |
| AT-15 | Recovery operations | Migration fixtures, publication-failure recovery, backup restore, and deployment rollback pass before production |
| AT-16 | Mission logic — P1 | Progress reflects defined conditions; locked actions explain why; tested completion path has no dead end |
| AT-17 | Prepared offline — P1 | A fully prepared supported lesson reopens and plays with the network disconnected; interrupted packages are not marked ready |
| AT-18 | Portable export — P2 | Exported supported content works from the declared local-file environment without undeclared network dependencies |

P0 release requires AT-01 through AT-15 and the declared browser/security/accessibility checks. Later capabilities cannot be advertised as supported until their corresponding gates pass.

---

## 17. Gate-Based Implementation Roadmap

A four-week feature-complete production commitment is not justified by the original concept. The plan must account for the editor, media boundary, publication system, runtime, and hardening as separate responsibilities.

For one experienced full-time engineer with regular pilot-teacher access and reusable host infrastructure, **8–12 weeks is a provisional planning range for the narrowed classroom-ready core**, not a validated estimate. Gate 0 must re-estimate it. Advanced missions, prepared offline playback, speaking submissions, and export are not all included in that range.

### Gate 0 — Platform audit and risk prototypes

**Deliver:** Repository/module map; authentication/storage/deployment decisions; asset ownership contract; rendering and tablet prototype; snapshot-publication prototype; browser matrix; hard limits; confirmed P0 scope and estimate.

**Exit:** No unresolved blocker in private/public asset separation, text geometry, basic audio, or publication isolation. If a host integration is unavailable, agree its fallback before implementation.

### Gate 1 — Private vertical slice

**Deliver:** Schema/validation, minimal shared renderer, multi-page editor, labelled hotspots, core actions, single-choice block, draft persistence/recovery, undo/redo, direct upload, and real-player preview.

**Exit:** An author can create, save, reopen, and complete the reference teaching activity. Runtime state is separate from authored state.

### Gate 2 — Publish and classroom pilot

**Deliver:** Immutable snapshots, approved asset manifests, anonymous player, authenticated classroom controls, link/QR, explicit unpublish, accessibility route, and verified first-priority integrations.

**Exit:** Authorization, publication, tablet, audio, and accessibility fixtures pass. Pilot teachers teach the reference activity on supported devices; failures are recorded.

### Gate 3 — Production hardening

**Deliver:** Pilot fixes, budget enforcement, migration fixtures, safe monitoring, backup/restore, rollback, onboarding, deletion/retention behavior, and support ownership.

**Exit:** All P0 acceptance tests pass; no unresolved critical security, save-loss, publication-isolation, or accessible-completion defect remains.

### Gate 4 — Evidence-led expansion

Sequence expansion by demonstrated demand: constrained missions/quizzes → matching/flashcards → prepared offline playback → classroom utilities. Evaluate embeds, student recordings, and portable export independently.

Each expansion requires a scope definition, risk prototype, updated estimate, supported-device tests, and its own acceptance gates. A deadline is not a substitute for readiness.

---

## 18. Risks, Decisions, and Next Actions

### 18.1. Principal risks

| Risk | Mitigation |
|---|---|
| Feature parity consumes the project | Protect the reference workflow and P0 contract; reject unrelated widgets until the core is proven |
| Existing modules lack reusable APIs | Define asset adapters and retain direct-upload fallbacks |
| Draft or private assets leak through public sharing | Server-side ownership checks; validated snapshots; publication-scoped media access |
| Rich text/scaling diverges across devices | Shared renderer; constrained formatting/fonts; actual-device fixtures |
| Students cannot use a spatial or drag task | Equivalent linear route and keyboard interaction; include accessibility in template design |
| Offline claims fail in class | Explicit preparation status, package integrity checks, real disconnected reopening tests |
| Escape logic traps the learner | Declarative conditions, lint warnings, progress explanations, authored-path testing |
| Export/migration expectations exceed reality | Publish capability limits; distinguish visual reconstruction from lossless import |
| Optional AI or recording changes cost/privacy | Separate service toggles and release review; no dependency in the core teaching loop |

### 18.2. Decisions required at Gate 0

1. Is Resource Canvas a reusable foundation or only a source of selected UI components?
2. What authentication, tenant/ownership, storage, and revision mechanisms already exist?
3. Which module assets have stable IDs/versions and can be authorized for publication?
4. Which devices, browser versions, school-network conditions, and ENT delivery routes must be supported?
5. Is anonymous public/unlisted playback sufficient, or is restricted distribution a later requirement?
6. What rights review, log retention, deletion, and backup policies govern teacher-uploaded content?
7. Who can publish, who supports the product, and which pilot lessons define release success?
8. Which features are cut if the estimate exceeds available capacity?

### 18.3. Immediate execution package

The next implementation step is a repository audit followed by a small vertical slice—not a large unverified component dump.

Produce these artifacts first:

- Architecture decision record and module/asset integration map.
- Validated P0 document schema with migration and malformed-input fixtures.
- Shared page renderer and minimal action interpreter.
- One end-to-end reference lesson: town-map listening, two audio hotspots, one question, publication, and anonymous playback.
- Automated permission, save/recovery, publication-isolation, and runtime tests.
- Pilot script and frozen browser/device matrix.

> **Definition of done:** Interactive Studio is ready when a teacher can author, preserve, publish, teach, and adapt a useful accessible lesson with confidence—and when the platform can prove that private drafts stay private, published versions stay stable, and supported classroom interactions work reliably. Visual effects and game widgets strengthen that foundation; they do not replace it.
