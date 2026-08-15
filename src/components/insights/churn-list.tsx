"use client";

import { useState } from "react";
import { MessageCircle, Copy, X, Sparkles } from "lucide-react";
import { toast } from "sonner";
import {
  type ChurnCustomer,
  CHURN_RISK_LABEL,
  CHURN_RISK_STYLE,
} from "@/lib/insights";
import {
  resolveTemplates,
  renderMessage,
  type MessageKind,
} from "@/lib/templates";
import { whatsAppReminderUrl, toWhatsAppNumber } from "@/lib/phone";
import { formatPrice } from "@/lib/appointments";
import { formatTrDate } from "@/lib/time";

export function ChurnList({
  customers,
  orgName,
  templates,
}: {
  customers: ChurnCustomer[];
  orgName: string;
  templates?: Partial<Record<MessageKind, string>> | null;
}) {
  const t = resolveTemplates(templates);
  const [openId, setOpenId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");

  function openEditor(c: ChurnCustomer) {
    const msg = renderMessage(t.win_back, { ad: c.name, isletme: orgName });
    setDraft(msg);
    setOpenId(c.id);
  }

  async function copyDraft() {
    try {
      await navigator.clipboard.writeText(draft.trim());
      toast.success("Mesaj kopyalandı");
    } catch {
      toast.error("Kopyalanamadı");
    }
  }

  return (
    <ul className="space-y-3">
      {customers.map((c) => {
        const waUrl = whatsAppReminderUrl(c.phone, draft);
        const hasPhone = !!toWhatsAppNumber(c.phone);
        const isOpen = openId === c.id;
        return (
          <li key={c.id} className="rounded-lg border bg-card p-4">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium">{c.name}</span>
                  <span
                    className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${CHURN_RISK_STYLE[c.risk]}`}
                  >
                    {CHURN_RISK_LABEL[c.risk]} risk
                  </span>
                </div>
                <div className="mt-1 text-xs text-muted-foreground">
                  {c.daysSince} gündür gelmedi · normal aralık ~
                  {c.avgIntervalDays} gün
                </div>
              </div>
              <button
                onClick={() => (isOpen ? setOpenId(null) : openEditor(c))}
                className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:opacity-90"
              >
                <Sparkles className="h-3.5 w-3.5" />
                Geri kazanma mesajı
              </button>
            </div>

            {/* Müşteri geçmişi */}
            <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-muted-foreground sm:grid-cols-4">
              <div>
                <span className="block text-foreground">
                  {formatTrDate(c.lastVisit)}
                </span>
                son ziyaret
              </div>
              <div>
                <span className="block text-foreground">{c.totalVisits}</span>
                toplam ziyaret
              </div>
              <div>
                <span className="block text-foreground">
                  {formatPrice(c.totalSpend)}
                </span>
                toplam harcama
              </div>
              <div>
                <span className="block text-foreground">
                  {c.lastService ?? "—"}
                </span>
                son hizmet
              </div>
            </div>
            {c.hasActivePackage && (
              <div className="mt-2 text-xs text-muted-foreground">
                📦 Aktif paketi var
              </div>
            )}

            {/* Düzenlenebilir mesaj */}
            {isOpen && (
              <div className="mt-3 space-y-2 rounded-lg border bg-muted/30 p-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium">
                    Mesajı düzenle, sonra gönder
                  </span>
                  <button
                    onClick={() => setOpenId(null)}
                    className="rounded p-1 text-muted-foreground hover:text-foreground"
                    aria-label="Kapat"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
                <textarea
                  rows={4}
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  className="w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
                <div className="flex flex-wrap gap-2">
                  {hasPhone && waUrl ? (
                    <a
                      href={waUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 rounded-lg bg-green-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-green-700"
                    >
                      <MessageCircle className="h-3.5 w-3.5" />
                      WhatsApp&apos;ta aç
                    </a>
                  ) : (
                    <span className="text-xs text-muted-foreground">
                      Bu müşteride geçerli telefon yok
                    </span>
                  )}
                  <button
                    onClick={copyDraft}
                    className="inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium hover:bg-muted"
                  >
                    <Copy className="h-3.5 w-3.5" />
                    Kopyala
                  </button>
                </div>
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
