"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Check, Loader2, Crown, Mail } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { PLANS, formatTl, type PlanId } from "@/lib/plans";

export function PlanChooser({
  orgId,
  currentPlan,
}: {
  orgId: string;
  currentPlan?: string | null;
}) {
  const [saving, setSaving] = useState<PlanId | null>(null);
  const [chosen, setChosen] = useState<PlanId | null>(null);

  async function choose(id: PlanId) {
    setSaving(id);
    const supabase = createClient();
    const { error } = await supabase
      .from("organizations")
      .update({ plan: id })
      .eq("id", orgId);
    setSaving(null);
    if (error) {
      toast.error("Kaydedilemedi", { description: error.message });
      return;
    }
    setChosen(id);
    toast.success("Paket seçimin kaydedildi");
  }

  if (chosen) {
    const plan = PLANS.find((p) => p.id === chosen)!;
    return (
      <div className="rounded-2xl border bg-card p-6 text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400">
          <Check className="h-7 w-7" />
        </div>
        <h2 className="text-lg font-semibold">
          {plan.name} paketini seçtin 🎉
        </h2>
        <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
          Seçimin kaydedildi. Hesabını aktive etmek için ödeme bilgilerini
          paylaşacağız — online ödeme altyapımız çok yakında. O zamana kadar
          aboneliğini başlatmak için bize ulaş:
        </p>
        <a
          href={`mailto:veritechsoft@gmail.com?subject=${encodeURIComponent(
            `TechİŞ Abonelik - ${plan.name}`,
          )}`}
          className="mt-4 inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:opacity-90"
        >
          <Mail className="h-4 w-4" />
          veritechsoft@gmail.com
        </a>
      </div>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {PLANS.map((plan) => {
        const isCurrent = currentPlan === plan.id;
        return (
          <div
            key={plan.id}
            className={`relative rounded-2xl border bg-card p-5 text-left ${
              plan.highlight ? "border-primary ring-1 ring-primary" : ""
            }`}
          >
            {plan.highlight && (
              <span className="absolute -top-2.5 left-5 inline-flex items-center gap-1 rounded-full bg-primary px-2.5 py-0.5 text-xs font-medium text-primary-foreground">
                <Crown className="h-3 w-3" /> En popüler
              </span>
            )}
            <div className="font-semibold">{plan.name}</div>
            <div className="text-xs text-muted-foreground">{plan.tagline}</div>
            <div className="mt-3">
              <span className="text-2xl font-bold">
                {formatTl(plan.priceMonthly)}
              </span>
              <span className="text-sm text-muted-foreground"> /ay</span>
            </div>
            <div className="text-xs text-muted-foreground">
              veya yıllık {formatTl(plan.priceYearly)} (2 ay bedava)
            </div>
            <ul className="mt-3 space-y-1.5">
              {plan.perks.map((perk) => (
                <li key={perk} className="flex items-start gap-2 text-sm">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-green-600" />
                  <span>{perk}</span>
                </li>
              ))}
            </ul>
            <button
              onClick={() => choose(plan.id)}
              disabled={saving !== null}
              className={`mt-4 inline-flex w-full items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium disabled:opacity-50 ${
                plan.highlight
                  ? "bg-primary text-primary-foreground hover:opacity-90"
                  : "border hover:bg-muted"
              }`}
            >
              {saving === plan.id && <Loader2 className="h-4 w-4 animate-spin" />}
              {isCurrent ? "Seçili paket" : "Bu paketi seç"}
            </button>
          </div>
        );
      })}
    </div>
  );
}
