import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Sidebar } from "@/components/sidebar";
import { UpdateNotifier } from "@/components/update-notifier";
import { AppointmentSoonNotifier } from "@/components/appointment-soon-notifier";
import { PushPrompt } from "@/components/push-prompt";
import { WelcomeTour } from "@/components/welcome-tour";
import { AccessLock } from "@/components/access-lock";
import { isLocked, trialDaysLeft } from "@/lib/plans";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: membership } = await supabase
    .from("organization_members")
    .select("organization_id, role, organizations(name)")
    .eq("user_id", user.id)
    .single();

  const orgName =
    (membership?.organizations as { name?: string } | null)?.name ?? "İşletmem";
  // DB'de owner dışı rol ('member') = çalışan. Menü/sayfa erişimi buna göre.
  const role: "owner" | "employee" =
    membership?.role === "owner" ? "owner" : "employee";

  // Canlı randevu bildirimi için özel şablonlar (tolerant — kolon yoksa varsayılan).
  let messageTemplates: Record<string, string> | null = null;
  if (membership?.organization_id) {
    const { data: orgTpl } = await supabase
      .from("organizations")
      .select("message_templates")
      .eq("id", membership.organization_id)
      .single();
    messageTemplates =
      (orgTpl as { message_templates?: Record<string, string> | null } | null)
        ?.message_templates ?? null;
  }

  // Erişim/deneme durumu (FAIL-OPEN: ayrı tolerant sorgu; kolon yoksa açık kalır).
  let accessStatus: string | null = null;
  let trialEndsAt: string | null = null;
  if (membership?.organization_id) {
    const { data: acc } = await supabase
      .from("organizations")
      .select("access_status, trial_ends_at")
      .eq("id", membership.organization_id)
      .single();
    const a = acc as {
      access_status?: string | null;
      trial_ends_at?: string | null;
    } | null;
    accessStatus = a?.access_status ?? null;
    trialEndsAt = a?.trial_ends_at ?? null;
  }

  // Deneme bitti + ödenmemiş → kilit ekranı (redirect DEĞİL; döngü olmasın).
  if (isLocked(accessStatus, trialEndsAt)) {
    return (
      <AccessLock role={role} orgId={membership?.organization_id ?? ""} />
    );
  }

  // Deneme sürüyorsa kaç gün kaldığını banner'da göster (yalnız patrona).
  const daysLeft =
    accessStatus === "trial" ? trialDaysLeft(trialEndsAt) : null;

  return (
    <div className="min-h-screen bg-background">
      <WelcomeTour />
      <UpdateNotifier />
      <AppointmentSoonNotifier orgName={orgName} templates={messageTemplates} />
      <Sidebar orgName={orgName} userEmail={user.email ?? ""} role={role} />
      <main className="md:pl-64">
        <PushPrompt />
        {role === "owner" && daysLeft !== null && (
          <div className="border-b border-amber-200 bg-amber-50 px-4 py-2 text-center text-sm text-amber-800 dark:border-amber-900/40 dark:bg-amber-900/20 dark:text-amber-300">
            Deneme sürümü — {daysLeft > 0 ? `${daysLeft} gün kaldı` : "bugün bitiyor"}.{" "}
            <Link href="/abonelik" className="font-medium underline">
              Paketleri gör
            </Link>
          </div>
        )}
        <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 sm:py-8">
          {children}
        </div>
      </main>
    </div>
  );
}
