import Link from "next/link";
import { Plus, Users, Upload } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { CustomerList } from "@/components/customer-list";

export default async function CustomersPage() {
  const supabase = await createClient();
  const [{ data: customers }, { data: pkgs }, { data: appts }, { data: pays }] =
    await Promise.all([
      supabase
        .from("customers")
        .select("id, name, phone, email, created_at, tags")
        .order("created_at", { ascending: false }),
      // Açık hesap için: paket/hizmet/ödeme toplamları (RLS: kendi işletmen).
      supabase.from("customer_packages").select("customer_id, price"),
      supabase
        .from("appointments")
        .select("customer_id, price")
        .eq("status", "completed")
        .is("package_id", null),
      supabase.from("payments").select("customer_id, amount"),
    ]);

  // Müşteri bazında bakiye: borç (paket + hizmet) − ödeme.
  const charge = new Map<string, number>();
  for (const p of (pkgs ?? []) as { customer_id: string; price: number | null }[])
    charge.set(p.customer_id, (charge.get(p.customer_id) ?? 0) + (Number(p.price) || 0));
  for (const a of (appts ?? []) as { customer_id: string; price: number | null }[])
    charge.set(a.customer_id, (charge.get(a.customer_id) ?? 0) + (Number(a.price) || 0));
  const paid = new Map<string, number>();
  for (const p of (pays ?? []) as { customer_id: string; amount: number | null }[])
    paid.set(p.customer_id, (paid.get(p.customer_id) ?? 0) + (Number(p.amount) || 0));
  const customersWithBalance = (customers ?? []).map((c) => ({
    ...c,
    balance: (charge.get(c.id) ?? 0) - (paid.get(c.id) ?? 0),
  }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Müşteriler</h1>
          <p className="text-sm text-muted-foreground">
            {customers?.length ?? 0} müşteri kayıtlı
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/customers/import"
            className="inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium hover:bg-muted"
          >
            <Upload className="h-4 w-4" />
            Toplu ekle
          </Link>
          <Link
            href="/customers/new"
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
          >
            <Plus className="h-4 w-4" />
            Yeni müşteri
          </Link>
        </div>
      </div>

      {!customers || customers.length === 0 ? (
        <EmptyState />
      ) : (
        <CustomerList customers={customersWithBalance} />
      )}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="rounded-xl border bg-card p-12 text-center">
      <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
        <Users className="h-6 w-6 text-muted-foreground" />
      </div>
      <h3 className="mb-1 font-semibold">Henüz müşteri yok</h3>
      <p className="mb-6 text-sm text-muted-foreground">
        İlk müşterinizi ekleyerek başlayın
      </p>
      <Link
        href="/customers/new"
        className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
      >
        <Plus className="h-4 w-4" />
        Yeni müşteri ekle
      </Link>
    </div>
  );
}
