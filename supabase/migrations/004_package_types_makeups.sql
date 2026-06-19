-- Paket türü (seans paketi / aylık üyelik) + telafi (makeup) sistemi.
-- Pilates/spor stüdyosu modeli:
--   - 'session': ders hakkı bazlı (mevcut davranış, kalan = toplam - tamamlanan)
--   - 'monthly': aylık üyelik; dersler referans (sayaçtan düşmez), ödeme günü sabit
-- Telafi: kaçırılan dersin ayrı defteri — seans sayısını, paket süresini ve
-- ödeme gününü BOZMAZ (sayaç/süre/ödeme'ye dokunmaz).
-- Supabase → SQL Editor → New query → yapıştır → Run.

-- Paket türü + aylık ödeme günü; aylık üyelikte seans sayısı boş olabilir.
alter table public.customer_packages
  add column if not exists type text not null default 'session'
    check (type in ('session', 'monthly')),
  add column if not exists next_payment_at date;

alter table public.customer_packages
  alter column total_sessions drop not null;

-- MAKEUPS (telafiler) -----------------------------------------
-- appointment_id: telafi tarihi belirlenince oluşturulan randevu (pakete saymaz).
create table if not exists public.makeups (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  customer_id uuid not null references public.customers(id) on delete cascade,
  package_id uuid references public.customer_packages(id) on delete set null,
  appointment_id uuid references public.appointments(id) on delete set null,
  missed_date date not null,
  makeup_at timestamptz,
  status text not null default 'pending'
    check (status in ('pending', 'scheduled', 'completed', 'cancelled')),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_makeups_org on public.makeups(organization_id);
create index if not exists idx_makeups_customer on public.makeups(customer_id);

drop trigger if exists trg_makeups_updated_at on public.makeups;
create trigger trg_makeups_updated_at
  before update on public.makeups
  for each row execute function public.set_updated_at();

-- RLS
alter table public.makeups enable row level security;

drop policy if exists "makeups_select" on public.makeups;
create policy "makeups_select" on public.makeups
  for select using (organization_id in (select public.user_org_ids()));

drop policy if exists "makeups_insert" on public.makeups;
create policy "makeups_insert" on public.makeups
  for insert with check (organization_id in (select public.user_org_ids()));

drop policy if exists "makeups_update" on public.makeups;
create policy "makeups_update" on public.makeups
  for update using (organization_id in (select public.user_org_ids()))
  with check (organization_id in (select public.user_org_ids()));

drop policy if exists "makeups_delete" on public.makeups;
create policy "makeups_delete" on public.makeups
  for delete using (organization_id in (select public.user_org_ids()));
