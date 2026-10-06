import { createClient } from "@/lib/supabase/server";
import { ProductsView } from "@/components/products-view";
import type { Product, ProductSale } from "@/lib/products";

export default async function ProductsPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: membership } = await supabase
    .from("organization_members")
    .select("organization_id")
    .eq("user_id", user?.id ?? "")
    .maybeSingle();

  const [{ data: products }, { data: sales }, { data: customers }, { data: staff }] =
    await Promise.all([
      supabase
        .from("products")
        .select("id, name, price, cost, stock, low_stock_at, active")
        .order("name", { ascending: true }),
      supabase
        .from("product_sales")
        .select(
          "id, product_id, product_name, customer_id, staff_id, quantity, unit_price, total, note, sold_at, customers(name), staff(name)",
        )
        .order("sold_at", { ascending: false })
        .limit(100),
      supabase.from("customers").select("id, name").order("name"),
      supabase.from("staff").select("id, name").eq("active", true).order("name"),
    ]);

  return (
    <ProductsView
      orgId={membership?.organization_id ?? ""}
      initialProducts={(products ?? []) as Product[]}
      initialSales={(sales ?? []) as unknown as ProductSale[]}
      customers={(customers ?? []) as { id: string; name: string }[]}
      staff={(staff ?? []) as { id: string; name: string }[]}
    />
  );
}
