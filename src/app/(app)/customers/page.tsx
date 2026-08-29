import Link from "next/link";
import { Plus, Users, Upload } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { CustomerList } from "@/components/customer-list";

export default async function CustomersPage() {
  const supabase = await createClient();
  const { data: customers } = await supabase
    .from("customers")
    .select("id, name, phone, email, created_at, tags")
    .order("created_at", { ascending: false });

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
        <CustomerList customers={customers} />
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
