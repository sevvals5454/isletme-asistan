"use client";

import { useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";

// Build sırasında gömülen dağıtım kimliği (next.config env).
// Not: yeni sürüm çıkınca açık sekmelerde "Güncelle" butonu belirir.
const CURRENT = process.env.NEXT_PUBLIC_BUILD_ID || "dev";

// Yeni sürüm yayınlanınca KALICI bir "Güncelle" butonu gösterir.
// Toast gibi kaybolmaz; kullanıcı tıklayıp güncelleyene kadar ekranda kalır.
export function UpdateNotifier() {
  const [available, setAvailable] = useState(false);

  useEffect(() => {
    if (CURRENT === "dev") return; // yerelde kontrol etme
    let active = true;

    async function check() {
      try {
        const res = await fetch("/api/version", { cache: "no-store" });
        if (!res.ok) return;
        const data = (await res.json()) as { id?: string };
        if (active && data.id && data.id !== CURRENT) setAvailable(true);
      } catch {
        // ağ hatası — sessizce geç
      }
    }

    check();
    const interval = setInterval(check, 5 * 60 * 1000); // 5 dk'da bir
    const onFocus = () => check();
    window.addEventListener("focus", onFocus);
    return () => {
      active = false;
      clearInterval(interval);
      window.removeEventListener("focus", onFocus);
    };
  }, []);

  if (!available) return null;

  return (
    <div className="fixed inset-x-0 bottom-4 z-40 flex justify-center px-4">
      <button
        onClick={() => window.location.reload()}
        className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground shadow-lg ring-1 ring-black/5 hover:opacity-90"
      >
        <RefreshCw className="h-4 w-4" />
        Yeni sürüm hazır — Güncelle
      </button>
    </div>
  );
}
