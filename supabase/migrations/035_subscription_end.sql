-- Manuel satış için abonelik bitiş tarihi: süre geçince otomatik kilitlenir.
-- Admin panelden aktive ederken set edilir; ödeme gateway'i gelince de aynı alan.
-- Supabase → SQL Editor → Run. (idempotent)

alter table public.organizations
  add column if not exists subscription_ends_at timestamptz;
