-- Gider defteri (sektör bağımsız) — gelir-gider/net kâr için.
-- İşletme seviyesinde giderler (kira, maaş, malzeme, fatura, diğer).
-- Supabase → SQL Editor → New query → yapıştır → Run.

create table if not exists public.expenses (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  amount numeric(10, 2) not null check (amount >= 0),
  category text not null default 'other'
    check (category in ('rent', 'salary', 'supplies', 'bills', 'other')),
  note text,
  spent_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists idx_expenses_org_date on public.expenses(organization_id, spent_at desc);

alter table public.expenses enable row level security;

drop policy if exists "expenses_select" on public.expenses;
create policy "expenses_select" on public.expenses
  for select using (organization_id in (select public.user_org_ids()));

drop policy if exists "expenses_insert" on public.expenses;
create policy "expenses_insert" on public.expenses
  for insert with check (organization_id in (select public.user_org_ids()));

drop policy if exists "expenses_delete" on public.expenses;
create policy "expenses_delete" on public.expenses
  for delete using (organization_id in (select public.user_org_ids()));
