-- Müşteri doğum tarihi — doğum günü aksiyonu (proaktif asistan) için.
-- Supabase → SQL Editor → New query → yapıştır → Run.

alter table public.customers add column if not exists birth_date date;
