-- Randevu onayı (public link) + değerlendirme (Google yorum linki).
-- Supabase → SQL Editor → New query → yapıştır → Run.

-- Randevu onay token'ı + müşteri yanıtı (geliyorum/gelemiyorum)
alter table public.appointments
  add column if not exists confirm_token uuid not null default gen_random_uuid(),
  add column if not exists client_response text
    check (client_response is null or client_response in ('confirmed', 'declined'));

create index if not exists idx_appointments_confirm_token
  on public.appointments(confirm_token);

-- İşletme Google yorum linki (değerlendirme mesajında)
alter table public.organizations
  add column if not exists google_review_url text;

-- ---- Public (anon) fonksiyonlar: token ile onay ----
-- RLS'i açmadan, sadece token bilenlere sınırlı erişim (security definer).

create or replace function public.get_appointment_by_token(p_token uuid)
returns table (
  customer_name text,
  start_at timestamptz,
  duration_min int,
  service_name text,
  org_name text,
  response text
)
language sql
security definer
set search_path = public
as $$
  select c.name, a.start_at, a.duration_min, s.name, o.name, a.client_response
  from public.appointments a
  join public.customers c on c.id = a.customer_id
  left join public.services s on s.id = a.service_id
  join public.organizations o on o.id = a.organization_id
  where a.confirm_token = p_token
  limit 1
$$;

create or replace function public.respond_appointment(p_token uuid, p_response text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  n int;
begin
  if p_response not in ('confirmed', 'declined') then
    raise exception 'invalid response';
  end if;
  update public.appointments
    set client_response = p_response
    where confirm_token = p_token;
  get diagnostics n = row_count;
  return n > 0;
end
$$;

grant execute on function public.get_appointment_by_token(uuid) to anon;
grant execute on function public.respond_appointment(uuid, text) to anon;
