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
