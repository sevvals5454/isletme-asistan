-- ============================================================
-- ÖLÇEK HAZIRLIĞI — customers/appointments için performans index'leri.
-- Çok sayıda müşteri/randevu olduğunda liste, takvim ve online randevu
-- sorgularının hızlı kalması için. Karışma/güvenlikle ilgisi YOK (o RLS'te).
-- Güvenli: mevcut bir index aynı kolonu zaten kapsıyorsa YENİDEN OLUŞTURMAZ.
-- Supabase → SQL Editor → New query → yapıştır → Run. (idempotent)
-- ============================================================

do $$
begin
  -- customers: işletmeye göre listeleme + RLS filtresi
  if not exists (
    select 1 from pg_indexes
    where schemaname = 'public' and tablename = 'customers'
      and indexdef ilike '%(organization_id%'
  ) then
    create index idx_customers_org on public.customers(organization_id);
  end if;

  -- customers: online randevuda telefonla eşleme + mükerrer kontrolü
  if not exists (
    select 1 from pg_indexes
    where schemaname = 'public' and tablename = 'customers'
      and indexdef ilike '%phone%'
  ) then
    create index idx_customers_org_phone on public.customers(organization_id, phone);
  end if;

  -- appointments: liste/takvim (işletme + tarihe göre sıralı en sık sorgu)
  if not exists (
    select 1 from pg_indexes
    where schemaname = 'public' and tablename = 'appointments'
      and indexdef ilike '%start_at%'
  ) then
    create index idx_appointments_org_start on public.appointments(organization_id, start_at);
  end if;

  -- appointments: müşteri detayındaki randevu geçmişi (FK, Postgres otomatik indekslemez)
  if not exists (
    select 1 from pg_indexes
    where schemaname = 'public' and tablename = 'appointments'
      and indexdef ilike '%(customer_id%'
  ) then
    create index idx_appointments_customer on public.appointments(customer_id);
  end if;

  -- appointments: personel bazlı filtre (çalışan kapsamı + personel seçili müsaitlik)
  if not exists (
    select 1 from pg_indexes
    where schemaname = 'public' and tablename = 'appointments'
      and indexdef ilike '%(staff_id%'
  ) then
    create index idx_appointments_staff on public.appointments(staff_id);
  end if;
end $$;
