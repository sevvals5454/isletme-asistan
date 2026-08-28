import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getUserRole } from "@/lib/roles";
import { BulkCustomerImport } from "@/components/bulk-customer-import";

export default async function CustomerImportPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: membership } = await supabase
    .from("organization_members")
    .select("organization_id")
    .eq("user_id", user?.id ?? "")
    .maybeSingle();
  if (!membership) redirect("/customers");

  const isOwner = (await getUserRole()) === "owner";

  // Mükerrer kontrolü için mevcut telefonlar (RLS: yalnız kendi işletmen).
  // Sahip için tüm çalışanları listele (müşterileri bir çalışana atayabilsin).
  const [{ data: existing }, { data: staff }] = await Promise.all([
    supabase.from("customers").select("phone").not("phone", "is", null),
    isOwner
      ? supabase
          .from("staff")
          .select("id, name")
          .eq("active", true)
          .order("name", { ascending: true })
      : Promise.resolve({ data: [] as { id: string; name: string }[] }),
  ]);

  const existingPhones = (existing ?? [])
    .map((c) => (c as { phone: string | null }).phone)
    .filter((p): p is string => !!p);

  return (
    <div className="mx-auto max-w-2xl">
      <BulkCustomerImport
        orgId={membership.organization_id}
        existingPhones={existingPhones}
        isOwner={isOwner}
        staff={(staff ?? []) as { id: string; name: string }[]}
      />
    </div>
  );
}
