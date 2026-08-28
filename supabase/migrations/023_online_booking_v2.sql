-- ============================================================
-- ONLINE RANDEVU v2 — personel bazlı müsaitlik + izin, zaman penceresi,
-- onay adımı, kötüye kullanım koruması. (017'nin üstüne çalışır.)
-- Supabase → SQL Editor → New query → yapıştır → Run. (idempotent)
-- ============================================================

-- 1) Yeni işletme ayarları + randevu onay bayrağı
alter table public.organizations
  add column if not exists online_booking_requires_approval boolean not null default false,
  add column if not exists online_min_notice_hours int not null default 0,
  add column if not exists online_max_advance_days int not null default 60;

alter table public.appointments
  add column if not exists pending_approval boolean not null default false;

-- 2) Genel bilgi: işletme + hizmet + çalışan + zaman penceresi
create or replace function public.get_booking_info(p_org uuid)
returns json language sql security definer set search_path = public as $$
  select json_build_object(
    'org_name', (select name from public.organizations where id = p_org),
    'enabled', coalesce((select online_booking_enabled from public.organizations where id = p_org), false),
    'min_notice_hours', coalesce((select online_min_notice_hours from public.organizations where id = p_org), 0),
    'max_advance_days', coalesce((select online_max_advance_days from public.organizations where id = p_org), 60),
    'services', coalesce((
      select json_agg(json_build_object('id', id, 'name', name, 'duration_min', duration_min, 'price', price) order by name)
      from public.services where organization_id = p_org and active = true), '[]'::json),
    'staff', coalesce((
      select json_agg(json_build_object('id', id, 'name', name) order by name)
      from public.staff where organization_id = p_org and active = true), '[]'::json)
  );
$$;

-- 3) Bir günün durumu — PERSONEL BAZLI kapasite + izin.
--    p_staff verilirse: o çalışanın doluluğu/izni; kapasite 1.
--    p_staff boşsa ("farketmez"): aktif personel sayısı - izinli sayısı = kapasite.
-- NOT: Eski 2 argümanlı get_booking_day(uuid,date) KORUNUR (deploy sırasında
-- eski istemci kırılmasın). Bu yeni sürüm 3 argümanlı ve DEFAULT'suz (belirsizlik olmasın).
create or replace function public.get_booking_day(p_org uuid, p_date date, p_staff uuid)
returns json language plpgsql security definer set search_path = public as $$
declare
  v_w int := extract(isodow from p_date)::int - 1;
  v_has_hours boolean;
  v_is_open boolean;
  v_open time; v_close time;
  v_closed boolean;
  v_active_staff int;
  v_on_leave int;
  v_capacity int;
  v_busy json;
  v_start timestamptz := (p_date::timestamp at time zone 'Europe/Istanbul');
  v_end   timestamptz := ((p_date + 1)::timestamp at time zone 'Europe/Istanbul');
begin
  select is_open, open_time, close_time into v_is_open, v_open, v_close
    from public.business_hours where organization_id = p_org and weekday = v_w;
  v_has_hours := found;
  if not v_has_hours then v_is_open := true; end if;

  v_closed := exists(select 1 from public.closed_days
    where organization_id = p_org and date = p_date and staff_id is null);

  select count(*) into v_active_staff from public.staff
    where organization_id = p_org and active = true;

  if p_staff is not null then
    v_capacity := 1;
    if exists(select 1 from public.closed_days
        where organization_id = p_org and date = p_date and staff_id = p_staff) then
      v_closed := true;
    end if;
    -- O personelin randevuları + personeli belirsiz (atanmamış) randevular da
    -- dolu sayılır; aksi halde atanmamış randevuya rağmen çift rezervasyon olur.
    select coalesce(json_agg(json_build_object('start_at', start_at, 'duration_min', duration_min)), '[]'::json)
      into v_busy from public.appointments
      where organization_id = p_org and status <> 'cancelled'
        and (staff_id = p_staff or staff_id is null)
        and start_at >= v_start and start_at < v_end;
  else
    if v_active_staff = 0 then
      v_capacity := 1;
    else
      select count(*) into v_on_leave from public.staff s
        where s.organization_id = p_org and s.active = true
          and exists(select 1 from public.closed_days cd
            where cd.organization_id = p_org and cd.date = p_date and cd.staff_id = s.id);
      v_capacity := greatest(v_active_staff - v_on_leave, 0);
    end if;
    select coalesce(json_agg(json_build_object('start_at', start_at, 'duration_min', duration_min)), '[]'::json)
      into v_busy from public.appointments
      where organization_id = p_org and status <> 'cancelled'
        and start_at >= v_start and start_at < v_end;
  end if;

  return json_build_object(
    'has_hours', v_has_hours,
    'is_open', coalesce(v_is_open, true),
    'open_time', v_open,
    'close_time', v_close,
    'closed', v_closed,
    'capacity', v_capacity,
    'busy', v_busy
  );
end $$;

-- 4) Randevu oluştur — kapasite/izin + zaman penceresi + telefon zorunlu +
--    kötüye kullanım limiti + onay bayrağı. (Yalnız sunucu/service_role çağırır.)
create or replace function public.create_booking(
  p_org uuid, p_service uuid, p_staff uuid, p_start timestamptz,
  p_name text, p_phone text
) returns json language plpgsql security definer set search_path = public as $$
declare
  v_dur int; v_price numeric; v_customer uuid; v_appt uuid; v_token uuid;
  v_min_notice int; v_max_adv int; v_req_approval boolean; v_enabled boolean;
  v_active_staff int; v_on_leave int; v_capacity int; v_overlap int; v_recent int;
  v_phone text := nullif(trim(p_phone), '');
  v_digits text;
  v_date date := (p_start at time zone 'Europe/Istanbul')::date;
begin
  if p_name is null or length(trim(p_name)) = 0 then
    return json_build_object('ok', false, 'error', 'Ad gerekli');
  end if;

  select online_booking_enabled, coalesce(online_min_notice_hours, 0),
         coalesce(online_max_advance_days, 60), coalesce(online_booking_requires_approval, false)
    into v_enabled, v_min_notice, v_max_adv, v_req_approval
    from public.organizations where id = p_org;
  if coalesce(v_enabled, false) = false then
    return json_build_object('ok', false, 'error', 'Online randevu kapalı');
  end if;

  -- Telefon zorunlu + format (mükerrer müşteri + limit için)
  if v_phone is null then
    return json_build_object('ok', false, 'error', 'Telefon numarası gerekli');
  end if;
  v_digits := regexp_replace(v_phone, '\D', '', 'g');
  if length(v_digits) < 10 or length(v_digits) > 11 then
    return json_build_object('ok', false, 'error', 'Geçerli bir telefon numarası girin');
  end if;

  -- Zaman penceresi
  if p_start < now() then
    return json_build_object('ok', false, 'error', 'Geçmiş bir saate randevu alınamaz');
  end if;
  if v_min_notice > 0 and p_start < now() + (v_min_notice || ' hours')::interval then
    return json_build_object('ok', false, 'error', 'Bu randevu için çok yakın bir saat seçtiniz');
  end if;
  if p_start > now() + (v_max_adv || ' days')::interval then
    return json_build_object('ok', false, 'error', 'Bu kadar ileri bir tarihe randevu alınamaz');
  end if;

  select duration_min, price into v_dur, v_price
    from public.services where id = p_service and organization_id = p_org;
  if v_dur is null then v_dur := 30; end if;

  -- Kapasite / izin (get_booking_day ile aynı mantık)
  select count(*) into v_active_staff from public.staff
    where organization_id = p_org and active = true;
  if p_staff is not null then
    if exists(select 1 from public.closed_days
        where organization_id = p_org and date = v_date and staff_id = p_staff) then
      return json_build_object('ok', false, 'error', 'Seçtiğiniz çalışan o gün müsait değil');
    end if;
    -- O personelin randevuları + atanmamış (null) randevular dolu sayılır.
    select count(*) into v_overlap from public.appointments a
      where a.organization_id = p_org and a.status <> 'cancelled'
        and (a.staff_id = p_staff or a.staff_id is null)
        and tstzrange(a.start_at, a.start_at + (a.duration_min || ' minutes')::interval)
            && tstzrange(p_start, p_start + (v_dur || ' minutes')::interval);
    if v_overlap >= 1 then
      return json_build_object('ok', false, 'error', 'Bu saat dolu, lütfen başka saat seçin');
    end if;
  else
    if v_active_staff = 0 then
      v_capacity := 1;
    else
      select count(*) into v_on_leave from public.staff s
        where s.organization_id = p_org and s.active = true
          and exists(select 1 from public.closed_days cd
            where cd.organization_id = p_org and cd.date = v_date and cd.staff_id = s.id);
      v_capacity := greatest(v_active_staff - v_on_leave, 0);
    end if;
    if v_capacity <= 0 then
      return json_build_object('ok', false, 'error', 'Bu gün için uygun personel yok');
    end if;
    select count(*) into v_overlap from public.appointments a
      where a.organization_id = p_org and a.status <> 'cancelled'
        and tstzrange(a.start_at, a.start_at + (a.duration_min || ' minutes')::interval)
            && tstzrange(p_start, p_start + (v_dur || ' minutes')::interval);
    if v_overlap >= v_capacity then
      return json_build_object('ok', false, 'error', 'Bu saat dolu, lütfen başka saat seçin');
    end if;
  end if;

  -- Kötüye kullanım: aynı telefondan son 24 saatte 5+ online randevu → engelle
  select count(*) into v_recent from public.appointments a
    join public.customers c on c.id = a.customer_id
    where a.organization_id = p_org and a.source = 'online'
      and c.phone = v_phone and a.created_at > now() - interval '24 hours';
  if v_recent >= 5 then
    return json_build_object('ok', false, 'error', 'Çok fazla randevu talebi oluşturdunuz; lütfen işletmeyle iletişime geçin');
  end if;

  -- Müşteriyi telefonla eşle veya oluştur
  select id into v_customer from public.customers
    where organization_id = p_org and phone = v_phone limit 1;
  if v_customer is null then
    insert into public.customers (organization_id, name, phone)
      values (p_org, trim(p_name), v_phone) returning id into v_customer;
  end if;

  insert into public.appointments
    (organization_id, customer_id, service_id, staff_id, start_at, duration_min, price, status, source, pending_approval)
    values (p_org, v_customer, p_service, p_staff, p_start, v_dur, v_price, 'scheduled', 'online', v_req_approval)
    returning id, confirm_token into v_appt, v_token;

  return json_build_object('ok', true, 'id', v_appt, 'token', v_token, 'pending', v_req_approval);
end $$;

-- 5) Yetkiler: okuma RPC'leri anon'a açık.
-- create_booking anon grant'ı KORUNUR (deploy kesintisi olmasın). Uygulama
-- /api/booking/create üzerinden çağırır (push için); doğrudan çağrılsa da
-- kapasite/limit kontrolleri fonksiyon içinde uygulandığından güvenli kalır.
grant execute on function public.get_booking_info(uuid) to anon;
grant execute on function public.get_booking_day(uuid, date, uuid) to anon;
