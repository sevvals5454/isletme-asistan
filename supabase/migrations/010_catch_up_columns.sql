-- YAKALAMA (catch-up): eksik tablo/kolonları tamamlar. Kendi kendine yeter —
-- staff yoksa önce onu oluşturur, sonra ALTER'ları yapar. Hepsi idempotent.
-- ⚠️ DOĞRU PROJEDE ÇALIŞTIR: .env.local'deki NEXT_PUBLIC_SUPABASE_URL ile
--    aynı proje olmalı (Supabase → Settings → API → Project URL ile karşılaştır).
-- Supabase → SQL Editor → New query → yapıştır → Run.

-- staff (yoksa oluştur; ALTER'ların FK'leri için gerekli)
create table if not exists public.staff (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_staff_org on public.staff(organization_id);

alter table public.staff enable row level security;

drop policy if exists "staff_select" on public.staff;
create policy "staff_select" on public.staff
  for select using (organization_id in (select public.user_org_ids()));
drop policy if exists "staff_insert" on public.staff;
create policy "staff_insert" on public.staff
  for insert with check (organization_id in (select public.user_org_ids()));
drop policy if exists "staff_update" on public.staff;
create policy "staff_update" on public.staff
  for update using (organization_id in (select public.user_org_ids()))
  with check (organization_id in (select public.user_org_ids()));
drop policy if exists "staff_delete" on public.staff;
create policy "staff_delete" on public.staff
  for delete using (organization_id in (select public.user_org_ids()));

-- eksik kolonlar
alter table public.organizations add column if not exists iban text;
alter table public.organizations add column if not exists iban_name text;

alter table public.appointments add column if not exists reminder_sent_at timestamptz;
alter table public.appointments add column if not exists recurrence_group_id uuid;
alter table public.appointments add column if not exists staff_id uuid
  references public.staff(id) on delete set null;

alter table public.customer_packages add column if not exists type text
  not null default 'session' check (type in ('session', 'monthly'));
alter table public.customer_packages add column if not exists next_payment_at date;
alter table public.customer_packages alter column total_sessions drop not null;

alter table public.customers add column if not exists staff_id uuid
  references public.staff(id) on delete set null;

create index if not exists idx_appointments_recurrence on public.appointments(recurrence_group_id);
