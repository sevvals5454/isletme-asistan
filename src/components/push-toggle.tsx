"use client";

import { useEffect, useState } from "react";
import { Bell, BellOff, Loader2 } from "lucide-react";
import { toast } from "sonner";

const VAPID = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const arr = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i);
  return arr;
}

export function PushToggle() {
  const [supported, setSupported] = useState(true);
  const [subscribed, setSubscribed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      const ok =
        typeof window !== "undefined" &&
        "serviceWorker" in navigator &&
        "PushManager" in window &&
        !!VAPID;
      let isSub = false;
      if (ok) {
        try {
          const reg = await navigator.serviceWorker.ready;
          isSub = !!(await reg.pushManager.getSubscription());
        } catch {
          isSub = false;
        }
      } else {
        await Promise.resolve();
      }
      if (!active) return;
      setSupported(ok);
      setSubscribed(isSub);
      setReady(true);
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
        return;
      }
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID!) as unknown as BufferSource,
      });
      const res = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(sub),
      });
      if (!res.ok) throw new Error();
      setSubscribed(true);
      toast.success("Bildirimler açıldı 🔔");
    } catch {
      toast.error("Bildirim açılamadı, tekrar deneyin");
    } finally {
      setBusy(false);
    }
  }

  async function disable() {
    setBusy(true);
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await fetch("/api/push/subscribe", {
          method: "DELETE",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ endpoint: sub.endpoint }),
        });
        await sub.unsubscribe();
      }
      setSubscribed(false);
      toast.success("Bildirimler kapatıldı");
    } catch {
      toast.error("Kapatılamadı");
    } finally {
      setBusy(false);
    }
  }

  if (!ready) return null;

  if (!supported) {
    return (
      <p className="text-sm text-muted-foreground">
        Bu tarayıcı bildirimi desteklemiyor. iPhone&apos;da: Safari → Paylaş →
        “Ana Ekrana Ekle”, sonra buradan açabilirsin.
      </p>
    );
  }

  return (
    <button
      onClick={subscribed ? disable : enable}
      disabled={busy}
      className="inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium hover:bg-muted disabled:opacity-50"
    >
      {busy ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : subscribed ? (
        <BellOff className="h-4 w-4" />
      ) : (
        <Bell className="h-4 w-4" />
      )}
      {subscribed ? "Bildirimleri kapat" : "Bildirimleri aç"}
    </button>
  );
}
