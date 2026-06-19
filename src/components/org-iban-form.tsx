"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Save } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";

export function OrgIbanForm({
  orgId,
  initialIban,
  initialIbanName,
}: {
  orgId: string;
  initialIban: string;
  initialIbanName: string;
}) {
  const router = useRouter();
  const [iban, setIban] = useState(initialIban);
  const [ibanName, setIbanName] = useState(initialIbanName);
  const [loading, setLoading] = useState(false);

  async function save() {
    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase
      .from("organizations")
      .update({
        iban: iban.trim() || null,
        iban_name: ibanName.trim() || null,
      })
      .eq("id", orgId);
    if (error) {
      toast.error("Kaydedilemedi", { description: error.message });
      setLoading(false);
      return;
    }
    toast.success("IBAN bilgisi kaydedildi");
    router.refresh();
    setLoading(false);
  }

  return (
    <div className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">IBAN</label>
          <input
            type="text"
            value={iban}
            onChange={(e) => setIban(e.target.value)}
            placeholder="TR.. .. .. .."
            className="w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">Hesap adı</label>
          <input
            type="text"
            value={ibanName}
            onChange={(e) => setIbanName(e.target.value)}
            placeholder="Ad Soyad / İşletme"
            className="w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </div>
      </div>
      <button
        onClick={save}
        disabled={loading}
        className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
      >
        {loading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Save className="h-4 w-4" />
        )}
        Kaydet
      </button>
    </div>
  );
}
