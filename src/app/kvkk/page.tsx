import { type Metadata } from "next";
import { LegalShell, LegalSection } from "@/components/legal-shell";

export const metadata: Metadata = {
  title: "KVKK Aydınlatma Metni — TechİŞ",
  description:
    "6698 sayılı Kişisel Verilerin Korunması Kanunu kapsamında aydınlatma metni.",
};

export default function KvkkPage() {
  return (
    <LegalShell title="KVKK Aydınlatma Metni" updated="30 Temmuz 2026">
      <p>
        Bu metin, 6698 sayılı Kişisel Verilerin Korunması Kanunu (“KVKK”)
        kapsamında, TechİŞ hizmetini kullanan işletme sahiplerinin
        kişisel verilerinin işlenmesine ilişkin aydınlatma yükümlülüğünü yerine
        getirmek amacıyla hazırlanmıştır.
      </p>

      <LegalSection title="1. İşlenen kişisel veriler">
        <p>
          Kimlik ve iletişim verileri (işletme adı, e-posta adresi) ile hesabınız
          üzerinden oluşturduğunuz işletme kayıtları.
        </p>
      </LegalSection>

      <LegalSection title="2. İşleme amaçları">
        <p>
          Üyelik oluşturma, hizmetin sunulması, güvenliğin sağlanması, destek
          taleplerinin karşılanması ve hizmetin iyileştirilmesi.
        </p>
      </LegalSection>

      <LegalSection title="3. Hukuki sebepler">
        <p>
          Verileriniz; sözleşmenin kurulması ve ifası, hukuki yükümlülüklerin
          yerine getirilmesi ve meşru menfaat hukuki sebeplerine dayanılarak,
          gerekli hâllerde açık rızanız alınarak işlenir.
        </p>
      </LegalSection>

      <LegalSection title="4. Aktarım">
        <p>
          Veriler, hizmetin çalışması için kullanılan barındırma ve veritabanı
          altyapı sağlayıcılarına, yalnızca bu amaçla ve gerekli güvenlik
          önlemleriyle aktarılabilir. Yasal talep hâlinde yetkili kamu kurum ve
          kuruluşlarıyla paylaşılabilir.
        </p>
      </LegalSection>

      <LegalSection title="5. İşletmelerin kendi müşteri verileri">
        <p>
          Uygulamaya kendi müşterilerinize ait kişisel verileri girdiğinizde, bu
          veriler bakımından <strong>veri sorumlusu sizsiniz</strong>. Bu
          kişilere yönelik aydınlatma yapılması ve gerekli hâllerde açık rıza
          alınması sizin yükümlülüğünüzdedir. TechİŞ bu verileri sizin
          talimatınız doğrultusunda işleyen konumundadır.
        </p>
      </LegalSection>

      <LegalSection title="6. Haklarınız (KVKK m. 11)">
        <p>
          Kişisel verilerinizin işlenip işlenmediğini öğrenme, işlenmişse buna
          ilişkin bilgi talep etme, düzeltilmesini veya silinmesini isteme,
          işlemeye itiraz etme ve kanunda sayılan diğer haklara sahipsiniz.
          Taleplerinizi{" "}
          <a
            href="mailto:veritechsoft@gmail.com"
            className="font-medium text-foreground underline"
          >
            veritechsoft@gmail.com
          </a>{" "}
          adresine iletebilirsiniz. Başvurunuz en kısa sürede ve en geç 30 gün
          içinde sonuçlandırılır.
        </p>
      </LegalSection>
    </LegalShell>
  );
}
