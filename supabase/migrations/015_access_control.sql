-- ============================================================
-- ERİŞİM / ABONELİK KONTROLÜ — DENEME SÜRELİ
-- ⚠️ ŞİMDİLİK ÇALIŞTIRMA. Test bittikten + ödeme altyapısı kurulacakken çalıştır.
-- Amaç: linki alan herkes süresiz ücretsiz kullanmasın; deneme süresi dolunca
--       kilitlensin. Ödeme gelince ödeme 'active' yapar.
-- Güvenli: mevcut TÜM işletmeleri 'active' yapar → bugünkü testerlar KİLİTLENMEZ.
-- ============================================================

-- 1) Durum alanları
alter table public.organizations
  add column if not exists access_status text not null default 'trial';
alter table public.organizations
  add column if not exists trial_ends_at timestamptz;

-- 2) Mevcut işletmeleri etkileme: hepsini aktif yap (grandfathered)
update public.organizations
  set access_status = 'active'
  where access_status is distinct from 'active';

-- 3) Yeni kayıtlarda 14 günlük deneme başlat
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  new_org_id uuid;
  org_name text;
begin
  org_name := coalesce(new.raw_user_meta_data->>'organization_name', 'İşletmem');
  insert into public.organizations (name, access_status, trial_ends_at)
    values (org_name, 'trial', now() + interval '14 days')
    returning id into new_org_id;
  insert into public.organization_members (user_id, organization_id, role)
    values (new.id, new_org_id, 'owner');
  return new;
end $$;

-- Bir işletmeyi elle aktive etmek için (ödeme gelene kadar):
--   update public.organizations set access_status='active' where name='...';
-- Değerler: 'trial' (deneme) | 'active' (ödeyen/aktif) | 'expired' | 'blocked'
