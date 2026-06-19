// Bildirim Merkezi — sektör bağımsız. Üç kaynağı tek tip bildirime dönüştürür:
//   1) Yaklaşan randevular
//   2) Ödemesi yaklaşan/geciken üyelikler
//   3) Bitmek üzere olan seans paketleri
// Her bildirim, müşteri için önceden doldurulmuş bir WhatsApp linki taşır.

import {
  type PackageWithUsage,
  remainingSessions,
  packageNeedsAttention,
  monthlyDueStatus,
} from "@/lib/packages";
import { whatsAppReminderUrl } from "@/lib/phone";
import { formatTrTime, formatTrDate } from "@/lib/time";
import {
  DEFAULT_TEMPLATES,
  renderTemplate,
  ibanLine,
  type MessageKind,
} from "@/lib/templates";

export type NotificationKind = "appointment" | "payment" | "package";
export type Severity = "info" | "warning" | "danger";

export type NotificationItem = {
  id: string;
  kind: NotificationKind;
  severity: Severity;
  title: string;
  detail: string;
  customerId: string;
  whatsappUrl: string | null;
  sortKey: number; // küçük = daha öncelikli/erken
};

type ApptInput = {
  id: string;
  start_at: string;
  customer_id: string;
  customers: { name: string; phone: string | null } | null;
  services: { name: string } | null;
};

type PkgInput = PackageWithUsage & {
  customers: { name: string; phone: string | null } | null;
};

function untilLabel(start: Date, now: Date): string {
  const min = Math.round((start.getTime() - now.getTime()) / 60000);
  if (min < 60) return `${Math.max(min, 0)} dakika kaldı`;
  const h = Math.round(min / 60);
  return `${h} saat kaldı`;
}

function msg(
  kind: MessageKind,
  vars: Record<string, string | number | null | undefined>,
): string {
  return renderTemplate(DEFAULT_TEMPLATES[kind], vars);
}

export function buildNotifications(input: {
  now: Date;
  orgName: string;
  iban?: string | null;
  ibanName?: string | null;
  upcomingAppointments: ApptInput[]; // bugün, henüz geçmemiş, planlı
  packages: PkgInput[]; // tüm paketler (tür fark etmez)
  soonHours?: number; // "yaklaşıyor" eşiği (varsayılan 3 saat)
}): NotificationItem[] {
  const {
    now,
    orgName,
    iban,
    ibanName,
    upcomingAppointments,
    packages,
    soonHours = 3,
  } = input;
  const items: NotificationItem[] = [];

  // 1) Yaklaşan randevular
  for (const a of upcomingAppointments) {
    const start = new Date(a.start_at);
    if (start <= now) continue;
    const name = a.customers?.name ?? "Müşteri";
    const minsUntil = (start.getTime() - now.getTime()) / 60000;
    const soon = minsUntil <= soonHours * 60;
    const url = whatsAppReminderUrl(
      a.customers?.phone,
      msg(soon ? "appointment_soon" : "appointment_reminder", {
        ad: name,
        tarih: formatTrDate(a.start_at),
        saat: formatTrTime(a.start_at),
        hizmet: a.services?.name ?? "",
        isletme: orgName,
      }),
    );
    items.push({
      id: `appt-${a.id}`,
      kind: "appointment",
      severity: soon ? "warning" : "info",
      title: `${name} — randevuya ${untilLabel(start, now)}`,
      detail: `${formatTrTime(a.start_at)} · ${a.services?.name ?? "Randevu"}`,
      customerId: a.customer_id,
      whatsappUrl: url,
      sortKey: start.getTime(),
    });
  }

  // 2) Ödemesi yaklaşan/geciken aylık üyelikler
  for (const p of packages) {
    const due = monthlyDueStatus(p, 7, now);
    if (due !== "overdue" && due !== "soon") continue;
    const name = p.customers?.name ?? "Müşteri";
    const url = whatsAppReminderUrl(
      p.customers?.phone,
      msg("payment_due", {
        ad: name,
        paket: p.name,
        iban: ibanLine(iban, ibanName),
        isletme: orgName,
      }),
    );
    items.push({
      id: `pay-${p.id}`,
      kind: "payment",
      severity: due === "overdue" ? "danger" : "warning",
      title: `${name} — üyelik ödemesi ${due === "overdue" ? "gecikti" : "yaklaşıyor"}`,
      detail: p.next_payment_at
        ? `${p.name} · ödeme: ${formatTrDate(p.next_payment_at)}`
        : p.name,
      customerId: p.customer_id,
      whatsappUrl: url,
      sortKey: due === "overdue" ? 0 : 1,
    });
  }

  // 3) Bitmek üzere seans paketleri
  for (const p of packages) {
    if (!packageNeedsAttention(p, {}, now)) continue;
    const name = p.customers?.name ?? "Müşteri";
    const remaining = remainingSessions(p);
    const url = whatsAppReminderUrl(
      p.customers?.phone,
      msg("package_low", {
        ad: name,
        paket: p.name,
        kalan: remaining,
        isletme: orgName,
      }),
    );
    items.push({
      id: `pkg-${p.id}`,
      kind: "package",
      severity: "warning",
      title: `${name} — paket bitmek üzere`,
      detail: `${p.name} · ${remaining} seans kaldı`,
      customerId: p.customer_id,
      whatsappUrl: url,
      sortKey: remaining,
    });
  }

  // Önce tehlike, sonra uyarı, sonra bilgi; içinde sortKey'e göre.
  const sevRank: Record<Severity, number> = { danger: 0, warning: 1, info: 2 };
  return items.sort(
    (a, b) => sevRank[a.severity] - sevRank[b.severity] || a.sortKey - b.sortKey,
  );
}
