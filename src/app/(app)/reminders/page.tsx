import { createClient } from "@/lib/supabase/server";
import { RemindersView } from "@/components/reminders-view";
import { trStartOfDay, addDays } from "@/lib/time";

export default async function RemindersPage() {
  const supabase = await createClient();

  // Bugün + yarınki planlanmış randevular (Türkiye saatine göre pencere).
  const start = trStartOfDay();
  const end = addDays(start, 2);

  const [{ data: appointments }, { data: org }] = await Promise.all([
    supabase
      .from("appointments")
      .select(
        "id, start_at, reminder_sent_at, customers(name, phone), services(name)",
      )
      .eq("status", "scheduled")
      .gte("start_at", start.toISOString())
      .lt("start_at", end.toISOString())
      .order("start_at", { ascending: true }),
    supabase.from("organizations").select("name").single(),
  ]);

  return (
    <RemindersView
      initial={(appointments ?? []) as never}
      orgName={org?.name ?? ""}
    />
  );
}
