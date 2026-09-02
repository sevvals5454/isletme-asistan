"use client";

import { useEffect, useState } from "react";
import { Bell, Loader2 } from "lucide-react";
import { toast } from "sonner";

const VAPID = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
const DISMISS_KEY = "push-prompt-dismissed";

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const arr = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i);
  return arr;
}

// Yeni kullanıcı girince ekranın üstünde çıkan tek tıkla "bildirimleri aç" şeridi.
// (Tarayıcı kuralı: izin kullanıcı hareketiyle verilmek zorunda; otomatik açılamaz.)
export function PushPrompt() {
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      await Promise.resolve();
      if (!active) return;
      const supported =
        "serviceWorker" in navigator && "PushManager" in window && !!VAPID;
      const notGranted =
        typeof Notification !== "undefined" &&
        Notification.permission !== "granted";
      // Kalıcı kapatma yok: "Sonra" 3 gün erteler, sonra tekrar hatırlatır.
      const snoozeUntil = Number(localStorage.getItem(DISMISS_KEY) || "0");
      const snoozed = Date.now() < snoozeUntil;
      // Tanıtım turu bitmeden şeridi gösterme (tur zaten bildirim adımı içeriyor).
      const tourDone = localStorage.getItem("welcome-tour-v1") === "1";
      setShow(supported && notGranted && !snoozed && tourDone);
    })();
    return () => {
      active = false;
    };
  }, []);

  async function enable() {
    setBusy(true);
    try {
      const perm = await Notification.requestPermission();
      if (perm !== "granted") {
        toast.error("Bildirim izni verilmedi");
        setShow(false);
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
      setShow(false);
    } catch {
      toast.error("Bildirim açılamadı, Ayarlar → Bildirimler’den deneyebilirsin");
    } finally {
      setBusy(false);
    }
  }

  function dismiss() {
    // Kalıcı değil — 3 gün sonra tekrar hatırlat (bildirim kullanımı artsın).
    localStorage.setItem(
      DISMISS_KEY,
      String(Date.now() + 3 * 24 * 60 * 60 * 1000),
    );
    setShow(false);
  }

  if (!show) return null;

  return (
    <div className="border-b-2 border-primary/30 bg-gradient-to-r from-primary/15 to-primary/5">
      <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-3 px-4 py-3 sm:px-6">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary">
          <Bell className="h-5 w-5" />
        </div>
        <div className="min-w-[200px] flex-1">
          <p className="text-sm font-semibold">
            Bildirimleri aç, hiçbir randevuyu kaçırma
          </p>
          <p className="text-xs text-muted-foreground">
            Randevu saatinden önce telefonuna hatırlatma gelir — uygulama kapalı
            olsa bile. Her sabah günün özetini de alırsın.
          </p>
        </div>
        <button
          onClick={enable}
          disabled={busy}
          className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Bell className="h-4 w-4" />}
          Bildirimleri aç
        </button>
        <button
          onClick={dismiss}
          className="rounded-lg px-3 py-2 text-sm text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          Sonra
        </button>
      </div>
    </div>
  );
}
