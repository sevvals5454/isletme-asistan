"use client";

import { useMemo, useState } from "react";
import { MessageCircle, Check, Users, Copy } from "lucide-react";
import { toast } from "sonner";
import {
  toWhatsAppNumber,
  whatsAppReminderUrl,
  fillTemplate,
} from "@/lib/phone";

type Customer = {
  id: string;
  name: string;
  phone: string | null;
  tags: string[] | null;
  kvkk_consent: boolean;
};

type Segment = "kvkk" | "all" | string; // string = etiket adı

const DEFAULT_TEMPLATE =
  "Merhaba {ad}, size özel kampanyamızdan haberdar olmanızı istedik. Detaylar için bize yazabilirsiniz!";

export function BulkMessage({
  customers,
  orgName,
}: {
  customers: Customer[];
  orgName: string;
}) {
  const [segment, setSegment] = useState<Segment>("kvkk");
  const [template, setTemplate] = useState(DEFAULT_TEMPLATE);
  const [sent, setSent] = useState<Set<string>>(new Set());

  // Müşterilerdeki tüm etiketler (segment seçimi için).
  const tags = useMemo(() => {
    const set = new Set<string>();
    for (const c of customers) for (const t of c.tags ?? []) set.add(t);
    return [...set].sort();
  }, [customers]);

  // Alıcılar: geçerli telefonu olan + segmente uyan müşteriler.
  const recipients = useMemo(() => {
    return customers.filter((c) => {
      if (!toWhatsAppNumber(c.phone)) return false;
      if (segment === "all") return true;
      if (segment === "kvkk") return c.kvkk_consent;
      return (c.tags ?? []).includes(segment); // etiket
    });
  }, [customers, segment]);

  const signature = orgName ? `\n\n${orgName}` : "";

  function markSent(id: string) {
    setSent((prev) => new Set(prev).add(id));
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Toplu mesaj</h1>
        <p className="text-sm text-muted-foreground">
          Bir segment seç, mesajı yaz, müşterilere WhatsApp&apos;tan tek tek
          gönder
        </p>
      </div>

      <div className="rounded-xl border bg-card p-6 space-y-4">
        <div className="space-y-1">
          <label className="text-sm font-medium">Kime gönderilecek?</label>
          <select
            value={segment}
            onChange={(e) => setSegment(e.target.value)}
            className="w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <option value="kvkk">KVKK onaylı müşteriler (önerilen)</option>
            <option value="all">Tüm müşteriler</option>
            {tags.length > 0 && (
              <optgroup label="Etikete göre">
                {tags.map((t) => (
                  <option key={t} value={t}>
                    Etiket: {t}
                  </option>
                ))}
              </optgroup>
            )}
          </select>
          {segment === "all" && (
            <p className="text-xs text-amber-600 dark:text-amber-500">
              ⚠️ KVKK: Açık rıza vermemiş kişilere pazarlama mesajı göndermek
              risklidir. Mümkünse &quot;KVKK onaylı&quot; segmentini kullan.
            </p>
          )}
        </div>

        <div className="space-y-1">
          <label className="text-sm font-medium">Mesaj</label>
          <textarea
            rows={4}
            value={template}
            onChange={(e) => setTemplate(e.target.value)}
            className="w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
          <p className="text-xs text-muted-foreground">
            <code className="rounded bg-muted px-1">{"{ad}"}</code> yazdığın yere
            müşterinin adı gelir. İmza otomatik eklenir: {orgName || "—"}
          </p>
          <button
            onClick={async () => {
              const text =
                (orgName ? fillTemplate(template, "").trim() : template) +
                (orgName ? `\n\n${orgName}` : "");
              try {
                await navigator.clipboard.writeText(text.trim());
                toast.success("Mesaj kopyalandı — WhatsApp duyuru grubuna yapıştır");
              } catch {
                toast.error("Kopyalanamadı");
              }
            }}
            className="inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium hover:bg-muted"
          >
            <Copy className="h-3.5 w-3.5" />
            Duyuru grubu için kopyala
          </button>
          <p className="text-xs text-muted-foreground">
            Grup mesajında kişiye özel {"{ad}"} kullanma — kopyalanan metinde boş
            bırakılır.
          </p>
        </div>

        <div className="flex items-center gap-2 rounded-lg bg-muted/50 p-3 text-sm">
          <Users className="h-4 w-4 text-muted-foreground" />
          <span>
            <strong>{recipients.length}</strong> alıcı (telefonu olan)
            {sent.size > 0 && ` · ${sent.size} gönderildi`}
          </span>
        </div>
      </div>

      {recipients.length === 0 ? (
        <div className="rounded-xl border bg-card p-12 text-center text-sm text-muted-foreground">
          Bu segmentte geçerli telefonu olan müşteri yok.
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border bg-card">
          <ul className="divide-y">
            {recipients.map((c) => {
              const message = fillTemplate(template, c.name) + signature;
              const url = whatsAppReminderUrl(c.phone, message);
              const isSent = sent.has(c.id);
              return (
                <li
                  key={c.id}
                  className="flex items-center justify-between gap-3 p-3 text-sm"
                >
                  <div className="min-w-0">
                    <div className="truncate font-medium">{c.name}</div>
                    <div className="truncate text-xs text-muted-foreground">
                      {c.phone}
                    </div>
                  </div>
                  {isSent ? (
                    <span className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-green-100 px-3 py-1.5 text-xs font-medium text-green-700 dark:bg-green-900/30 dark:text-green-400">
                      <Check className="h-3.5 w-3.5" />
                      Gönderildi
                    </span>
                  ) : (
                    url && (
                      <a
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={() => markSent(c.id)}
                        className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-green-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-green-700"
                      >
                        <MessageCircle className="h-3.5 w-3.5" />
                        Gönder
                      </a>
                    )
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
