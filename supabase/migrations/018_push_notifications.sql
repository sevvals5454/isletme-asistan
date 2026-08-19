-- ============================================================
-- PUSH BİLDİRİM (telefon kapalıyken de) — web push abonelikleri
-- Supabase → SQL Editor → New query → yapıştır → Run.
-- ============================================================

create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now()
);

alter table public.push_subscriptions enable row level security;

-- Kullanıcı yalnızca kendi cihaz aboneliklerini yönetir.
drop policy if exists "own push subs" on public.push_subscriptions;
create policy "own push subs" on public.push_subscriptions
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Randevu hatırlatma push'u gönderildi mi (tekrar göndermemek için).
alter table public.appointments
  add column if not exists push_reminder_sent_at timestamptz;
