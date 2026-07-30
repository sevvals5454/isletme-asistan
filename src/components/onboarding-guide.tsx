"use client";

import { useState, useSyncExternalStore } from "react";
import Link from "next/link";
import {
  CheckCircle2,
  Circle,
  ArrowRight,
  X,
  Rocket,
  BookOpen,
} from "lucide-react";

export type OnboardingStatus = {
  services: boolean;
  customers: boolean;
  appointment: boolean;
  staff: boolean;
  branding: boolean; // IBAN veya özel mesaj şablonu girildi mi
};

type Step = {
  key: keyof OnboardingStatus;
  title: string;
  desc: string;
  href: string;
  cta: string;
  optional?: boolean;
};

const STEPS: Step[] = [
  {
    key: "services",
    title: "Hizmetlerini ekle",
    desc: "Randevu oluştururken seçeceğin hizmetler (süre + fiyat). Örn. “Reformer Pilates”, “Saç kesimi”.",
    href: "/settings",
    cta: "Ayarlar → Hizmetler",
  },
  {
    key: "staff",
    title: "Çalışan ekle",
    desc: "Müşteri ve randevuları atayacağın kişiler (eğitmen, uzman). Tek kişiysen atlayabilirsin.",
    href: "/settings",
    cta: "Ayarlar → Çalışanlar",
    optional: true,
  },
  {
    key: "customers",
    title: "İlk müşterini ekle",
    desc: "Ad, telefon ve (varsa) etiket. WhatsApp mesajları bu telefona gider.",
    href: "/customers/new",
    cta: "Müşteri ekle",
  },
  {
    key: "appointment",
    title: "İlk randevunu oluştur",
    desc: "Müşteri + hizmet + tarih seç. İstersen tekrarlayan seri veya paket kullanımı ekle.",
    href: "/appointments",
    cta: "Randevu oluştur",
  },
  {
    key: "branding",
    title: "İşletme bilgilerini tamamla",
    desc: "Ödeme mesajları için IBAN'ını gir, mesaj şablonlarını kendi dilinle düzenle.",
    href: "/settings",
    cta: "Ayarlar → Ödeme & Mesajlar",
    optional: true,
  },
];

const DISMISS_KEY = "onboarding-dismissed-v1";

// localStorage'ı dış kaynak olarak oku (effect içinde setState uyarısı olmadan).
function subscribe(cb: () => void) {
  window.addEventListener("storage", cb);
  return () => window.removeEventListener("storage", cb);
}

export function OnboardingGuide({ status }: { status: OnboardingStatus }) {
  const storedDismissed = useSyncExternalStore(
    subscribe,
    () => localStorage.getItem(DISMISS_KEY) === "1",
    () => false, // SSR/hidrasyon: kapatılmamış varsay
  );
  const [manualDismissed, setManualDismissed] = useState(false);
  const dismissed = storedDismissed || manualDismissed;

  // Çekirdek adımlar (isteğe bağlı olmayanlar) bittiyse rehber işini bitirmiştir.
  const coreDone = status.services && status.customers && status.appointment;

  if (coreDone || dismissed) return null;

  const doneCount = STEPS.filter((s) => status[s.key]).length;

  function dismiss() {
    localStorage.setItem(DISMISS_KEY, "1");
    setManualDismissed(true);
  }

  return (
    <div className="rounded-xl border border-primary/30 bg-primary/5 p-6">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Rocket className="h-4 w-4" />
          </div>
          <div>
            <h2 className="font-semibold">Hoş geldin! Hızlı başlangıç</h2>
            <p className="text-sm text-muted-foreground">
              Birkaç adımda kullanmaya hazır hale gelirsin ({doneCount}/
              {STEPS.length})
            </p>
          </div>
        </div>
        <button
          onClick={dismiss}
          className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
          aria-label="Rehberi kapat"
          title="Kapat"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* İlerleme çubuğu */}
      <div className="mb-4 h-1.5 w-full overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-primary transition-all"
          style={{ width: `${(doneCount / STEPS.length) * 100}%` }}
        />
      </div>

      <ol className="space-y-2">
        {STEPS.map((step) => {
          const done = status[step.key];
          return (
            <li
              key={step.key + step.href}
              className="flex items-start gap-3 rounded-lg border bg-card p-3"
            >
              {done ? (
                <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-green-600" />
              ) : (
                <Circle className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" />
              )}
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span
                    className={
                      done
                        ? "text-sm font-medium text-muted-foreground line-through"
                        : "text-sm font-medium"
                    }
                  >
                    {step.title}
                  </span>
                  {step.optional && (
                    <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
                      isteğe bağlı
                    </span>
                  )}
                </div>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {step.desc}
                </p>
              </div>
              {!done && (
                <Link
                  href={step.href}
                  className="inline-flex shrink-0 items-center gap-1 self-center rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:opacity-90"
                >
                  {step.cta}
                  <ArrowRight className="h-3 w-3" />
                </Link>
              )}
            </li>
          );
        })}
      </ol>

      <div className="mt-4 flex items-center justify-between gap-3">
        <Link
          href="/rehber"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:underline"
        >
          <BookOpen className="h-3.5 w-3.5" />
          Detaylı kullanım kılavuzu
        </Link>
        <button
          onClick={dismiss}
          className="text-xs text-muted-foreground hover:text-foreground"
        >
          Rehberi gizle
        </button>
      </div>
    </div>
  );
}
