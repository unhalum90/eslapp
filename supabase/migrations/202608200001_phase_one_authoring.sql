-- Phase 1: teacher authoring, manual class delivery and anonymous practice.
-- Student identities, scores and remediation are intentionally excluded.

create extension if not exists pgcrypto;

create table if not exists public.teacher_classes (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  level text not null check (level in ('6e', '5e', '4e', '3e', 'SEGPA')),
  school_year text not null,
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (owner_id, name, school_year)
);

create table if not exists public.authoring_units (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  lineage_root_id uuid,
  parent_unit_id uuid references public.authoring_units(id) on delete set null,
  forked_for_class_id uuid references public.teacher_classes(id) on delete set null,
  title text not null,
  level text not null check (level in ('6e', '5e', '4e', '3e', 'SEGPA')),
  school_year text not null,
  status text not null default 'draft' check (status in ('draft', 'ready', 'archived')),
  content jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.authoring_units
  drop constraint if exists authoring_units_lineage_root_id_fkey;
alter table public.authoring_units
  add constraint authoring_units_lineage_root_id_fkey
  foreign key (lineage_root_id) references public.authoring_units(id) on delete set null;

create table if not exists public.class_unit_runs (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  class_id uuid not null references public.teacher_classes(id) on delete cascade,
  unit_id uuid not null references public.authoring_units(id) on delete cascade,
  status text not null default 'not_started'
    check (status in ('not_started', 'in_progress', 'complete')),
  current_session integer not null default 0 check (current_session between 0 and 8),
  progress_percent integer not null default 0 check (progress_percent between 0 and 100),
  class_notes text not null default '',
  updated_at timestamptz not null default now(),
  unique (class_id, unit_id)
);

create table if not exists public.vocabulary_items (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  normalized_term text not null,
  term text not null,
  translation_fr text not null default '',
  phonetic text not null default '',
  image_url text not null default '',
  audio jsonb not null default '[]'::jsonb,
  tags text[] not null default '{}',
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (owner_id, normalized_term)
);

create table if not exists public.unit_vocabulary (
  unit_id uuid not null references public.authoring_units(id) on delete cascade,
  vocabulary_id uuid not null references public.vocabulary_items(id) on delete restrict,
  purpose text not null default 'new' check (purpose in ('new', 'reactivation')),
  source_unit_id uuid references public.authoring_units(id) on delete set null,
  primary key (unit_id, vocabulary_id)
);

create table if not exists public.unit_revisions (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  unit_id uuid not null references public.authoring_units(id) on delete cascade,
  label text not null,
  snapshot jsonb not null,
  created_at timestamptz not null default now()
);

create table if not exists public.unit_publications (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  unit_id text not null,
  code text not null unique check (code ~ '^[A-Z0-9]{6,12}$'),
  payload jsonb not null,
  published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (owner_id, unit_id)
);

alter table public.teacher_classes enable row level security;
alter table public.authoring_units enable row level security;
alter table public.class_unit_runs enable row level security;
alter table public.vocabulary_items enable row level security;
alter table public.unit_vocabulary enable row level security;
alter table public.unit_revisions enable row level security;
alter table public.unit_publications enable row level security;

create policy "Teachers manage their classes"
  on public.teacher_classes for all
  using (auth.uid() = owner_id) with check (auth.uid() = owner_id);
create policy "Teachers manage their units"
  on public.authoring_units for all
  using (auth.uid() = owner_id) with check (auth.uid() = owner_id);
create policy "Teachers manage class delivery"
  on public.class_unit_runs for all
  using (auth.uid() = owner_id) with check (auth.uid() = owner_id);
create policy "Teachers manage global vocabulary"
  on public.vocabulary_items for all
  using (auth.uid() = owner_id) with check (auth.uid() = owner_id);
create policy "Teachers manage unit vocabulary"
  on public.unit_vocabulary for all
  using (
    exists (
      select 1 from public.authoring_units u
      where u.id = unit_vocabulary.unit_id and u.owner_id = auth.uid()
    )
  ) with check (
    exists (
      select 1 from public.authoring_units u
      where u.id = unit_vocabulary.unit_id and u.owner_id = auth.uid()
    )
  );
create policy "Teachers manage revisions"
  on public.unit_revisions for all
  using (auth.uid() = owner_id) with check (auth.uid() = owner_id);
create policy "Teachers manage publications"
  on public.unit_publications for all
  using (auth.uid() = owner_id) with check (auth.uid() = owner_id);
create policy "Anyone can read active anonymous practice"
  on public.unit_publications for select
  using (published = true);

create index if not exists authoring_units_owner_level_year_idx
  on public.authoring_units(owner_id, level, school_year);
create index if not exists class_unit_runs_class_idx on public.class_unit_runs(class_id);
create index if not exists unit_revisions_unit_created_idx
  on public.unit_revisions(unit_id, created_at desc);
create index if not exists unit_publications_code_idx on public.unit_publications(code)
  where published = true;
