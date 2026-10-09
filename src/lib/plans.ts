// Abonelik paketleri + deneme süresi — fiyatları buradan değiştir.
// Paketler çalışan/kullanıcı sayısına göre ayrışır; tüm özellikler her pakette açık.

export const TRIAL_DAYS = 14;

export type PlanId = "pro" | "business";

export type Plan = {
  id: PlanId;
  name: string;
  priceMonthly: number; // ₺ / ay
  priceYearly: number; // ₺ / yıl (2 ay bedava)
  maxUsers: number | null; // patron dahil kullanıcı sınırı; null = sınırsız
  highlight?: boolean; // vitrinde öne çıkar
  tagline: string;
  perks: string[];
};

export const PLANS: Plan[] = [
  {
    id: "pro",
    name: "Profesyonel",
    priceMonthly: 699,
    priceYearly: 6990,
    maxUsers: 3,
    highlight: true,
    tagline: "Küçük ekipler için",
    perks: [
      "Patron + 2 çalışan (3 kullanıcı)",
      "Tüm özellikler sınırsız",
      "Online randevu + akıllı asistan",
      "E-posta & WhatsApp hatırlatma",
      "Ürün/stok, sadakat, raporlar",
    ],
  },
  {
    id: "business",
    name: "İşletme",
    priceMonthly: 1299,
    priceYearly: 12990,
    maxUsers: null,
    tagline: "Büyüyen işletmeler için",
    perks: [
      "Sınırsız çalışan",
      "Tüm özellikler sınırsız",
      "Öncelikli destek",
      "Çoklu şube (yakında)",
    ],
  },
];

export function getPlan(id: string | null | undefined): Plan | undefined {
  return PLANS.find((p) => p.id === id);
}

export function formatTl(n: number): string {
  return new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency: "TRY",
    maximumFractionDigits: 0,
  }).format(n);
}

/** Deneme bitimine kalan tam gün (geçmişse 0). */
export function trialDaysLeft(trialEndsAt: string | null | undefined): number {
  if (!trialEndsAt) return 0;
  const ms = new Date(trialEndsAt).getTime() - Date.now();
  return ms <= 0 ? 0 : Math.ceil(ms / (1000 * 60 * 60 * 24));
}

export type AccessStatus = "trial" | "active" | "expired" | "blocked";

/** Erişim kapısı kararı — FAIL-OPEN: bilgi yoksa izin ver, asla bug yüzünden kilitleme. */
export function isLocked(
  status: string | null | undefined,
  trialEndsAt: string | null | undefined,
): boolean {
  if (status === "expired" || status === "blocked") return true;
  if (status === "trial" && trialEndsAt && trialDaysLeft(trialEndsAt) <= 0)
    return true;
  return false; // 'active', bilinmeyen, null → açık
}
