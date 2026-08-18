"use client";

import { useState } from "react";
import { Copy, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";

export function OnlineBookingSettings({
  orgId,
  bookingUrl,
  initialEnabled,
}: {
  orgId: string;
  bookingUrl: string;
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
      .update({ online_booking_enabled: next })
      .eq("id", orgId);
    setSaving(false);
    if (error) {
      setEnabled(!next); // geri al
      toast.error("Kaydedilemedi", {
        description: error.message.includes("online_booking_enabled")
          ? "Önce migration 017'yi çalıştırın."
          : error.message,
      });
      return;
    }
    toast.success(next ? "Online randevu açıldı" : "Online randevu kapatıldı");
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(bookingUrl);
      toast.success("Link kopyalandı");
    } catch {
      toast.error("Kopyalanamadı");
    }
  }

  return (
    <div className="space-y-4">
      <label className="flex cursor-pointer items-center justify-between gap-4 rounded-lg border p-3">
        <span className="text-sm">
          <span className="font-medium">Online randevuyu aç</span>
          <span className="block text-xs text-muted-foreground">
            Müşteriler linkten kendi randevusunu alabilsin
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

      <div className="space-y-1">
        <label className="text-xs text-muted-foreground">
          Paylaşılacak randevu linki (Instagram bio, WhatsApp, Google…)
        </label>
        <div className="flex flex-wrap items-center gap-2">
          <code className="flex-1 truncate rounded-lg border bg-muted/40 px-3 py-2 text-xs">
            {bookingUrl}
          </code>
          <button
            onClick={copy}
            className="inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-medium hover:bg-muted"
          >
            <Copy className="h-3.5 w-3.5" />
            Kopyala
          </button>
          <a
            href={bookingUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-medium hover:bg-muted"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            Aç
          </a>
        </div>
      </div>
    </div>
  );
}
