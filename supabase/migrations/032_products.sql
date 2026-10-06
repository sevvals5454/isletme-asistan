-- Ürün / stok satış takibi (sektör bağımsız): ürün tanımı + stok + satış kaydı.
-- Örn. kozmetik ürün, içecek, aksesuar, kıyafet… Satış stoğu düşürür ve gelire yazılır.
-- Supabase → SQL Editor → Run. (idempotent)

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  price numeric(10, 2) not null default 0 check (price >= 0),
  cost numeric(10, 2) check (cost is null or cost >= 0),
  stock int not null default 0,
  low_stock_at int not null default 0, -- bu değerin altına düşünce uyarı
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create index if not exists idx_products_org on public.products(organization_id, active);

create table if not exists public.product_sales (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  product_id uuid references public.products(id) on delete set null,
  product_name text not null, -- ürün silinse de satış geçmişi kalsın
  customer_id uuid references public.customers(id) on delete set null,
  staff_id uuid references public.staff(id) on delete set null,
  quantity int not null default 1 check (quantity > 0),
  unit_price numeric(10, 2) not null default 0 check (unit_price >= 0),
  total numeric(10, 2) not null default 0 check (total >= 0),
  note text,
  sold_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists idx_product_sales_org_date
  on public.product_sales(organization_id, sold_at desc);

-- RLS: organizasyon üyeleri görür/yazar (çalışan da satış yapabilir).
alter table public.products enable row level security;
alter table public.product_sales enable row level security;

drop policy if exists "products_select" on public.products;
create policy "products_select" on public.products
  for select using (organization_id in (select public.user_org_ids()));
drop policy if exists "products_insert" on public.products;
create policy "products_insert" on public.products
  for insert with check (organization_id in (select public.user_org_ids()));
drop policy if exists "products_update" on public.products;
create policy "products_update" on public.products
  for update using (organization_id in (select public.user_org_ids()));
drop policy if exists "products_delete" on public.products;
create policy "products_delete" on public.products
  for delete using (organization_id in (select public.user_org_ids()));

drop policy if exists "product_sales_select" on public.product_sales;
create policy "product_sales_select" on public.product_sales
  for select using (organization_id in (select public.user_org_ids()));
drop policy if exists "product_sales_insert" on public.product_sales;
create policy "product_sales_insert" on public.product_sales
  for insert with check (organization_id in (select public.user_org_ids()));
drop policy if exists "product_sales_delete" on public.product_sales;
create policy "product_sales_delete" on public.product_sales
  for delete using (organization_id in (select public.user_org_ids()));

-- Satış: stoğu atomik düşür + satış kaydı oluştur (yetki RLS'den gelir).
create or replace function public.sell_product(
  p_product_id uuid,
  p_quantity int,
  p_customer_id uuid default null,
  p_staff_id uuid default null,
  p_note text default null
) returns json language plpgsql security invoker set search_path = public as $$
declare
  v_prod public.products%rowtype;
  v_sale_id uuid;
begin
  if p_quantity is null or p_quantity < 1 then
    return json_build_object('ok', false, 'error', 'Adet en az 1 olmalı');
  end if;
  -- RLS otomatik olarak yalnızca kullanıcının org'undaki ürünü döndürür.
  select * into v_prod from public.products where id = p_product_id for update;
  if not found then
    return json_build_object('ok', false, 'error', 'Ürün bulunamadı');
  end if;
  if v_prod.stock < p_quantity then
    return json_build_object('ok', false, 'error', 'Yetersiz stok (kalan: ' || v_prod.stock || ')');
  end if;

  update public.products set stock = stock - p_quantity where id = p_product_id;

  insert into public.product_sales (
    organization_id, product_id, product_name, customer_id, staff_id,
    quantity, unit_price, total, note
  ) values (
    v_prod.organization_id, v_prod.id, v_prod.name, p_customer_id, p_staff_id,
    p_quantity, v_prod.price, v_prod.price * p_quantity, nullif(trim(p_note), '')
  ) returning id into v_sale_id;

  return json_build_object('ok', true, 'sale_id', v_sale_id, 'stock', v_prod.stock - p_quantity);
end $$;

grant execute on function public.sell_product(uuid, int, uuid, uuid, text) to authenticated;
