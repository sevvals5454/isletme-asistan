-- Nota opsiyonel takip/hatırlatma tarihi ekle (ör. "Cuma gelecek").
-- Supabase → SQL Editor → New query → yapıştır → Run.
alter table public.notes
  add column if not exists remind_at timestamptz;
