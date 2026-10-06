"use client";

import { useState } from "react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";

export function LoyaltySettings({
  orgId,
  initialThreshold,
}: {
  orgId: string;
  initialThreshold: number;
}) {
  const [value, setValue] = useState(String(initialThreshold || ""));
  const [saving, setSaving] = useState(false);

  async function save() {
    const n = Math.max(0, parseInt(value || "0", 10) || 0);
    setValue(n ? String(n) : "");
    setSaving(true);
    const supabase = createClient();
    const { error } = await supabase
      .from("organizations")
      .update({ loyalty_threshold: n })
      .eq("id", orgId);
    setSaving(false);
    if (error) {
      toast.error("Kaydedilemedi", {
        description: error.message.includes("loyalty")
          ? "Önce migration 030'u çalıştırın."
          : error.message,
      });
      return;
    }
    toast.success(
      n > 0
        ? `Sadakat açık: her ${n} ziyarette ödül`
        : "Sadakat programı kapatıldı",
    );
  }

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium">Kaç ziyarette bir ödül?</label>
      <div className="flex items-center gap-2">
        <input
          type="number"
          min={0}
          inputMode="numeric"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onBlur={save}
          placeholder="0 (kapalı)"
          className="w-32 rounded-lg border bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
        {saving && <span className="text-xs text-muted-foreground">…</span>}
      </div>
      <p className="text-xs text-muted-foreground">
        Örn. <strong>10</strong> yazarsan, 10 ziyareti tamamlayan müşteride &quot;🎁
        Ödül hak etti&quot; görünür. <strong>0</strong> = kapalı. Ödülü (indirim,
        bedava seans vb.) sen belirlersin.
      </p>
    </div>
  );
}
