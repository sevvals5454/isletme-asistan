// Randevu durum etiketleri, rozet stilleri ve biçimlendirme yardımcıları.
// Hem server component'lerde (dashboard, müşteri detayı) hem de
// client view'da (appointments-view) ortak kullanılır.

export type AppointmentStatus =
  | "scheduled"
  | "completed"
  | "cancelled"
  | "no_show";

export const STATUS_LABELS: Record<AppointmentStatus, string> = {
  scheduled: "Planlandı",
  completed: "Tamamlandı",
  cancelled: "İptal",
  no_show: "Gelmedi",
};

export const STATUS_STYLES: Record<AppointmentStatus, string> = {
  scheduled:
    "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  completed:
    "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  cancelled: "bg-muted text-muted-foreground",
  no_show: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
};

export function formatPrice(price: number | null): string {
  if (price == null) return "—";
  return price.toLocaleString("tr-TR", {
    style: "currency",
    currency: "TRY",
    maximumFractionDigits: 0,
  });
}

export function formatAppointmentWhen(iso: string): string {
  return new Date(iso).toLocaleString("tr-TR", {
    timeZone: "Europe/Istanbul",
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// Tekrarlayan randevu: kayıt anında N adet bağımsız satır üretilir.
// Şema değişmeden çalışır; her randevu tek tek düzenlenip silinebilir.
export type RecurrenceType = "none" | "weekly" | "biweekly" | "monthly";

export const RECURRENCE_LABELS: Record<RecurrenceType, string> = {
  none: "Tekrar yok",
  weekly: "Her hafta",
  biweekly: "İki haftada bir",
  monthly: "Her ay",
};

// Başlangıç tarihinden itibaren `count` adet tekrar tarihi üretir (ilki
// başlangıcın kendisi). Saat korunur. Aylık tekrarda ayın günü korunur;
// taşma olursa (örn. 31 → şubat) hedef ayın son gününe sabitlenir.
export function buildRecurringDates(
  start: Date,
  type: RecurrenceType,
  count: number,
): Date[] {
  if (type === "none" || count <= 1) return [new Date(start)];

  const dates: Date[] = [];
  for (let i = 0; i < count; i++) {
    if (type === "monthly") {
      const d = new Date(start);
      d.setDate(1); // gün taşmasını önlemek için önce 1'e çek
      d.setMonth(start.getMonth() + i); // ay >11 olursa yıl otomatik artar
      const daysInMonth = new Date(
        d.getFullYear(),
        d.getMonth() + 1,
        0,
      ).getDate();
      d.setDate(Math.min(start.getDate(), daysInMonth));
      dates.push(d);
    } else {
      const step = type === "weekly" ? 7 : 14;
      const d = new Date(start);
      d.setDate(start.getDate() + step * i);
      dates.push(d);
    }
  }
  return dates;
}
