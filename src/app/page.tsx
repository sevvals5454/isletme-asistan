import Link from "next/link";
import { ArrowRight, Sparkles, Users, Calendar } from "lucide-react";

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-background">
      <header className="border-b">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Sparkles className="h-4 w-4" />
            </div>
            <span className="font-semibold">İşletme Asistanı</span>
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

      <section className="mx-auto max-w-4xl px-6 py-24 text-center">
        <div className="mb-4 inline-flex items-center gap-2 rounded-full border bg-muted/50 px-3 py-1 text-xs">
          <Sparkles className="h-3 w-3" />
          Randevu, müşteri ve paket yönetimi
        </div>
        <h1 className="mb-6 text-balance text-5xl font-semibold tracking-tight md:text-6xl">
          Müşterilerinizi ve randevularınızı
          <br />
          <span className="text-muted-foreground">tek panelden yönetin.</span>
        </h1>
        <p className="mx-auto mb-10 max-w-xl text-balance text-lg text-muted-foreground">
          Güzellik salonları, ajanslar ve küçük işletmeler için tasarlandı.
          WhatsApp ve Excel karmaşasını bırakın — tek panelden yönetin.
        </p>
        <div className="flex items-center justify-center gap-3">
          <Link
            href="/signup"
            className="inline-flex items-center gap-1 rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground hover:opacity-90"
          >
            Ücretsiz dene
            <ArrowRight className="h-4 w-4" />
          </Link>
          <Link
            href="/login"
            className="rounded-lg border px-5 py-2.5 text-sm font-medium hover:bg-muted"
          >
            Giriş yap
          </Link>
        </div>
      </section>

      <section className="mx-auto grid max-w-5xl gap-6 px-6 pb-24 md:grid-cols-3">
        <Feature
          icon={<Users className="h-5 w-5" />}
          title="Müşteri Yönetimi"
          description="Tüm müşterilerinizi tek yerden takip edin. Notlar, etiketler ve geçmiş kayıtları parmaklarınızın ucunda."
        />
        <Feature
          icon={<Calendar className="h-5 w-5" />}
          title="Randevu & Paket"
          description="Randevu, tekrar eden seans, paket ve aylık üyelik takibini tek panelden yapın. WhatsApp hatırlatmaları cabası."
        />
        <Feature
          icon={<Sparkles className="h-5 w-5" />}
          title="Modern Tasarım"
          description="ERP karmaşası yok. Notion ve Linear esintili, sade ve sıcak bir arayüz."
        />
      </section>
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
      <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
        {icon}
      </div>
      <h3 className="mb-2 font-semibold">{title}</h3>
      <p className="text-sm text-muted-foreground">{description}</p>
    </div>
  );
}
