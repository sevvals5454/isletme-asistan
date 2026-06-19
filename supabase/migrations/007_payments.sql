-- Basit ödeme defteri (tahsilat geçmişi) — sektör bağımsız.
-- Fiilen alınan ödemelerin kaydı. Randevu/paket bazlı "gelir tahmini"nden
-- ayrı bir kavram: bu, gerçekten tahsil edilen tutarların defteridir.
-- Supabase → SQL Editor → New query → yapıştır → Run.

create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  customer_id uuid references public.customers(id) on delete set null,
  amount numeric(10, 2) not null check (amount >= 0),
  method text not null default 'cash'
    check (method in ('cash', 'card', 'transfer', 'other')),
  note text,
  paid_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists idx_payments_org_date on public.payments(organization_id, paid_at desc);
create index if not exists idx_payments_customer on public.payments(customer_id);

alter table public.payments enable row level security;

drop policy if exists "payments_select" on public.payments;
create policy "payments_select" on public.payments
  for select using (organization_id in (select public.user_org_ids()));

drop policy if exists "payments_insert" on public.payments;
create policy "payments_insert" on public.payments
  for insert with check (organization_id in (select public.user_org_ids()));

drop policy if exists "payments_delete" on public.payments;
create policy "payments_delete" on public.payments
  for delete using (organization_id in (select public.user_org_ids()));
