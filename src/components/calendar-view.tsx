"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import {
  type AppointmentStatus,
  STATUS_LABELS,
  STATUS_STYLES,
} from "@/lib/appointments";
import { trDateKey, formatTrTime } from "@/lib/time";

type CalAppt = {
  id: string;
  start_at: string;
  status: AppointmentStatus;
  customer_id: string;
  customers: { name: string } | null;
  services: { name: string } | null;
  staff: { name: string } | null;
};

const WEEKDAYS = ["Pzt", "Sal", "Çar", "Per", "Cum", "Cmt", "Paz"];
const MONTHS = [
  "Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran",
  "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık",
];

function pad(n: number) {
  return String(n).padStart(2, "0");
}
function cellKey(y: number, m: number, d: number) {
  return `${y}-${pad(m + 1)}-${pad(d)}`;
}

export function CalendarView() {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth()); // 0-based
  const [appts, setAppts] = useState<CalAppt[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<string | null>(trDateKey(today));

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      const supabase = createClient();
      // Ay kenarlarındaki saat dilimi sapmasını kapsamak için ±1 gün geniş çek.
      const start = new Date(year, month, 1);
      start.setDate(start.getDate() - 1);
      const end = new Date(year, month + 1, 1);
      end.setDate(end.getDate() + 1);
      const { data, error } = await supabase
        .from("appointments")
        .select(
          "id, start_at, status, customer_id, customers(name), services(name), staff(name)",
        )
        .gte("start_at", start.toISOString())
        .lt("start_at", end.toISOString())
        .order("start_at", { ascending: true });
      if (cancelled) return;
      if (error) {
        toast.error("Takvim yüklenemedi", { description: error.message });
        setAppts([]);
      } else {
        setAppts((data ?? []) as unknown as CalAppt[]);
      }
      setLoading(false);
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [year, month]);

  // Gün anahtarına göre randevuları grupla (Türkiye gününe göre).
  const byDay = useMemo(() => {
    const map = new Map<string, CalAppt[]>();
    for (const a of appts) {
      const key = trDateKey(new Date(a.start_at));
      const arr = map.get(key);
      if (arr) arr.push(a);
      else map.set(key, [a]);
    }
    return map;
  }, [appts]);

  // Ay grid'i: pazartesi başlangıçlı haftalar.
  const cells = useMemo(() => {
    const monthStart = new Date(year, month, 1);
    const lead = (monthStart.getDay() + 6) % 7; // pazartesi = 0
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const arr: (number | null)[] = [];
    for (let i = 0; i < lead; i++) arr.push(null);
    for (let d = 1; d <= daysInMonth; d++) arr.push(d);
    while (arr.length % 7 !== 0) arr.push(null);
    return arr;
  }, [year, month]);

  const todayKey = trDateKey(today);
  const selectedAppts = selected ? (byDay.get(selected) ?? []) : [];

  function prevMonth() {
    if (month === 0) {
      setYear(year - 1);
      setMonth(11);
    } else setMonth(month - 1);
  }
  function nextMonth() {
    if (month === 11) {
      setYear(year + 1);
      setMonth(0);
    } else setMonth(month + 1);
  }
  function goToday() {
    setYear(today.getFullYear());
    setMonth(today.getMonth());
    setSelected(todayKey);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Takvim</h1>
          <p className="text-sm text-muted-foreground">
            Randevuları aylık görünümde takip et
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={goToday}
            className="rounded-lg border px-3 py-1.5 text-sm hover:bg-muted"
          >
            Bugün
          </button>
          <button
            onClick={prevMonth}
            className="rounded-lg border p-1.5 hover:bg-muted"
            aria-label="Önceki ay"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <div className="min-w-[140px] text-center text-sm font-medium">
            {MONTHS[month]} {year}
          </div>
          <button
            onClick={nextMonth}
            className="rounded-lg border p-1.5 hover:bg-muted"
            aria-label="Sonraki ay"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="rounded-xl border bg-card p-2 sm:p-4">
        <div className="mb-2 grid grid-cols-7 gap-1 text-center text-xs text-muted-foreground">
          {WEEKDAYS.map((w) => (
            <div key={w} className="py-1 font-medium">
              {w}
            </div>
          ))}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16 text-sm text-muted-foreground">
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Yükleniyor…
          </div>
        ) : (
          <div className="grid grid-cols-7 gap-1">
            {cells.map((d, i) => {
              if (d === null)
                return <div key={`b-${i}`} className="min-h-16 rounded-lg" />;
              const key = cellKey(year, month, d);
              const dayAppts = byDay.get(key) ?? [];
              const isToday = key === todayKey;
              const isSelected = key === selected;
              return (
                <button
                  key={key}
                  onClick={() => setSelected(key)}
                  className={[
                    "min-h-16 rounded-lg border p-1 text-left align-top transition-colors",
                    isSelected
                      ? "border-primary bg-primary/5"
                      : "hover:bg-muted/40",
                  ].join(" ")}
                >
                  <div
                    className={[
                      "mb-1 inline-flex h-5 w-5 items-center justify-center rounded-full text-xs",
                      isToday
                        ? "bg-primary font-semibold text-primary-foreground"
                        : "text-muted-foreground",
                    ].join(" ")}
                  >
                    {d}
                  </div>
                  <div className="space-y-0.5">
                    {dayAppts.slice(0, 2).map((a) => (
                      <div
                        key={a.id}
                        className={`truncate rounded px-1 py-0.5 text-[10px] leading-tight ${STATUS_STYLES[a.status]}`}
                      >
                        {formatTrTime(a.start_at)} {a.customers?.name ?? ""}
                      </div>
                    ))}
                    {dayAppts.length > 2 && (
                      <div className="px-1 text-[10px] text-muted-foreground">
                        +{dayAppts.length - 2} daha
                      </div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {selected && (
        <div className="rounded-xl border bg-card p-6">
          <h2 className="mb-4 font-semibold">
            {selected.split("-").reverse().join(".")} —{" "}
            {selectedAppts.length} randevu
          </h2>
          {selectedAppts.length === 0 ? (
            <p className="py-4 text-center text-sm text-muted-foreground">
              Bu gün için randevu yok.
            </p>
          ) : (
            <ul className="space-y-2">
              {selectedAppts.map((a) => (
                <li
                  key={a.id}
                  className="flex items-center justify-between gap-3 rounded-lg border p-3 text-sm"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="shrink-0 font-medium tabular-nums">
                      {formatTrTime(a.start_at)}
                    </span>
                    <div className="min-w-0">
                      <div className="truncate font-medium">
                        {a.customers?.name ?? "—"}
                      </div>
                      <div className="truncate text-xs text-muted-foreground">
                        {a.services?.name ?? "Hizmet belirtilmedi"}
                        {a.staff?.name ? ` · ${a.staff.name}` : ""}
                      </div>
                    </div>
                  </div>
                  <span
                    className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLES[a.status]}`}
                  >
                    {STATUS_LABELS[a.status]}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
