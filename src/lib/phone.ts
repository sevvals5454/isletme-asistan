// Türk telefon numarası biçimleme/doğrulama + WhatsApp hatırlatma linki.

/** Sadece rakamları alır. */
function digitsOnly(raw: string): string {
  return raw.replace(/\D/g, "");
}

/**
 * Girişi "0532 123 45 67" biçiminde gösterir (kullanıcı yazarken).
 * Tam 11 haneye ulaşmadıysa elindeki kadarını gruplayarak döner.
 */
export function formatTurkishPhone(raw: string): string {
  let d = digitsOnly(raw);
  // +90 / 90 önekini 0'a indirge
  if (d.startsWith("90")) d = "0" + d.slice(2);
  d = d.slice(0, 11);
  if (d.length === 0) return "";
  const parts = [d.slice(0, 4), d.slice(4, 7), d.slice(7, 9), d.slice(9, 11)];
  return parts.filter(Boolean).join(" ");
}

/** Türk cep telefonu mu? (05XX ... — 11 hane, 05 ile başlar) */
export function isValidTurkishMobile(raw: string): boolean {
  let d = digitsOnly(raw);
  if (d.startsWith("90")) d = "0" + d.slice(2);
  return /^05\d{9}$/.test(d);
}

/** WhatsApp için 90XXXXXXXXXX biçimine çevirir; geçersizse null. */
export function toWhatsAppNumber(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const d = digitsOnly(raw);
  if (d.startsWith("90") && d.length === 12) return d;
  if (d.startsWith("0") && d.length === 11) return "90" + d.slice(1);
  if (d.length === 10 && d.startsWith("5")) return "90" + d;
  return null;
}

/**
 * wa.me hatırlatma linki üretir. Telefon geçersizse null döner
 * (buton render edilmez).
 */
export function whatsAppReminderUrl(
  phone: string | null | undefined,
  message: string,
): string | null {
  const num = toWhatsAppNumber(phone);
  if (!num) return null;
  return `https://wa.me/${num}?text=${encodeURIComponent(message)}`;
}

/** Standart randevu hatırlatma metni. */
export function buildReminderMessage(opts: {
  customerName: string;
  whenText: string;
  serviceName?: string | null;
  orgName?: string | null;
}): string {
  const { customerName, whenText, serviceName, orgName } = opts;
  const hizmet = serviceName ? ` ${serviceName}` : "";
  const imza = orgName ? `\n\n${orgName}` : "";
  return `Merhaba ${customerName}, ${whenText} tarihli${hizmet} randevunuzu hatırlatmak isteriz. Görüşmek üzere!${imza}`;
}

/** Paket bitmek üzere / süresi yaklaşıyor — yenileme daveti. */
export function buildPackageRenewalMessage(opts: {
  customerName: string;
  packageName: string;
  remaining: number;
  orgName?: string | null;
}): string {
  const { customerName, packageName, remaining, orgName } = opts;
  const imza = orgName ? `\n\n${orgName}` : "";
  const durum =
    remaining > 0
      ? `"${packageName}" paketinizde ${remaining} seans kaldı`
      : `"${packageName}" paketiniz tamamlandı`;
  return `Merhaba ${customerName}, ${durum}. Yenilemek veya yeni bir randevu planlamak ister misiniz?${imza}`;
}

/** Toplu mesajda {ad} yer tutucusunu müşteri adıyla değiştirir. */
export function fillTemplate(template: string, customerName: string): string {
  return template.replaceAll("{ad}", customerName);
}

/** Hazır wa.me linki (mesaj zaten oluşturulmuş). */
export function whatsAppUrl(
  phone: string | null | undefined,
  message: string,
): string | null {
  return whatsAppReminderUrl(phone, message);
}
