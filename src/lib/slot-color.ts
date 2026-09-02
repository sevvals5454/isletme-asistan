// Aynı saatte (yani genelde aynı grup/seans) gelen randevuları aynı renkte
// göstermek için deterministik renk. Anahtar: Türkiye saatine göre saat:dakika
// → aynı saat her zaman aynı renk; bir grup haftanın farklı günlerinde de aynı
// renkte kalır. Sektör bağımsız (aynı saatte gelen herkesi renkle ayırır).
//
// Palet: dataviz kılavuzunun doğrulanmış 8 kategorik hue'su (blue, orange, aqua,
// yellow, magenta, green, violet, red) — validator ile ayrışması onaylı; eski
// palette birbirine yakın renkler vardı. Tailwind'in purge etmemesi için tam
// string yazılıdır.
const SLOT_CHIP = [
  "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-200",
  "bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-200",
  "bg-teal-100 text-teal-800 dark:bg-teal-900/40 dark:text-teal-200",
  "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200",
  "bg-pink-100 text-pink-800 dark:bg-pink-900/40 dark:text-pink-200",
  "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-200",
  "bg-violet-100 text-violet-800 dark:bg-violet-900/40 dark:text-violet-200",
  "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-200",
];
const SLOT_DOT = [
  "bg-blue-500",
  "bg-orange-500",
  "bg-teal-500",
  "bg-amber-500",
  "bg-pink-500",
  "bg-green-600",
  "bg-violet-500",
  "bg-red-500",
];

function slotIndex(startIso: string): number {
  let key: string;
  try {
    // Yalnız saat:dakika (Türkiye) — gün fark etmez, aynı saat aynı renk.
    key = new Intl.DateTimeFormat("tr-TR", {
      timeZone: "Europe/Istanbul",
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
