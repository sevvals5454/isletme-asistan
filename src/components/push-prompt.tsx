"use client";

import { useEffect, useState } from "react";
import { Bell, X, Loader2 } from "lucide-react";
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
      const dismissed = localStorage.getItem(DISMISS_KEY) === "1";
      setShow(supported && notGranted && !dismissed);
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
    localStorage.setItem(DISMISS_KEY, "1");
    setShow(false);
  }

  if (!show) return null;

  return (
    <div className="border-b border-primary/20 bg-primary/10">
      <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-2 px-4 py-2 sm:px-6">
        <Bell className="h-4 w-4 shrink-0 text-primary" />
        <span className="flex-1 text-sm">
          Randevu hatırlatmalarını kaçırma — telefonuna bildirim gelsin.
        </span>
        <button
          onClick={enable}
          disabled={busy}
          className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
        >
          {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
          Bildirimleri aç
        </button>
        <button
          onClick={dismiss}
          className="rounded-md p-1 text-muted-foreground hover:text-foreground"
          aria-label="Kapat"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
