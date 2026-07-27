-- ============================================================
-- İşletme Asistanı — Veritabanı Şeması
-- Multi-tenant: her satır organization_id ile sahibine bağlı,
-- RLS politikaları kullanıcının sadece kendi org verisini görmesini sağlar.
-- ============================================================

-- ORGANIZATIONS ------------------------------------------------
create table if not exists public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  plan text not null default 'free' check (plan in ('free', 'premium')),
  iban text,
  iban_name text,
  created_at timestamptz not null default now()
);

-- ORGANIZATION_MEMBERS (kullanıcı ↔ organizasyon eşleştirmesi)
create table if not exists public.organization_members (
  user_id uuid not null references auth.users(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  role text not null default 'owner' check (role in ('owner', 'member')),
  created_at timestamptz not null default now(),
  primary key (user_id, organization_id)
);

create index if not exists idx_org_members_user on public.organization_members(user_id);
create index if not exists idx_org_members_org on public.organization_members(organization_id);

-- CUSTOMERS ----------------------------------------------------
create table if not exists public.customers (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  phone text,
  email text,
  notes text,
  tags text[] default '{}',
  birth_date date,
  last_contact_at timestamptz,
  kvkk_consent boolean not null default false,
  kvkk_consent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_customers_org on public.customers(organization_id);
create index if not exists idx_customers_name on public.customers(organization_id, name);

-- MESSAGES (AI ile üretilen / gönderilen mesaj geçmişi)
create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  customer_id uuid references public.customers(id) on delete set null,
  content text not null,
  tone text check (tone in ('professional', 'friendly', 'sales')),
  generated_by_ai boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists idx_messages_org on public.messages(organization_id);
create index if not exists idx_messages_customer on public.messages(customer_id);

-- AI_LOGS (maliyet ve kullanım takibi — kritik)
create table if not exists public.ai_logs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  feature text not null,
  input_tokens int,
  output_tokens int,
  model text,
  created_at timestamptz not null default now()
);

create index if not exists idx_ai_logs_org_date on public.ai_logs(organization_id, created_at desc);

-- ============================================================
-- TRIGGERS
-- ============================================================

-- updated_at otomatik güncelleme
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

drop trigger if exists trg_customers_updated_at on public.customers;
create trigger trg_customers_updated_at
  before update on public.customers
  for each row execute function public.set_updated_at();

-- Yeni kullanıcı kaydolunca otomatik organizasyon oluştur
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  new_org_id uuid;
  org_name text;
begin
  org_name := coalesce(new.raw_user_meta_data->>'organization_name', 'İşletmem');

  insert into public.organizations (name) values (org_name) returning id into new_org_id;
  insert into public.organization_members (user_id, organization_id, role)
    values (new.id, new_org_id, 'owner');

  return new;
end $$;

drop trigger if exists trg_auth_new_user on auth.users;
create trigger trg_auth_new_user
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

alter table public.organizations enable row level security;
alter table public.organization_members enable row level security;
alter table public.customers enable row level security;
alter table public.messages enable row level security;
alter table public.ai_logs enable row level security;

-- Yardımcı: kullanıcının üyesi olduğu org_id'leri döner
create or replace function public.user_org_ids()
returns setof uuid language sql stable security definer set search_path = public as $$
  select organization_id from public.organization_members where user_id = auth.uid()
$$;

-- ORGANIZATIONS policies
drop policy if exists "org_select_own" on public.organizations;
create policy "org_select_own" on public.organizations
  for select using (id in (select public.user_org_ids()));

drop policy if exists "org_update_owner" on public.organizations;
create policy "org_update_owner" on public.organizations
  for update using (
    id in (
      select organization_id from public.organization_members
      where user_id = auth.uid() and role = 'owner'
    )
  )
  with check (
    id in (
      select organization_id from public.organization_members
      where user_id = auth.uid() and role = 'owner'
    )
  );

-- ORGANIZATION_MEMBERS policies
drop policy if exists "members_select_own" on public.organization_members;
create policy "members_select_own" on public.organization_members
  for select using (user_id = auth.uid() or organization_id in (select public.user_org_ids()));

-- CUSTOMERS policies
drop policy if exists "customers_select" on public.customers;
create policy "customers_select" on public.customers
  for select using (organization_id in (select public.user_org_ids()));

drop policy if exists "customers_insert" on public.customers;
create policy "customers_insert" on public.customers
  for insert with check (organization_id in (select public.user_org_ids()));

drop policy if exists "customers_update" on public.customers;
create policy "customers_update" on public.customers
  for update using (organization_id in (select public.user_org_ids()))
  with check (organization_id in (select public.user_org_ids()));

drop policy if exists "customers_delete" on public.customers;
create policy "customers_delete" on public.customers
  for delete using (organization_id in (select public.user_org_ids()));

-- MESSAGES policies
drop policy if exists "messages_select" on public.messages;
create policy "messages_select" on public.messages
  for select using (organization_id in (select public.user_org_ids()));

drop policy if exists "messages_insert" on public.messages;
create policy "messages_insert" on public.messages
  for insert with check (organization_id in (select public.user_org_ids()));

drop policy if exists "messages_delete" on public.messages;
create policy "messages_delete" on public.messages
  for delete using (organization_id in (select public.user_org_ids()));

-- AI_LOGS policies (sadece okuma — yazma server-side service role ile)
drop policy if exists "ai_logs_select" on public.ai_logs;
create policy "ai_logs_select" on public.ai_logs
  for select using (organization_id in (select public.user_org_ids()));

-- ============================================================
-- RANDEVU SİSTEMİ
-- services: işletmenin sunduğu hizmet kataloğu (manikür, saç kesimi vb.)
-- appointments: müşteri ↔ hizmet ↔ tarih eşleşmesi
-- ============================================================

-- SERVICES ----------------------------------------------------
create table if not exists public.services (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  duration_min int not null default 30 check (duration_min > 0),
  price numeric(10, 2) check (price is null or price >= 0),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_services_org on public.services(organization_id);
create index if not exists idx_services_org_active on public.services(organization_id, active);

drop trigger if exists trg_services_updated_at on public.services;
create trigger trg_services_updated_at
  before update on public.services
  for each row execute function public.set_updated_at();

-- APPOINTMENTS ------------------------------------------------
-- service_id silinirse randevu kalır (set null) — duration ve price snapshot olarak tutulur.
create table if not exists public.appointments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  customer_id uuid not null references public.customers(id) on delete cascade,
  service_id uuid references public.services(id) on delete set null,
  start_at timestamptz not null,
  duration_min int not null default 30 check (duration_min > 0),
  status text not null default 'scheduled'
    check (status in ('scheduled', 'completed', 'cancelled', 'no_show')),
  price numeric(10, 2) check (price is null or price >= 0),
  notes text,
  reminder_sent_at timestamptz,
  recurrence_group_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_appointments_recurrence on public.appointments(recurrence_group_id);

create index if not exists idx_appointments_org_date on public.appointments(organization_id, start_at desc);
create index if not exists idx_appointments_customer on public.appointments(customer_id);
create index if not exists idx_appointments_status on public.appointments(organization_id, status);

drop trigger if exists trg_appointments_updated_at on public.appointments;
create trigger trg_appointments_updated_at
  before update on public.appointments
  for each row execute function public.set_updated_at();

-- RLS
alter table public.services enable row level security;
alter table public.appointments enable row level security;

-- SERVICES policies
drop policy if exists "services_select" on public.services;
create policy "services_select" on public.services
  for select using (organization_id in (select public.user_org_ids()));

drop policy if exists "services_insert" on public.services;
create policy "services_insert" on public.services
  for insert with check (organization_id in (select public.user_org_ids()));

drop policy if exists "services_update" on public.services;
create policy "services_update" on public.services
  for update using (organization_id in (select public.user_org_ids()))
  with check (organization_id in (select public.user_org_ids()));

drop policy if exists "services_delete" on public.services;
create policy "services_delete" on public.services
  for delete using (organization_id in (select public.user_org_ids()));

-- APPOINTMENTS policies
drop policy if exists "appointments_select" on public.appointments;
create policy "appointments_select" on public.appointments
  for select using (organization_id in (select public.user_org_ids()));

drop policy if exists "appointments_insert" on public.appointments;
create policy "appointments_insert" on public.appointments
  for insert with check (organization_id in (select public.user_org_ids()));

drop policy if exists "appointments_update" on public.appointments;
create policy "appointments_update" on public.appointments
  for update using (organization_id in (select public.user_org_ids()))
  with check (organization_id in (select public.user_org_ids()));

drop policy if exists "appointments_delete" on public.appointments;
create policy "appointments_delete" on public.appointments
  for delete using (organization_id in (select public.user_org_ids()));

-- ============================================================
-- PAKET / SEANS SİSTEMİ
-- customer_packages: müşterinin aldığı seans paketi (ör. "10 Seans Lazer").
-- Paket satışı = gelir anı; her tamamlanan randevu paketten 1 seans düşer.
-- Kalan = total_sessions - (package_id'si bu olan tamamlanmış randevu sayısı).
-- ============================================================

-- service_id null ise paket geneldir (her hizmette kullanılabilir).
-- type: 'session' (ders hakkı bazlı) | 'monthly' (aylık üyelik, dersler referans).
-- total_sessions yalnızca 'session' türünde anlamlı; 'monthly'de boş olabilir.
-- next_payment_at: aylık üyelikte sonraki ödeme tarihi.
create table if not exists public.customer_packages (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  customer_id uuid not null references public.customers(id) on delete cascade,
  service_id uuid references public.services(id) on delete set null,
  name text not null,
  type text not null default 'session' check (type in ('session', 'monthly')),
  total_sessions int check (total_sessions is null or total_sessions > 0),
  price numeric(10, 2) check (price is null or price >= 0),
  purchased_at timestamptz not null default now(),
  next_payment_at date,
  expires_at timestamptz,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_cust_packages_org on public.customer_packages(organization_id);
create index if not exists idx_cust_packages_customer on public.customer_packages(customer_id);

drop trigger if exists trg_cust_packages_updated_at on public.customer_packages;
create trigger trg_cust_packages_updated_at
  before update on public.customer_packages
  for each row execute function public.set_updated_at();

-- Randevuyu pakete bağlayan kolon. Paket silinirse randevu kalır (set null).
alter table public.appointments
  add column if not exists package_id uuid references public.customer_packages(id) on delete set null;

create index if not exists idx_appointments_package on public.appointments(package_id);

-- RLS
alter table public.customer_packages enable row level security;

drop policy if exists "cust_packages_select" on public.customer_packages;
create policy "cust_packages_select" on public.customer_packages
  for select using (organization_id in (select public.user_org_ids()));

drop policy if exists "cust_packages_insert" on public.customer_packages;
create policy "cust_packages_insert" on public.customer_packages
  for insert with check (organization_id in (select public.user_org_ids()));

drop policy if exists "cust_packages_update" on public.customer_packages;
create policy "cust_packages_update" on public.customer_packages
  for update using (organization_id in (select public.user_org_ids()))
  with check (organization_id in (select public.user_org_ids()));

drop policy if exists "cust_packages_delete" on public.customer_packages;
create policy "cust_packages_delete" on public.customer_packages
  for delete using (organization_id in (select public.user_org_ids()));

-- ============================================================
-- TELAFİ (MAKEUP) SİSTEMİ
-- Kaçırılan dersin ayrı defteri. Seans sayısını, paket süresini ve ödeme
-- gününü BOZMAZ — sadece kayıt + (telafi tarihinde) pakete saymayan randevu.
-- ============================================================

create table if not exists public.makeups (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  customer_id uuid not null references public.customers(id) on delete cascade,
  package_id uuid references public.customer_packages(id) on delete set null,
  appointment_id uuid references public.appointments(id) on delete set null,
  missed_date date not null,
  makeup_at timestamptz,
  status text not null default 'pending'
    check (status in ('pending', 'scheduled', 'completed', 'cancelled')),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_makeups_org on public.makeups(organization_id);
create index if not exists idx_makeups_customer on public.makeups(customer_id);

drop trigger if exists trg_makeups_updated_at on public.makeups;
create trigger trg_makeups_updated_at
  before update on public.makeups
  for each row execute function public.set_updated_at();

alter table public.makeups enable row level security;

drop policy if exists "makeups_select" on public.makeups;
create policy "makeups_select" on public.makeups
  for select using (organization_id in (select public.user_org_ids()));

drop policy if exists "makeups_insert" on public.makeups;
create policy "makeups_insert" on public.makeups
  for insert with check (organization_id in (select public.user_org_ids()));

drop policy if exists "makeups_update" on public.makeups;
create policy "makeups_update" on public.makeups
  for update using (organization_id in (select public.user_org_ids()))
  with check (organization_id in (select public.user_org_ids()));

drop policy if exists "makeups_delete" on public.makeups;
create policy "makeups_delete" on public.makeups
  for delete using (organization_id in (select public.user_org_ids()));

-- ============================================================
-- ÇALIŞANLAR (STAFF)
-- Sektör bağımsız (eğitmen/kuaför/doktor). Giriş yapmaz, sadece atama etiketi.
-- Müşteri "kimin üyesi" + randevu sahibi olarak kullanılır.
-- ============================================================

create table if not exists public.staff (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_staff_org on public.staff(organization_id);

drop trigger if exists trg_staff_updated_at on public.staff;
create trigger trg_staff_updated_at
  before update on public.staff
  for each row execute function public.set_updated_at();

alter table public.customers
  add column if not exists staff_id uuid references public.staff(id) on delete set null;

alter table public.appointments
  add column if not exists staff_id uuid references public.staff(id) on delete set null;

alter table public.staff enable row level security;

drop policy if exists "staff_select" on public.staff;
create policy "staff_select" on public.staff
  for select using (organization_id in (select public.user_org_ids()));

drop policy if exists "staff_insert" on public.staff;
create policy "staff_insert" on public.staff
  for insert with check (organization_id in (select public.user_org_ids()));

drop policy if exists "staff_update" on public.staff;
create policy "staff_update" on public.staff
  for update using (organization_id in (select public.user_org_ids()))
  with check (organization_id in (select public.user_org_ids()));

drop policy if exists "staff_delete" on public.staff;
create policy "staff_delete" on public.staff
  for delete using (organization_id in (select public.user_org_ids()));

-- ============================================================
-- ÇALIŞMA SAATLERİ + KAPALI GÜNLER (sektör bağımsız, opt-in)
-- Tanımlanmazsa kısıt yok. Randevu uygunluk UYARISI için kullanılır.
-- ============================================================

create table if not exists public.business_hours (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  weekday smallint not null check (weekday between 0 and 6), -- 0=Pazartesi
  is_open boolean not null default true,
  open_time time not null default '09:00',
  close_time time not null default '18:00',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, weekday)
);

create index if not exists idx_business_hours_org on public.business_hours(organization_id);

drop trigger if exists trg_business_hours_updated_at on public.business_hours;
create trigger trg_business_hours_updated_at
  before update on public.business_hours
  for each row execute function public.set_updated_at();

create table if not exists public.closed_days (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  date date not null,
  reason text,
  created_at timestamptz not null default now(),
  unique (organization_id, date)
);

create index if not exists idx_closed_days_org on public.closed_days(organization_id);

alter table public.business_hours enable row level security;
alter table public.closed_days enable row level security;

drop policy if exists "business_hours_select" on public.business_hours;
create policy "business_hours_select" on public.business_hours
  for select using (organization_id in (select public.user_org_ids()));

drop policy if exists "business_hours_insert" on public.business_hours;
create policy "business_hours_insert" on public.business_hours
  for insert with check (organization_id in (select public.user_org_ids()));

drop policy if exists "business_hours_update" on public.business_hours;
create policy "business_hours_update" on public.business_hours
  for update using (organization_id in (select public.user_org_ids()))
  with check (organization_id in (select public.user_org_ids()));

drop policy if exists "business_hours_delete" on public.business_hours;
create policy "business_hours_delete" on public.business_hours
  for delete using (organization_id in (select public.user_org_ids()));

drop policy if exists "closed_days_select" on public.closed_days;
create policy "closed_days_select" on public.closed_days
  for select using (organization_id in (select public.user_org_ids()));

drop policy if exists "closed_days_insert" on public.closed_days;
create policy "closed_days_insert" on public.closed_days
  for insert with check (organization_id in (select public.user_org_ids()));

drop policy if exists "closed_days_delete" on public.closed_days;
create policy "closed_days_delete" on public.closed_days
  for delete using (organization_id in (select public.user_org_ids()));

-- ============================================================
-- ÖDEME DEFTERİ (PAYMENTS) — fiilen tahsil edilen ödemeler
-- ============================================================

create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  customer_id uuid references public.customers(id) on delete set null,
  amount numeric(10, 2) not null check (amount >= 0),
  method text not null default 'cash'
    check (method in ('cash', 'card', 'transfer', 'other')),
  note text,
  paid_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists idx_payments_org_date on public.payments(organization_id, paid_at desc);
create index if not exists idx_payments_customer on public.payments(customer_id);

alter table public.payments enable row level security;

drop policy if exists "payments_select" on public.payments;
create policy "payments_select" on public.payments
  for select using (organization_id in (select public.user_org_ids()));

drop policy if exists "payments_insert" on public.payments;
create policy "payments_insert" on public.payments
  for insert with check (organization_id in (select public.user_org_ids()));

drop policy if exists "payments_update" on public.payments;
create policy "payments_update" on public.payments
  for update using (organization_id in (select public.user_org_ids()))
  with check (organization_id in (select public.user_org_ids()));

drop policy if exists "payments_delete" on public.payments;
create policy "payments_delete" on public.payments
  for delete using (organization_id in (select public.user_org_ids()));

-- ============================================================
-- GİDER DEFTERİ (EXPENSES) — gelir-gider / net kâr
-- ============================================================

create table if not exists public.expenses (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  amount numeric(10, 2) not null check (amount >= 0),
  category text not null default 'other'
    check (category in ('rent', 'salary', 'supplies', 'bills', 'other')),
  note text,
  spent_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists idx_expenses_org_date on public.expenses(organization_id, spent_at desc);

alter table public.expenses enable row level security;

drop policy if exists "expenses_select" on public.expenses;
create policy "expenses_select" on public.expenses
  for select using (organization_id in (select public.user_org_ids()));

drop policy if exists "expenses_insert" on public.expenses;
create policy "expenses_insert" on public.expenses
  for insert with check (organization_id in (select public.user_org_ids()));

drop policy if exists "expenses_update" on public.expenses;
create policy "expenses_update" on public.expenses
  for update using (organization_id in (select public.user_org_ids()))
  with check (organization_id in (select public.user_org_ids()));

drop policy if exists "expenses_delete" on public.expenses;
create policy "expenses_delete" on public.expenses
  for delete using (organization_id in (select public.user_org_ids()));

-- ============================================================
-- UYUMLULUK ALTER'LARI (idempotent)
-- create-if-not-exists var olan tabloya kolon eklemediği için, mevcut
-- veritabanlarında eksik kalan kolonları burada garanti ediyoruz.
-- ============================================================

alter table public.organizations add column if not exists iban text;
alter table public.organizations add column if not exists iban_name text;

alter table public.appointments add column if not exists reminder_sent_at timestamptz;
alter table public.appointments add column if not exists recurrence_group_id uuid;
alter table public.appointments add column if not exists staff_id uuid
  references public.staff(id) on delete set null;

alter table public.customer_packages add column if not exists type text
  not null default 'session' check (type in ('session', 'monthly'));
alter table public.customer_packages add column if not exists next_payment_at date;
alter table public.customer_packages alter column total_sessions drop not null;

alter table public.customers add column if not exists staff_id uuid
  references public.staff(id) on delete set null;
alter table public.customers add column if not exists birth_date date;

alter table public.appointments
  add column if not exists confirm_token uuid not null default gen_random_uuid();
alter table public.appointments
  add column if not exists client_response text
    check (client_response is null or client_response in ('confirmed', 'declined'));
create index if not exists idx_appointments_confirm_token
  on public.appointments(confirm_token);

alter table public.organizations add column if not exists google_review_url text;

-- Public (anon) onay fonksiyonları
create or replace function public.get_appointment_by_token(p_token uuid)
returns table (
  customer_name text, start_at timestamptz, duration_min int,
  service_name text, org_name text, response text
)
language sql security definer set search_path = public as $$
  select c.name, a.start_at, a.duration_min, s.name, o.name, a.client_response
  from public.appointments a
  join public.customers c on c.id = a.customer_id
  left join public.services s on s.id = a.service_id
  join public.organizations o on o.id = a.organization_id
  where a.confirm_token = p_token limit 1
$$;

create or replace function public.respond_appointment(p_token uuid, p_response text)
returns boolean language plpgsql security definer set search_path = public as $$
declare n int;
begin
  if p_response not in ('confirmed', 'declined') then raise exception 'invalid response'; end if;
  update public.appointments set client_response = p_response where confirm_token = p_token;
  get diagnostics n = row_count;
  return n > 0;
end $$;

grant execute on function public.get_appointment_by_token(uuid) to anon;
grant execute on function public.respond_appointment(uuid, text) to anon;
