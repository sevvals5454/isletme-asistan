-- Sabah günlük özet bildirimi için: her işletmeye günde 1 kez gönderildiğini
-- işaretleyen kolon. (Cron sık çalışsa da tekrar göndermez.)
-- Supabase → SQL Editor → Run.

alter table public.organizations add column if not exists last_digest_at date;
