"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { formatTrDate } from "@/lib/time";

export type ClosedDay = {
  id: string;
  date: string;
  reason: string | null;
};

export function ClosedDaysManager({
  orgId,
  initialClosedDays,
}: {
  orgId: string;
  initialClosedDays: ClosedDay[];
}) {
  const router = useRouter();
  const [days, setDays] = useState<ClosedDay[]>(initialClosedDays);
  const [date, setDate] = useState("");
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);

  async function add() {
    if (!date) {
      toast.error("Tarih seç");
      return;
    }
    setLoading(true);
    const supabase = createClient();
    const { data, error } = await supabase
      .from("closed_days")
      .insert({ organization_id: orgId, date, reason: reason.trim() || null })
      .select("id, date, reason")
      .single();
    if (error) {
      toast.error("Eklenemedi", { description: error.message });
      setLoading(false);
      return;
    }
    setDays((prev) =>
      [...prev, data as ClosedDay].sort((a, b) => a.date.localeCompare(b.date)),
    );
    setDate("");
    setReason("");
    toast.success("Kapalı gün eklendi");
    router.refresh();
    setLoading(false);
  }

  async function remove(d: ClosedDay) {
    const supabase = createClient();
    const { error } = await supabase.from("closed_days").delete().eq("id", d.id);
    if (error) {
      toast.error("Silme başarısız", { description: error.message });
      return;
    }
    setDays((prev) => prev.filter((x) => x.id !== d.id));
    router.refresh();
  }

  return (
    <div className="space-y-3">
      {days.length > 0 && (
        <ul className="divide-y rounded-lg border">
          {days.map((d) => (
            <li
              key={d.id}
              className="flex items-center justify-between gap-3 p-3 text-sm"
            >
              <div className="min-w-0">
                <span className="font-medium">{formatTrDate(d.date)}</span>
                {d.reason && (
                  <span className="ml-2 text-xs text-muted-foreground">
                    {d.reason}
                  </span>
                )}
              </div>
              <button
                onClick={() => remove(d)}
                className="rounded-md p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                aria-label="Sil"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="flex flex-wrap items-end gap-2">
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">Tarih</label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="rounded-lg border bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </div>
        <div className="flex-1 space-y-1">
          <label className="text-xs text-muted-foreground">
            Sebep (opsiyonel)
          </label>
          <input
            type="text"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Resmi tatil, izin…"
            className="w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </div>
        <button
          onClick={add}
          disabled={loading}
          className="inline-flex items-center gap-1 rounded-lg border px-3 py-2 text-sm font-medium hover:bg-muted disabled:opacity-50"
        >
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Plus className="h-4 w-4" />
          )}
          Ekle
        </button>
      </div>
    </div>
  );
}
