-- ============================================================
-- NOTLAR — randevusuz görüşmeler, gelmek isteyenler, hatırlatmalar
-- Supabase → SQL Editor → New query → yapıştır → Run.
-- ============================================================

create table if not exists public.notes (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  content text not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_notes_org
  on public.notes(organization_id, created_at desc);

alter table public.notes enable row level security;

drop policy if exists "notes_select" on public.notes;
create policy "notes_select" on public.notes
  for select using (organization_id in (select public.user_org_ids()));

drop policy if exists "notes_insert" on public.notes;
create policy "notes_insert" on public.notes
  for insert with check (organization_id in (select public.user_org_ids()));

drop policy if exists "notes_update" on public.notes;
create policy "notes_update" on public.notes
  for update using (organization_id in (select public.user_org_ids()))
  with check (organization_id in (select public.user_org_ids()));

drop policy if exists "notes_delete" on public.notes;
create policy "notes_delete" on public.notes
  for delete using (organization_id in (select public.user_org_ids()));
