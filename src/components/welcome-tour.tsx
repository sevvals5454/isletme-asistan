"use client";

import { useEffect, useState } from "react";
import {
  Rocket,
  LayoutDashboard,
  Users,
  StickyNote,
  Calendar,
  Sparkles,
  Globe,
  MessageCircle,
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
  icon: LucideIcon;
  title: string;
  desc: string;
  notif?: boolean;
};

const STEPS: Step[] = [
  {
    icon: Rocket,
    title: "TechİŞ'e hoş geldin 👋",
    desc: "30 saniyede sana önemli yerleri gösterelim. İstemezsen “Atla” diyebilirsin.",
  },
  {
    icon: LayoutDashboard,
    title: "Panel",
    desc: "Ana ekranın. “Bugün işletmen için önemli olanlar” ve “Bugün ne yapmalısın?” — güne buradan başla.",
  },
  {
    icon: Users,
    title: "Müşteriler",
    desc: "Müşterilerini ekle; telefon, etiket, doğum günü ve geçmişleri tek yerde.",
  },
  {
    icon: StickyNote,
    title: "Notlar",
    desc: "Randevusuz görüşmeleri, gelmek isteyenleri hızlıca not al. Takip tarihi verirsen sana hatırlatır.",
  },
  {
    icon: Calendar,
    title: "Randevular",
    desc: "Randevu oluştur — kayıtlı olmayan müşteriyi bile anında ekle. Tekrarlayan seri ve paket kullanımı da var.",
  },
  {
    icon: Sparkles,
    title: "Akıllı Asistan",
    desc: "Verilerinden analiz: kaybetme riskli müşteriler, gelir/hizmet analizi, haftalık rapor ve öneriler.",
  },
  {
    icon: Globe,
    title: "Online randevu",
    desc: "Ayarlar’dan linkini al; müşterilerin kendi randevusunu 7/24 kendisi alsın.",
  },
  {
    icon: MessageCircle,
    title: "Hazır mesajlar",
    desc: "Hatırlatma, ödeme, doğum günü… tek tıkla WhatsApp. Toplu mesaj da var, isim otomatik yazılır.",
  },
  {
    icon: Bell,
    title: "Bildirimler",
    desc: "Telefonuna “randevu yaklaştı / takip zamanı” bildirimleri gelsin. Kaçırma!",
    notif: true,
  },
  {
    icon: CheckCircle2,
    title: "Hazırsın! 🎉",
    desc: "Aklında kalmazsa sol menüde “Yardım” her zaman burada. Hadi başlayalım!",
  },
];

export function WelcomeTour() {
  const [show, setShow] = useState(false);
  const [i, setI] = useState(0);
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

  const step = STEPS[i];
  const Icon = step.icon;
  const last = i === STEPS.length - 1;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-sm rounded-2xl border bg-card p-6 text-center shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <span className="text-xs text-muted-foreground">
            {i + 1} / {STEPS.length}
          </span>
          <button
            onClick={finish}
            className="text-xs text-muted-foreground hover:text-foreground"
          >
            Atla
          </button>
        </div>

        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <Icon className="h-7 w-7" />
        </div>
        <h2 className="text-lg font-semibold">{step.title}</h2>
        <p className="mt-2 text-sm text-muted-foreground">{step.desc}</p>

        {step.notif && (
          <button
            onClick={enableNotifications}
            disabled={busy}
            className="mt-4 inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
          >
            {busy ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Bell className="h-4 w-4" />
            )}
            Bildirimleri aç
          </button>
        )}

        {/* İlerleme noktaları */}
        <div className="mt-5 flex justify-center gap-1.5">
          {STEPS.map((_, idx) => (
            <span
              key={idx}
              className={`h-1.5 rounded-full transition-all ${
                idx === i ? "w-4 bg-primary" : "w-1.5 bg-muted-foreground/30"
              }`}
            />
          ))}
        </div>

        <div className="mt-5 flex items-center justify-between gap-2">
          <button
            onClick={() => setI((v) => Math.max(0, v - 1))}
            disabled={i === 0}
            className="inline-flex items-center gap-1 rounded-lg border px-3 py-2 text-sm hover:bg-muted disabled:opacity-40"
          >
            <ChevronLeft className="h-4 w-4" />
            Geri
          </button>
          {last ? (
            <button
              onClick={finish}
              className="inline-flex flex-1 items-center justify-center gap-1 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
            >
              Başla
            </button>
          ) : (
            <button
              onClick={() => setI((v) => Math.min(STEPS.length - 1, v + 1))}
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
