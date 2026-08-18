"use client";

import { useState } from "react";
import { Loader2, Plus, Trash2, User } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { formatTrDate } from "@/lib/time";

export type ClosedDay = {
  id: string;
  date: string;
  reason: string | null;
  staff_id?: string | null;
};

type StaffOption = { id: string; name: string };

export function ClosedDaysManager({
  orgId,
  initialClosedDays,
  staff = [],
}: {
  orgId: string;
  initialClosedDays: ClosedDay[];
  staff?: StaffOption[];
}) {
  const router = useRouter();
  const [days, setDays] = useState<ClosedDay[]>(initialClosedDays);
  const [date, setDate] = useState("");
  const [reason, setReason] = useState("");
  const [staffId, setStaffId] = useState(""); // "" = tüm işletme kapalı
  const [loading, setLoading] = useState(false);

  const staffName = (id: string | null | undefined) =>
    id ? staff.find((s) => s.id === id)?.name ?? "Çalışan" : null;

  async function add() {
    if (!date) {
      toast.error("Tarih seç");
      return;
    }
    setLoading(true);
    const supabase = createClient();
    const base = {
      organization_id: orgId,
      date,
      reason: reason.trim() || null,
    };
    // Personel izni için staff_id ekle; kolon yoksa (migration çalışmadıysa) geri düş.
    let res = await supabase
      .from("closed_days")
      .insert({ ...base, staff_id: staffId || null })
      .select("id, date, reason, staff_id")
      .single();
    if (res.error && /staff_id|column|schema/i.test(res.error.message)) {
      res = await supabase
        .from("closed_days")
        .insert(base)
        .select("id, date, reason")
        .single();
      if (!res.error && staffId)
        toast.info(
          "Personel izni için güncelleme (016) gerekli — kayıt tüm işletme olarak eklendi.",
        );
    }
    if (res.error) {
      toast.error("Eklenemedi", { description: res.error.message });
      setLoading(false);
      return;
    }
    setDays((prev) =>
      [...prev, res.data as ClosedDay].sort((a, b) =>
        a.date.localeCompare(b.date),
      ),
    );
    setDate("");
    setReason("");
    setStaffId("");
    toast.success(staffId ? "Personel izni eklendi" : "Kapalı gün eklendi");
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
          {days.map((d) => {
            const sName = staffName(d.staff_id);
            return (
              <li
                key={d.id}
                className="flex items-center justify-between gap-3 p-3 text-sm"
              >
                <div className="min-w-0">
                  <span className="font-medium">{formatTrDate(d.date)}</span>
                  {sName ? (
                    <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                      <User className="h-3 w-3" />
                      {sName} izinli
                    </span>
                  ) : (
                    <span className="ml-2 rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                      Tüm işletme kapalı
                    </span>
                  )}
                  {d.reason && (
                    <span className="ml-2 text-xs text-muted-foreground">
                      · {d.reason}
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
            );
          })}
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
        {staff.length > 0 && (
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Kim?</label>
            <select
              value={staffId}
              onChange={(e) => setStaffId(e.target.value)}
              className="rounded-lg border bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <option value="">Tüm işletme kapalı</option>
              {staff.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} izinli
                </option>
              ))}
            </select>
          </div>
        )}
        <div className="min-w-[140px] flex-1 space-y-1">
          <label className="text-xs text-muted-foreground">
            Sebep (opsiyonel)
          </label>
          <input
            type="text"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder={staffId ? "Rahatsız, kaza, izin…" : "Resmi tatil, izin…"}
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
