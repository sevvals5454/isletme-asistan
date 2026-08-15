// Akıllı İşletme Asistanı — mevcut gerçek verilerden anlam çıkaran analiz katmanı.
// AI YOK: tüm sonuçlar gerçek verilerden hesaplanır. Yeterli veri yoksa üretmez.
// Faz 1: işletme özeti (dashboard). Sonraki fazlarda churn/gelir/hizmet/rapor eklenecek.

import { formatPrice } from "@/lib/appointments";

export type InsightTone = "danger" | "warning" | "attention" | "success" | "muted";

export type SummaryLine = {
  tone: InsightTone;
  text: string;
  href?: string;
};

export type BusinessSummaryInput = {
  packagesEndingSoon: number; // paketinde 1 seans kalan müşteri sayısı
  awaitingConfirm: number; // onay bekleyen gelecek randevu sayısı
  inactiveCount: number; // eşik günü aşan, gelecek randevusu olmayan müşteri
  inactiveDays: number; // eşik (ör. 45 gün)
  todayRevenue: number; // bugünkü tahmini ciro (planlı + tamamlanan)
  todayAppointments: number; // bugün planlı/tamamlanan randevu sayısı
  weekTrendPct: number | null; // bu hafta vs geçen hafta randevu %; null = yetersiz veri
};

// Dashboard üstündeki "Bugün işletmen için önemli olanlar" satırlarını üretir.
// Sadece gerçekten durum varsa satır ekler (boş/uydurma satır yok).
export function buildBusinessSummary(i: BusinessSummaryInput): SummaryLine[] {
  const lines: SummaryLine[] = [];

  if (i.packagesEndingSoon > 0) {
    lines.push({
      tone: "danger",
      text: `${i.packagesEndingSoon} müşterinin paketinin bitmesine 1 seans kaldı.`,
    });
  }

  if (i.awaitingConfirm > 0) {
    lines.push({
      tone: "warning",
      text: `${i.awaitingConfirm} randevu onay bekliyor.`,
      href: "/appointments",
    });
  }

  if (i.inactiveCount > 0) {
    lines.push({
      tone: "attention",
      text: `${i.inactiveCount} müşteri ${i.inactiveDays}+ gündür işletmeye gelmedi.`,
    });
  }

  // Haftalık trend: sadece anlamlı fark varsa (%5+) ve yeterli veri varsa göster.
  if (i.weekTrendPct != null && Math.abs(i.weekTrendPct) >= 5) {
    const down = i.weekTrendPct < 0;
    lines.push({
      tone: down ? "warning" : "success",
      text: `Bu hafta randevu sayısı geçen haftaya göre %${Math.abs(
        Math.round(i.weekTrendPct),
      )} ${down ? "düştü" : "arttı"}.`,
    });
  }

  // Bugünkü tahmini ciro — her zaman gösterilir (gerçek veri).
  lines.push({
    tone: "success",
    text: `Bugünkü tahmini ciro: ${formatPrice(i.todayRevenue)}${
      i.todayAppointments ? ` · ${i.todayAppointments} randevu` : " · randevu yok"
    }.`,
    href: i.todayAppointments ? "/appointments" : undefined,
  });

  return lines;
}

// Ton → renk sınıfı (nokta/rozet için). Mevcut TechİŞ paletiyle uyumlu.
export const TONE_DOT: Record<InsightTone, string> = {
  danger: "bg-red-500",
  warning: "bg-amber-500",
  attention: "bg-yellow-400",
  success: "bg-green-500",
  muted: "bg-muted-foreground",
};

// ============================================================
// MÜŞTERİ KAYBI (CHURN) ANALİZİ — Faz 2
// ============================================================

export type ChurnRisk = "low" | "medium" | "high";

export const CHURN_RISK_LABEL: Record<ChurnRisk, string> = {
  low: "Düşük",
  medium: "Orta",
  high: "Yüksek",
};

export const CHURN_RISK_STYLE: Record<ChurnRisk, string> = {
  low: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  medium:
    "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  high: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
};

export type ChurnCustomer = {
  id: string;
  name: string;
  phone: string | null;
  lastVisit: string;
  daysSince: number;
  totalVisits: number;
  totalSpend: number;
  avgIntervalDays: number;
  lastService: string | null;
  hasActivePackage: boolean;
  risk: ChurnRisk;
};

type ChurnApptInput = {
  customer_id: string;
  start_at: string;
  status: string;
  price: number | null;
  services: { name: string } | null;
};
type ChurnPkgInput = {
  customer_id: string;
  type: string;
  price: number | null;
  expires_at: string | null;
};

const DAY = 86400000;

// Düzenli gelen ama normal ziyaret aralığını aşmış müşterileri tespit eder.
// Risk = geçen süre / ortalama aralık. Yeterli geçmişi (>=2 ziyaret) olmayan
// veya gelecekte randevusu olan müşteriler dışta bırakılır (uydurma yok).
export function analyzeChurn(input: {
  now: Date;
  customers: { id: string; name: string; phone: string | null }[];
  appointments: ChurnApptInput[];
  packages: ChurnPkgInput[];
  minDaysSince?: number; // gürültüyü önlemek için alt eşik (varsayılan 21)
}): { enough: boolean; customers: ChurnCustomer[] } {
  const { now, customers, appointments, packages, minDaysSince = 21 } = input;
  const nowT = now.getTime();

  // Müşteri bazında geçmiş (iptal olmayan, geçmiş) ziyaretler
  const past = new Map<string, ChurnApptInput[]>();
  const future = new Set<string>();
  for (const a of appointments) {
    if (a.status === "cancelled") continue;
    const t = new Date(a.start_at).getTime();
    if (t <= nowT) {
      if (!past.has(a.customer_id)) past.set(a.customer_id, []);
      past.get(a.customer_id)!.push(a);
    } else if (a.status === "scheduled") {
      future.add(a.customer_id);
    }
  }

  // Aktif paketi olanlar (yaklaşık: süresi dolmamış herhangi bir paket)
  const activePkg = new Set<string>();
  const spendByPkg = new Map<string, number>();
  for (const p of packages) {
    spendByPkg.set(
      p.customer_id,
      (spendByPkg.get(p.customer_id) ?? 0) + (p.price ?? 0),
    );
    const alive = !p.expires_at || new Date(p.expires_at).getTime() >= nowT;
    if (alive) activePkg.add(p.customer_id);
  }

  // Yeterli geçmişi olan müşteri sayısı (analizin anlamlı olması için)
  const eligible = customers.filter((c) => (past.get(c.id)?.length ?? 0) >= 2);
  if (eligible.length < 3) return { enough: false, customers: [] };

  const result: ChurnCustomer[] = [];
  for (const c of customers) {
    if (future.has(c.id)) continue; // gelecekte randevusu var → riskte değil
    const visits = (past.get(c.id) ?? []).sort(
      (a, b) => new Date(a.start_at).getTime() - new Date(b.start_at).getTime(),
    );
    if (visits.length < 2) continue; // yeterli geçmiş yok

    const dates = visits.map((v) => new Date(v.start_at).getTime());
    const lastT = dates[dates.length - 1];
    const daysSince = Math.floor((nowT - lastT) / DAY);
    if (daysSince < minDaysSince) continue;

    // Ortalama ziyaret aralığı
    let gapSum = 0;
    for (let k = 1; k < dates.length; k++) gapSum += dates[k] - dates[k - 1];
    const avgIntervalDays = Math.max(
      1,
      Math.round(gapSum / (dates.length - 1) / DAY),
    );

    // Risk: geçen süre normal aralığın kaç katı?
    const ratio = daysSince / avgIntervalDays;
    let risk: ChurnRisk;
    if (ratio >= 2) risk = "high";
    else if (ratio >= 1.5) risk = "medium";
    else if (ratio >= 1) risk = "low";
    else continue; // henüz normal aralığında → riskte değil

    const totalSpend =
      visits
        .filter((v) => v.status === "completed")
        .reduce((s, v) => s + (v.price ?? 0), 0) +
      (spendByPkg.get(c.id) ?? 0);

    result.push({
      id: c.id,
      name: c.name,
      phone: c.phone,
      lastVisit: visits[visits.length - 1].start_at,
      daysSince,
      totalVisits: visits.length,
      totalSpend,
      avgIntervalDays,
      lastService: visits[visits.length - 1].services?.name ?? null,
      hasActivePackage: activePkg.has(c.id),
      risk,
    });
  }

  const rank: Record<ChurnRisk, number> = { high: 0, medium: 1, low: 2 };
  result.sort(
    (a, b) => rank[a.risk] - rank[b.risk] || b.daysSince - a.daysSince,
  );
  return { enough: true, customers: result };
}
