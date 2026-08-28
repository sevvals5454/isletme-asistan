import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { BulkCustomerImport } from "@/components/bulk-customer-import";

export default async function CustomerImportPage() {
  const supabase = await createClient();

  const { data: membership } = await supabase
    .from("organization_members")
    .select("organization_id")
    .single();
  if (!membership) redirect("/customers");

  // Mükerrer kontrolü için mevcut telefonlar (RLS: yalnız kendi işletmen).
  const { data: existing } = await supabase
    .from("customers")
    .select("phone")
    .not("phone", "is", null);

  const existingPhones = (existing ?? [])
    .map((c) => (c as { phone: string | null }).phone)
    .filter((p): p is string => !!p);

  return (
    <div className="mx-auto max-w-2xl">
      <BulkCustomerImport
        orgId={membership.organization_id}
        existingPhones={existingPhones}
      />
    </div>
  );
}
