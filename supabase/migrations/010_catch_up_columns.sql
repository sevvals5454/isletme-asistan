-- YAKALAMA (catch-up): var olan tablolara eksik kolonları ekler.
-- schema.sql'i yeniden çalıştırmak mevcut tablolara kolon EKLEMEZ
-- (create if not exists no-op) — bu dosya eksik ALTER'ları toplar.
-- Hepsi idempotent; zaten varsa hata vermez.
-- Supabase → SQL Editor → New query → yapıştır → Run.

-- organizations (IBAN)
alter table public.organizations add column if not exists iban text;
alter table public.organizations add column if not exists iban_name text;

-- appointments
alter table public.appointments add column if not exists reminder_sent_at timestamptz;
alter table public.appointments add column if not exists recurrence_group_id uuid;
alter table public.appointments add column if not exists staff_id uuid
  references public.staff(id) on delete set null;

-- customer_packages (paket türü + aylık ödeme)
alter table public.customer_packages add column if not exists type text
  not null default 'session' check (type in ('session', 'monthly'));
alter table public.customer_packages add column if not exists next_payment_at date;
alter table public.customer_packages alter column total_sessions drop not null;

-- customers (sorumlu çalışan)
alter table public.customers add column if not exists staff_id uuid
  references public.staff(id) on delete set null;

create index if not exists idx_appointments_recurrence on public.appointments(recurrence_group_id);
