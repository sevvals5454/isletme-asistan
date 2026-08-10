import Link from "next/link";
import {
  ArrowRight,
  Sparkles,
  Users,
  Calendar,
  Package,
  MessageCircle,
  BarChart3,
  Bell,
  Check,
  ShieldCheck,
} from "lucide-react";
import { SiteFooter } from "@/components/site-footer";

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-background">
      <header className="border-b">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-foreground text-background">
              <Sparkles className="h-4 w-4" />
            </div>
            <div className="leading-tight">
              <div className="font-semibold">
                Tech<span className="text-primary">İŞ</span>
              </div>
              <div className="text-[11px] text-muted-foreground">
                İşletme Asistanı
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="text-sm text-muted-foreground hover:text-foreground"
            >
              Giriş yap
            </Link>
            <Link
              href="/signup"
              className="inline-flex items-center gap-1 rounded-lg bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:opacity-90"
            >
              Ücretsiz başla
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="mx-auto max-w-4xl px-6 py-20 text-center md:py-28">
        <div className="mb-4 inline-flex items-center gap-2 rounded-full border bg-muted/50 px-3 py-1 text-xs">
          <Sparkles className="h-3 w-3" />
          Randevu · Müşteri · Paket · Gelir takibi — tek panelde
        </div>
        <h1 className="mb-6 text-balance text-4xl font-semibold tracking-tight md:text-6xl">
          Defter ve WhatsApp karmaşasını
          <br />
          <span className="bg-gradient-to-r from-primary to-violet-500 bg-clip-text text-transparent">
            tek panele taşıyın.
          </span>
        </h1>
        <p className="mx-auto mb-10 max-w-xl text-balance text-lg text-muted-foreground">
          Pilates stüdyosu, güzellik salonu, kuaför, danışman… Randevularınızı,
          paketlerinizi ve gelir-giderinizi kolayca yönetin. Kurulum yok,
          ücretsiz başlayın.
        </p>
        <div className="flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link
            href="/signup"
            className="inline-flex w-full items-center justify-center gap-1 rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground hover:opacity-90 sm:w-auto"
          >
            Ücretsiz dene
            <ArrowRight className="h-4 w-4" />
          </Link>
          <Link
            href="/login"
            className="inline-flex w-full items-center justify-center rounded-lg border px-5 py-2.5 text-sm font-medium hover:bg-muted sm:w-auto"
          >
            Giriş yap
          </Link>
        </div>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            <Check className="h-3.5 w-3.5 text-green-600" /> Masaüstü ve telefonda
            çalışır
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Check className="h-3.5 w-3.5 text-green-600" /> Kurulum gerekmez
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Check className="h-3.5 w-3.5 text-green-600" /> KVKK’ya uygun
          </span>
        </div>
      </section>

      {/* Özellikler */}
      <section className="mx-auto max-w-5xl px-6 pb-8">
        <div className="grid gap-6 md:grid-cols-3">
          <Feature
            icon={<Users className="h-5 w-5" />}
            title="Müşteri yönetimi"
            description="Müşteri kartları, etiketler, doğum günü ve sorumlu çalışan. Geçmiş randevular ve ödemeler tek yerde."
          />
          <Feature
            icon={<Calendar className="h-5 w-5" />}
            title="Randevu & takvim"
            description="Tek tek veya tekrarlayan randevu, aylık takvim, çalışma saati uyarısı. Düzenle, taşı, seri sil."
          />
          <Feature
            icon={<Package className="h-5 w-5" />}
            title="Paket & telafi"
            description="Seans paketi ve aylık üyelik takibi, kalan seans otomatik düşer. Paket başına telafi hakkı korunur."
          />
          <Feature
            icon={<MessageCircle className="h-5 w-5" />}
            title="Hazır WhatsApp mesajı"
            description="Hatırlatma, ödeme, doğum günü ve geri kazanım mesajları tek tıkla hazır — isim otomatik, siz sadece gönderin."
          />
          <Feature
            icon={<Bell className="h-5 w-5" />}
            title="Bugünkü aksiyonlar"
            description="Her gün ne yapmanız gerektiğini söyler: yaklaşan ödeme, bitmek üzere paket, kaybetmek üzere müşteri."
          />
          <Feature
            icon={<BarChart3 className="h-5 w-5" />}
            title="Gelir, gider & rapor"
            description="Aylık gelir, tahsilat, gider ve net kâr. En çok kazandıran hizmet ve çalışan performansı."
          />
        </div>
      </section>

      {/* Nasıl çalışır */}
      <section className="mx-auto max-w-4xl px-6 py-16">
        <h2 className="mb-8 text-center text-2xl font-semibold">
          3 adımda başlayın
        </h2>
        <div className="grid gap-6 md:grid-cols-3">
          <HowStep
            n={1}
            title="Hesap oluşturun"
            desc="E-posta ile dakikalar içinde ücretsiz kayıt olun."
          />
          <HowStep
            n={2}
            title="Hizmet ve müşteri ekleyin"
            desc="Uygulama sizi adım adım yönlendirir; birkaç dakikada hazırsınız."
          />
          <HowStep
            n={3}
            title="Randevu ve takibi yönetin"
            desc="Randevuları planlayın, hatırlatmaları tek tıkla gönderin, gelirinizi görün."
          />
        </div>
      </section>

      {/* Güven / dürüst not */}
      <section className="mx-auto max-w-3xl px-6 pb-20">
        <div className="rounded-xl border bg-muted/30 p-6">
          <div className="mb-2 flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-primary" />
            <h3 className="font-semibold">Verileriniz size ait</h3>
          </div>
          <p className="text-sm text-muted-foreground">
            Her işletme yalnızca kendi verisini görür. Mesajlar otomatik değil,
            “tek tıkla hazır”dır — gönderme kararı her zaman sizde kalır, bu da
            hem KVKK açısından güvenli hem de WhatsApp kurallarına uygundur.
          </p>
        </div>
        <div className="mt-8 text-center">
          <Link
            href="/signup"
            className="inline-flex items-center gap-1 rounded-lg bg-primary px-6 py-3 text-sm font-medium text-primary-foreground hover:opacity-90"
          >
            Hemen ücretsiz başlayın
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

      <SiteFooter />
    </main>
  );
}

function Feature({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-xl border bg-card p-6">
      <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
        {icon}
      </div>
      <h3 className="mb-2 font-semibold">{title}</h3>
      <p className="text-sm text-muted-foreground">{description}</p>
    </div>
  );
}

function HowStep({
  n,
  title,
  desc,
}: {
  n: number;
  title: string;
  desc: string;
}) {
  return (
    <div className="text-center">
      <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">
        {n}
      </div>
      <h3 className="mb-1 font-medium">{title}</h3>
      <p className="text-sm text-muted-foreground">{desc}</p>
    </div>
  );
}
