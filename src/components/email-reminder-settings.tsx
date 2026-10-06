"use client";

import { useState } from "react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";

export function EmailReminderSettings({
  orgId,
  initialEnabled,
}: {
  orgId: string;
  initialEnabled: boolean;
}) {
  const [enabled, setEnabled] = useState(initialEnabled);
  const [saving, setSaving] = useState(false);

  async function toggle() {
    const next = !enabled;
    setEnabled(next);
    setSaving(true);
    const supabase = createClient();
    const { error } = await supabase
      .from("organizations")
      .update({ email_reminders_enabled: next })
      .eq("id", orgId);
    setSaving(false);
    if (error) {
      setEnabled(!next);
      toast.error("Kaydedilemedi", {
        description: error.message.includes("email_reminders")
          ? "Önce migration 029'u çalıştırın."
          : error.message,
      });
      return;
    }
    toast.success(
      next
        ? "Otomatik e-posta hatırlatma açıldı 📧"
        : "Otomatik e-posta hatırlatma kapatıldı",
    );
  }

  return (
    <div className="space-y-3">
      <label className="flex cursor-pointer items-center justify-between gap-4 rounded-lg border p-3">
        <span className="text-sm">
          <span className="font-medium">Otomatik e-posta hatırlatma</span>
          <span className="block text-xs text-muted-foreground">
            Randevudan önce, e-postası olan müşterilere otomatik hatırlatma maili
            gönderilir.
          </span>
        </span>
        <button
          type="button"
          onClick={toggle}
          disabled={saving}
          role="switch"
          aria-checked={enabled}
          className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors ${
            enabled ? "bg-green-500" : "bg-muted-foreground/30"
          }`}
        >
          <span
            className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${
              enabled ? "translate-x-5" : "translate-x-0.5"
            }`}
          />
        </button>
      </label>
      <p className="text-xs text-muted-foreground">
        Mesaj metni <strong>Mesaj şablonları → Randevu hatırlatma</strong>&apos;dan
        düzenlenir (WhatsApp ile aynı şablon). Yalnızca{" "}
        <strong>e-posta adresi kayıtlı</strong> müşterilere gider; WhatsApp tek-tık
        hatırlatma ayrıca durur.
      </p>
    </div>
  );
}
