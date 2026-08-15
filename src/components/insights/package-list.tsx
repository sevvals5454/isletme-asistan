"use client";

import { useState } from "react";
import { MessageCircle, Copy, X, Sparkles } from "lucide-react";
import { toast } from "sonner";
import {
  resolveTemplates,
  renderMessage,
  type MessageKind,
} from "@/lib/templates";
import { whatsAppReminderUrl, toWhatsAppNumber } from "@/lib/phone";
import { formatTrDate } from "@/lib/time";

export type EndingPackage = {
  id: string;
  customerName: string;
  phone: string | null;
  packageName: string;
  remaining: number;
  total: number | null;
  expiresAt: string | null;
  lastUse: string | null;
};

export function PackageList({
  items,
  orgName,
  templates,
}: {
  items: EndingPackage[];
  orgName: string;
  templates?: Partial<Record<MessageKind, string>> | null;
}) {
  const t = resolveTemplates(templates);
  const [openId, setOpenId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");

  function openEditor(p: EndingPackage) {
    setDraft(
      renderMessage(t.package_low, {
        ad: p.customerName,
        paket: p.packageName,
        kalan: p.remaining,
        isletme: orgName,
      }),
    );
    setOpenId(p.id);
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
      {items.map((p) => {
        const waUrl = whatsAppReminderUrl(p.phone, draft);
        const hasPhone = !!toWhatsAppNumber(p.phone);
        const isOpen = openId === p.id;
        return (
          <li key={p.id} className="rounded-lg border bg-card p-4">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="font-medium">{p.customerName}</div>
                <div className="mt-0.5 text-xs text-muted-foreground">
                  {p.packageName} · {p.remaining} seans kaldı
                  {p.total ? ` / ${p.total}` : ""}
                </div>
              </div>
              <button
                onClick={() => (isOpen ? setOpenId(null) : openEditor(p))}
                className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:opacity-90"
              >
                <Sparkles className="h-3.5 w-3.5" />
                Yenileme mesajı
              </button>
            </div>

            <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-muted-foreground sm:grid-cols-4">
              <div>
                <span className="block text-foreground">{p.remaining}</span>
                kalan seans
              </div>
              <div>
                <span className="block text-foreground">{p.total ?? "—"}</span>
                toplam seans
              </div>
              <div>
                <span className="block text-foreground">
                  {p.expiresAt ? formatTrDate(p.expiresAt) : "—"}
                </span>
                bitiş tarihi
              </div>
              <div>
                <span className="block text-foreground">
                  {p.lastUse ? formatTrDate(p.lastUse) : "—"}
                </span>
                son kullanım
              </div>
            </div>

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
