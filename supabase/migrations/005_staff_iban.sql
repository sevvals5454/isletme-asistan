-- Çalışanlar (staff) + müşteri/randevu ataması + işletme IBAN.
-- Pilates stüdyosu görüşmesi: müşteri "kimin üyesi" (hangi eğitmen) seçiliyor,
-- randevunun sahibi (çalışan) var. IBAN ödeme mesajlarında kullanılıyor.
-- staff sektör bağımsız: eğitmen/kuaför/doktor hepsi için geçerli. Giriş yapmaz
-- (sadece atama etiketi).
-- Supabase → SQL Editor → New query → yapıştır → Run.

-- STAFF -------------------------------------------------------
create table if not exists public.staff (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_staff_org on public.staff(organization_id);

drop trigger if exists trg_staff_updated_at on public.staff;
create trigger trg_staff_updated_at
  before update on public.staff
  for each row execute function public.set_updated_at();

-- Müşteri ve randevuya çalışan ataması (çalışan silinirse atama boşalır).
alter table public.customers
  add column if not exists staff_id uuid references public.staff(id) on delete set null;

alter table public.appointments
  add column if not exists staff_id uuid references public.staff(id) on delete set null;

-- İşletme IBAN (ödeme mesajlarında).
alter table public.organizations
  add column if not exists iban text,
  add column if not exists iban_name text;

-- RLS
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
