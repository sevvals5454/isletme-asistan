"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { CalendarClock, CheckCircle, Loader2, XCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { formatTurkishPhone } from "@/lib/phone";

type Svc = { id: string; name: string; duration_min: number; price: number | null };
type Stf = { id: string; name: string };
type Info = { org_name: string; enabled: boolean; services: Svc[]; staff: Stf[] };
type Day = {
  has_hours: boolean;
  is_open: boolean;
  open_time: string | null;
  close_time: string | null;
  closed: boolean;
  busy: { start_at: string; duration_min: number }[];
};

function toMin(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
}

function buildSlots(day: Day, serviceDur: number, dateStr: string): string[] {
  if (day.closed) return [];
  if (day.has_hours && !day.is_open) return [];
  const open = toMin(day.has_hours && day.open_time ? day.open_time : "09:00");
  const close = toMin(
    day.has_hours && day.close_time ? day.close_time : "19:00",
  );
  const busy = day.busy.map((b) => {
    const s = new Date(b.start_at).getTime();
    return { s, e: s + b.duration_min * 60000 };
  });
  const now = Date.now();
  const out: string[] = [];
  for (let m = open; m + serviceDur <= close; m += 30) {
    const hh = String(Math.floor(m / 60)).padStart(2, "0");
    const mm = String(m % 60).padStart(2, "0");
    const start = new Date(`${dateStr}T${hh}:${mm}`).getTime();
    const end = start + serviceDur * 60000;
    if (start < now) continue;
    if (busy.some((b) => start < b.e && end > b.s)) continue;
    out.push(`${hh}:${mm}`);
  }
  return out;
}

export default function BookingPage() {
  const params = useParams<{ org: string }>();
  const org = params.org;

  const [info, setInfo] = useState<Info | null>(null);
  const [loading, setLoading] = useState(true);
  const [serviceId, setServiceId] = useState("");
  const [staffId, setStaffId] = useState("");
  const [dateVal, setDateVal] = useState("");
  const [day, setDay] = useState<Day | null>(null);
  const [dayDate, setDayDate] = useState(""); // day hangi tarih için yüklendi
  const [slot, setSlot] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);
  const [err, setErr] = useState("");

  const todayStr = useMemo(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  }, []);

  const service = info?.services.find((s) => s.id === serviceId) ?? null;

  useEffect(() => {
    (async () => {
      const sb = createClient();
      const { data } = await sb.rpc("get_booking_info", { p_org: org });
      setInfo((data as Info) ?? null);
      setLoading(false);
    })();
  }, [org]);

  // Hizmet + tarih seçilince o günün müsaitliğini çek (setState yalnızca await sonrası).
  useEffect(() => {
    if (!serviceId || !dateVal) return;
    let active = true;
    createClient()
      .rpc("get_booking_day", { p_org: org, p_date: dateVal })
      .then(({ data }) => {
        if (!active) return;
        setDay((data as Day) ?? null);
        setDayDate(dateVal);
      });
    return () => {
      active = false;
    };
  }, [org, serviceId, dateVal]);

  const dayReady = !!day && dayDate === dateVal;
  const dayLoading = !!serviceId && !!dateVal && !dayReady;

  const slots = useMemo(() => {
    if (!dayReady || !day || !service) return [];
    return buildSlots(day, service.duration_min, dateVal);
  }, [dayReady, day, service, dateVal]);

  async function submit() {
    setErr("");
    if (!serviceId) return setErr("Hizmet seçin");
    if (!dateVal || !slot) return setErr("Gün ve saat seçin");
    if (!name.trim()) return setErr("Adınızı yazın");
    setSaving(true);
    const sb = createClient();
    const startAt = new Date(`${dateVal}T${slot}`).toISOString();
    const { data, error } = await sb.rpc("create_booking", {
      p_org: org,
      p_service: serviceId,
      p_staff: staffId || null,
      p_start: startAt,
      p_name: name.trim(),
      p_phone: phone.trim() || null,
    });
    setSaving(false);
    const res = data as { ok: boolean; error?: string } | null;
    if (error || !res?.ok) {
      setErr(res?.error || "Randevu oluşturulamadı, lütfen tekrar deneyin.");
      if (res?.error?.includes("dolu")) setSlot(""); // saat kapılmış olabilir
      return;
    }
    setDone(true);
  }

  const card =
    "w-full max-w-md rounded-2xl border bg-card p-6 shadow-sm";
  const field =
    "w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring";

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-muted/30 p-4">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!info || info.enabled === false) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-muted/30 p-4">
        <div className={`${card} text-center`}>
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
            <XCircle className="h-6 w-6 text-muted-foreground" />
          </div>
          <h1 className="font-semibold">Online randevu şu an kapalı</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Lütfen işletmeyle iletişime geçin.
          </p>
        </div>
      </div>
    );
  }

  if (done) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-muted/30 p-4">
        <div className={`${card} text-center`}>
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
            <CheckCircle className="h-6 w-6" />
          </div>
          <h1 className="text-lg font-semibold">Randevunuz alındı 🎉</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {info.org_name} · {dateVal} {slot}
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            İşletme en kısa sürede sizinle iletişime geçecek. Teşekkürler!
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-start justify-center bg-muted/30 p-4">
      <div className={`${card} my-6 space-y-4`}>
        <div className="text-center">
          <div className="mx-auto mb-2 flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <CalendarClock className="h-6 w-6" />
          </div>
          <h1 className="text-lg font-semibold">{info.org_name}</h1>
          <p className="text-sm text-muted-foreground">Online randevu al</p>
        </div>

        <div className="space-y-1">
          <label className="text-sm font-medium">Hizmet</label>
          <select
            value={serviceId}
            onChange={(e) => {
              setServiceId(e.target.value);
              setSlot("");
            }}
            className={field}
          >
            <option value="">Hizmet seçin…</option>
            {info.services.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} ({s.duration_min} dk)
              </option>
            ))}
          </select>
        </div>

        {info.staff.length > 0 && (
          <div className="space-y-1">
            <label className="text-sm font-medium">Çalışan (isteğe bağlı)</label>
            <select
              value={staffId}
              onChange={(e) => setStaffId(e.target.value)}
              className={field}
            >
              <option value="">Farketmez</option>
              {info.staff.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="space-y-1">
          <label className="text-sm font-medium">Gün</label>
          <input
            type="date"
            min={todayStr}
            value={dateVal}
            onChange={(e) => {
              setDateVal(e.target.value);
              setSlot("");
            }}
            className={field}
          />
        </div>

        {serviceId && dateVal && (
          <div className="space-y-1">
            <label className="text-sm font-medium">Saat</label>
            {dayLoading ? (
              <div className="flex items-center gap-2 py-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Müsait saatler yükleniyor…
              </div>
            ) : slots.length === 0 ? (
              <p className="rounded-lg bg-muted/50 p-3 text-sm text-muted-foreground">
                Bu gün için uygun saat yok. Lütfen başka bir gün seçin.
              </p>
            ) : (
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                {slots.map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setSlot(t)}
                    className={`rounded-lg border px-2 py-1.5 text-sm ${
                      slot === t
                        ? "border-primary bg-primary text-primary-foreground"
                        : "hover:bg-muted"
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="space-y-1">
          <label className="text-sm font-medium">Ad Soyad</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Adınız"
            className={field}
          />
        </div>
        <div className="space-y-1">
          <label className="text-sm font-medium">Telefon</label>
          <input
            value={phone}
            onChange={(e) => setPhone(formatTurkishPhone(e.target.value))}
            placeholder="0532 123 45 67"
            inputMode="tel"
            className={field}
          />
        </div>

        {err && <p className="text-sm text-red-600">{err}</p>}

        <button
          onClick={submit}
          disabled={saving || !slot}
          className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
        >
          {saving && <Loader2 className="h-4 w-4 animate-spin" />}
          Randevu al
        </button>
      </div>
    </div>
  );
}
