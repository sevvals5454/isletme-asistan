"use client";

import { useState } from "react";
import { Loader2, Send } from "lucide-react";
import { toast } from "sonner";

export function PushTestButton() {
  const [busy, setBusy] = useState(false);

  async function test() {
    setBusy(true);
    try {
      const res = await fetch("/api/push/test", { method: "POST" });
      const data = (await res.json()) as {
        ok?: boolean;
        sent?: number;
        total?: number;
      };
      if (!data.ok) {
        toast.error("Test gönderilemedi");
      } else if ((data.total ?? 0) === 0) {
        toast.error("Bu hesapta kayıtlı cihaz yok", {
          description:
            "Önce yukarıdan “Bildirimleri aç”ı kullan. iPhone’da uygulamayı ana ekrandan açman gerekir.",
        });
      } else {
        toast.success(`${data.sent}/${data.total} cihaza test gönderildi 🔔`, {
          description: "Birkaç saniye içinde telefonunda görünmeli.",
        });
      }
    } catch {
      toast.error("Test gönderilemedi");
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      onClick={test}
      disabled={busy}
      className="inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium hover:bg-muted disabled:opacity-50"
    >
      {busy ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <Send className="h-4 w-4" />
      )}
      Test bildirimi gönder
    </button>
  );
}
