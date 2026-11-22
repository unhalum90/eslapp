# The ESL Architect — Atelier de séquences

This is the teacher workspace for building ready-to-teach English lesson packs, printable games
and audio materials. It is a Next.js App Router project bootstrapped with
[`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Student speaking workspace (`/tools/speaking`)

Upload an MP3 of students speaking, review a timestamped transcript by speaker, edit the words or
speaker names, and request CEFR-aware language feedback. The feedback quotes exact transcript
passages and can be downloaded with the transcript as a teacher text report. A separate learner
text export and copy action use the original, uncorrected transcript by speaker, without the
teacher edits or AI feedback. The browser uploads the original MP3 to a private temporary
Supabase Storage bucket, then Auphonic fetches it for speech isolation, noise reduction and
level balancing. Auphonic's processed MP3 goes to Mistral. The temporary Supabase copy is
deleted when Auphonic finishes; Auphonic retains productions according to the account settings.

The workspace requires server-side `AUPHONIC_API_KEY`, `MISTRAL_API_KEY`, and
`SUPABASE_SERVICE_ROLE_KEY`: Voxtral Mini Transcribe 2 for
speaker diarization and Mistral Small for grammar, vocabulary, word order, and expression
feedback. Optional model overrides are
`MISTRAL_MODEL_SPEAKING_TRANSCRIPTION` and `MISTRAL_MODEL_SPEAKING_FEEDBACK`.

The browser accepts complete MP3s up to 50 MB with a signed direct upload, preserving
their original bitrate and duration. Feedback is based on the reviewed
transcript, so it does not score pronunciation or accent. Speaker assignments and suggested
corrections should be checked by the teacher before sharing.
Some Auphonic account plans add a spoken credit to processed audio. The workspace flags a
detected credit, and the teacher should check the raw learner export before sharing it.

### Speaking library

When signed in with a Supabase teacher account, a completed transcription is saved automatically
to a private `speaking-library` Storage bucket. The cleaned MP3 and a JSON manifest contain the
original transcript, teacher edits, speaker names, context and feedback. Feedback is saved after
analysis; later edits can be saved with **Enregistrer les modifications**. The library lists saved
recordings and opens them with a one-hour signed playback URL. Storage paths are scoped to the
Supabase user ID. Teachers can create and rename folders, filter the library, and move saved recordings
between folders. Existing recordings appear under **Sans dossier** until moved. Anonymous
transcription remains available, but saving requires sign-in.

## Dialogue Builder (`/tools/dialogue`)

Two-voice conversation builder for listening activities. Write your own script or generate one
from a situation (ordering food, asking directions, checking into a hotel…), pick a voice for each
speaker, listen line by line, download an MP3, and keep everything in a library that syncs across
devices.

- **Speech engine:** Mistral **Voxtral Mini TTS** (`voxtral-mini-tts-2603`, override with
  `MISTRAL_MODEL_DIALOGUE_TTS`). Each line is generated with its speaker's voice and then joined
  into a single MP3.
- **Script engine:** the selected text agent (Codex Terra / Claude Opus) writes the dialogue when
  its key is present; otherwise the builder falls back to **Mistral chat**
  (`MISTRAL_MODEL_DIALOGUE_SCRIPT`, default `mistral-small-latest`), so the tool works with
  `MISTRAL_API_KEY` alone. The notice under the buttons names the engine that wrote the script.
- **Voices:** 30 presets come from Mistral (`GET /v1/audio/voices`); the defaults are
  `gb_jane_neutral` and `gb_oliver_neutral` (British English). A 2–3 second recording can be
  uploaded to clone another voice.
- **Library:** metadata and scripts live in the app store; MP3s go to the private Supabase Storage
  bucket `dialogue-audio` with one `dialogue_library` row per dialogue. When nobody is signed in,
  the audio stays on the device and the library offers a **Sync** button.
- **Deployment check:** `GET /api/dialogue/health` reports (without generating anything) whether
  the speech model, script engine and Supabase library are configured.

### Setup

1. Add the server-only Mistral key and (optionally) the model overrides to `.env.local`:

   ```bash
   MISTRAL_API_KEY=…
   MISTRAL_MODEL_DIALOGUE_TTS=voxtral-mini-tts-2603
   MISTRAL_MODEL_DIALOGUE_SCRIPT=mistral-small-latest
   ```

   `OPENAI_API_KEY` / `ANTHROPIC_API_KEY` stay optional: without them the dialogue scripts are
   written by Mistral instead, and the rest of the workspace keeps using its own agents.

2. Apply the library migration, either by pasting
   `supabase/migrations/202609200001_dialogue_library.sql` into the Supabase SQL editor, or by
   adding `SUPABASE_CONNECT` (dashboard → Database → Connection string → URI) to `.env.local` and
   running `node scripts/apply-dialogue-migration.js`.

   The migration creates `dialogue_library` (owner-only RLS) and the private `dialogue-audio`
   bucket with per-user folder policies. Without it, saving still works but stays local-only.

3. Sign in with the teacher account (email link on `/account`) to sync a library across devices.

### Useful commands

```bash
npm run dev                             # http://localhost:3000/tools/dialogue
npm run test:dialogue                   # dialogue parsing / MP3 joining unit tests
node scripts/check-mistral-voices.js    # verifies the key, model id and preset voices
```

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
