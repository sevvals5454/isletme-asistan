// Tüm tarih/saat işlemleri Türkiye saatine (Europe/Istanbul) göre yapılır.
// Türkiye 2016'dan beri sabit UTC+3 (yaz saati yok), bu yüzden sabit offset
// güvenli ve okunaklı. Hem sunucuda (dashboard/raporlar, Vercel UTC çalışır)
// hem istemcide aynı sonucu verir.

export const TR_TZ = "Europe/Istanbul";
const TR_OFFSET_MS = 3 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

// "now" anının Türkiye duvar-saatini UTC alanlarında taşıyan yardımcı.
function trWall(now: Date): Date {
  return new Date(now.getTime() + TR_OFFSET_MS);
}

// Türkiye'de günün başlangıcı, gerçek (UTC) bir an olarak.
export function trStartOfDay(now: Date = new Date()): Date {
  const w = trWall(now);
  return new Date(
    Date.UTC(w.getUTCFullYear(), w.getUTCMonth(), w.getUTCDate()) - TR_OFFSET_MS,
  );
}

// Pazartesi başlangıçlı, içinde bulunulan haftanın başı.
export function trStartOfWeek(now: Date = new Date()): Date {
  const w = trWall(now);
  const dow = (w.getUTCDay() + 6) % 7; // pazartesi = 0
  return new Date(trStartOfDay(now).getTime() - dow * DAY_MS);
}

// Türkiye'de ayın başı.
export function trStartOfMonth(now: Date = new Date()): Date {
  const w = trWall(now);
  return new Date(
    Date.UTC(w.getUTCFullYear(), w.getUTCMonth(), 1) - TR_OFFSET_MS,
  );
}

// Belirli bir (yıl, ay0) için Türkiye ay başı (gerçek/UTC an). month0 taşarsa
// (örn. 12) Date.UTC yıla taşır.
export function trMonthStart(year: number, month0: number): Date {
  return new Date(Date.UTC(year, month0, 1) - TR_OFFSET_MS);
}

// Ayın başından n ay sonrası (ay sınırı hesapları için).
export function trAddMonths(now: Date, n: number): Date {
  const w = trWall(now);
  return new Date(
    Date.UTC(w.getUTCFullYear(), w.getUTCMonth() + n, 1) - TR_OFFSET_MS,
  );
}

// Sabit offset olduğu için gün eklemek güvenle 24s × n'dir.
export function addDays(d: Date, n: number): Date {
  return new Date(d.getTime() + n * DAY_MS);
}

// --- Gösterim (her zaman Türkiye saatiyle) -------------------------------

export function formatTrTime(iso: string | Date): string {
  return new Date(iso).toLocaleTimeString("tr-TR", {
    timeZone: TR_TZ,
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatTrDate(iso: string | Date): string {
  return new Date(iso).toLocaleDateString("tr-TR", { timeZone: TR_TZ });
}

// Bir anın Türkiye'deki takvim gününü "YYYY-MM-DD" olarak döndürür
// (takvim hücresi eşleştirmesi için).
export function trDateKey(d: Date): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: TR_TZ }).format(d);
}
