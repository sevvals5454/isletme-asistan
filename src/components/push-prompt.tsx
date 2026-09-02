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
type Mode = "enable" | "ios-install" | null;

export function PushPrompt() {
  // mode: "enable" = tek tıkla aç; "ios-install" = iPhone Safari'de önce ana
  // ekrana ekle (iOS'ta push yalnız yüklü uygulamada çalışır).
  const [mode, setMode] = useState<Mode>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      await Promise.resolve();
      if (!active) return;
      const snoozeUntil = Number(localStorage.getItem(DISMISS_KEY) || "0");
      if (Date.now() < snoozeUntil) return; // "Sonra" ile 3 gün ertelenmiş
      const notGranted =
        typeof Notification === "undefined" ||
        Notification.permission !== "granted";
      if (!notGranted) return; // zaten izin verilmiş

      const pushSupported =
        "serviceWorker" in navigator && "PushManager" in window && !!VAPID;
      const ua = navigator.userAgent || "";
      const isIOS = /iphone|ipad|ipod/i.test(ua);
      const standalone =
        window.matchMedia?.("(display-mode: standalone)").matches ||
        (navigator as unknown as { standalone?: boolean }).standalone === true;

      if (pushSupported) {
        setMode("enable"); // tur şartı kaldırıldı — çalışan dahil herkese çıkar
      } else if (isIOS && !standalone) {
        setMode("ios-install"); // iPhone Safari sekmesi: önce ana ekrana ekle
      }
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
        setMode(null);
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
      setMode(null);
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
    setMode(null);
  }

  if (!mode) return null;

  // iPhone Safari sekmesi: push yalnız yüklü uygulamada çalışır → yönlendirme.
  if (mode === "ios-install") {
    return (
      <div className="border-b-2 border-primary/30 bg-gradient-to-r from-primary/15 to-primary/5">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-3 px-4 py-3 sm:px-6">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary">
            <Bell className="h-5 w-5" />
          </div>
          <div className="min-w-[200px] flex-1">
            <p className="text-sm font-semibold">
              Bildirim almak için uygulamayı ana ekrana ekle
            </p>
            <p className="text-xs text-muted-foreground">
              iPhone&apos;da: alttaki <strong>Paylaş</strong> ikonuna bas →{" "}
              <strong>Ana Ekrana Ekle</strong>. Sonra uygulamayı oradan açıp
              bildirimlere izin ver.
            </p>
          </div>
          <button
            onClick={dismiss}
            className="rounded-lg px-3 py-2 text-sm text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            Anladım
          </button>
        </div>
      </div>
    );
  }

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
