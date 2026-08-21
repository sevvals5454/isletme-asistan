// Akıllı İşletme Asistanı — mevcut gerçek verilerden anlam çıkaran analiz katmanı.
// AI YOK: tüm sonuçlar gerçek verilerden hesaplanır. Yeterli veri yoksa üretmez.
// Faz 1: işletme özeti (dashboard). Sonraki fazlarda churn/gelir/hizmet/rapor eklenecek.

import { formatPrice } from "@/lib/appointments";
import { trMonthStart, TR_TZ } from "@/lib/time";

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
  dueNotes?: number; // takip zamanı gelen/geçen not sayısı
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

  if (i.dueNotes && i.dueNotes > 0) {
    lines.push({
      tone: "warning",
      text: `${i.dueNotes} notun takip zamanı geldi.`,
      href: "/notlar",
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

// ============================================================
// GELİR ANALİZİ — Faz 3
// Gelir tabanı: tamamlanan randevu ücretleri + seans paketi satışları.
// (Aylık üyelik aidatları hariç — ay-üstü-ay trend için tutarlı taban.)
// ============================================================

export type RevenueInsight = {
  enough: boolean;
  monthRevenue: number;
  prevMonthRevenue: number;
  changePct: number | null;
  topService: { name: string; revenue: number } | null;
  avgSpend: number | null;
  bestDay: { name: string; revenue: number } | null;
};

type RevAppt = {
  status: string;
  price: number | null;
  start_at: string;
  customer_id: string;
  services: { name: string } | null;
};
type RevPkg = { type: string; price: number | null; purchased_at: string };

export function analyzeRevenue(input: {
  now: Date;
  appointments: RevAppt[];
  packages: RevPkg[];
}): RevenueInsight {
  const { now, appointments, packages } = input;
  const ymNow = new Intl.DateTimeFormat("en-CA", {
    timeZone: TR_TZ,
    year: "numeric",
    month: "2-digit",
  }).format(now);
  const y = Number(ymNow.slice(0, 4));
  const m0 = Number(ymNow.slice(5, 7)) - 1;
  const curStart = trMonthStart(y, m0);
  const nextStart = trMonthStart(y, m0 + 1);
  const prevStart = trMonthStart(y, m0 - 1);

  const inRange = (iso: string, a: Date, b: Date) => {
    const t = new Date(iso).getTime();
    return t >= a.getTime() && t < b.getTime();
  };
  const rev = (a: Date, b: Date) =>
    appointments
      .filter((r) => r.status === "completed" && inRange(r.start_at, a, b))
      .reduce((s, r) => s + (r.price ?? 0), 0) +
    packages
      .filter((p) => p.type !== "monthly" && inRange(p.purchased_at, a, b))
      .reduce((s, p) => s + (p.price ?? 0), 0);

  const monthRevenue = rev(curStart, nextStart);
  const prevMonthRevenue = rev(prevStart, curStart);
  const changePct =
    prevMonthRevenue > 0
      ? ((monthRevenue - prevMonthRevenue) / prevMonthRevenue) * 100
      : null;

  const monthAppts = appointments.filter(
    (r) => r.status === "completed" && inRange(r.start_at, curStart, nextStart),
  );
  const enough = monthAppts.length >= 3;

  let topService: { name: string; revenue: number } | null = null;
  let avgSpend: number | null = null;
  let bestDay: { name: string; revenue: number } | null = null;

  if (enough) {
    const byS = new Map<string, number>();
    for (const r of monthAppts) {
      const n = r.services?.name ?? "Diğer";
      byS.set(n, (byS.get(n) ?? 0) + (r.price ?? 0));
    }
    for (const [name, revenue] of byS)
      if (!topService || revenue > topService.revenue)
        topService = { name, revenue };

    const custs = new Set(monthAppts.map((r) => r.customer_id));
    const total = monthAppts.reduce((s, r) => s + (r.price ?? 0), 0);
    avgSpend = custs.size > 0 ? Math.round(total / custs.size) : null;

    const fmt = new Intl.DateTimeFormat("tr-TR", {
      timeZone: TR_TZ,
      weekday: "long",
    });
    const byD = new Map<string, number>();
    for (const r of monthAppts) {
      const n = fmt.format(new Date(r.start_at));
      byD.set(n, (byD.get(n) ?? 0) + (r.price ?? 0));
    }
    for (const [name, revenue] of byD)
      if (!bestDay || revenue > bestDay.revenue) bestDay = { name, revenue };
  }

  return {
    enough,
    monthRevenue,
    prevMonthRevenue,
    changePct,
    topService,
    avgSpend,
    bestDay,
  };
}

// ============================================================
// HİZMET ANALİZİ — Faz 3
// ============================================================

export type ServiceStat = {
  name: string;
  count: number;
  revenue: number;
  avgRevenue: number;
  change30Pct: number | null; // son 30 gün vs önceki 30 gün (adet)
};

export function analyzeServices(input: {
  now: Date;
  appointments: {
    status: string;
    price: number | null;
    start_at: string;
    services: { name: string } | null;
  }[];
}): { enough: boolean; services: ServiceStat[]; top: ServiceStat | null; bottom: ServiceStat | null } {
  const { now, appointments } = input;
  const completed = appointments.filter((a) => a.status === "completed");
  const enough = completed.length >= 5;

  const nowT = now.getTime();
  const d30 = 30 * DAY;
  const map = new Map<
    string,
    { count: number; revenue: number; recent: number; prev: number }
  >();
  for (const a of completed) {
    const n = a.services?.name ?? "Diğer";
    const e = map.get(n) ?? { count: 0, revenue: 0, recent: 0, prev: 0 };
    e.count++;
    e.revenue += a.price ?? 0;
    const t = new Date(a.start_at).getTime();
    if (t >= nowT - d30) e.recent++;
    else if (t >= nowT - 2 * d30) e.prev++;
    map.set(n, e);
  }
  const services: ServiceStat[] = [...map.entries()]
    .map(([name, e]) => ({
      name,
      count: e.count,
      revenue: e.revenue,
      avgRevenue: e.count ? Math.round(e.revenue / e.count) : 0,
      change30Pct: e.prev > 0 ? Math.round(((e.recent - e.prev) / e.prev) * 100) : null,
    }))
    .sort((a, b) => b.count - a.count);

  return {
    enough,
    services,
    top: services[0] ?? null,
    bottom: services.length > 1 ? services[services.length - 1] : null,
  };
}

// ============================================================
// RANDEVU RİSK ANALİZİ — Faz 4
// Geçmiş iptal/gelmeme davranışına göre yaklaşan randevu riski.
// Yeterli geçmişi (>=3 randevu) olmayan müşteride "unknown" (uydurma yok).
// ============================================================

export type ApptRiskLevel = "low" | "medium" | "high" | "unknown";

export const APPT_RISK_LABEL: Record<ApptRiskLevel, string> = {
  low: "Düşük risk",
  medium: "Orta risk",
  high: "Yüksek risk",
  unknown: "Yeterli veri yok",
};

export type UpcomingRisk = {
  id: string;
  when: string;
  customerName: string;
  serviceName: string | null;
  level: ApptRiskLevel;
  pastTotal: number;
  noShowCancel: number;
};

export function analyzeAppointmentRisk(input: {
  now: Date;
  horizonDays?: number;
  appointments: {
    id: string;
    customer_id: string;
    start_at: string;
    status: string;
    customers: { name: string } | null;
    services: { name: string } | null;
  }[];
}): UpcomingRisk[] {
  const { now, horizonDays = 7, appointments } = input;
  const nowT = now.getTime();
  const horizon = nowT + horizonDays * DAY;

  const hist = new Map<string, { total: number; bad: number }>();
  for (const a of appointments) {
    const t = new Date(a.start_at).getTime();
    if (t > nowT) continue; // sadece geçmiş davranış
    const e = hist.get(a.customer_id) ?? { total: 0, bad: 0 };
    e.total++;
    if (a.status === "no_show" || a.status === "cancelled") e.bad++;
    hist.set(a.customer_id, e);
  }

  const upcoming = appointments.filter((a) => {
    const t = new Date(a.start_at).getTime();
    return a.status === "scheduled" && t > nowT && t <= horizon;
  });

  const res: UpcomingRisk[] = upcoming.map((a) => {
    const h = hist.get(a.customer_id);
    let level: ApptRiskLevel = "unknown";
    if (h && h.total >= 3) {
      const rate = h.bad / h.total;
      level = rate >= 0.4 ? "high" : rate >= 0.2 ? "medium" : "low";
    }
    return {
      id: a.id,
      when: a.start_at,
      customerName: a.customers?.name ?? "Müşteri",
      serviceName: a.services?.name ?? null,
      level,
      pastTotal: h?.total ?? 0,
      noShowCancel: h?.bad ?? 0,
    };
  });

  const rank: Record<ApptRiskLevel, number> = {
    high: 0,
    medium: 1,
    low: 2,
    unknown: 3,
  };
  res.sort(
    (a, b) =>
      rank[a.level] - rank[b.level] ||
      new Date(a.when).getTime() - new Date(b.when).getTime(),
  );
  return res;
}

// ============================================================
// PERSONEL PERFORMANS ANALİZİ — Faz 4
// ============================================================

export type StaffStat = {
  name: string;
  appts: number; // tamamlanan randevu
  revenue: number;
  avgSpend: number;
  cancelRate: number; // %
  repeatRate: number; // tekrar gelen müşteri %
};

export function analyzeStaff(input: {
  appointments: {
    staff: { name: string } | null;
    status: string;
    price: number | null;
    customer_id: string;
  }[];
}): { enough: boolean; staff: StaffStat[]; avgRepeatRate: number } {
  const withStaff = input.appointments.filter((a) => a.staff?.name);
  const g = new Map<
    string,
    { status: string; price: number | null; customer_id: string }[]
  >();
  for (const a of withStaff) {
    const n = a.staff!.name;
    if (!g.has(n)) g.set(n, []);
    g.get(n)!.push(a);
  }
  const enough =
    g.size >= 1 &&
    withStaff.filter((a) => a.status === "completed").length >= 5;

  const staff: StaffStat[] = [];
  for (const [name, list] of g) {
    const completed = list.filter((a) => a.status === "completed");
    const bad = list.filter(
      (a) => a.status === "no_show" || a.status === "cancelled",
    );
    const revenue = completed.reduce((s, a) => s + (a.price ?? 0), 0);
    const custCounts = new Map<string, number>();
    for (const a of completed)
      custCounts.set(a.customer_id, (custCounts.get(a.customer_id) ?? 0) + 1);
    const distinct = custCounts.size;
    const repeat = [...custCounts.values()].filter((c) => c > 1).length;
    staff.push({
      name,
      appts: completed.length,
      revenue,
      avgSpend: distinct ? Math.round(revenue / distinct) : 0,
      cancelRate: list.length
        ? Math.round((bad.length / list.length) * 100)
        : 0,
      repeatRate: distinct ? Math.round((repeat / distinct) * 100) : 0,
    });
  }
  staff.sort((a, b) => b.revenue - a.revenue);
  const avgRepeatRate = staff.length
    ? Math.round(staff.reduce((s, x) => s + x.repeatRate, 0) / staff.length)
    : 0;
  return { enough, staff, avgRepeatRate };
}

// ============================================================
// HAFTALIK İŞLETME RAPORU + ÖNERİLER — Faz 5
// ============================================================

export type WeeklyReport = {
  revenue: number;
  newCustomers: number;
  atRiskCustomers: number;
  totalAppointments: number;
  cancellations: number;
  avgSpend: number | null;
  warnings: string[];
  recommendations: string[];
};

export function buildWeeklyReport(input: {
  now: Date;
  startOfWeek: Date;
  appointments: {
    start_at: string;
    status: string;
    price: number | null;
    customer_id: string;
  }[];
  packages: { type: string; price: number | null; purchased_at: string }[];
  customersCreatedAt: string[];
  churnCount: number;
  packagesEndingCount: number;
}): WeeklyReport {
  const {
    now,
    startOfWeek,
    appointments,
    packages,
    customersCreatedAt,
    churnCount,
    packagesEndingCount,
  } = input;
  const nowT = now.getTime();
  const swT = startOfWeek.getTime();
  const weekMs = 7 * DAY;

  const wk = appointments.filter((a) => {
    const t = new Date(a.start_at).getTime();
    return t >= swT && t <= nowT;
  });
  const completed = wk.filter((a) => a.status === "completed");
  const sessionSales = packages
    .filter((p) => p.type !== "monthly")
    .filter((p) => {
      const t = new Date(p.purchased_at).getTime();
      return t >= swT && t <= nowT;
    })
    .reduce((s, p) => s + (p.price ?? 0), 0);
  const revenue =
    completed.reduce((s, a) => s + (a.price ?? 0), 0) + sessionSales;
  const cancellations = wk.filter(
    (a) => a.status === "cancelled" || a.status === "no_show",
  ).length;
  const custs = new Set(completed.map((a) => a.customer_id));
  const avgSpend = custs.size
    ? Math.round(completed.reduce((s, a) => s + (a.price ?? 0), 0) / custs.size)
    : null;
  const newCustomers = customersCreatedAt.filter((c) => {
    const t = new Date(c).getTime();
    return t >= swT && t <= nowT;
  }).length;

  // Geçen hafta ortalama harcama (trend için)
  const lastWk = appointments.filter((a) => {
    const t = new Date(a.start_at).getTime();
    return t >= swT - weekMs && t <= nowT - weekMs && a.status === "completed";
  });
  const lastCusts = new Set(lastWk.map((a) => a.customer_id));
  const lastAvg = lastCusts.size
    ? Math.round(lastWk.reduce((s, a) => s + (a.price ?? 0), 0) / lastCusts.size)
    : null;

  // Son 4 haftada görece boş gün
  const fmt = new Intl.DateTimeFormat("tr-TR", {
    timeZone: TR_TZ,
    weekday: "long",
  });
  const byWd = new Map<string, number>();
  const since = nowT - 28 * DAY;
  for (const a of appointments) {
    const t = new Date(a.start_at).getTime();
    if (t < since || t > nowT || a.status === "cancelled") continue;
    const n = fmt.format(new Date(a.start_at));
    byWd.set(n, (byWd.get(n) ?? 0) + 1);
  }
  let lowWeekday: string | null = null;
  if (byWd.size >= 3) {
    let min = Infinity;
    for (const [n, c] of byWd)
      if (c < min) {
        min = c;
        lowWeekday = n;
      }
  }

  const warnings: string[] = [];
  if (churnCount > 0)
    warnings.push(`${churnCount} müşteri normal ziyaret aralığını aştı.`);
  if (lowWeekday)
    warnings.push(`Son 4 haftada ${lowWeekday} günleri görece daha boş.`);
  if (avgSpend != null && lastAvg != null && lastAvg > 0) {
    const diff = Math.round(((avgSpend - lastAvg) / lastAvg) * 100);
    if (diff <= -5)
      warnings.push(
        `Ortalama müşteri harcaması geçen haftaya göre %${Math.abs(diff)} düştü.`,
      );
  }

  const recommendations: string[] = [];
  if (churnCount > 0)
    recommendations.push(
      `Uzun süredir gelmeyen ${churnCount} müşteriye geri dönüş kampanyası oluşturabilirsiniz.`,
    );
  if (packagesEndingCount > 0)
    recommendations.push(
      `${packagesEndingCount} müşterinin paketi bitmek üzere; yenileme hatırlatması gönderebilirsiniz.`,
    );
  if (lowWeekday)
    recommendations.push(
      `${lowWeekday} günleri doluluk düşük; bu güne özel kampanya oluşturabilirsiniz.`,
    );
  if (avgSpend != null && lastAvg != null && lastAvg > 0 && avgSpend < lastAvg)
    recommendations.push(
      `Ortalama harcama düştü; paket veya ek hizmet önerisiyle sepeti büyütebilirsiniz.`,
    );

  return {
    revenue,
    newCustomers,
    atRiskCustomers: churnCount,
    totalAppointments: wk.length,
    cancellations,
    avgSpend,
    warnings,
    recommendations,
  };
}
