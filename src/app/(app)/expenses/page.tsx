import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getUserRole } from "@/lib/roles";
import { ExpensesView } from "@/components/expenses-view";

export default async function ExpensesPage() {
  if ((await getUserRole()) !== "owner") redirect("/dashboard");
  const supabase = await createClient();

  const { data: membership } = await supabase
    .from("organization_members")
    .select("organization_id")
    .single();

  const { data: expenses } = await supabase
    .from("expenses")
    .select("id, amount, category, note, spent_at")
    .order("spent_at", { ascending: false });

  return (
    <ExpensesView
      orgId={membership?.organization_id ?? ""}
      initialExpenses={(expenses ?? []) as never}
    />
  );
}
