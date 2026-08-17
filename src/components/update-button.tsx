"use client";

import { useState } from "react";
import { RefreshCw, Loader2 } from "lucide-react";
import { toast } from "sonner";

const CURRENT = process.env.NEXT_PUBLIC_BUILD_ID || "dev";

// Ayarlarda her zaman erişilebilen manuel "güncelle" butonu.
// Yeni sürüm varsa yeniler; yoksa "güncelsin" der.
export function UpdateButton() {
  const [loading, setLoading] = useState(false);

  async function check() {
    setLoading(true);
    try {
      const res = await fetch("/api/version", { cache: "no-store" });
      const data = (await res.json()) as { id?: string };
      if (data.id && CURRENT !== "dev" && data.id !== CURRENT) {
        toast.success("Yeni sürüm bulundu, güncelleniyor…");
        setTimeout(() => window.location.reload(), 700);
        return;
      }
      toast.success("Uygulaman güncel ✓");
    } catch {
      toast.error("Kontrol edilemedi, tekrar dene");
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={check}
      disabled={loading}
      className="inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium hover:bg-muted disabled:opacity-50"
    >
      {loading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <RefreshCw className="h-4 w-4" />
      )}
      Güncellemeleri kontrol et
    </button>
  );
}
