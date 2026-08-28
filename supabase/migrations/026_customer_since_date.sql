-- Müşteri başlangıç tarihi — "ne zamandan beri müşterimiz" (eski müşterileri
-- geriye dönük girerken gerçek başlangıç tarihini kaydetmek için).
-- Supabase → SQL Editor → New query → yapıştır → Run.

alter table public.customers add column if not exists since_date date;
