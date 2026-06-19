-- Paket / seans sistemi (ör. "10 Seans Lazer").
-- Paket satışı = gelir anı; her tamamlanan randevu paketten 1 seans düşer.
-- Kalan seans ayrı sayaçla değil, tamamlanan randevular sayılarak hesaplanır.
-- Mevcut bir veritabanına uygulanır (schema.sql zaten çalıştırılmışsa).
-- Supabase → SQL Editor → New query → yapıştır → Run.

-- CUSTOMER_PACKAGES -------------------------------------------
-- service_id null ise paket geneldir (her hizmette kullanılabilir).
create table if not exists public.customer_packages (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  customer_id uuid not null references public.customers(id) on delete cascade,
  service_id uuid references public.services(id) on delete set null,
  name text not null,
  total_sessions int not null check (total_sessions > 0),
  price numeric(10, 2) check (price is null or price >= 0),
  purchased_at timestamptz not null default now(),
  expires_at timestamptz,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_cust_packages_org on public.customer_packages(organization_id);
create index if not exists idx_cust_packages_customer on public.customer_packages(customer_id);

drop trigger if exists trg_cust_packages_updated_at on public.customer_packages;
create trigger trg_cust_packages_updated_at
  before update on public.customer_packages
  for each row execute function public.set_updated_at();

-- APPOINTMENTS.package_id -------------------------------------
-- Paket silinirse randevu kalır (set null); randevu paketten bağımsızlaşır.
alter table public.appointments
  add column if not exists package_id uuid references public.customer_packages(id) on delete set null;

create index if not exists idx_appointments_package on public.appointments(package_id);

-- RLS
alter table public.customer_packages enable row level security;

drop policy if exists "cust_packages_select" on public.customer_packages;
create policy "cust_packages_select" on public.customer_packages
  for select using (organization_id in (select public.user_org_ids()));

drop policy if exists "cust_packages_insert" on public.customer_packages;
create policy "cust_packages_insert" on public.customer_packages
  for insert with check (organization_id in (select public.user_org_ids()));

drop policy if exists "cust_packages_update" on public.customer_packages;
create policy "cust_packages_update" on public.customer_packages
  for update using (organization_id in (select public.user_org_ids()))
  with check (organization_id in (select public.user_org_ids()));

drop policy if exists "cust_packages_delete" on public.customer_packages;
create policy "cust_packages_delete" on public.customer_packages
  for delete using (organization_id in (select public.user_org_ids()));
