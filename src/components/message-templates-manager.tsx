"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Save, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import {
  type MessageKind,
  DEFAULT_TEMPLATES,
  MESSAGE_KIND_LABELS,
  TEMPLATE_VARIABLES,
} from "@/lib/templates";

const KINDS = Object.keys(DEFAULT_TEMPLATES) as MessageKind[];

export function MessageTemplatesManager({
  orgId,
  initial,
}: {
  orgId: string;
  initial: Partial<Record<MessageKind, string>>;
}) {
  const router = useRouter();
  const [values, setValues] = useState<Record<MessageKind, string>>(() => {
    const v = {} as Record<MessageKind, string>;
    for (const k of KINDS) v[k] = initial[k]?.trim() || DEFAULT_TEMPLATES[k];
    return v;
  });
  const [loading, setLoading] = useState(false);

  async function save() {
    setLoading(true);
    const supabase = createClient();
    // Varsayılandan farklı olanları kaydet (aynı olanları boş bırak → varsayılan kullanılır).
    const custom: Partial<Record<MessageKind, string>> = {};
    for (const k of KINDS) {
      const val = values[k].trim();
      if (val && val !== DEFAULT_TEMPLATES[k]) custom[k] = val;
    }
    const { error } = await supabase
      .from("organizations")
      .update({ message_templates: custom })
      .eq("id", orgId);
    if (error) {
      toast.error("Kaydedilemedi", { description: error.message });
      setLoading(false);
      return;
    }
    toast.success("Mesaj şablonları kaydedildi");
    router.refresh();
    setLoading(false);
  }

  return (
    <div className="space-y-4">
      <div className="rounded-lg bg-muted/50 p-3 text-xs text-muted-foreground">
        <div className="mb-1">
          Her mesaj otomatik olarak{" "}
          <strong>&quot;Merhaba [müşteri adı],&quot;</strong> ile başlar — ismi
          sen yazmana gerek yok, sadece devamını yaz.
        </div>
        Kullanabileceğin diğer değişkenler:{" "}
        {TEMPLATE_VARIABLES.map((v) => (
          <code key={v} className="mx-0.5 rounded bg-background px-1 py-0.5">
            {`{${v}}`}
          </code>
        ))}
        <div className="mt-1">
          Değişkenler ilgili bilgiyle dolar (ör.{" "}
          <code className="rounded bg-background px-1">{"{tarih}"}</code> →
          randevu tarihi). Boş bırakılan alanlar varsayılan metni kullanır.
        </div>
      </div>

      <div className="space-y-4">
        {KINDS.map((k) => {
          const isDefault = values[k].trim() === DEFAULT_TEMPLATES[k];
          return (
            <div key={k} className="space-y-1">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium">
                  {MESSAGE_KIND_LABELS[k]}
                </label>
                {!isDefault && (
                  <button
                    type="button"
                    onClick={() =>
                      setValues((prev) => ({ ...prev, [k]: DEFAULT_TEMPLATES[k] }))
                    }
                    className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                  >
                    <RotateCcw className="h-3 w-3" />
                    Varsayılana dön
                  </button>
                )}
              </div>
              <textarea
                rows={3}
                value={values[k]}
                onChange={(e) =>
                  setValues((prev) => ({ ...prev, [k]: e.target.value }))
                }
                className="w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </div>
          );
        })}
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
