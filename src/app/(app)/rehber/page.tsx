import {
  Rocket,
  Sparkles,
  Users,
  UserPlus,
  Calendar,
  CalendarDays,
  Package,
  RotateCcw,
  MessageCircle,
  Bell,
  Send,
  Wallet,
  TrendingDown,
  BarChart3,
  Settings,
  Smartphone,
  HelpCircle,
} from "lucide-react";
import { type ReactNode } from "react";

function Section({
  icon,
  title,
  children,
}: {
  icon: ReactNode;
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-xl border bg-card p-6">
      <div className="mb-3 flex items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
          {icon}
        </div>
        <h2 className="font-semibold">{title}</h2>
      </div>
      <div className="space-y-2 text-sm text-muted-foreground">{children}</div>
    </section>
  );
}

function Step({ n, children }: { n: number; children: ReactNode }) {
  return (
    <div className="flex gap-3">
      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary text-[11px] font-semibold text-primary-foreground">
        {n}
      </span>
      <span className="flex-1">{children}</span>
    </div>
  );
}

export default function RehberPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Kullanım kılavuzu</h1>
        <p className="text-sm text-muted-foreground">
          Uygulamanın tüm özellikleri, adım adım. Aradığın bölüme in.
        </p>
      </div>

      <Section icon={<Rocket className="h-4 w-4" />} title="Hızlı başlangıç">
        <p>İlk kez kullanıyorsan bu sırayı takip et:</p>
        <div className="space-y-2">
          <Step n={1}>
            <strong>Ayarlar → Hizmetler:</strong> Sunduğun hizmetleri süre ve
            fiyatıyla ekle (örn. “Reformer Pilates — 50 dk — 400₺”).
          </Step>
          <Step n={2}>
            <strong>Ayarlar → Çalışanlar</strong> (isteğe bağlı): Birden fazla
            eğitmen/uzman varsa ekle. Tek kişiysen atla.
          </Step>
          <Step n={3}>
            <strong>Müşteriler → Yeni müşteri:</strong> Ad ve telefonla ilk
            müşterini kaydet.
          </Step>
          <Step n={4}>
            <strong>Randevular → Yeni randevu:</strong> Müşteri, hizmet ve tarih
            seçerek ilk randevunu oluştur.
          </Step>
          <Step n={5}>
            <strong>Ayarlar → Ödeme & Mesajlar</strong> (isteğe bağlı): IBAN’ını
            gir, mesaj şablonlarını kendine göre düzenle.
          </Step>
        </div>
        <p className="pt-1">
          Panelin üstündeki “Hızlı başlangıç” kartı bu adımları senin için canlı
          takip eder; hepsi bitince kendiliğinden kaybolur.
        </p>
      </Section>

      <Section
        icon={<Sparkles className="h-4 w-4" />}
        title="Akıllı Asistan (analiz & öneriler)"
      >
        <p>
          Sol menüdeki <strong>Akıllı Asistan</strong>, işletmenin gerçek
          verilerini analiz edip sana anlamlı çıkarımlar ve öneriler sunar
          (hesap uydurmaz; veri az olduğunda “yeterli veri yok” der):
        </p>
        <ul className="list-disc space-y-1 pl-5">
          <li>
            <strong>Haftalık rapor:</strong> Ciro, yeni müşteri, randevu, iptal,
            ortalama harcama + “dikkat etmen gerekenler” + öneriler.
          </li>
          <li>
            <strong>Gelir analizi:</strong> Bu ay/geçen ay değişim, en çok
            kazandıran hizmet ve gün, ortalama müşteri harcaması.
          </li>
          <li>
            <strong>Hizmet analizi:</strong> Hangi hizmet ne kadar tercih
            ediliyor, gelir getiriyor, son 30 günde arttı/azaldı.
          </li>
          <li>
            <strong>Randevu risk analizi:</strong> Geçmiş iptal/gelmeme
            davranışına göre yaklaşan randevularda düşük/orta/yüksek risk.
          </li>
          <li>
            <strong>Personel performansı:</strong> Çalışan bazında randevu,
            gelir, iptal ve tekrar gelen müşteri oranı.
          </li>
          <li>
            <strong>Paket bitiş:</strong> Seansı bitmek üzere olanlar + tek tıkla
            yenileme mesajı.
          </li>
          <li>
            <strong>Müşteri kaybı:</strong> Düzenli gelirken uzaklaşan müşteriler
            + tek tıkla kişiselleştirilmiş <em>geri kazanma mesajı</em>.
          </li>
        </ul>
        <p>
          Panelde ayrıca <strong>“Bugün işletmen için önemli olanlar”</strong>{" "}
          özeti ve <strong>“Bugün ne yapmalısın?”</strong> öncelikli aksiyon
          listesi çıkar.
        </p>
      </Section>

      <Section icon={<Users className="h-4 w-4" />} title="Müşteriler">
        <p>
          <strong>Müşteriler</strong> menüsünden ekle/düzenle. Her müşteride:
        </p>
        <ul className="list-disc space-y-1 pl-5">
          <li>
            <strong>Telefon:</strong> WhatsApp mesajları bu numaraya gider (Türk
            cep formatı otomatik doğrulanır).
          </li>
          <li>
            <strong>KVKK onayı:</strong> Pazarlama/toplu mesaj göndermek için
            gerekli açık rıza kutusu.
          </li>
          <li>
            <strong>Etiket:</strong> “VIP”, “sabahçı” gibi. Toplu mesajda
            segment olarak kullanılır.
          </li>
          <li>
            <strong>Doğum tarihi:</strong> Yaklaşınca panelde kutlama
            hatırlatması çıkar.
          </li>
          <li>
            <strong>Sorumlu çalışan:</strong> “Kimin üyesi” — müşteriyi bir
            çalışana bağlar.
          </li>
        </ul>
        <p>
          Müşteri detayında randevu geçmişi, paketler, telafiler ve
          tahsilat/ödeme kayıtları görünür.
        </p>
      </Section>

      <Section icon={<Calendar className="h-4 w-4" />} title="Randevular">
        <ul className="list-disc space-y-1 pl-5">
          <li>
            <strong>Yeni randevu:</strong> Müşteri + hizmet seçince süre ve fiyat
            otomatik dolar. Tarih ve saati ayrı ayrı seçersin.
          </li>
          <li className="flex items-start gap-1.5">
            <UserPlus className="mt-0.5 h-4 w-4 shrink-0" />
            <span>
              <strong>Kayıtlı olmayan müşteri:</strong> Randevu formunda “+ Yeni
              müşteri” ile ad-telefon girip anında ekleyebilirsin; müşteri
              kaydedilip randevuya bağlanır.
            </span>
          </li>
          <li>
            <strong>Tekrarlayan randevu:</strong> “Haftalık / 2 haftada bir /
            aylık” + kaç kez → tek seferde seri oluşturur.
          </li>
          <li>
            <strong>Paket kullanımı:</strong> Müşterinin paketi varsa randevuda
            seçilir; randevu tamamlanınca seans otomatik düşer (0₺ işlenir).
          </li>
          <li>
            <strong>Durum:</strong> Planlandı / Tamamlandı / Gelmedi / İptal.
          </li>
          <li>
            <strong>WhatsApp butonları:</strong> Hatırlatma, onay linki (planlı),
            telafi daveti (gelmedi), değerlendirme isteği (tamamlandı).
          </li>
          <li>
            <strong>Uygunluk uyarısı:</strong> Çalışma saati dışına/kapalı güne
            randevu girersen uyarır (engellemez).
          </li>
        </ul>
      </Section>

      <Section icon={<CalendarDays className="h-4 w-4" />} title="Takvim">
        <p>
          Aylık görünüm. Bir güne tıklayınca o günün randevularını görür, o gün
          için hızlıca yeni randevu ekleyebilirsin.
        </p>
      </Section>

      <Section
        icon={<Package className="h-4 w-4" />}
        title="Paketler ve telafi"
      >
        <p>Müşteri detayındaki “Paketler” kartından paket sat:</p>
        <ul className="list-disc space-y-1 pl-5">
          <li>
            <strong>Seans paketi:</strong> Örn. “10 Seans”. Her tamamlanan
            randevuda bir seans düşer, kalan gösterilir.
          </li>
          <li>
            <strong>Aylık üyelik:</strong> Seans düşmez; ödeme günü gelince
            “Ödendi” ile sonraki aya geçer, panelde ödeme hatırlatması çıkar.
          </li>
        </ul>
        <p className="flex items-start gap-2 pt-1">
          <RotateCcw className="mt-0.5 h-4 w-4 shrink-0" />
          <span>
            <strong>Telafi:</strong> Paket başına 1 telafi hakkı, paketin alındığı
            ay içinde. Telafi randevusu seans sayısına, süreye ve ödeme gününe{" "}
            <em>dokunmaz</em> — paket bozulmaz.
          </span>
        </p>
      </Section>

      <Section
        icon={<MessageCircle className="h-4 w-4" />}
        title="Bugünkü aksiyonlar (takip asistanı)"
      >
        <p>
          Panelde her gün ne yapman gerektiğini söyler ve her biri için hazır
          WhatsApp mesajı sunar:
        </p>
        <ul className="list-disc space-y-1 pl-5">
          <li>Yaklaşan randevular</li>
          <li>Ödemesi yaklaşan/geciken üyelikler (IBAN’lı mesaj)</li>
          <li>Bitmek üzere seans paketleri</li>
          <li>Uzun süredir gelmeyen (kaybetmek üzere) müşteriler</li>
          <li>Bu hafta doğum günü olanlar</li>
        </ul>
        <p>Butona basınca WhatsApp, hazır metinle açılır — sen sadece gönderirsin.</p>
        <p className="flex items-start gap-1.5 pt-1">
          <Bell className="mt-0.5 h-4 w-4 shrink-0" />
          <span>
            <strong>Canlı bildirim:</strong> Uygulama açıkken, bir randevunun
            saati yaklaşınca ekrana “randevuya X dk kaldı” bildirimi düşer;
            oradan tek tıkla hatırlatma gönderebilirsin.
          </span>
        </p>
      </Section>

      <Section icon={<Send className="h-4 w-4" />} title="Toplu mesaj">
        <p>
          Bir segment seç (KVKK onaylı / tümü / etikete göre), mesajı yaz,
          müşterilere tek tek WhatsApp’tan gönder. Duyuru grubu için “kopyala”
          seçeneği de var.
        </p>
        <p className="rounded-lg bg-muted/50 p-3 text-xs">
          <strong>İsim otomatik:</strong> Tek tek gönderimde her müşterinin adı
          mesajın başına otomatik yazılır (“Merhaba [isim],”). Sen ismi yazmazsın.
        </p>
      </Section>

      <Section
        icon={<Wallet className="h-4 w-4" />}
        title="Tahsilat, giderler ve raporlar"
      >
        <ul className="list-disc space-y-1 pl-5">
          <li>
            <strong>Tahsilat/Ödemeler:</strong> Müşteri detayında tutar + yöntem
            + not olarak kaydedilir.
          </li>
          <li className="flex items-start gap-2">
            <TrendingDown className="mt-0.5 h-4 w-4 shrink-0" />
            <span>
              <strong>Giderler:</strong> Kira, maaş, malzeme, fatura vb. Aylık
              gider takibi.
            </span>
          </li>
          <li className="flex items-start gap-2">
            <BarChart3 className="mt-0.5 h-4 w-4 shrink-0" />
            <span>
              <strong>Raporlar:</strong> Aylık gelir, randevu sayısı, tamamlanma
              oranı, no-show, en çok kazandıran hizmetler, çalışan performansı ve
              net (gelir − gider). Ay ay gezebilirsin.
            </span>
          </li>
        </ul>
      </Section>

      <Section icon={<Settings className="h-4 w-4" />} title="Ayarlar">
        <ul className="list-disc space-y-1 pl-5">
          <li>
            <strong>İşletme bilgileri:</strong> Sidebar ve raporlarda görünen
            isim.
          </li>
          <li>
            <strong>Ödeme & Değerlendirme:</strong> IBAN (ödeme mesajlarına
            eklenir).
          </li>
          <li>
            <strong>Mesaj şablonları:</strong> Tüm otomatik mesajları kendi
            dilinle düzenle. İsim her zaman otomatik eklenir.
          </li>
          <li>
            <strong>Hizmetler / Çalışanlar:</strong> Randevuda seçilecek katalog.
          </li>
          <li>
            <strong>Çalışma saatleri / Kapalı günler:</strong> Uygunluk uyarısı
            için (boş bırakırsan kısıt olmaz).
          </li>
        </ul>
      </Section>

      <Section
        icon={<Smartphone className="h-4 w-4" />}
        title="Telefonda uygulama gibi kullan"
      >
        <p>
          Uygulamayı telefon tarayıcısında aç → menüden{" "}
          <strong>“Ana ekrana ekle”</strong> de. İkonu ana ekranına gelir, tam
          ekran açılır — ayrı bir uygulama indirmene gerek yok.
        </p>
      </Section>

      <Section icon={<HelpCircle className="h-4 w-4" />} title="Sık sorulanlar">
        <p>
          <strong>Mesajlar otomatik mi gidiyor?</strong> Hayır — güvenlik ve
          ücretsizlik için mesajlar “tek tıkla hazır”dır: buton WhatsApp’ı hazır
          metinle açar, gönderme kararı sende.
        </p>
        <p>
          <strong>Müşterinin adını her seferinde yazmalı mıyım?</strong> Hayır,
          isim tüm mesajlara otomatik eklenir.
        </p>
        <p>
          <strong>Verilerim güvende mi?</strong> Her işletme yalnızca kendi
          verisini görür; kayıtlar hesabına bağlıdır.
        </p>
        <p>
          <strong>Güncellemeler nasıl geliyor?</strong> Otomatik. Yeni bir sürüm
          yayınlandığında, uygulama açıksa ekranın altında{" "}
          <strong>“Yeni sürüm hazır — Güncelle”</strong> butonu çıkar; tıklayınca
          en güncel hâle geçersin. İndirme/güncelleme derdi yok.
        </p>
      </Section>
    </div>
  );
}
