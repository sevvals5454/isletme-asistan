import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { AppointmentsView } from "@/components/appointments-view";
import {
  type CustomerPackage,
  withUsage,
  remainingSessions,
  isPackageUsable,
} from "@/lib/packages";

export default async function AppointmentsPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  const { date } = await searchParams;
  const openNewAt = date && /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : undefined;

  // Onay linki için canlı taban URL (header'dan).
  const hdrs = await headers();
  const host = hdrs.get("host");
  const proto = hdrs.get("x-forwarded-proto") ?? "https";
  const baseUrl = host ? `${proto}://${host}` : "";

  const supabase = await createClient();

  const { data: membership } = await supabase
    .from("organization_members")
    .select("organization_id")
    .single();

  const [
    { data: appointments },
    { data: customers },
    { data: services },
    { data: packagesData },
    { data: usedRows },
    { data: staff },
    { data: hours },
    { data: closedDays },
    { data: org },
  ] = await Promise.all([
    supabase
      .from("appointments")
      .select(
        "id, start_at, duration_min, status, price, notes, customer_id, service_id, package_id, staff_id, recurrence_group_id, confirm_token, client_response, customers(name, phone), services(name), staff(name)",
      )
      .order("start_at", { ascending: false }),
    supabase
      .from("customers")
      .select("id, name")
      .order("name", { ascending: true }),
    supabase
      .from("services")
      .select("id, name, duration_min, price")
      .eq("active", true)
      .order("name", { ascending: true }),
    supabase
      .from("customer_packages")
      .select(
        "id, customer_id, service_id, name, type, total_sessions, price, purchased_at, next_payment_at, expires_at, notes",
      ),
    supabase
      .from("appointments")
      .select("package_id")
      .eq("status", "completed")
      .not("package_id", "is", null),
    supabase
      .from("staff")
      .select("id, name")
      .eq("active", true)
      .order("name", { ascending: true }),
    supabase
      .from("business_hours")
      .select("weekday, is_open, open_time, close_time"),
    supabase.from("closed_days").select("date"),
    supabase.from("organizations").select("name, google_review_url").single(),
  ]);

  // Paketlerin kalan seansını tamamlanmış randevulardan hesapla;
  // sadece randevuda kullanılabilir olanları (kalan > 0, süresi dolmamış) geçir.
  const usedByPackageId = new Map<string, number>();
  for (const r of (usedRows ?? []) as { package_id: string | null }[]) {
    if (!r.package_id) continue;
    usedByPackageId.set(
      r.package_id,
      (usedByPackageId.get(r.package_id) ?? 0) + 1,
    );
  }
  const usablePackages = withUsage(
    (packagesData ?? []) as unknown as CustomerPackage[],
    usedByPackageId,
  )
    .filter((p) => isPackageUsable(p))
    .map((p) => ({
      id: p.id,
      customer_id: p.customer_id,
      service_id: p.service_id,
      name: p.name,
      remaining: remainingSessions(p),
    }));

  return (
    <AppointmentsView
      orgId={membership?.organization_id ?? ""}
      initialAppointments={(appointments ?? []) as never}
      customers={customers ?? []}
      services={services ?? []}
      packages={usablePackages}
      staff={staff ?? []}
      hours={(hours ?? []) as never}
      closedDays={((closedDays ?? []) as { date: string }[]).map((d) => d.date)}
      orgName={org?.name ?? ""}
      reviewUrl={
        (org as { google_review_url?: string | null } | null)
          ?.google_review_url ?? ""
      }
      baseUrl={baseUrl}
      openNewAt={openNewAt}
    />
  );
}
