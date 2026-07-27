"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Plus,
  Calendar,
  Loader2,
  Save,
  X,
  Trash2,
  MessageCircle,
  RotateCcw,
  Pencil,
  CalendarX,
} from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import {
  type AppointmentStatus as Status,
  type RecurrenceType,
  STATUS_LABELS,
  STATUS_STYLES,
  RECURRENCE_LABELS,
  formatPrice,
  formatAppointmentWhen as formatWhen,
  buildRecurringDates,
} from "@/lib/appointments";
import { whatsAppReminderUrl, buildReminderMessage } from "@/lib/phone";
import { trStartOfDay, trStartOfWeek, addDays } from "@/lib/time";
import { availabilityWarning, type DayHours } from "@/lib/hours";
import { renderTemplate, DEFAULT_TEMPLATES } from "@/lib/templates";

type Appointment = {
  id: string;
  start_at: string;
  duration_min: number;
  status: Status;
  price: number | null;
  notes: string | null;
  customer_id: string;
  service_id: string | null;
  package_id: string | null;
  staff_id: string | null;
  recurrence_group_id: string | null;
  customers: { name: string; phone: string | null } | null;
  services: { name: string } | null;
  staff: { name: string } | null;
};

// datetime-local input değeri ("YYYY-MM-DDTHH:MM") — yerel/TR cihaz saatiyle.
function isoToLocalInput(iso: string): string {
  const d = new Date(iso);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}

const APPT_SELECT =
  "id, start_at, duration_min, status, price, notes, customer_id, service_id, package_id, staff_id, recurrence_group_id, customers(name, phone), services(name), staff(name)";

// Saat seçimi için 07:00–22:00 arası 15 dakikalık dilimler.
const TIME_SLOTS: string[] = (() => {
  const out: string[] = [];
  for (let h = 7; h <= 22; h++) {
    for (const m of [0, 15, 30, 45]) {
      if (h === 22 && m > 0) break;
      out.push(`${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`);
    }
  }
  return out;
})();

type CustomerOption = { id: string; name: string };
type StaffOption = { id: string; name: string };
type ServiceOption = {
  id: string;
  name: string;
  duration_min: number;
  price: number | null;
};
// Müşterinin randevuda kullanılabilir paketi (kalan seansı olan, süresi dolmamış).
type PackageOption = {
  id: string;
  customer_id: string;
  service_id: string | null;
  name: string;
  remaining: number;
};

type Tab = "today" | "week" | "all";

export function AppointmentsView({
  orgId,
  initialAppointments,
  customers,
  services,
  packages,
  staff,
  hours,
  closedDays,
  orgName,
  openNewAt,
}: {
  orgId: string;
  initialAppointments: Appointment[];
  customers: CustomerOption[];
  services: ServiceOption[];
  packages: PackageOption[];
  staff: StaffOption[];
  hours: DayHours[];
  closedDays: string[];
  orgName: string;
  openNewAt?: string; // takvimden gelen tarih (YYYY-MM-DD) → modalı aç
}) {
  const router = useRouter();
  const [appointments, setAppointments] =
    useState<Appointment[]>(initialAppointments);
  const [tab, setTab] = useState<Tab>("today");
  const [staffFilter, setStaffFilter] = useState("");
  const [modalOpen, setModalOpen] = useState(!!openNewAt);
  const [editingAppt, setEditingAppt] = useState<Appointment | null>(null);

  function closeModal() {
    setModalOpen(false);
    setEditingAppt(null);
  }

  const filtered = useMemo(() => {
    // Gün/hafta sınırları Türkiye saatine göre (cihaz saatinden bağımsız).
    let base = appointments;
    if (tab === "today") {
      const start = trStartOfDay();
      const end = addDays(start, 1);
      base = appointments.filter((a) => {
        const d = new Date(a.start_at);
        return d >= start && d < end;
      });
    } else if (tab === "week") {
      const start = trStartOfWeek();
      const end = addDays(start, 7);
      base = appointments.filter((a) => {
        const d = new Date(a.start_at);
        return d >= start && d < end;
      });
    }
    if (staffFilter) base = base.filter((a) => a.staff_id === staffFilter);
    return base;
  }, [appointments, tab, staffFilter]);

  async function changeStatus(appt: Appointment, status: Status) {
    const supabase = createClient();
    const { error } = await supabase
      .from("appointments")
      .update({ status })
      .eq("id", appt.id);
    if (error) {
      toast.error("Durum güncellenemedi", { description: error.message });
      return;
    }
    setAppointments((prev) =>
      prev.map((a) => (a.id === appt.id ? { ...a, status } : a)),
    );
    router.refresh();
  }

  async function deleteAppointment(appt: Appointment) {
    if (!confirm("Bu randevuyu silmek istiyor musun?")) return;
    const supabase = createClient();
    const { error } = await supabase
      .from("appointments")
      .delete()
      .eq("id", appt.id);
    if (error) {
      toast.error("Silme başarısız", { description: error.message });
      return;
    }
    setAppointments((prev) => prev.filter((a) => a.id !== appt.id));
    toast.success("Randevu silindi");
    router.refresh();
  }

  async function deleteSeries(appt: Appointment) {
    const gid = appt.recurrence_group_id;
    if (!gid) return;
    if (
      !confirm(
        "Bu tekrarlayan serinin bu ve sonraki randevularını silmek istiyor musun?",
      )
    )
      return;
    const supabase = createClient();
    const { error } = await supabase
      .from("appointments")
      .delete()
      .eq("recurrence_group_id", gid)
      .gte("start_at", appt.start_at);
    if (error) {
      toast.error("Seri silinemedi", { description: error.message });
      return;
    }
    setAppointments((prev) =>
      prev.filter(
        (a) =>
          !(
            a.recurrence_group_id === gid &&
            new Date(a.start_at) >= new Date(appt.start_at)
          ),
      ),
    );
    toast.success("Seri silindi");
    router.refresh();
  }

  const tabs: { key: Tab; label: string }[] = [
    { key: "today", label: "Bugün" },
    { key: "week", label: "Bu hafta" },
    { key: "all", label: "Tümü" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Randevular</h1>
          <p className="text-sm text-muted-foreground">
            {appointments.length} randevu kayıtlı
          </p>
        </div>
        <button
          onClick={() => setModalOpen(true)}
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
        >
          <Plus className="h-4 w-4" />
          Yeni randevu
        </button>
      </div>

      <div className="flex gap-1 rounded-lg border bg-muted/30 p-1">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={
              tab === t.key
                ? "flex-1 rounded-md bg-background px-3 py-1.5 text-sm font-medium shadow-sm"
                : "flex-1 rounded-md px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground"
            }
          >
            {t.label}
          </button>
        ))}
      </div>

      {staff.length > 0 && (
        <select
          value={staffFilter}
          onChange={(e) => setStaffFilter(e.target.value)}
          className="w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring sm:w-auto"
        >
          <option value="">Tüm çalışanlar</option>
          {staff.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
      )}

      {filtered.length === 0 ? (
        <EmptyState onAdd={() => setModalOpen(true)} />
      ) : (
        <div className="overflow-x-auto rounded-xl border bg-card">
          <table className="w-full min-w-[640px] text-sm">
            <thead className="border-b bg-muted/30 text-left text-xs text-muted-foreground">
              <tr>
                <th className="px-4 py-3 font-medium">Tarih / Saat</th>
                <th className="px-4 py-3 font-medium">Müşteri</th>
                <th className="px-4 py-3 font-medium">Hizmet</th>
                <th className="px-4 py-3 font-medium">Süre</th>
                <th className="px-4 py-3 font-medium">Fiyat</th>
                <th className="px-4 py-3 font-medium">Durum</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y">
              {filtered.map((a) => (
                <tr key={a.id} className="hover:bg-muted/20">
                  <td className="px-4 py-3 whitespace-nowrap">
                    {formatWhen(a.start_at)}
                  </td>
                  <td className="px-4 py-3 font-medium">
                    {a.customers?.name ?? "—"}
                    {a.staff?.name && (
                      <span className="block text-xs font-normal text-muted-foreground">
                        {a.staff.name}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {a.services?.name ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {a.duration_min} dk
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {a.package_id ? (
                      <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                        Paket
                      </span>
                    ) : (
                      formatPrice(a.price)
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <select
                      value={a.status}
                      onChange={(e) =>
                        changeStatus(a, e.target.value as Status)
                      }
                      className={`cursor-pointer rounded-full border-0 px-2 py-1 text-xs font-medium outline-none ${STATUS_STYLES[a.status]}`}
                    >
                      {(Object.keys(STATUS_LABELS) as Status[]).map((s) => (
                        <option key={s} value={s}>
                          {STATUS_LABELS[s]}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => setEditingAppt(a)}
                        className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                        aria-label="Düzenle"
                        title="Düzenle"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      {(() => {
                        const url = whatsAppReminderUrl(
                          a.customers?.phone,
                          buildReminderMessage({
                            customerName: a.customers?.name ?? "",
                            whenText: formatWhen(a.start_at),
                            serviceName: a.services?.name,
                          }),
                        );
                        return url ? (
                          <a
                            href={url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="rounded-md p-1.5 text-muted-foreground hover:bg-green-100 hover:text-green-700 dark:hover:bg-green-900/30 dark:hover:text-green-400"
                            aria-label="WhatsApp'tan hatırlat"
                            title="WhatsApp'tan hatırlat"
                          >
                            <MessageCircle className="h-4 w-4" />
                          </a>
                        ) : null;
                      })()}
                      {a.status === "no_show" &&
                        (() => {
                          const url = whatsAppReminderUrl(
                            a.customers?.phone,
                            renderTemplate(DEFAULT_TEMPLATES.makeup_offer, {
                              ad: a.customers?.name ?? "",
                              isletme: orgName,
                            }),
                          );
                          return url ? (
                            <a
                              href={url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="rounded-md p-1.5 text-muted-foreground hover:bg-amber-100 hover:text-amber-700 dark:hover:bg-amber-900/30 dark:hover:text-amber-400"
                              aria-label="Telafi mesajı gönder"
                              title="Telafi / gelemedi mesajı gönder"
                            >
                              <RotateCcw className="h-4 w-4" />
                            </a>
                          ) : null;
                        })()}
                      {a.recurrence_group_id && (
                        <button
                          onClick={() => deleteSeries(a)}
                          className="rounded-md p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                          aria-label="Seriyi sil"
                          title="Tekrarlayan seriyi sil"
                        >
                          <CalendarX className="h-4 w-4" />
                        </button>
                      )}
                      <button
                        onClick={() => deleteAppointment(a)}
                        className="rounded-md p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                        aria-label="Sil"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {(modalOpen || editingAppt) && (
        <AppointmentModal
          orgId={orgId}
          customers={customers}
          services={services}
          packages={packages}
          staff={staff}
          hours={hours}
          closedDays={closedDays}
          editing={editingAppt}
          initialDate={editingAppt ? undefined : openNewAt}
          onClose={closeModal}
          onCreated={(appts) => {
            setAppointments((prev) =>
              [...appts, ...prev].sort(
                (x, y) =>
                  new Date(y.start_at).getTime() -
                  new Date(x.start_at).getTime(),
              ),
            );
            closeModal();
          }}
          onUpdated={(appt) => {
            setAppointments((prev) =>
              prev
                .map((a) => (a.id === appt.id ? appt : a))
                .sort(
                  (x, y) =>
                    new Date(y.start_at).getTime() -
                    new Date(x.start_at).getTime(),
                ),
            );
            closeModal();
          }}
        />
      )}
    </div>
  );
}

function EmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="rounded-xl border bg-card p-12 text-center">
      <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
        <Calendar className="h-6 w-6 text-muted-foreground" />
      </div>
      <h3 className="mb-1 font-semibold">Bu aralıkta randevu yok</h3>
      <p className="mb-6 text-sm text-muted-foreground">
        Yeni bir randevu ekleyerek başlayın
      </p>
      <button
        onClick={onAdd}
        className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
      >
        <Plus className="h-4 w-4" />
        Yeni randevu ekle
      </button>
    </div>
  );
}

function AppointmentModal({
  orgId,
  customers,
  services,
  packages,
  staff,
  hours,
  closedDays,
  editing,
  initialDate,
  onClose,
  onCreated,
  onUpdated,
}: {
  orgId: string;
  customers: CustomerOption[];
  services: ServiceOption[];
  packages: PackageOption[];
  staff: StaffOption[];
  hours: DayHours[];
  closedDays: string[];
  editing?: Appointment | null;
  initialDate?: string;
  onClose: () => void;
  onCreated: (appts: Appointment[]) => void;
  onUpdated: (appt: Appointment) => void;
}) {
  const router = useRouter();
  const isEdit = !!editing;
  const [customerId, setCustomerId] = useState(editing?.customer_id ?? "");
  const [serviceId, setServiceId] = useState(editing?.service_id ?? "");
  const initStart = editing
    ? isoToLocalInput(editing.start_at)
    : initialDate
      ? `${initialDate}T09:00`
      : "";
  const [dateVal, setDateVal] = useState(initStart ? initStart.slice(0, 10) : "");
  const [timeVal, setTimeVal] = useState(
    initStart ? initStart.slice(11, 16) : "09:00",
  );
  const startAt = dateVal ? `${dateVal}T${timeVal}` : "";
  const [duration, setDuration] = useState(String(editing?.duration_min ?? 30));
  const [price, setPrice] = useState(
    editing?.price != null ? String(editing.price) : "",
  );
  const [notes, setNotes] = useState(editing?.notes ?? "");
  const [repeat, setRepeat] = useState<RecurrenceType>("none");
  const [repeatCount, setRepeatCount] = useState("4");
  const [packageId, setPackageId] = useState(editing?.package_id ?? "");
  const [staffId, setStaffId] = useState(editing?.staff_id ?? "");
  const [loading, setLoading] = useState(false);

  // Seçili müşterinin kullanılabilir paketleri.
  const customerPackages = packages.filter((p) => p.customer_id === customerId);

  function onCustomerChange(id: string) {
    setCustomerId(id);
    setPackageId(""); // paketler müşteriye özel; müşteri değişince sıfırla
  }

  function onServiceChange(id: string) {
    setServiceId(id);
    const svc = services.find((s) => s.id === id);
    if (svc) {
      setDuration(String(svc.duration_min));
      // Paket kullanılıyorsa fiyat 0 kalır (zaten ödendi).
      if (!packageId) setPrice(svc.price != null ? String(svc.price) : "");
    }
  }

  function onPackageChange(id: string) {
    setPackageId(id);
    if (id) {
      setPrice("0"); // paket seansı: ücret pakette ödendi
      // Hizmete özel paketse hizmeti otomatik seç + süreyi doldur.
      const pkg = customerPackages.find((p) => p.id === id);
      if (pkg?.service_id) {
        setServiceId(pkg.service_id);
        const svc = services.find((s) => s.id === pkg.service_id);
        if (svc) setDuration(String(svc.duration_min));
      }
    }
  }

  async function save() {
    if (!customerId) {
      toast.error("Müşteri seçmelisin");
      return;
    }
    if (!startAt) {
      toast.error("Tarih ve saat gerekli");
      return;
    }
    const durationNum = parseInt(duration, 10);
    if (!durationNum || durationNum <= 0) {
      toast.error("Süre 0'dan büyük olmalı");
      return;
    }
    let count = 1;
    if (repeat !== "none") {
      count = parseInt(repeatCount, 10);
      if (!count || count < 2 || count > 52) {
        toast.error("Tekrar sayısı 2 ile 52 arasında olmalı");
        return;
      }
    }
    // Paket kullanılıyorsa kalan seanstan fazla randevu oluşturulamaz (yeni kayıtta).
    if (packageId && !isEdit) {
      const pkg = customerPackages.find((p) => p.id === packageId);
      if (pkg && count > pkg.remaining) {
        toast.error(
          `Bu pakette ${pkg.remaining} seans kaldı; ${count} randevu oluşturamazsın.`,
        );
        return;
      }
    }
    setLoading(true);
    const supabase = createClient();

    // Düzenleme: tek randevuyu güncelle.
    if (isEdit && editing) {
      const { data, error } = await supabase
        .from("appointments")
        .update({
          customer_id: customerId,
          service_id: serviceId || null,
          package_id: packageId || null,
          staff_id: staffId || null,
          start_at: new Date(startAt).toISOString(),
          duration_min: durationNum,
          price: price.trim() === "" ? null : Number(price),
          notes: notes.trim() || null,
        })
        .eq("id", editing.id)
        .select(APPT_SELECT)
        .single();
      if (error) {
        toast.error("Randevu güncellenemedi", { description: error.message });
        setLoading(false);
        return;
      }
      toast.success("Randevu güncellendi");
      router.refresh();
      onUpdated(data as unknown as Appointment);
      return;
    }

    // Yeni: (tekrarlıysa) ortak seri kimliğiyle N satır ekle.
    const gid = count > 1 ? crypto.randomUUID() : null;
    const dates = buildRecurringDates(new Date(startAt), repeat, count);
    const rows = dates.map((d) => ({
      organization_id: orgId,
      customer_id: customerId,
      service_id: serviceId || null,
      package_id: packageId || null,
      staff_id: staffId || null,
      recurrence_group_id: gid,
      start_at: d.toISOString(),
      duration_min: durationNum,
      price: price.trim() === "" ? null : Number(price),
      notes: notes.trim() || null,
    }));

    const { data, error } = await supabase
      .from("appointments")
      .insert(rows)
      .select(APPT_SELECT);

    if (error) {
      toast.error("Randevu eklenemedi", { description: error.message });
      setLoading(false);
      return;
    }
    const created = (data ?? []) as unknown as Appointment[];
    toast.success(
      created.length > 1
        ? `${created.length} randevu eklendi`
        : "Randevu eklendi",
    );
    router.refresh();
    onCreated(created);
  }

  // Çalışma saati / kapalı gün uyarısı (engellemez, bilgi verir).
  const availWarning = startAt
    ? availabilityWarning(new Date(startAt), hours, new Set(closedDays))
    : null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-xl border bg-card p-6 shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">
            {isEdit ? "Randevu düzenle" : "Yeni randevu"}
          </h2>
          <button
            onClick={onClose}
            className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
            aria-label="Kapat"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-4">
          <div className="space-y-1">
            <label className="text-sm font-medium">Müşteri *</label>
            <select
              value={customerId}
              onChange={(e) => onCustomerChange(e.target.value)}
              className="w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <option value="">Müşteri seç…</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            {customers.length === 0 && (
              <p className="text-xs text-muted-foreground">
                Önce müşteri eklemelisin.
              </p>
            )}
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium">Hizmet</label>
            <select
              value={serviceId}
              onChange={(e) => onServiceChange(e.target.value)}
              className="w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <option value="">Hizmet seç (opsiyonel)…</option>
              {services.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>

          {staff.length > 0 && (
            <div className="space-y-1">
              <label className="text-sm font-medium">
                Sorumlu çalışan
              </label>
              <select
                value={staffId}
                onChange={(e) => setStaffId(e.target.value)}
                className="w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <option value="">Atanmadı</option>
                {staff.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {customerId && customerPackages.length > 0 && (
            <div className="space-y-1">
              <label className="text-sm font-medium">Paket kullan</label>
              <select
                value={packageId}
                onChange={(e) => onPackageChange(e.target.value)}
                className="w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <option value="">Paket kullanma</option>
                {customerPackages.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.remaining} seans kaldı)
                  </option>
                ))}
              </select>
              {packageId && (
                <p className="text-xs text-muted-foreground">
                  Bu randevu tamamlanınca paketten 1 seans düşülür. Ücret 0₺
                  (pakette ödendi).
                </p>
              )}
            </div>
          )}

          <div className="space-y-1">
            <label className="text-sm font-medium">Tarih ve saat *</label>
            <div className="grid grid-cols-2 gap-2">
              <input
                type="date"
                value={dateVal}
                onChange={(e) => setDateVal(e.target.value)}
                className="w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                aria-label="Tarih"
              />
              <select
                value={timeVal}
                onChange={(e) => setTimeVal(e.target.value)}
                className="w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                aria-label="Saat"
              >
                {(TIME_SLOTS.includes(timeVal)
                  ? TIME_SLOTS
                  : [timeVal, ...TIME_SLOTS]
                ).map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
            {availWarning && (
              <p className="text-xs text-amber-600 dark:text-amber-500">
                ⚠️ {availWarning}
              </p>
            )}
          </div>

          {!isEdit && (
            <div className="space-y-1">
              <label className="text-sm font-medium">Tekrar</label>
              <select
                value={repeat}
                onChange={(e) => setRepeat(e.target.value as RecurrenceType)}
                className="w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {(Object.keys(RECURRENCE_LABELS) as RecurrenceType[]).map(
                  (r) => (
                    <option key={r} value={r}>
                      {RECURRENCE_LABELS[r]}
                    </option>
                  ),
                )}
              </select>
            </div>
          )}

          {!isEdit && repeat !== "none" && (
            <div className="space-y-1">
              <label className="text-sm font-medium">
                Kaç kez tekrarlansın?
              </label>
              <input
                type="number"
                min={2}
                max={52}
                value={repeatCount}
                onChange={(e) => setRepeatCount(e.target.value)}
                className="w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
              <p className="text-xs text-muted-foreground">
                İlki dahil toplam {repeatCount || "—"} randevu oluşturulacak.
              </p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-sm font-medium">Süre (dk)</label>
              <input
                type="number"
                min={1}
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                className="w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">Fiyat (₺)</label>
              <input
                type="number"
                min={0}
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="—"
                className="w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium">Not</label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
              placeholder="Opsiyonel not…"
            />
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="rounded-lg border px-4 py-2 text-sm hover:bg-muted"
          >
            İptal
          </button>
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
            {isEdit ? "Güncelle" : "Kaydet"}
          </button>
        </div>
      </div>
    </div>
  );
}
