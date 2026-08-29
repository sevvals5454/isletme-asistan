// Aynı gün + saatte (yani aynı grup/seans) gelen randevuları aynı renkte
// göstermek için deterministik renk. Anahtar: Türkiye saatine göre haftanın
// günü + saat-dakika → aynı slot her zaman aynı renk (farklı sektörlere de yarar).

// Tailwind'in bu sınıfları purge etmemesi için tam string olarak yazılıdır.
const SLOT_CHIP = [
  "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-200",
  "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200",
  "bg-violet-100 text-violet-800 dark:bg-violet-900/40 dark:text-violet-200",
  "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200",
  "bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-200",
  "bg-cyan-100 text-cyan-800 dark:bg-cyan-900/40 dark:text-cyan-200",
  "bg-fuchsia-100 text-fuchsia-800 dark:bg-fuchsia-900/40 dark:text-fuchsia-200",
  "bg-lime-100 text-lime-800 dark:bg-lime-900/40 dark:text-lime-200",
  "bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-200",
  "bg-teal-100 text-teal-800 dark:bg-teal-900/40 dark:text-teal-200",
  "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/40 dark:text-indigo-200",
  "bg-pink-100 text-pink-800 dark:bg-pink-900/40 dark:text-pink-200",
];
const SLOT_DOT = [
  "bg-blue-500",
  "bg-emerald-500",
  "bg-violet-500",
  "bg-amber-500",
  "bg-rose-500",
  "bg-cyan-500",
  "bg-fuchsia-500",
  "bg-lime-500",
  "bg-orange-500",
  "bg-teal-500",
  "bg-indigo-500",
  "bg-pink-500",
];

function slotIndex(startIso: string): number {
  let key: string;
  try {
    key = new Intl.DateTimeFormat("tr-TR", {
      timeZone: "Europe/Istanbul",
      weekday: "short",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(startIso));
  } catch {
    key = startIso.slice(11, 16); // fallback: HH:MM
  }
  let h = 0;
  for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) >>> 0;
  return h % SLOT_CHIP.length;
}

/** Takvim/liste rozetleri için arka plan + metin renk sınıfları. */
export function slotChipClasses(startIso: string): string {
  return SLOT_CHIP[slotIndex(startIso)];
}

/** Küçük renk noktası (liste satırında saatin yanında). */
export function slotDotClass(startIso: string): string {
  return SLOT_DOT[slotIndex(startIso)];
}
