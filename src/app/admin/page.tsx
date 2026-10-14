import { createClient as createServer } from "@/lib/supabase/server";
import { createClient } from "@supabase/supabase-js";
import { isAdminEmail } from "@/lib/admin";
import { AdminPanel, type AdminOrg } from "@/components/admin-panel";
import { AdminLogin } from "@/components/admin-login";
import { AdminAccountMenu } from "@/components/admin-account-menu";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const supabase = await createServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Admin değilse: iş uygulamasına yönlendirme YOK — kendi giriş ekranı.
  if (!isAdminEmail(user?.email)) {
    return <AdminLogin loggedInEmail={user?.email ?? null} />;
  }

  // Tüm işletmeleri service_role ile çek (RLS'i aşar — sadece admin buraya gelir).
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const supaUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  let orgs: AdminOrg[] = [];
  if (service && supaUrl) {
    const admin = createClient(supaUrl, service, {
      auth: { persistSession: false },
    });
    const { data } = await admin
      .from("organizations")
      .select(
        "id, name, access_status, plan, trial_ends_at, subscription_ends_at, last_active_at, created_at",
      )
      .order("created_at", { ascending: false });
    orgs = (data ?? []) as AdminOrg[];
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-semibold">İşletmeler</h1>
          <p className="text-sm text-muted-foreground">
            Manuel satış: ödeme alınca paketi seç, süreyi gir, aktive et. Süre
            dolunca otomatik kilitlenir.
          </p>
        </div>
        <AdminAccountMenu email={user?.email ?? ""} />
      </div>
      <AdminPanel initialOrgs={orgs} />
    </div>
  );
}
