-- Hatırlatma gönderildi takibi.
-- Manuel (wa.me) hatırlatma akışında hangi randevuya hatırlatma
-- gönderildiğini işaretlemek için. Otomatik gönderim YOK — sadece takip.
-- Supabase → SQL Editor → New query → yapıştır → Run.

alter table public.appointments
  add column if not exists reminder_sent_at timestamptz;
