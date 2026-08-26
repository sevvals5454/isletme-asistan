-- ============================================================
-- ÇALIŞAN GİRİŞİ + 2 ROL (sahip / çalışan) — RLS güvenliği
-- Sahip: her şeyi görür. Çalışan: yalnızca KENDİ müşteri + randevuları;
-- gelir-gider, rapor, ayarlar DB'den bile çekilemez.
-- Supabase → SQL Editor → New query → yapıştır → Run.
-- ============================================================

-- 1) Çalışan girişini staff kaydına bağlayan kolon
alter table public.staff
  add column if not exists user_id uuid references auth.users(id) on delete set null;
create unique index if not exists idx_staff_user
  on public.staff(user_id) where user_id is not null;

-- 2) Yardımcı fonksiyonlar
create or replace function public.is_org_owner(p_org uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists(
    select 1 from public.organization_members
    where user_id = auth.uid() and organization_id = p_org and role = 'owner'
  )
$$;

create or replace function public.owner_org_ids()
returns setof uuid language sql stable security definer set search_path = public as $$
  select organization_id from public.organization_members
  where user_id = auth.uid() and role = 'owner'
$$;

-- Bu kullanıcının (çalışan girişi) bağlı olduğu staff kaydı; sahip için null.
create or replace function public.current_staff_id()
returns uuid language sql stable security definer set search_path = public as $$
  select id from public.staff where user_id = auth.uid() limit 1
$$;

-- 3) Yeni kayıt: app_metadata.invited_to_org varsa (yalnız service_role set eder)
--    → çalışan olarak mevcut org'a bağla; yoksa normal (yeni org + owner).
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  new_org_id uuid;
  org_name text;
  invited_org uuid;
  inv_staff_id uuid;
  inv_staff_name text;
begin
  invited_org := nullif(new.raw_app_meta_data->>'invited_to_org','')::uuid;

  if invited_org is not null then
    insert into public.organization_members (user_id, organization_id, role)
      values (new.id, invited_org, 'employee');
    inv_staff_id := nullif(new.raw_app_meta_data->>'staff_id','')::uuid;
    if inv_staff_id is not null then
      update public.staff set user_id = new.id
        where id = inv_staff_id and organization_id = invited_org;
    else
      inv_staff_name := coalesce(new.raw_app_meta_data->>'staff_name', split_part(new.email,'@',1));
      insert into public.staff (organization_id, name, user_id)
        values (invited_org, inv_staff_name, new.id);
    end if;
    return new;
  end if;

  org_name := coalesce(new.raw_user_meta_data->>'organization_name', 'İşletmem');
  insert into public.organizations (name) values (org_name) returning id into new_org_id;
  insert into public.organization_members (user_id, organization_id, role)
    values (new.id, new_org_id, 'owner');
  return new;
end $$;

-- 4) Yeni müşteri/randevu, çalışan tarafından eklendiyse otomatik ona atanır.
create or replace function public.assign_staff_on_insert()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.staff_id is null then
    new.staff_id := public.current_staff_id(); -- çalışansa kendine; sahip/anon ise null
  end if;
  return new;
end $$;

drop trigger if exists trg_customers_assign_staff on public.customers;
create trigger trg_customers_assign_staff
  before insert on public.customers
  for each row execute function public.assign_staff_on_insert();

drop trigger if exists trg_appointments_assign_staff on public.appointments;
create trigger trg_appointments_assign_staff
  before insert on public.appointments
  for each row execute function public.assign_staff_on_insert();

-- ============================================================
-- 5) RLS — ROL BAZLI
-- ============================================================

-- MÜŞTERİLER: sahip hepsini; çalışan yalnız kendi (staff_id = current_staff_id)
drop policy if exists "customers_select" on public.customers;
create policy "customers_select" on public.customers for select using (
  public.is_org_owner(organization_id)
  or (organization_id in (select public.user_org_ids()) and staff_id = public.current_staff_id())
);
drop policy if exists "customers_insert" on public.customers;
create policy "customers_insert" on public.customers for insert with check (
  organization_id in (select public.user_org_ids())
);
drop policy if exists "customers_update" on public.customers;
create policy "customers_update" on public.customers for update using (
  public.is_org_owner(organization_id)
  or (organization_id in (select public.user_org_ids()) and staff_id = public.current_staff_id())
) with check (
  public.is_org_owner(organization_id)
  or (organization_id in (select public.user_org_ids()) and staff_id = public.current_staff_id())
);
drop policy if exists "customers_delete" on public.customers;
create policy "customers_delete" on public.customers for delete using (
  public.is_org_owner(organization_id)
  or (organization_id in (select public.user_org_ids()) and staff_id = public.current_staff_id())
);

-- RANDEVULAR: aynı mantık
drop policy if exists "appointments_select" on public.appointments;
create policy "appointments_select" on public.appointments for select using (
  public.is_org_owner(organization_id)
  or (organization_id in (select public.user_org_ids()) and staff_id = public.current_staff_id())
);
drop policy if exists "appointments_insert" on public.appointments;
create policy "appointments_insert" on public.appointments for insert with check (
  organization_id in (select public.user_org_ids())
);
drop policy if exists "appointments_update" on public.appointments;
create policy "appointments_update" on public.appointments for update using (
  public.is_org_owner(organization_id)
  or (organization_id in (select public.user_org_ids()) and staff_id = public.current_staff_id())
) with check (
  public.is_org_owner(organization_id)
  or (organization_id in (select public.user_org_ids()) and staff_id = public.current_staff_id())
);
drop policy if exists "appointments_delete" on public.appointments;
create policy "appointments_delete" on public.appointments for delete using (
  public.is_org_owner(organization_id)
  or (organization_id in (select public.user_org_ids()) and staff_id = public.current_staff_id())
);

-- PAKETLER: sahip hepsi; çalışan yalnız kendi müşterisininki
drop policy if exists "cust_packages_select" on public.customer_packages;
create policy "cust_packages_select" on public.customer_packages for select using (
  public.is_org_owner(organization_id)
  or customer_id in (select id from public.customers where staff_id = public.current_staff_id())
);
drop policy if exists "cust_packages_insert" on public.customer_packages;
create policy "cust_packages_insert" on public.customer_packages for insert with check (
  public.is_org_owner(organization_id)
  or customer_id in (select id from public.customers where staff_id = public.current_staff_id())
);
drop policy if exists "cust_packages_update" on public.customer_packages;
create policy "cust_packages_update" on public.customer_packages for update using (
  public.is_org_owner(organization_id)
  or customer_id in (select id from public.customers where staff_id = public.current_staff_id())
) with check (
  public.is_org_owner(organization_id)
  or customer_id in (select id from public.customers where staff_id = public.current_staff_id())
);
drop policy if exists "cust_packages_delete" on public.customer_packages;
create policy "cust_packages_delete" on public.customer_packages for delete using (
  public.is_org_owner(organization_id)
  or customer_id in (select id from public.customers where staff_id = public.current_staff_id())
);

-- TELAFİ (makeups): aynı — kendi müşterisi
drop policy if exists "makeups_select" on public.makeups;
create policy "makeups_select" on public.makeups for select using (
  public.is_org_owner(organization_id)
  or customer_id in (select id from public.customers where staff_id = public.current_staff_id())
);
drop policy if exists "makeups_insert" on public.makeups;
create policy "makeups_insert" on public.makeups for insert with check (
  public.is_org_owner(organization_id)
  or customer_id in (select id from public.customers where staff_id = public.current_staff_id())
);
drop policy if exists "makeups_update" on public.makeups;
create policy "makeups_update" on public.makeups for update using (
  public.is_org_owner(organization_id)
  or customer_id in (select id from public.customers where staff_id = public.current_staff_id())
) with check (
  public.is_org_owner(organization_id)
  or customer_id in (select id from public.customers where staff_id = public.current_staff_id())
);
drop policy if exists "makeups_delete" on public.makeups;
create policy "makeups_delete" on public.makeups for delete using (
  public.is_org_owner(organization_id)
  or customer_id in (select id from public.customers where staff_id = public.current_staff_id())
);

-- GELİR/GİDER: yalnızca SAHİP (çalışan hiç göremez)
drop policy if exists "payments_select" on public.payments;
create policy "payments_select" on public.payments for select using (organization_id in (select public.owner_org_ids()));
drop policy if exists "payments_insert" on public.payments;
create policy "payments_insert" on public.payments for insert with check (organization_id in (select public.owner_org_ids()));
drop policy if exists "payments_update" on public.payments;
create policy "payments_update" on public.payments for update using (organization_id in (select public.owner_org_ids())) with check (organization_id in (select public.owner_org_ids()));
drop policy if exists "payments_delete" on public.payments;
create policy "payments_delete" on public.payments for delete using (organization_id in (select public.owner_org_ids()));

drop policy if exists "expenses_select" on public.expenses;
create policy "expenses_select" on public.expenses for select using (organization_id in (select public.owner_org_ids()));
drop policy if exists "expenses_insert" on public.expenses;
create policy "expenses_insert" on public.expenses for insert with check (organization_id in (select public.owner_org_ids()));
drop policy if exists "expenses_update" on public.expenses;
create policy "expenses_update" on public.expenses for update using (organization_id in (select public.owner_org_ids())) with check (organization_id in (select public.owner_org_ids()));
drop policy if exists "expenses_delete" on public.expenses;
create policy "expenses_delete" on public.expenses for delete using (organization_id in (select public.owner_org_ids()));

-- HİZMET / ÇALIŞAN / SAAT / KAPALI GÜN: iki rol de OKUR, yalnız SAHİP yazar
do $$
declare t text;
begin
  foreach t in array array['services','staff','business_hours','closed_days'] loop
    execute format('drop policy if exists "%1$s_select" on public.%1$s', t);
    execute format('create policy "%1$s_select" on public.%1$s for select using (organization_id in (select public.user_org_ids()))', t);
    execute format('drop policy if exists "%1$s_insert" on public.%1$s', t);
    execute format('create policy "%1$s_insert" on public.%1$s for insert with check (organization_id in (select public.owner_org_ids()))', t);
    execute format('drop policy if exists "%1$s_update" on public.%1$s', t);
    execute format('create policy "%1$s_update" on public.%1$s for update using (organization_id in (select public.owner_org_ids())) with check (organization_id in (select public.owner_org_ids()))', t);
    execute format('drop policy if exists "%1$s_delete" on public.%1$s', t);
    execute format('create policy "%1$s_delete" on public.%1$s for delete using (organization_id in (select public.owner_org_ids()))', t);
  end loop;
end $$;
