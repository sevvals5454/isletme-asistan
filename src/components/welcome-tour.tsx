"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import {
  Rocket,
  Users,
  StickyNote,
  Calendar,
  Sparkles,
  Send,
  Settings,
  Bell,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Loader2,
  type LucideIcon,
} from "lucide-react";
import { toast } from "sonner";

export const TOUR_KEY = "welcome-tour-v1";
const VAPID = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const arr = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i);
  return arr;
}

type Step = {
  path?: string; // bu adımda açılacak sayfa
  icon: LucideIcon;
  title: string;
  desc: string;
  notif?: boolean;
};

const STEPS: Step[] = [
  {
    path: "/dashboard",
    icon: Rocket,
    title: "Hoş geldin 👋 — Panel",
    desc: "Burası ana ekranın. “Bugün işletmen için önemli olanlar” ve “Bugün ne yapmalısın?” burada. Sayfaları tek tek gezelim; istemezsen “Atla”.",
  },
  {
    path: "/customers",
    icon: Users,
    title: "Müşteriler",
    desc: "Müşterilerini buradan ekle/düzenle — telefon, etiket, doğum günü ve geçmiş randevular tek yerde.",
  },
  {
    path: "/notlar",
    icon: StickyNote,
    title: "Notlar",
    desc: "Randevusuz görüşmeleri, gelmek isteyenleri hızlıca not al. Takip tarihi verirsen sana hatırlatır.",
  },
  {
    path: "/appointments",
    icon: Calendar,
    title: "Randevular",
    desc: "Randevu oluştur — kayıtlı olmayan müşteriyi bile anında ekle. Tekrarlayan seri ve paket kullanımı da var.",
  },
  {
    path: "/asistan",
    icon: Sparkles,
    title: "Akıllı Asistan",
    desc: "Gerçek verinden analiz: kaybetme riskli müşteriler, gelir/hizmet analizi, haftalık rapor ve öneriler.",
  },
  {
    path: "/messages/bulk",
    icon: Send,
    title: "Toplu mesaj",
    desc: "Segment seç, mesajı yaz, müşterilere tek tek WhatsApp gönder. İsim otomatik yazılır.",
  },
  {
    path: "/settings",
    icon: Settings,
    title: "Ayarlar",
    desc: "Online randevu linki, mesaj şablonları, hizmetler, çalışma saatleri — hepsi burada. Üstteki menüden hızlıca ilgili bölüme atlarsın.",
  },
  {
    path: "/dashboard",
    icon: Bell,
    title: "Bildirimler",
    desc: "Telefonuna “randevu yaklaştı / takip zamanı” bildirimi gelsin — uygulama kapalıyken bile. Kaçırma!",
    notif: true,
  },
  {
    icon: CheckCircle2,
    title: "Hazırsın! 🎉",
    desc: "İhtiyacın olursa sol menüde “Yardım” her zaman burada — turu oradan tekrar başlatabilirsin. Hadi başlayalım!",
  },
];

export function WelcomeTour() {
  const router = useRouter();
  const pathname = usePathname();
  const [show, setShow] = useState(false);
  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      await Promise.resolve();
      if (active) setShow(localStorage.getItem(TOUR_KEY) !== "1");
    })();
    return () => {
      active = false;
    };
  }, []);

  function go(next: number) {
    const clamped = Math.max(0, Math.min(STEPS.length - 1, next));
    setStep(clamped);
    const p = STEPS[clamped].path;
    if (p && p !== pathname) router.push(p);
  }

  function finish() {
    localStorage.setItem(TOUR_KEY, "1");
    setShow(false);
  }

  async function enableNotifications() {
    setBusy(true);
    try {
      const supported =
        "serviceWorker" in navigator && "PushManager" in window && !!VAPID;
      if (!supported) {
        toast.error("Bu cihaz bildirimi desteklemiyor");
        return;
      }
      const perm = await Notification.requestPermission();
      if (perm !== "granted") {
        toast.error("Bildirim izni verilmedi");
        return;
      }
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(
          VAPID!,
        ) as unknown as BufferSource,
      });
      const res = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(sub),
      });
      if (!res.ok) throw new Error();
      toast.success("Bildirimler açıldı 🔔");
    } catch {
      toast.error("Bildirim açılamadı, Ayarlar’dan deneyebilirsin");
    } finally {
      setBusy(false);
    }
  }

  if (!show) return null;

  const s = STEPS[step];
  const Icon = s.icon;
  const last = step === STEPS.length - 1;

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-[60] p-3 sm:p-4">
      <div className="pointer-events-auto mx-auto max-w-md rounded-2xl border bg-card p-4 shadow-2xl ring-1 ring-black/5">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-xs text-muted-foreground">
            {step + 1} / {STEPS.length}
          </span>
          <button
            onClick={finish}
            className="text-xs font-medium text-muted-foreground hover:text-foreground"
          >
            Atla
          </button>
        </div>

        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Icon className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <h2 className="font-semibold">{s.title}</h2>
            <p className="mt-0.5 text-sm text-muted-foreground">{s.desc}</p>
            {s.notif && (
              <button
                onClick={enableNotifications}
                disabled={busy}
                className="mt-3 inline-flex items-center gap-2 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
              >
                {busy ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Bell className="h-3.5 w-3.5" />
                )}
                Bildirimleri aç
              </button>
            )}
          </div>
        </div>

        <div className="mt-3 flex justify-center gap-1.5">
          {STEPS.map((_, idx) => (
            <span
              key={idx}
              className={`h-1.5 rounded-full transition-all ${
                idx === step ? "w-4 bg-primary" : "w-1.5 bg-muted-foreground/30"
              }`}
            />
          ))}
        </div>

        <div className="mt-3 flex items-center justify-between gap-2">
          <button
            onClick={() => go(step - 1)}
            disabled={step === 0}
            className="inline-flex items-center gap-1 rounded-lg border px-3 py-2 text-sm hover:bg-muted disabled:opacity-40"
          >
            <ChevronLeft className="h-4 w-4" />
            Geri
          </button>
          {last ? (
            <button
              onClick={finish}
              className="inline-flex flex-1 items-center justify-center rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
            >
              Başla
            </button>
          ) : (
            <button
              onClick={() => go(step + 1)}
              className="inline-flex flex-1 items-center justify-center gap-1 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
            >
              İleri
              <ChevronRight className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
