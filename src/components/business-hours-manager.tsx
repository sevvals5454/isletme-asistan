"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Save } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { WEEKDAY_LABELS, type DayHours, hhmm } from "@/lib/hours";

type Row = {
  weekday: number;
  is_open: boolean;
  open_time: string; // "HH:MM"
  close_time: string;
};

export function BusinessHoursManager({
  orgId,
  initialHours,
}: {
  orgId: string;
  initialHours: DayHours[];
}) {
  const router = useRouter();
  const [rows, setRows] = useState<Row[]>(() =>
    WEEKDAY_LABELS.map((_, wd) => {
      const existing = initialHours.find((h) => h.weekday === wd);
      return {
        weekday: wd,
        is_open: existing ? existing.is_open : wd <= 5, // varsayılan: Pzt-Cmt açık
        open_time: existing ? hhmm(existing.open_time) : "09:00",
        close_time: existing ? hhmm(existing.close_time) : "18:00",
      };
    }),
  );
  const [loading, setLoading] = useState(false);

  function update(wd: number, patch: Partial<Row>) {
    setRows((prev) =>
      prev.map((r) => (r.weekday === wd ? { ...r, ...patch } : r)),
    );
  }

  async function save() {
    setLoading(true);
    const supabase = createClient();
    const payload = rows.map((r) => ({
      organization_id: orgId,
      weekday: r.weekday,
      is_open: r.is_open,
      open_time: r.open_time,
      close_time: r.close_time,
    }));
    const { error } = await supabase
      .from("business_hours")
      .upsert(payload, { onConflict: "organization_id,weekday" });
    if (error) {
      toast.error("Kaydedilemedi", { description: error.message });
      setLoading(false);
      return;
    }
    toast.success("Çalışma saatleri kaydedildi");
    router.refresh();
    setLoading(false);
  }

  return (
    <div className="space-y-3">
      <div className="divide-y rounded-lg border">
        {rows.map((r) => (
          <div
            key={r.weekday}
            className="flex flex-wrap items-center gap-3 p-3 text-sm"
          >
            <div className="w-24 font-medium">{WEEKDAY_LABELS[r.weekday]}</div>
            <button
              type="button"
              onClick={() => update(r.weekday, { is_open: !r.is_open })}
              className={
                r.is_open
                  ? "rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700 dark:bg-green-900/30 dark:text-green-400"
                  : "rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground"
              }
            >
              {r.is_open ? "Açık" : "Kapalı"}
            </button>
            {r.is_open && (
              <div className="flex items-center gap-2">
                <input
                  type="time"
                  value={r.open_time}
                  onChange={(e) => update(r.weekday, { open_time: e.target.value })}
                  className="rounded-lg border bg-background px-2 py-1 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
                <span className="text-muted-foreground">–</span>
                <input
                  type="time"
                  value={r.close_time}
                  onChange={(e) =>
                    update(r.weekday, { close_time: e.target.value })
                  }
                  className="rounded-lg border bg-background px-2 py-1 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
              </div>
            )}
          </div>
        ))}
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
