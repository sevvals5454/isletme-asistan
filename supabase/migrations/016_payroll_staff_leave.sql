-- ============================================================
-- MAAŞ + PRİM ve PERSONEL BAZLI İZİN
-- Supabase → SQL Editor → New query → yapıştır → Run.
-- (Uygulama migration çalışmasa da kırılmaz; sadece bu özellikler pasif kalır.)
-- ============================================================

-- Maaş + prim (personel bordrosu için)
alter table public.staff
  add column if not exists base_salary numeric default 0;
alter table public.staff
  add column if not exists commission_rate numeric default 0; -- yüzde (%)

-- Personel bazlı izin:
--   closed_days.staff_id NULL  → tüm işletme kapalı (mevcut davranış)
--   closed_days.staff_id dolu  → sadece o çalışan izinli, işletme açık
alter table public.closed_days
  add column if not exists staff_id uuid references public.staff(id) on delete cascade;
