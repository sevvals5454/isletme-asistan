-- Çalışma saatleri + kapalı günler (sektör bağımsız).
-- Tanımlanmazsa kısıt yok (opt-in) — saat girilmeyen işletme engellenmez.
-- Randevu oluştururken uygunluk UYARISI verir (engellemez).
-- Supabase → SQL Editor → New query → yapıştır → Run.

-- BUSINESS_HOURS (haftanın günü başına bir satır; 0=Pazartesi .. 6=Pazar)
create table if not exists public.business_hours (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  weekday smallint not null check (weekday between 0 and 6),
  is_open boolean not null default true,
  open_time time not null default '09:00',
  close_time time not null default '18:00',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, weekday)
);

create index if not exists idx_business_hours_org on public.business_hours(organization_id);

drop trigger if exists trg_business_hours_updated_at on public.business_hours;
create trigger trg_business_hours_updated_at
  before update on public.business_hours
  for each row execute function public.set_updated_at();

-- CLOSED_DAYS (tatil/izin gibi belirli kapalı tarihler)
create table if not exists public.closed_days (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  date date not null,
  reason text,
  created_at timestamptz not null default now(),
  unique (organization_id, date)
);

create index if not exists idx_closed_days_org on public.closed_days(organization_id);

-- RLS
alter table public.business_hours enable row level security;
alter table public.closed_days enable row level security;

drop policy if exists "business_hours_select" on public.business_hours;
create policy "business_hours_select" on public.business_hours
  for select using (organization_id in (select public.user_org_ids()));

drop policy if exists "business_hours_insert" on public.business_hours;
create policy "business_hours_insert" on public.business_hours
  for insert with check (organization_id in (select public.user_org_ids()));

drop policy if exists "business_hours_update" on public.business_hours;
create policy "business_hours_update" on public.business_hours
  for update using (organization_id in (select public.user_org_ids()))
  with check (organization_id in (select public.user_org_ids()));

drop policy if exists "business_hours_delete" on public.business_hours;
create policy "business_hours_delete" on public.business_hours
  for delete using (organization_id in (select public.user_org_ids()));

drop policy if exists "closed_days_select" on public.closed_days;
create policy "closed_days_select" on public.closed_days
  for select using (organization_id in (select public.user_org_ids()));

drop policy if exists "closed_days_insert" on public.closed_days;
create policy "closed_days_insert" on public.closed_days
  for insert with check (organization_id in (select public.user_org_ids()));

drop policy if exists "closed_days_delete" on public.closed_days;
create policy "closed_days_delete" on public.closed_days
  for delete using (organization_id in (select public.user_org_ids()));
