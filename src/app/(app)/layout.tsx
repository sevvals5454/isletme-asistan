import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Sidebar } from "@/components/sidebar";
import { UpdateNotifier } from "@/components/update-notifier";
import { AppointmentSoonNotifier } from "@/components/appointment-soon-notifier";
import { PushPrompt } from "@/components/push-prompt";
import { WelcomeTour } from "@/components/welcome-tour";

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

  return (
    <div className="min-h-screen bg-background">
      <WelcomeTour />
      <UpdateNotifier />
      <AppointmentSoonNotifier orgName={orgName} templates={messageTemplates} />
      <Sidebar orgName={orgName} userEmail={user.email ?? ""} role={role} />
      <main className="md:pl-64">
        <PushPrompt />
        <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 sm:py-8">
          {children}
        </div>
      </main>
    </div>
  );
}
