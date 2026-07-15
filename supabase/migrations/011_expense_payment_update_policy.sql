-- expenses ve payments için eksik UPDATE RLS politikaları.
-- (İlk migration'larda select/insert/delete vardı, update unutulmuştu →
-- gider/ödeme düzenleme RLS'e takılıyordu.)
-- Supabase → SQL Editor → New query → yapıştır → Run.

drop policy if exists "expenses_update" on public.expenses;
create policy "expenses_update" on public.expenses
  for update using (organization_id in (select public.user_org_ids()))
  with check (organization_id in (select public.user_org_ids()));

drop policy if exists "payments_update" on public.payments;
create policy "payments_update" on public.payments
  for update using (organization_id in (select public.user_org_ids()))
  with check (organization_id in (select public.user_org_ids()));
