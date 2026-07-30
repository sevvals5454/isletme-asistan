import { type Metadata } from "next";
import { LegalShell, LegalSection } from "@/components/legal-shell";

export const metadata: Metadata = {
  title: "Kullanım Koşulları — İşletme Asistanı",
  description: "İşletme Asistanı hizmetinin kullanım koşulları.",
};

export default function KullanimKosullariPage() {
  return (
    <LegalShell title="Kullanım Koşulları" updated="30 Temmuz 2026">
      <p>
        Bu koşullar, İşletme Asistanı (“Uygulama”) hizmetinin kullanımını
        düzenler. Uygulamaya kayıt olarak bu koşulları kabul etmiş sayılırsınız.
      </p>

      <LegalSection title="1. Hizmetin tanımı">
        <p>
          Uygulama; müşteri, randevu, paket, ödeme ve gider yönetimi ile hazır
          WhatsApp mesajı oluşturma gibi işlevler sunan web tabanlı bir yönetim
          aracıdır. Hizmet “olduğu gibi” sunulur ve zaman içinde geliştirilebilir.
        </p>
      </LegalSection>

      <LegalSection title="2. Hesap ve sorumluluk">
        <ul className="list-disc space-y-1 pl-5">
          <li>Hesap bilgilerinizin gizliliğinden siz sorumlusunuz.</li>
          <li>
            Girdiğiniz içeriklerin (müşteri verileri dâhil) doğruluğundan ve
            bunları toplama/işleme yetkisine sahip olmaktan siz sorumlusunuz.
          </li>
          <li>
            Uygulamayı yürürlükteki mevzuata ve üçüncü kişilerin haklarına aykırı
            biçimde kullanamazsınız.
          </li>
        </ul>
      </LegalSection>

      <LegalSection title="3. Mesaj gönderimi">
        <p>
          Uygulama, mesajları otomatik göndermez; yalnızca hazır metinle WhatsApp
          bağlantısı oluşturur. Mesajı gönderme kararı ve bunun ilgili kişilere
          uygun/rızalı biçimde iletilmesi tamamen sizin sorumluluğunuzdadır. İz
          alınmamış kişilere pazarlama mesajı göndermekten doğabilecek sonuçlardan
          Uygulama sorumlu değildir.
        </p>
      </LegalSection>

      <LegalSection title="4. Ücretlendirme">
        <p>
          Hizmet şu anda ücretsiz sunulmaktadır. İleride ücretli planlar
          sunulması hâlinde, geçiş öncesinde bilgilendirilirsiniz ve ücretli
          özellikleri kullanıp kullanmama tercihini yaparsınız.
        </p>
      </LegalSection>

      <LegalSection title="5. Sorumluluğun sınırlandırılması">
        <p>
          Uygulama, veri kaybı, kâr kaybı veya dolaylı zararlar dâhil olmak üzere
          hizmetin kullanımından doğabilecek zararlardan, yürürlükteki mevzuatın
          izin verdiği ölçüde sorumlu tutulamaz. Verilerinizi düzenli olarak
          yedeklemeniz önerilir.
        </p>
      </LegalSection>

      <LegalSection title="6. Fesih">
        <p>
          Dilediğiniz zaman kullanımı bırakabilir ve hesabınızın silinmesini
          talep edebilirsiniz. Koşulların ihlali hâlinde hesabınıza erişimi
          askıya alma veya sonlandırma hakkımız saklıdır.
        </p>
      </LegalSection>

      <LegalSection title="7. İletişim">
        <p>
          Sorularınız için:{" "}
          <a
            href="mailto:veritechsoft@gmail.com"
            className="font-medium text-foreground underline"
          >
            veritechsoft@gmail.com
          </a>
        </p>
      </LegalSection>
    </LegalShell>
  );
}
