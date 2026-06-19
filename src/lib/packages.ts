// Paket / seans sistemi yardımcıları.
// Kalan seans ayrı sayaçla tutulmaz — tamamlanan randevular sayılarak
// hesaplanır, böylece sayaç asla bozulmaz/kaymaz.

export type PackageType = "session" | "monthly";

export const PACKAGE_TYPE_LABELS: Record<PackageType, string> = {
  session: "Seans Paketi",
  monthly: "Aylık Üyelik",
};

export type CustomerPackage = {
  id: string;
  customer_id: string;
  service_id: string | null;
  name: string;
  type: PackageType;
  total_sessions: number | null;
  price: number | null;
  purchased_at: string;
  next_payment_at: string | null;
  expires_at: string | null;
  notes: string | null;
};

// Paket + o pakete bağlı tamamlanmış seans sayısı.
export type PackageWithUsage = CustomerPackage & {
  used_sessions: number;
};

export function remainingSessions(pkg: PackageWithUsage): number {
  return Math.max(0, (pkg.total_sessions ?? 0) - pkg.used_sessions);
}

export function isExpired(pkg: { expires_at: string | null }, now = new Date()): boolean {
  return pkg.expires_at != null && new Date(pkg.expires_at) < now;
}

// Son kullanıma kalan tam gün sayısı; tarih yoksa null.
export function daysUntilExpiry(
  pkg: { expires_at: string | null },
  now = new Date(),
): number | null {
  if (!pkg.expires_at) return null;
  return Math.ceil(
    (new Date(pkg.expires_at).getTime() - now.getTime()) /
      (24 * 60 * 60 * 1000),
  );
}

// Bitme uyarısı gerektirir mi: az seans kaldı VEYA süresi yaklaşıyor
// (henüz dolmamış). Tamamen bitmiş/süresi dolmuş paketler gösterilmez.
export function packageNeedsAttention(
  pkg: PackageWithUsage,
  opts: { lowThreshold?: number; soonDays?: number } = {},
  now = new Date(),
): boolean {
  const { lowThreshold = 2, soonDays = 14 } = opts;
  if (pkg.type !== "session") return false; // aylık üyelik ayrı (ödeme)
  if (isExpired(pkg, now)) return false;
  const remaining = remainingSessions(pkg);
  if (remaining === 0) return false;
  const days = daysUntilExpiry(pkg, now);
  const low = remaining <= lowThreshold;
  const soon = days != null && days <= soonDays;
  return low || soon;
}

// Randevuda kullanılabilir mi: seans paketi + seansı kalmış + süresi dolmamış.
// (Aylık üyelik seans tüketmez, randevuya bağlanmaz.)
export function isPackageUsable(pkg: PackageWithUsage, now = new Date()): boolean {
  return (
    pkg.type === "session" &&
    remainingSessions(pkg) > 0 &&
    !isExpired(pkg, now)
  );
}

// Aylık üyelik ödeme durumu (basit model: next_payment_at'a göre).
export type MonthlyDueStatus = "overdue" | "soon" | "ok";

export function monthlyDueStatus(
  pkg: { type: PackageType; next_payment_at: string | null },
  soonDays = 7,
  now = new Date(),
): MonthlyDueStatus | null {
  if (pkg.type !== "monthly" || !pkg.next_payment_at) return null;
  const days = Math.ceil(
    (new Date(pkg.next_payment_at).getTime() - now.getTime()) /
      (24 * 60 * 60 * 1000),
  );
  if (days < 0) return "overdue";
  if (days <= soonDays) return "soon";
  return "ok";
}

// --- Telafi (makeup) -----------------------------------------------------

export type MakeupStatus = "pending" | "scheduled" | "completed" | "cancelled";

export const MAKEUP_STATUS_LABELS: Record<MakeupStatus, string> = {
  pending: "Bekliyor",
  scheduled: "Planlandı",
  completed: "Tamamlandı",
  cancelled: "İptal",
};

export const MAKEUP_STATUS_STYLES: Record<MakeupStatus, string> = {
  pending: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  scheduled: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  completed:
    "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  cancelled: "bg-muted text-muted-foreground",
};

export type Makeup = {
  id: string;
  customer_id: string;
  package_id: string | null;
  appointment_id: string | null;
  missed_date: string;
  makeup_at: string | null;
  status: MakeupStatus;
  notes: string | null;
};

export function packageProgressLabel(pkg: PackageWithUsage): string {
  return `${remainingSessions(pkg)}/${pkg.total_sessions} seans kaldı`;
}

// Bir paket listesine, her paketin kaç seansının kullanıldığını eşler.
// usedByPackageId: package_id -> tamamlanmış randevu sayısı.
export function withUsage(
  packages: CustomerPackage[],
  usedByPackageId: Map<string, number>,
): PackageWithUsage[] {
  return packages.map((p) => ({
    ...p,
    used_sessions: usedByPackageId.get(p.id) ?? 0,
  }));
}
