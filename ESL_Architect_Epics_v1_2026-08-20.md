# The ESL Architect — Product Epics v1

**Source:** Elicitation session with the teacher, 20 August 2026
**Status:** Draft for review. Contains open questions that must be closed before build.

---

## Read this first

**Confidence markers are used throughout.** The session ran through voice transcription with significant loss, and several answers were single words ("Oui") responding to compound questions. Where I supplied an example and she agreed, that is *my* framing, not hers — and it is marked as such. Treat every `[VERIFY]` as a real risk of building the wrong thing.

| Marker | Meaning |
| --- | --- |
| `[CONFIRMED]` | She stated it clearly and unprompted, or answered an unambiguous single question |
| `[VERIFY]` | Inferred, or agreed to an example I supplied — confirm before building |
| `[OPEN]` | Asked but not answered, or never asked |

### Scope reality

The existing repository is a worksheet canvas with AI text generation and six printable activities. What she described is a **unit-authoring environment plus a student-facing learning platform with progress tracking and remediation**. Honest estimate: the current codebase covers roughly 10–15% of this vision, and the parts it covers (canvas, printable activity renderers, PDF export) sit in the middle of the stack rather than at the foundation.

This is not an argument against the existing work — the activity renderers and canvas are genuinely reusable. It is an argument against treating this as "adding features to the app." The data model has to be built underneath it first.

### The design principle that solves her actual complaint

Her original, unprompted complaint was that ChatGPT **gives her the same documents twice** because it loses the start of the conversation.

The fix is not a bigger context window or better memory prompting. The fix is that **content stops being chat output and becomes addressable data.** If every vocabulary item, document, and exercise is a row with a unit and class association, the system cannot hand her a duplicate — it can query what already exists. Memory becomes a lookup, not a recollection.

Every epic below is downstream of that decision.

---

## Phase A — Teacher authoring
*Solves her stated pain. Standalone product. No student data, no legal exposure.*

### EPIC 1 — Workspace hierarchy

**Why:** She teaches 6ᵉ, 5ᵉ, 4ᵉ, 3ᵉ and SEGPA `[CONFIRMED]`, with multiple classes per level `[CONFIRMED]` running the same content at different paces `[VERIFY — she answered "Oui" then "Non" in the same breath; I interpreted]`.

**Structure:** `Level → Class → Unit`, where unit *content* is authored once at level and *progress* is tracked per class. Duplicating a unit for a second class is a failure state, not a feature.

**Acceptance:**
- A unit authored for 5ᵉ appears in both 5ᵉA and 5ᵉB without duplication
- Each class shows independently where it has reached in that unit
- Editing shared content updates both classes; class-specific notes do not leak across

`[OPEN]` How many classes total? How many students per class? This determines whether "at a glance" views need design work.

---

### EPIC 2 — The unit model and decision record

**Why:** This is the anti-repetition machinery.

A unit contains: a final task, up to 8 sessions `[CONFIRMED — "huit maximum"]`, a vocabulary set, grammar points, source documents, exercises, and an evaluation `[CONFIRMED — "tout plus une tâche finale"]`.

Alongside it sits an **append-only decision record**: every item chosen, every proposal rejected, every constraint set. The AI reads this before generating anything and is bound by it.

**Acceptance:**
- Any AI generation call receives the current decision record as input
- Rejecting a proposal writes the rejection to the record; the same proposal is not offered again
- She can view and edit the record directly — it is not a hidden system artifact
- Asking for "another exercise on food" produces something that does not reuse already-placed items

`[OPEN]` What exactly is the "évaluation"? Formative, summative, graded out of 20? Does it need an answer key, and does the answer key need to be a separate printable?

---

### EPIC 3 — Backward design from the final task

**Why:** `[CONFIRMED]` She defines the final task first and builds the unit backward from it — standard *approche actionnelle*. She also confirmed `[CONFIRMED]` that the tool should **help her find** the final task rather than wait for her to arrive with one.

**Acceptance:**
- Given a theme and a level, the tool proposes several candidate final tasks
- Selecting one derives the language requirements it implies (vocabulary fields, grammar, skills)
- Sessions are then generated as a path toward that task, not as a flat list of exercises
- Changing the final task mid-unit flags which existing material no longer serves it

`[VERIFY]` I have assumed the final task is a *performance* (a roleplay, a poster, a presentation). Confirm the range she actually uses.

---

### EPIC 4 — Source ingestion

**Why:** `[CONFIRMED]` Starting material can be "n'importe quoi" — a textbook page, a video, a text, whatever she has.

**Required inputs:** pasted text, URL, uploaded PDF, **photo of a textbook page** (needs OCR — the existing `pdf2json` path does raw text extraction only and will not handle this), video link `[OPEN — what should a video actually produce? Transcript? Comprehension questions? She wasn't asked]`.

**Acceptance:**
- Each input type either works or fails with a clear message — no silent acceptance of formats the parser cannot read (this is a live defect in the current code)
- Ingested source is attached to the unit as provenance, not just consumed and discarded
- Extracted content lands in the editor as editable objects

---

### EPIC 5 — The vocabulary item *(the atom of the system)*

**Why:** This is the single most concrete thing she gave me, and it is the answer to "what does a good exercise look like."

Every vocabulary item carries **four facets** `[CONFIRMED, all four separately]`:

| Facet | Detail |
| --- | --- |
| Image | Visual support |
| Audio | Spoken, generated (see Epic 6) |
| French translation | **Hidden by default** `[CONFIRMED]` — the student attempts first |
| Pronunciation | Both phonetic transcription *and* audible sound `[CONFIRMED — "les deux"]` |

Items are **reusable objects** in a per-level registry, not text typed into an exercise. This is what makes Epic 10 (reactivation) possible at all.

**Acceptance:**
- An item created in unit 2 can be pulled into unit 5 with all four facets intact
- Translation reveal is a deliberate interaction on screen
- An item missing a facet is visibly incomplete rather than silently shipped

---

### EPIC 6 — Audio generation and accents

**Why:** `[CONFIRMED]` Generated voice, not her own recordings. She interrupted me specifically to insist on accent range beyond British/American — she named Australian, and confirmed `[CONFIRMED]` that exposing students to varied accents is a pedagogical goal, not a nice-to-have.

**Acceptance:**
- Accent selectable per item or per document from a broad list (GB, US, AU, IE, CA, NZ, IN, ZA at minimum)
- Audio is generated once and cached — never regenerated on each render, for cost and consistency
- Audio is addressable by stable URL (Epic 7 depends on this)

`[OPEN]` Should a single unit be able to mix accents deliberately — e.g. a listening exercise that contrasts two speakers? This is a plausible teaching move and would change the data model.

---

### EPIC 7 — Print output

**Why:** `[CONFIRMED]` She prints. Paper has no sound, so **QR codes** `[CONFIRMED, her word]` — the student scans and hears the item.

**Acceptance:**
- A4, photocopier-safe (high contrast, no reliance on colour)
- Each audio-bearing item carries a scannable QR resolving to its cached audio
- QR targets require no login (Epic 12's generic-code path)
- Print and screen render from the same unit data — no separate authoring

`[OPEN]` Student version vs. answer-key version. The original PRD wanted this; she was never asked. Given she produces evaluations, it is very likely needed.

---

### EPIC 8 — Games

**Why:** `[CONFIRMED]` "Beaucoup de jeux" — heavily for SEGPA, some for other levels.

| Level | Format | Source |
| --- | --- | --- |
| SEGPA | **Paper, manipulable, cut-out** `[CONFIRMED]` — cards, dominoes, matching | Existing renderers partly cover this |
| 6ᵉ–3ᵉ | **Mix of screen and paper** `[CONFIRMED]` | Screen games are new build |

Screen games are played **in pairs at one computer** `[CONFIRMED]` — design for two students sharing a screen, not solo play.

**Acceptance:**
- Games are populated from the unit's vocabulary registry, not hand-typed
- Paper games print with cut lines and are physically usable
- Screen games work for a pair sharing one input

Note: the existing repo has six activity renderers (I Have Who Has, dominoes, board game, sorting, snakes & ladders, roll-a-sentence). These are real assets — but they currently randomise with `Math.random()` during render, which makes output non-deterministic. That must be fixed before they can be trusted to produce the same printable twice.

---

### EPIC 9 — SEGPA adaptation

**Why:** `[CONFIRMED]` "Très différente." Oral-first, minimal written work because writing is not secure for these students `[CONFIRMED]`, heavy on manipulable games.

**`[OPEN] — THE MOST IMPORTANT UNRESOLVED QUESTION IN THIS DOCUMENT.`**

I asked whether SEGPA should be a *variant of an existing unit* or a *separate unit entirely*, and the answer went elsewhere. These are very different builds:

- **Variant:** one unit, multiple renderings, shared vocabulary — cheaper, keeps her work in one place
- **Separate:** SEGPA units authored independently — more honest if the pedagogy genuinely doesn't map

Ask her directly, with that framing. Do not let a developer guess.

---

### EPIC 10 — Reactivation across units

**Why:** `[CONFIRMED, and she corrected me to get the word right]` — "elle doit le **réactiver**." Not merely remember that the present tense was taught in unit 2, but actively bring it back into unit 5's exercises. This is *brassage*, and she named it as something the AI never does.

**Acceptance:**
- The system knows, per class, which items and grammar points have been taught and when
- Generating an exercise can deliberately seed prior material at a specified proportion
- She can see and override what is being reactivated

---

### EPIC 11 — Year-over-year reuse

**Why:** `[CONFIRMED]` — "Je reprends les unités d'avant et je réadapte."

**Acceptance:**
- Duplicate a unit into a new school year and class
- Lineage is preserved (this unit descends from last year's)
- Progress and student data do **not** carry over; content does

---

## Phase B — Student platform
*Separate product. Different risk profile. Read Epic 15 before scoping any of this.*

### EPIC 12 — Student access

**Why:** She corrected herself here, and the final position is **both** `[CONFIRMED]`:
- **Generic code** — no account, walk-up access to an exercise (also what QR codes resolve to)
- **Individual accounts** — per student, because she wants progress tracking

**Acceptance:**
- A code grants exercise access with no personal data collected
- Individual login supports pair-mode and solo work
- Works at school and at home `[CONFIRMED]`

`[OPEN]` How do students get accounts? Does she create them? Does the établissement have an existing identity system (ENT / Pronote) that should be used instead? This is both a UX and a legal question.

---

### EPIC 13 — Progress tracking

**Why:** `[CONFIRMED]` — "l'ensemble." Completion, scores, **and error patterns.**

**Acceptance:**
- Per student and per class: what was attempted, scores, time
- Error analysis surfaces *which items and which language points* are failing, aggregated across the class
- Clear at a glance when a majority of the class has missed the same thing

---

### EPIC 14 — Remediation

**Why:** `[CONFIRMED]` Generated from the error data, and `[CONFIRMED]` at **both** class level and individual level.

**Acceptance:**
- Class-wide weakness produces a proposed remediation activity for the next session
- Individual weakness produces targeted practice for that student
- Remediation reuses existing vocabulary items rather than inventing new content

---

### EPIC 15 — RGPD and minors' data ⚠️

**This is not a technical epic and it may be a blocker on all of Phase B.**

Phase B stores performance data about **children in a French collège**, on a platform that is not the établissement's. That raises, at minimum:

- **Legal basis.** Consent from a private individual teacher is a weak footing. Normally this sits with the établissement, under the *rectorat*'s data governance.
- **Institutional approval.** French schools have processes for approving outside digital tools. A teacher deploying a personal platform to students may well be outside them, regardless of quality.
- **Hosting.** EU-hosted data, with a DPA in place for every processor (Supabase, TTS provider, AI provider).
- **AI processors.** Student work sent to Google or similar means children's data leaves for a third-country processor. This needs explicit handling.
- **Parental information**, retention limits, and deletion rights.

**Recommendation:** Build Phase A first and completely. It solves the problem she actually described, involves no student data, and is genuinely useful on its own. Take Phase B to the établissement as a proposal, not as a fait accompli.

---

## What to do next

**1. Get the exemplar unit.** She agreed to find one. Everything above gets sharper once there is a real unit — with its real documents — in the project. It also pins down house style, which no amount of questioning will.

**2. Close these five questions with her:**

| # | Question | Blocks |
| --- | --- | --- |
| 1 | Is SEGPA a *variant* of a unit, or a *separate* unit? | Epic 9 — architectural |
| 2 | What is the "évaluation" concretely, and does it need an answer key? | Epics 2, 7 |
| 3 | Same content for both classes at a level, or does content differ too? | Epic 1 — architectural |
| 4 | How would students get accounts — does the collège have an ENT? | Epics 12, 15 |
| 5 | What should ingesting a *video* actually produce? | Epic 4 |

**3. Re-verify the shallowness diagnosis.** Her unprompted complaint was duplicate documents. The "superficial proposals" thread came partly from an example *I* invented (the apple/banana/bread matching exercise) which she agreed to. Her own answer — that a good exercise needs image, audio, translation and pronunciation together — is solid and I have built Epic 5 on it. But ask her once more, cold: *what makes an exercise good, and what makes one useless?* Without my example in front of her.

**4. Decide on the existing codebase.** Phase A needs the data model built underneath the canvas. The canvas itself and the six activity renderers are worth keeping. The repo's current defects (documented separately) should be fixed as part of that rebuild rather than in advance of it — no point stabilising a save path that is about to be replaced.

---

*Prepared from a single elicitation session. Epics 1–11 are firm enough to estimate against once the five open questions are closed. Epics 12–15 should not be estimated until the legal position is understood.*
