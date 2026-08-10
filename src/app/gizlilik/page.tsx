import { type Metadata } from "next";
import { LegalShell, LegalSection } from "@/components/legal-shell";

export const metadata: Metadata = {
  title: "Gizlilik Politikası — TechİŞ",
  description:
    "TechİŞ gizlilik politikası: hangi verileri, neden ve nasıl işliyoruz.",
};

export default function GizlilikPage() {
  return (
    <LegalShell title="Gizlilik Politikası" updated="30 Temmuz 2026">
      <p>
        Bu politika, TechİŞ (“Uygulama”, “biz”) hizmetini kullanırken
        verilerinizin nasıl toplandığını, kullanıldığını ve korunduğunu açıklar.
        Uygulamayı kullanarak bu politikayı kabul etmiş olursunuz.
      </p>

      <LegalSection title="1. Topladığımız veriler">
        <ul className="list-disc space-y-1 pl-5">
          <li>
            <strong>Hesap bilgileri:</strong> Kayıt sırasında verdiğiniz işletme
            adı, e-posta adresi ve şifreniz (şifreler geri döndürülemez şekilde
            şifrelenir).
          </li>
          <li>
            <strong>İşletme içeriği:</strong> Uygulamaya girdiğiniz müşteri,
            randevu, paket, ödeme, gider ve mesaj şablonu kayıtları.
          </li>
          <li>
            <strong>Teknik veriler:</strong> Oturum çerezleri ve hizmetin
            çalışması için gereken temel günlük kayıtları.
          </li>
        </ul>
      </LegalSection>

      <LegalSection title="2. Verileri neden işliyoruz">
        <ul className="list-disc space-y-1 pl-5">
          <li>Hizmeti sunmak, hesabınızı oluşturmak ve güvenliğini sağlamak,</li>
          <li>Randevu, müşteri ve ödeme takibi gibi temel işlevleri yürütmek,</li>
          <li>Talebiniz üzerine destek sağlamak ve hizmeti geliştirmek.</li>
        </ul>
      </LegalSection>

      <LegalSection title="3. Müşteri verilerindeki rolünüz">
        <p>
          Uygulamaya kaydettiğiniz kendi müşterilerinize ait kişisel veriler
          bakımından <strong>veri sorumlusu sizsiniz</strong>; biz bu verileri
          yalnızca sizin adınıza barındıran{" "}
          <strong>veri işleyen</strong> konumundayız. Bu verileri toplamak için
          gerekli hukuki dayanağı (ör. KVKK kapsamında aydınlatma ve gerekli
          hallerde açık rıza) sağlamak sizin sorumluluğunuzdadır.
        </p>
      </LegalSection>

      <LegalSection title="4. Veri paylaşımı">
        <p>
          Verilerinizi satmayız. Yalnızca hizmetin çalışması için kullandığımız
          altyapı sağlayıcılarıyla (ör. veritabanı ve barındırma hizmetleri)
          paylaşılır. Yasal bir yükümlülük olması halinde yetkili mercilerle
          paylaşım yapılabilir.
        </p>
      </LegalSection>

      <LegalSection title="5. Saklama ve güvenlik">
        <p>
          Veriler, hesabınız aktif olduğu sürece saklanır. Her işletme yalnızca
          kendi verisine erişebilir (satır bazlı erişim kısıtı). Aktarım
          sırasında şifreleme kullanılır. Hesabınızı silmek isterseniz aşağıdaki
          iletişim adresinden talepte bulunabilirsiniz.
        </p>
      </LegalSection>

      <LegalSection title="6. Haklarınız">
        <p>
          KVKK kapsamında; verilerinize erişme, düzeltme, silme ve işlemeye
          itiraz etme haklarına sahipsiniz. Taleplerinizi{" "}
          <a
            href="mailto:veritechsoft@gmail.com"
            className="font-medium text-foreground underline"
          >
            veritechsoft@gmail.com
          </a>{" "}
          adresine iletebilirsiniz.
        </p>
      </LegalSection>

      <LegalSection title="7. Değişiklikler">
        <p>
          Bu politikayı zaman zaman güncelleyebiliriz. Önemli değişikliklerde
          uygulama içinde bilgilendirme yaparız. Güncel sürüm her zaman bu
          sayfada yer alır.
        </p>
      </LegalSection>
    </LegalShell>
  );
}
