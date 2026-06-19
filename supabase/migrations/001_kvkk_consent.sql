-- KVKK müşteri açık rıza takibi.
-- Mevcut bir veritabanına uygulanır (schema.sql zaten çalıştırılmışsa).
-- Supabase → SQL Editor → New query → yapıştır → Run.

alter table public.customers
  add column if not exists kvkk_consent boolean not null default false,
  add column if not exists kvkk_consent_at timestamptz;
