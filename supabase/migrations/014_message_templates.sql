-- Düzenlenebilir mesaj şablonları. İşletme, mesajları kendi diliyle yazar.
-- JSONB: { "appointment_reminder": "...", "birthday": "...", ... }
-- Boş/eksikse uygulama varsayılan şablonlara düşer (kırılmaz).
-- Supabase → SQL Editor → New query → yapıştır → Run.

alter table public.organizations add column if not exists message_templates jsonb;
