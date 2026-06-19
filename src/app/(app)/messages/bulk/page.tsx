import { createClient } from "@/lib/supabase/server";
import { BulkMessage } from "@/components/bulk-message";

export default async function BulkMessagePage() {
  const supabase = await createClient();

  const [{ data: customers }, { data: org }] = await Promise.all([
    supabase
      .from("customers")
      .select("id, name, phone, tags, kvkk_consent")
      .order("name", { ascending: true }),
    supabase.from("organizations").select("name").single(),
  ]);

  return (
    <BulkMessage
      customers={(customers ?? []) as never}
      orgName={org?.name ?? ""}
    />
  );
}
