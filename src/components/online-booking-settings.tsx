"use client";

import { useState } from "react";
import { Copy, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";

export function OnlineBookingSettings({
  orgId,
  bookingUrl,
  initialEnabled,
  initialRequiresApproval = false,
  initialMinNoticeHours = 0,
  initialMaxAdvanceDays = 60,
}: {
  orgId: string;
  bookingUrl: string;
  initialEnabled: boolean;
  initialRequiresApproval?: boolean;
  initialMinNoticeHours?: number;
  initialMaxAdvanceDays?: number;
}) {
  const [enabled, setEnabled] = useState(initialEnabled);
  const [requiresApproval, setRequiresApproval] = useState(
    initialRequiresApproval,
  );
  const [minNotice, setMinNotice] = useState(String(initialMinNoticeHours));
  const [maxAdvance, setMaxAdvance] = useState(String(initialMaxAdvanceDays));
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

  async function toggleApproval() {
    const next = !requiresApproval;
    setRequiresApproval(next);
    const supabase = createClient();
    const { error } = await supabase
      .from("organizations")
      .update({ online_booking_requires_approval: next })
      .eq("id", orgId);
    if (error) {
      setRequiresApproval(!next);
      toast.error("Kaydedilemedi", {
        description: error.message.includes("requires_approval")
          ? "Önce migration 023'ü çalıştırın."
          : error.message,
      });
      return;
    }
    toast.success(
      next
        ? "Artık online randevular onayınıza düşecek"
        : "Online randevular otomatik onaylanacak",
    );
  }

  async function saveWindow() {
    const mn = Math.max(0, parseInt(minNotice || "0", 10) || 0);
    const mx = Math.max(1, parseInt(maxAdvance || "60", 10) || 60);
    setMinNotice(String(mn));
    setMaxAdvance(String(mx));
    const supabase = createClient();
    const { error } = await supabase
      .from("organizations")
      .update({
        online_min_notice_hours: mn,
        online_max_advance_days: mx,
      })
      .eq("id", orgId);
    if (error) {
      toast.error("Kaydedilemedi", {
        description: error.message.includes("min_notice")
          ? "Önce migration 023'ü çalıştırın."
          : error.message,
      });
      return;
    }
    toast.success("Randevu zaman aralığı kaydedildi");
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

      {enabled && (
        <div className="space-y-3 rounded-lg border bg-muted/20 p-3">
          <label className="flex cursor-pointer items-center justify-between gap-4">
            <span className="text-sm">
              <span className="font-medium">Randevular onayıma düşsün</span>
              <span className="block text-xs text-muted-foreground">
                Açıksa online randevular “onay bekliyor” olarak gelir, sen
                onaylayana kadar kesinleşmez.
              </span>
            </span>
            <button
              type="button"
              onClick={toggleApproval}
              role="switch"
              aria-checked={requiresApproval}
              className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors ${
                requiresApproval ? "bg-green-500" : "bg-muted-foreground/30"
              }`}
            >
              <span
                className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${
                  requiresApproval ? "translate-x-5" : "translate-x-0.5"
                }`}
              />
            </button>
          </label>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">
                En erken (saat sonra)
              </label>
              <input
                type="number"
                min={0}
                inputMode="numeric"
                value={minNotice}
                onChange={(e) => setMinNotice(e.target.value)}
                onBlur={saveWindow}
                className="w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
              <p className="text-[11px] text-muted-foreground">
                0 = hemen alınabilir
              </p>
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">
                En geç (gün ileri)
              </label>
              <input
                type="number"
                min={1}
                inputMode="numeric"
                value={maxAdvance}
                onChange={(e) => setMaxAdvance(e.target.value)}
                onBlur={saveWindow}
                className="w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
              <p className="text-[11px] text-muted-foreground">
                kaç gün öncesine kadar
              </p>
            </div>
          </div>
        </div>
      )}

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
