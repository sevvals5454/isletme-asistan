// Dinamik mesaj şablonları — sektör bağımsız.
// Değişkenler süslü parantezle: {ad} {tarih} {saat} {hizmet} {paket} {kalan} {isletme}
// Boş kalan değişkenler temizlenir (çift boşluk / fazla satır sadeleşir).

export type MessageKind =
  | "appointment_reminder" // randevu hatırlatma (gün öncesi)
  | "appointment_soon" // randevu yaklaşıyor (aynı gün)
  | "payment_due" // üyelik/ödeme yaklaştı (IBAN'lı)
  | "package_low" // paket bitmek üzere
  | "makeup_offer" // gelememe / telafi daveti
  | "win_back" // uzun süredir gelmeyen müşteri
  | "birthday" // doğum günü kutlaması
  | "review_request" // değerlendirme / Google yorum daveti
  | "confirm_request"; // randevu onay linki

// {iban}: önceden hazırlanmış IBAN satırı (ör. "IBAN: TR.. — Ad Soyad") veya boş.
export const TEMPLATE_VARIABLES = [
  "ad",
  "tarih",
  "saat",
  "hizmet",
  "paket",
  "kalan",
  "iban",
  "link",
  "isletme",
] as const;

export const DEFAULT_TEMPLATES: Record<MessageKind, string> = {
  appointment_reminder:
    "Merhaba {ad}, {tarih} {saat} {hizmet} randevunuzu hatırlatmak isteriz. Görüşmek üzere!\n\n{isletme}",
  appointment_soon:
    "Merhaba {ad}, bugünkü randevunuzun saati ({saat}) yaklaşıyor. Katılım durumunuzu teyit edebilir misiniz?\n\n{isletme}",
  payment_due:
    "Merhaba {ad}, {paket} ödemenizin zamanı yaklaştı.\n{iban}\nDetaylar için bize ulaşabilirsiniz.\n\n{isletme}",
  package_low:
    "Merhaba {ad}, {paket} paketinizde {kalan} seans kaldı. Yenilemek veya yeni bir randevu planlamak ister misiniz?\n\n{isletme}",
  makeup_offer:
    "Merhaba {ad}, randevunuza gelemediğinizi gördük. Telafi için uygun bir gün belirleyelim mi?\n\n{isletme}",
  win_back:
    "Merhaba {ad}, bir süredir görüşemedik, sizi özledik! Size uygun bir gün ayarlayıp tekrar bekleriz. 💛\n\n{isletme}",
  birthday:
    "Merhaba {ad}, doğum gününüz kutlu olsun! 🎉 Nice mutlu, sağlıklı yıllara. Sizi görmek isteriz!\n\n{isletme}",
  review_request:
    "Merhaba {ad}, ziyaretiniz nasıldı? Görüşleriniz bizim için çok değerli. Bir dakikanızı ayırıp değerlendirir misiniz? 🙏\n{link}\n\n{isletme}",
  confirm_request:
    "Merhaba {ad}, {tarih} {saat} randevunuza katılımınızı onaylar mısınız? 👇\n{link}\n\n{isletme}",
};

// IBAN değişkeni için hazır satır üretir (boşsa "" döner → şablondan temizlenir).
export function ibanLine(
  iban: string | null | undefined,
  ibanName?: string | null,
): string {
  if (!iban) return "";
  return ibanName ? `IBAN: ${iban} — ${ibanName}` : `IBAN: ${iban}`;
}

export type TemplateVars = Record<string, string | number | null | undefined>;

export function renderTemplate(template: string, vars: TemplateVars): string {
  const filled = template.replace(/\{(\w+)\}/g, (_, key: string) => {
    const v = vars[key];
    return v == null || v === "" ? "" : String(v);
  });
  // Boş değişkenlerden kalan fazlalıkları sadeleştir.
  return filled
    .replace(/[ \t]{2,}/g, " ")
    .replace(/ +\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
