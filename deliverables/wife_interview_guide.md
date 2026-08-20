# The ESL Architect — Product Discovery Interview Guide

**Purpose:** Get the real teacher's voice into the product before we write epics. This is meant for a relaxed, spoken conversation — not a form to read verbatim. Follow her energy: when she lights up about something, stay there and dig in before moving on.

**After the call:** bring back her answers (notes, recording transcript, or your own paraphrase) and I'll convert them into prioritized epics for the dev backlog.

---

## 0. How to open the call

Something like: *"I'm building an app to help you make worksheets faster. Before we build more, I want to understand exactly how you work today and what would actually make your life easier — there are no wrong answers, and it's fine to say 'I don't need that.'"*

If it's easier for her, ask if you can record (voice memo) so nothing gets lost — you don't need to take notes live.

---

## 1. Warm-up: her world today

- Walk me through last week — how did you actually make a worksheet, start to finish?
- How long does a typical worksheet take you, from idea to something you can photocopy?
- What tools do you use right now (Word, Canva, printed textbooks, Genially, etc.)? What do you like about each?
- What's the most annoying, tedious, or time-wasting part of making classroom materials?
- Do you usually start from scratch, or from something that already exists (a textbook page, an old worksheet, a PDF someone shared)?

## 2. The magic wand question

- If this app could do exactly one thing perfectly for you, what would it be?
- Imagine it's six months from now and this app has completely changed how you prep lessons — what does a Tuesday evening look like?
- What would make you tell another teacher "you have to try this"?
- What would make you give up and go back to your old way?

## 3. Walking through what exists (probe reaction + priority on each)

Go one at a time. For each, ask: *does this matter to you? how much? what's missing or wrong about how I described it?*

- **Uploading an old PDF/worksheet and having it turn into something editable.** How important is preserving the original layout (images, tables, columns) vs. just getting clean text she can rework?
- **A free-form canvas** where she can drag around text boxes, shapes, tables, answer lines. Does she want this, or would a simpler "just edit the text" experience actually serve her better?
- **Asking an AI to rewrite text for a specific level** (A1–B2 / CECRL). Does she trust AI to do this well? Would she want to review/edit every AI suggestion, or accept it as-is?
- **AI generating brand-new content** (a text, a set of questions, illustrations) vs. only ever working from something she supplied.
- **A student version vs. teacher/answer-key version** made automatically (blanks, hidden answers). How does she do this today? Is this a big time-saver or a nice-to-have?
- **Printable classroom games** (vocabulary dominoes, board games, "I have who has," category sorting, snakes & ladders). Does she actually use games like this? Which formats, if any, does she recognize/use already?
- **Saving and reopening documents later**, building a personal library she can reuse year to year.
- **Sharing with colleagues / her department** — does she work with other teachers on shared materials, or is this a solo tool for her?
- **Exporting a clean, print-ready PDF.** What does "print ready" mean to her — one page, multi-page, must look like a real worksheet vs. a screenshot?
- **An audio tool** for trimming/using audio clips in class. Does she use audio in lessons? Listening comprehension?
- **Importing a YouTube video** to auto-generate a listening comprehension worksheet — worth building, or not something she'd use?

## 4. Deep dive: pick her single most common worksheet type

- Ask her to describe, in detail, the *one* worksheet she makes most often (or wishes she could make faster).
- What's the input (a textbook page? a topic? a grammar point?) What's the output supposed to look like exactly?
- Who is it for — which levels, which class sizes, mixed-ability or not?
- What would "done and I'm happy with it" look like for that one worksheet?

*(This becomes the north-star user journey we build and test against first.)*

## 5. Priorities — force the ranking

Read these roughly as a list and ask her to sort into **must-have for this to be useful at all / nice to have eventually / don't bother**:

- Reliable PDF/image ingestion that keeps layout and images
- Free-form drag-and-drop canvas editing
- AI text rewriting to a specific level
- AI-generated new content (text, questions, images)
- Automatic student/answer-key versions
- The six printable classroom games
- Save/reopen a personal library
- Sharing with other teachers / her school
- High-fidelity multi-page PDF export
- Audio tools
- YouTube/video-based worksheet generation

## 6. Practical constraints

- What device does she actually use — laptop, school desktop, tablet? Browser she prefers?
- Does she have reliable internet at school, or does she often work offline/at home?
- Any French-language requirement for the interface itself, or is English fine since it's a teaching tool?
- Any concerns about student data, names, or grades ever touching this app?
- Does she need to log in/sign up, or would that friction turn her off using it day-to-day?

## 7. Success criteria

- How would she personally know, three months in, that this was worth using?
- Is there a specific amount of time she'd want to save per worksheet, per week?
- Would she want to show this to other teachers at her school? What would she need to see first before she'd feel comfortable doing that?

## 8. Wrap-up

- Anything I didn't ask that you think matters?
- Anything from what I described that sounded confusing, or that you'd actively dislike?
- On a scale of 1–10, how excited are you about this right now — and what would move that number up?

---

## After the call: what to send back

Any of these work — I'll turn it into epics either way:
- A rough transcript or recording
- Bullet notes against the sections above
- Just your summary of what stood out most
