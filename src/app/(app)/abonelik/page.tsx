import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getUserRole } from "@/lib/roles";
import { PlanChooser } from "@/components/plan-chooser";
import { getPlan, trialDaysLeft } from "@/lib/plans";

export default async function AbonelikPage() {
  // Abonelik kararı patronundur; çalışan panele döner.
  if ((await getUserRole()) !== "owner") redirect("/dashboard");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: membership } = await supabase
    .from("organization_members")
    .select("organization_id")
    .eq("user_id", user?.id ?? "")
    .maybeSingle();

  let status: string | null = null;
  let trialEndsAt: string | null = null;
  let plan: string | null = null;
  if (membership?.organization_id) {
    const { data } = await supabase
      .from("organizations")
      .select("access_status, trial_ends_at, plan")
      .eq("id", membership.organization_id)
      .single();
    const a = data as {
      access_status?: string | null;
      trial_ends_at?: string | null;
      plan?: string | null;
    } | null;
    status = a?.access_status ?? null;
    trialEndsAt = a?.trial_ends_at ?? null;
    plan = a?.plan ?? null;
  }

  const activePlan = getPlan(plan);
  const daysLeft = status === "trial" ? trialDaysLeft(trialEndsAt) : null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Abonelik & Paketler</h1>
        <p className="text-sm text-muted-foreground">
          İşletmen için uygun paketi seç
        </p>
      </div>

      {/* Durum kartı */}
      <div className="rounded-xl border bg-card p-4 text-sm">
        {status === "active" ? (
          <p>
            Durum:{" "}
            <span className="font-medium text-green-600">Aktif abonelik</span>
            {activePlan ? ` · ${activePlan.name} paketi` : ""}
          </p>
        ) : status === "trial" ? (
          <p>
            Durum:{" "}
            <span className="font-medium text-amber-600">Ücretsiz deneme</span> —{" "}
            {daysLeft && daysLeft > 0
              ? `${daysLeft} gün kaldı`
              : "bugün sona eriyor"}
            . Kesintisiz devam için bir paket seç.
          </p>
        ) : (
          <p className="text-muted-foreground">
            Devam etmek için bir paket seç.
          </p>
        )}
      </div>

      <PlanChooser orgId={membership?.organization_id ?? ""} currentPlan={plan} />

      <p className="text-xs text-muted-foreground">
        14 gün ücretsiz deneme kart bilgisi istemez. Paketi seçince aboneliğini
        başlatmak için seninle iletişime geçeceğiz (online ödeme çok yakında).
        Sorular için: veritechsoft@gmail.com
      </p>
    </div>
  );
}
