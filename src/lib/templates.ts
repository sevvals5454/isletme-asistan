// Dinamik mesaj şablonları — sektör bağımsız.
// İsim OTOMATİK: her mesajın başına "Merhaba [müşteri adı]," otomatik eklenir.
// Şablonlarda {ad} YAZMAYA GEREK YOK — kullanıcı sadece devamını yazar.
// Diğer değişkenler süslü parantezle: {tarih} {saat} {hizmet} {paket} {kalan} {isletme}
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

// İsim ({ad}) otomatik eklenir, bu yüzden listede yok.
// {iban}: önceden hazırlanmış IBAN satırı (ör. "IBAN: TR.. — Ad Soyad") veya boş.
export const TEMPLATE_VARIABLES = [
  "tarih",
  "saat",
  "hizmet",
  "paket",
  "kalan",
  "iban",
  "link",
  "isletme",
] as const;

// NOT: Şablonlar "Merhaba [isim]," ile BAŞLAMAZ — isim otomatik eklenir (renderMessage).
export const DEFAULT_TEMPLATES: Record<MessageKind, string> = {
  appointment_reminder:
    "{tarih} {saat} {hizmet} randevunuzu hatırlatmak isteriz. Görüşmek üzere!\n\n{isletme}",
  appointment_soon:
    "bugünkü randevunuzun saati ({saat}) yaklaşıyor. Katılım durumunuzu teyit edebilir misiniz?\n\n{isletme}",
  payment_due:
    "{paket} ödemenizin zamanı yaklaştı.\n{iban}\nDetaylar için bize ulaşabilirsiniz.\n\n{isletme}",
  package_low:
    "{paket} paketinizde {kalan} seans kaldı. Yenilemek veya yeni bir randevu planlamak ister misiniz?\n\n{isletme}",
  makeup_offer:
    "randevunuza gelemediğinizi gördük. Telafi için uygun bir gün belirleyelim mi?\n\n{isletme}",
  win_back:
    "bir süredir görüşemedik, sizi özledik! Size uygun bir gün ayarlayıp tekrar bekleriz. 💛\n\n{isletme}",
  birthday:
    "doğum gününüz kutlu olsun! 🎉 Nice mutlu, sağlıklı yıllara. Sizi görmek isteriz!\n\n{isletme}",
  review_request:
    "ziyaretiniz nasıldı? Görüşleriniz bizim için çok değerli. Bir dakikanızı ayırıp değerlendirir misiniz? 🙏\n{link}\n\n{isletme}",
  confirm_request:
    "{tarih} {saat} randevunuza katılımınızı onaylar mısınız? 👇\n{link}\n\n{isletme}",
};

// IBAN değişkeni için hazır satır üretir (boşsa "" döner → şablondan temizlenir).
export function ibanLine(
  iban: string | null | undefined,
  ibanName?: string | null,
): string {
  if (!iban) return "";
  return ibanName ? `IBAN: ${iban} — ${ibanName}` : `IBAN: ${iban}`;
}

// Ayarlar ekranında gösterilecek okunur etiketler.
export const MESSAGE_KIND_LABELS: Record<MessageKind, string> = {
  appointment_reminder: "Randevu hatırlatma",
  appointment_soon: "Randevu yaklaşıyor (aynı gün)",
  payment_due: "Ödeme / üyelik hatırlatma",
  package_low: "Paket bitmek üzere",
  makeup_offer: "Telafi daveti",
  win_back: "Geri kazanım (uzun süredir gelmeyen)",
  birthday: "Doğum günü",
  review_request: "Değerlendirme isteği",
  confirm_request: "Randevu onay linki",
};

// İşletmenin özel şablonlarını varsayılanların üzerine bindirir.
// Kolon/veri yoksa (migration çalışmamışsa) varsayılanlar kullanılır.
export function resolveTemplates(
  custom?: Partial<Record<MessageKind, string>> | null,
): Record<MessageKind, string> {
  const merged = { ...DEFAULT_TEMPLATES };
  if (custom) {
    for (const k of Object.keys(DEFAULT_TEMPLATES) as MessageKind[]) {
      const v = custom[k];
      if (typeof v === "string" && v.trim()) merged[k] = v;
    }
  }
  return merged;
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

// Müşteriye gidecek NİHAİ mesaj: isim otomatik başa eklenir + değişkenler doldurulur.
// vars.ad → müşteri adı (boşsa "Merhaba," ile başlar, toplu/gruba uygun).
// Şablon zaten "Merhaba" ile başlıyorsa (kullanıcı kendi selamını yazdıysa) tekrar eklenmez.
export function renderMessage(template: string, vars: TemplateVars): string {
  const name = vars.ad == null ? "" : String(vars.ad).trim();
  const startsWithGreeting = /^\s*merhaba/i.test(template);
  const prefix = startsWithGreeting ? "" : name ? `Merhaba ${name}, ` : "Merhaba, ";
  return renderTemplate(prefix + template, { ...vars, ad: name });
}
