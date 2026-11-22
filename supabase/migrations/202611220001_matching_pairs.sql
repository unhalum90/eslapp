begin;

-- Private drafts and immutable, unlisted learner snapshots. No learner records.
create table if not exists public.matching_activities (
  id uuid primary key,
  owner_id uuid not null references auth.users(id) on delete cascade,
  payload jsonb not null,
  updated_at timestamptz not null default now()
);
create table if not exists public.matching_publications (
  code text primary key,
  activity_id uuid not null,
  owner_id uuid not null references auth.users(id) on delete cascade,
  payload jsonb not null,
  created_at timestamptz not null default now()
);
alter table public.matching_activities enable row level security;
alter table public.matching_publications enable row level security;
drop policy if exists "Matching drafts belong to their author" on public.matching_activities;
create policy "Matching drafts belong to their author" on public.matching_activities
  for all to authenticated using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));
drop policy if exists "Unlisted matching snapshots are readable" on public.matching_publications;
create policy "Unlisted matching snapshots are readable" on public.matching_publications
  for select to anon, authenticated using (true);
drop policy if exists "Authors publish matching snapshots" on public.matching_publications;
create policy "Authors publish matching snapshots" on public.matching_publications
  for insert to authenticated with check (owner_id = (select auth.uid()));
drop policy if exists "Authors revoke matching snapshots" on public.matching_publications;
create policy "Authors revoke matching snapshots" on public.matching_publications
  for delete to authenticated using (owner_id = (select auth.uid()));
grant select, insert, update, delete on public.matching_activities to authenticated;
grant select on public.matching_publications to anon, authenticated;
grant insert, delete on public.matching_publications to authenticated;
create index if not exists matching_drafts_owner on public.matching_activities(owner_id, updated_at desc);

create index if not exists matching_publications_owner on public.matching_publications(owner_id, created_at desc);

commit;
