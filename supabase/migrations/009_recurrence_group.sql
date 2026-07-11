-- Tekrarlayan randevu serisi kimliği.
-- Aynı seride oluşturulan randevular ortak bir uuid taşır → "seriyi sil".
-- Supabase → SQL Editor → New query → yapıştır → Run.

alter table public.appointments
  add column if not exists recurrence_group_id uuid;

create index if not exists idx_appointments_recurrence
  on public.appointments(recurrence_group_id);
