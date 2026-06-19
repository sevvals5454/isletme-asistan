// Çalışma saatleri + kapalı gün uygunluk kontrolü (sektör bağımsız).
// Tanımlı değilse kısıt yok. Engellemez, sadece UYARI döndürür.

import { trDateKey } from "@/lib/time";

export const WEEKDAY_LABELS = [
  "Pazartesi",
  "Salı",
  "Çarşamba",
  "Perşembe",
  "Cuma",
  "Cumartesi",
  "Pazar",
];

export type DayHours = {
  weekday: number; // 0=Pazartesi .. 6=Pazar
  is_open: boolean;
  open_time: string; // "HH:MM[:SS]"
  close_time: string;
};

// Türkiye haftanın günü (Pazartesi=0). Cihaz TR olduğu için getDay yeterli.
export function trWeekday(d: Date): number {
  return (d.getDay() + 6) % 7;
}

function toMin(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
}

export function hhmm(t: string): string {
  return t.slice(0, 5);
}

// Randevu zamanı için uyarı metni; uygunsa null.
export function availabilityWarning(
  start: Date,
  hours: DayHours[],
  closedKeys: Set<string>, // kapalı tarihler, "YYYY-MM-DD" (TR)
): string | null {
  if (closedKeys.has(trDateKey(start))) {
    return "Bu gün kapalı olarak işaretli (tatil/izin).";
  }
  const dh = hours.find((h) => h.weekday === trWeekday(start));
  if (!dh) return null; // tanımlı değil → kısıt yok
  if (!dh.is_open) return "İşletme bu gün kapalı.";
  const mins = start.getHours() * 60 + start.getMinutes();
  if (mins < toMin(dh.open_time) || mins >= toMin(dh.close_time)) {
    return `Çalışma saatleri dışında (${hhmm(dh.open_time)}–${hhmm(dh.close_time)}).`;
  }
  return null;
}
