-- ============================================================
-- ONLINE RANDEVU (müşteri kendi kendine randevu alır)
-- Supabase → SQL Editor → New query → yapıştır → Run.
-- Güvenlik: anon SADECE hizmet listesi + boş/dolu SAAT görür; müşteri adı/
-- telefonu/geliri GÖREMEZ. Randevu oluşturma güvenli fonksiyondan geçer.
-- ============================================================

-- Randevu kaynağı + online randevu aç/kapa
alter table public.appointments
  add column if not exists source text not null default 'manual';
alter table public.organizations
  add column if not exists online_booking_enabled boolean not null default true;

-- 1) Genel bilgi: işletme adı + açık mı + hizmetler + çalışanlar
create or replace function public.get_booking_info(p_org uuid)
returns json language sql security definer set search_path = public as $$
  select json_build_object(
    'org_name', (select name from public.organizations where id = p_org),
    'enabled', coalesce((select online_booking_enabled from public.organizations where id = p_org), false),
    'services', coalesce((
      select json_agg(json_build_object('id', id, 'name', name, 'duration_min', duration_min, 'price', price) order by name)
      from public.services where organization_id = p_org and active = true), '[]'::json),
    'staff', coalesce((
      select json_agg(json_build_object('id', id, 'name', name) order by name)
      from public.staff where organization_id = p_org and active = true), '[]'::json)
  );
$$;

-- 2) Bir günün durumu: açık mı, saatleri, kapalı mı + dolu aralıklar (SADECE saat, isim yok)
create or replace function public.get_booking_day(p_org uuid, p_date date)
returns json language sql security definer set search_path = public as $$
  with wd as (select (extract(isodow from p_date)::int - 1) as w),
  bh as (
    select is_open, open_time, close_time
    from public.business_hours, wd
    where organization_id = p_org and weekday = wd.w
  )
  select json_build_object(
    'has_hours', exists(select 1 from bh),
    'is_open', coalesce((select is_open from bh), true),
    'open_time', (select open_time from bh),
    'close_time', (select close_time from bh),
    'closed', exists(
      select 1 from public.closed_days
      where organization_id = p_org and date = p_date and staff_id is null),
    'busy', coalesce((
      select json_agg(json_build_object('start_at', a.start_at, 'duration_min', a.duration_min))
      from public.appointments a
      where a.organization_id = p_org and a.status <> 'cancelled'
        and a.start_at >= (p_date::timestamp at time zone 'Europe/Istanbul')
        and a.start_at <  ((p_date + 1)::timestamp at time zone 'Europe/Istanbul')
    ), '[]'::json)
  );
$$;

-- 3) Randevu oluştur (müşteriyi telefonla eşle veya oluştur, çakışmayı engelle)
create or replace function public.create_booking(
  p_org uuid, p_service uuid, p_staff uuid, p_start timestamptz,
  p_name text, p_phone text
) returns json language plpgsql security definer set search_path = public as $$
declare
  v_dur int; v_price numeric; v_customer uuid; v_appt uuid; v_overlap int;
begin
  if p_name is null or length(trim(p_name)) = 0 then
    return json_build_object('ok', false, 'error', 'Ad gerekli');
  end if;
  if coalesce((select online_booking_enabled from public.organizations where id = p_org), false) = false then
    return json_build_object('ok', false, 'error', 'Online randevu kapalı');
  end if;
  if p_start < now() then
    return json_build_object('ok', false, 'error', 'Geçmiş bir saate randevu alınamaz');
  end if;

  select duration_min, price into v_dur, v_price
    from public.services where id = p_service and organization_id = p_org;
  if v_dur is null then v_dur := 30; end if;

  select count(*) into v_overlap from public.appointments a
    where a.organization_id = p_org and a.status <> 'cancelled'
      and tstzrange(a.start_at, a.start_at + (a.duration_min || ' minutes')::interval)
          && tstzrange(p_start, p_start + (v_dur || ' minutes')::interval);
  if v_overlap > 0 then
    return json_build_object('ok', false, 'error', 'Bu saat dolu, lütfen başka saat seçin');
  end if;

  if p_phone is not null and length(trim(p_phone)) > 0 then
    select id into v_customer from public.customers
      where organization_id = p_org and phone = trim(p_phone) limit 1;
  end if;
  if v_customer is null then
    insert into public.customers (organization_id, name, phone)
      values (p_org, trim(p_name), nullif(trim(p_phone), ''))
      returning id into v_customer;
  end if;

  insert into public.appointments
    (organization_id, customer_id, service_id, staff_id, start_at, duration_min, price, status, source)
    values (p_org, v_customer, p_service, p_staff, p_start, v_dur, v_price, 'scheduled', 'online')
    returning id into v_appt;

  return json_build_object('ok', true, 'id', v_appt);
end $$;

grant execute on function public.get_booking_info(uuid) to anon;
grant execute on function public.get_booking_day(uuid, date) to anon;
grant execute on function public.create_booking(uuid, uuid, uuid, timestamptz, text, text) to anon;
