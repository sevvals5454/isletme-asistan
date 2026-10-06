-- Otomatik e-posta hatırlatma: randevudan önce müşteriye mail.
-- Supabase → SQL Editor → Run. (idempotent)

-- Her randevu için 1 kez mail gönderildi işareti.
alter table public.appointments
  add column if not exists email_reminder_sent_at timestamptz;

-- İşletme bazında aç/kapa (varsayılan kapalı — e-posta/Resend ayarı gerektirir).
alter table public.organizations
  add column if not exists email_reminders_enabled boolean not null default false;
