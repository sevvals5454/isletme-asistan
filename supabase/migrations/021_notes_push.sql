-- Not takip hatırlatmasını push olarak göndermek için.
-- (remind_at zaten 020'de; burada tekrar if-not-exists ile güvenli.)
-- Supabase → SQL Editor → New query → yapıştır → Run.
alter table public.notes
  add column if not exists remind_at timestamptz;
alter table public.notes
  add column if not exists push_sent_at timestamptz;
