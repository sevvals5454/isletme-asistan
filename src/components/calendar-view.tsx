"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight, Loader2, Plus } from "lucide-react";
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
function dateKey(d: Date) {
  return cellKey(d.getFullYear(), d.getMonth(), d.getDate());
}
// Verilen tarihin haftasının pazartesisi (yerel gece yarısı).
function mondayOf(d: Date) {
  const m = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const off = (m.getDay() + 6) % 7; // pazartesi = 0
  m.setDate(m.getDate() - off);
  return m;
}
function addDays(d: Date, n: number) {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

type View = "month" | "week";

export function CalendarView() {
  const today = new Date();
  const [view, setView] = useState<View>("month");
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth()); // 0-based
  const [weekStart, setWeekStart] = useState(() => mondayOf(today));
  const [appts, setAppts] = useState<CalAppt[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<string | null>(trDateKey(today));

  // Görünüm tercihini hatırla (setState senkron değil — await sonrası).
  useEffect(() => {
    let cancelled = false;
    (async () => {
      await Promise.resolve();
      try {
        const v = localStorage.getItem("calendar-view");
        if (!cancelled && (v === "week" || v === "month")) setView(v);
      } catch {
        // yoksay
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);
  function changeView(v: View) {
    setView(v);
    try {
      localStorage.setItem("calendar-view", v);
    } catch {
      // yoksay
    }
  }

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      const supabase = createClient();
      // Görünen aralığı, saat dilimi sapmasını kapsamak için ±1 gün geniş çek.
      let start: Date;
      let end: Date;
      if (view === "week") {
        start = addDays(weekStart, -1);
        end = addDays(weekStart, 8);
      } else {
        start = new Date(year, month, 1);
        start.setDate(start.getDate() - 1);
        end = new Date(year, month + 1, 1);
        end.setDate(end.getDate() + 1);
      }
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
  }, [view, year, month, weekStart]);

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

  // Haftalık görünümün 7 günü (pazartesi → pazar).
  const weekDays = useMemo(
    () => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)),
    [weekStart],
  );

  const periodLabel = useMemo(() => {
    if (view === "month") return `${MONTHS[month]} ${year}`;
    const end = addDays(weekStart, 6);
    const sameMonth = end.getMonth() === weekStart.getMonth();
    const left = sameMonth
      ? `${weekStart.getDate()}`
      : `${weekStart.getDate()} ${MONTHS[weekStart.getMonth()]}`;
    return `${left} – ${end.getDate()} ${MONTHS[end.getMonth()]} ${end.getFullYear()}`;
  }, [view, month, year, weekStart]);

  function goPrev() {
    if (view === "week") {
      setWeekStart(addDays(weekStart, -7));
    } else if (month === 0) {
      setYear(year - 1);
      setMonth(11);
    } else setMonth(month - 1);
  }
  function goNext() {
    if (view === "week") {
      setWeekStart(addDays(weekStart, 7));
    } else if (month === 11) {
      setYear(year + 1);
      setMonth(0);
    } else setMonth(month + 1);
  }
  function goToday() {
    setYear(today.getFullYear());
    setMonth(today.getMonth());
    setWeekStart(mondayOf(today));
    setSelected(todayKey);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Takvim</h1>
          <p className="text-sm text-muted-foreground">
            Randevuları {view === "week" ? "haftalık" : "aylık"} görünümde takip
            et
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {/* Ay / Hafta geçişi */}
          <div className="inline-flex rounded-lg border p-0.5">
            <button
              onClick={() => changeView("month")}
              className={`rounded-md px-3 py-1 text-sm font-medium transition-colors ${
                view === "month"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted"
              }`}
            >
              Ay
            </button>
            <button
              onClick={() => changeView("week")}
              className={`rounded-md px-3 py-1 text-sm font-medium transition-colors ${
                view === "week"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted"
              }`}
            >
              Hafta
            </button>
          </div>
          <button
            onClick={goToday}
            className="rounded-lg border px-3 py-1.5 text-sm hover:bg-muted"
          >
            Bugün
          </button>
          <button
            onClick={goPrev}
            className="rounded-lg border p-1.5 hover:bg-muted"
            aria-label={view === "week" ? "Önceki hafta" : "Önceki ay"}
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <div className="min-w-[150px] text-center text-sm font-medium">
            {periodLabel}
          </div>
          <button
            onClick={goNext}
            className="rounded-lg border p-1.5 hover:bg-muted"
            aria-label={view === "week" ? "Sonraki hafta" : "Sonraki ay"}
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
        ) : view === "week" ? (
          <div className="grid grid-cols-7 gap-1">
            {weekDays.map((dt) => {
              const key = dateKey(dt);
              const dayAppts = byDay.get(key) ?? [];
              const isToday = key === todayKey;
              const isSelected = key === selected;
              return (
                <button
                  key={key}
                  onClick={() => setSelected(key)}
                  className={[
                    "flex min-h-40 flex-col rounded-lg border p-1 text-left align-top transition-colors",
                    isSelected
                      ? "border-primary bg-primary/5"
                      : "hover:bg-muted/40",
                  ].join(" ")}
                >
                  <div className="mb-1 flex items-center justify-center">
                    <span
                      className={[
                        "inline-flex h-6 w-6 items-center justify-center rounded-full text-xs",
                        isToday
                          ? "bg-primary font-semibold text-primary-foreground"
                          : "font-medium text-muted-foreground",
                      ].join(" ")}
                    >
                      {dt.getDate()}
                    </span>
                  </div>
                  <div className="flex-1 space-y-0.5 overflow-y-auto">
                    {dayAppts.map((a) => (
                      <div
                        key={a.id}
                        className={`truncate rounded px-1 py-0.5 text-[10px] leading-tight ${STATUS_STYLES[a.status]}`}
                      >
                        {formatTrTime(a.start_at)} {a.customers?.name ?? ""}
                      </div>
                    ))}
                  </div>
                </button>
              );
            })}
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
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="font-semibold">
              {selected.split("-").reverse().join(".")} — {selectedAppts.length}{" "}
              randevu
            </h2>
            <Link
              href={`/appointments?date=${selected}`}
              className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:opacity-90"
            >
              <Plus className="h-3.5 w-3.5" />
              Randevu ekle
            </Link>
          </div>
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
