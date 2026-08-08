"use client";

import { useEffect, useRef } from "react";
import { toast } from "sonner";

// Build sırasında gömülen dağıtım kimliği (next.config env).
const CURRENT = process.env.NEXT_PUBLIC_BUILD_ID || "dev";

// Uygulama açıkken yeni sürüm yayınlanırsa "Güncelle" bildirimi gösterir.
// git push → Vercel deploy → sunucudaki kimlik değişir → burada yakalanır.
export function UpdateNotifier() {
  const shown = useRef(false);

  useEffect(() => {
    if (CURRENT === "dev") return; // yerelde/geliştirmede kontrol etme

    let active = true;

    async function check() {
      if (shown.current) return;
      try {
        const res = await fetch("/api/version", { cache: "no-store" });
        if (!res.ok) return;
        const data = (await res.json()) as { id?: string };
        if (active && data.id && data.id !== CURRENT) {
          shown.current = true;
          toast("Yeni sürüm hazır 🎉", {
            description:
              "Uygulamanın en güncel haline geçmek için sayfayı yenileyin.",
            duration: Infinity,
            action: {
              label: "Güncelle",
              onClick: () => window.location.reload(),
            },
          });
        }
      } catch {
        // ağ hatası — sessizce geç, sonraki kontrolde tekrar dener
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

  return null;
}
