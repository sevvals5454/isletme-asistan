-- Kullanıcı etkileşimi: uygulamaya uğramayanı "geri dön" bildirimiyle dürt + ayar.
-- Supabase → SQL Editor → Run. (idempotent)

alter table public.organizations
  add column if not exists last_active_at timestamptz;   -- son uygulama açılışı
alter table public.organizations
  add column if not exists last_nudge_at timestamptz;    -- son "geri dön" dürtmesi
alter table public.organizations
  add column if not exists notify_digest boolean not null default true;   -- sabah özeti
alter table public.organizations
  add column if not exists notify_inactive boolean not null default true; -- hareketsizlik dürtmesi
