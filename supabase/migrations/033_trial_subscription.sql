-- ============================================================
-- DENEME SÜRESİ + ABONELİK (14 gün ücretsiz → paket seçimi)
-- 015'in yerine geçer; 022'nin çalışan-davet mantığını KORUR.
-- Güvenli: mevcut TÜM işletmeler 'active' (grandfather) → kimse kilitlenmez.
-- Supabase → SQL Editor → Run. (idempotent)
-- ============================================================

-- 1) Durum alanları
alter table public.organizations
  add column if not exists access_status text not null default 'trial';
alter table public.organizations
  add column if not exists trial_ends_at timestamptz;
alter table public.organizations
  add column if not exists plan text; -- 'pro' | 'business' | null (seçilmedi)

-- 2) Mevcut işletmeleri aktif yap (bugünkü kullanıcılar kilitlenmesin)
update public.organizations
  set access_status = 'active'
  where access_status is distinct from 'active';

-- 3) handle_new_user: 022 (çalışan davet) + 14 günlük deneme birleşik.
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

  -- Çalışan daveti: mevcut org'a bağlan (deneme/abonelik org'tan miras alınır).
  if invited_org is not null then
    insert into public.organization_members (user_id, organization_id, role)
      values (new.id, invited_org, 'member');
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

  -- Yeni işletme: 14 günlük deneme başlat.
  org_name := coalesce(new.raw_user_meta_data->>'organization_name', 'İşletmem');
  insert into public.organizations (name, access_status, trial_ends_at)
    values (org_name, 'trial', now() + interval '14 days')
    returning id into new_org_id;
  insert into public.organization_members (user_id, organization_id, role)
    values (new.id, new_org_id, 'owner');
  return new;
end $$;

-- Bir işletmeyi elle aktive etmek (ödeme gelene kadar):
--   update public.organizations set access_status='active', plan='pro' where name='...';
-- access_status: 'trial' | 'active' | 'expired' | 'blocked'
