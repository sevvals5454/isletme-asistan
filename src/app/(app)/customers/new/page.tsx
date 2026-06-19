import { CustomerForm } from "@/components/customer-form";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";

export default async function NewCustomerPage() {
  const supabase = await createClient();
  const { data: staff } = await supabase
    .from("staff")
    .select("id, name")
    .eq("active", true)
    .order("name", { ascending: true });

  return (
    <div className="space-y-6">
      <Link
        href="/customers"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft className="h-4 w-4" />
        Müşteriler
      </Link>

      <div>
        <h1 className="text-2xl font-semibold">Yeni müşteri</h1>
        <p className="text-sm text-muted-foreground">
          Yeni bir müşteri kaydı oluşturun
        </p>
      </div>

      <div className="rounded-xl border bg-card p-6">
        <CustomerForm staff={staff ?? []} />
      </div>
    </div>
  );
}
