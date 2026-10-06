-- Memnuniyet anketi: müşteri randevusunu 1-5 yıldız + yorumla puanlar (in-app).
-- Supabase → SQL Editor → Run. (idempotent)

alter table public.appointments
  add column if not exists customer_rating int,
  add column if not exists customer_feedback text;

-- get_appointment_by_token: status + mevcut puanı da döndür (eski alanlar korunur).
drop function if exists public.get_appointment_by_token(uuid);
create or replace function public.get_appointment_by_token(p_token uuid)
returns table (
  customer_name text,
  start_at timestamptz,
  duration_min int,
  service_name text,
  org_name text,
  response text,
  status text,
  customer_rating int
)
language sql security definer set search_path = public as $$
  select c.name, a.start_at, a.duration_min, s.name, o.name,
         a.client_response, a.status, a.customer_rating
  from public.appointments a
  join public.customers c on c.id = a.customer_id
  left join public.services s on s.id = a.service_id
  join public.organizations o on o.id = a.organization_id
  where a.confirm_token = p_token;
$$;

-- Puanlama (anon): token ile randevuya 1-5 yıldız + yorum.
create or replace function public.rate_appointment(
  p_token uuid, p_rating int, p_feedback text
) returns json language plpgsql security definer set search_path = public as $$
declare v_id uuid;
begin
  if p_rating is null or p_rating < 1 or p_rating > 5 then
    return json_build_object('ok', false, 'error', 'Puan 1-5 arası olmalı');
  end if;
  update public.appointments
     set customer_rating = p_rating,
         customer_feedback = nullif(trim(p_feedback), '')
   where confirm_token = p_token
   returning id into v_id;
  if v_id is null then
    return json_build_object('ok', false, 'error', 'Randevu bulunamadı');
  end if;
  return json_build_object('ok', true);
end $$;

grant execute on function public.get_appointment_by_token(uuid) to anon;
grant execute on function public.rate_appointment(uuid, int, text) to anon;
