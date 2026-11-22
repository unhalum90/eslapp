-- Dialogue Builder library: two-voice dialogues with the generated MP3 stored in
-- a private Supabase Storage bucket so a teacher can open the library on any device.

create extension if not exists pgcrypto;

create table if not exists public.dialogue_library (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  scenario text not null default '',
  level text not null default 'A1' check (level in ('A1', 'A2', 'B1', 'B2')),
  source text not null default 'text' check (source in ('text', 'generated')),
  speaker_labels jsonb not null default '{"A":"Speaker A","B":"Speaker B"}'::jsonb,
  voices jsonb not null default '{}'::jsonb,
  lines jsonb not null default '[]'::jsonb,
  audio_path text,
  audio_mime text not null default 'audio/mpeg',
  audio_bytes bigint not null default 0,
  duration_seconds numeric,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.dialogue_library enable row level security;

drop policy if exists "Teachers manage their dialogues" on public.dialogue_library;
create policy "Teachers manage their dialogues"
  on public.dialogue_library for all
  using (auth.uid() = owner_id) with check (auth.uid() = owner_id);

create index if not exists dialogue_library_owner_created_idx
  on public.dialogue_library(owner_id, created_at desc);

-- Private bucket. Path convention: "{user_id}/{dialogue_id}.mp3"
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'dialogue-audio',
  'dialogue-audio',
  false,
  26214400,
  array['audio/mpeg', 'audio/wav']
)
on conflict (id) do nothing;

drop policy if exists "Teachers read own dialogue audio" on storage.objects;
create policy "Teachers read own dialogue audio"
  on storage.objects for select
  using (bucket_id = 'dialogue-audio' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "Teachers upload own dialogue audio" on storage.objects;
create policy "Teachers upload own dialogue audio"
  on storage.objects for insert
  with check (bucket_id = 'dialogue-audio' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "Teachers update own dialogue audio" on storage.objects;
create policy "Teachers update own dialogue audio"
  on storage.objects for update
  using (bucket_id = 'dialogue-audio' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "Teachers delete own dialogue audio" on storage.objects;
create policy "Teachers delete own dialogue audio"
  on storage.objects for delete
  using (bucket_id = 'dialogue-audio' and (storage.foldername(name))[1] = auth.uid()::text);
