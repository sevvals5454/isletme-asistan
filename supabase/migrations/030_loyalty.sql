-- Müşteri sadakat programı: ziyaret (tamamlanan randevu) başına puan.
-- İşletme bir "ödül eşiği" belirler (ör. 10 ziyarette 1 ödül). 0 = kapalı.
-- Supabase → SQL Editor → Run. (idempotent)

alter table public.organizations
  add column if not exists loyalty_threshold int not null default 0;
