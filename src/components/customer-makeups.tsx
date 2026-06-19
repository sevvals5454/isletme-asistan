"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus, Trash2, Check, X } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { formatTrDate } from "@/lib/time";
import { formatAppointmentWhen } from "@/lib/appointments";
import {
  type Makeup,
  type MakeupStatus,
  MAKEUP_STATUS_LABELS,
  MAKEUP_STATUS_STYLES,
} from "@/lib/packages";

const MAKEUP_DURATION_MIN = 60;

type PackageRef = {
  id: string;
  name: string;
  purchased_at: string;
};

export function CustomerMakeups({
  orgId,
  customerId,
  initialMakeups,
  packages,
}: {
  orgId: string;
  customerId: string;
  initialMakeups: Makeup[];
  packages: PackageRef[];
}) {
  const router = useRouter();
  const [makeups, setMakeups] = useState<Makeup[]>(initialMakeups);
  const [adding, setAdding] = useState(false);

  // Telafi hakkı kullanılmış paketler (paket başına 1 hak).
  const usedPackageIds = new Set(
    makeups.map((m) => m.package_id).filter((id): id is string => !!id),
  );

  async function changeStatus(m: Makeup, status: MakeupStatus) {
    const supabase = createClient();
    const { error } = await supabase
      .from("makeups")
      .update({ status })
      .eq("id", m.id);
    if (error) {
      toast.error("Güncellenemedi", { description: error.message });
      return;
    }
    setMakeups((prev) =>
      prev.map((x) => (x.id === m.id ? { ...x, status } : x)),
    );
    router.refresh();
  }

  async function deleteMakeup(m: Makeup) {
    if (!confirm("Bu telafi kaydını silmek istiyor musun?")) return;
    const supabase = createClient();
    const { error } = await supabase.from("makeups").delete().eq("id", m.id);
    if (error) {
      toast.error("Silme başarısız", { description: error.message });
      return;
    }
    setMakeups((prev) => prev.filter((x) => x.id !== m.id));
    toast.success("Telafi silindi");
    router.refresh();
  }

  return (
    <div className="space-y-4">
      {makeups.length > 0 && (
        <ul className="space-y-2">
          {makeups.map((m) => (
            <li
              key={m.id}
              className="flex items-center justify-between gap-3 rounded-lg border p-3 text-sm"
            >
              <div className="min-w-0">
                <div className="font-medium">
                  Kaçırılan: {formatTrDate(m.missed_date)}
                </div>
                <div className="truncate text-xs text-muted-foreground">
                  {m.makeup_at
                    ? `Telafi: ${formatAppointmentWhen(m.makeup_at)}`
                    : "Telafi tarihi belirlenmedi"}
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <select
                  value={m.status}
                  onChange={(e) =>
                    changeStatus(m, e.target.value as MakeupStatus)
                  }
                  className={`cursor-pointer rounded-full border-0 px-2 py-1 text-xs font-medium outline-none ${MAKEUP_STATUS_STYLES[m.status]}`}
                >
                  {(Object.keys(MAKEUP_STATUS_LABELS) as MakeupStatus[]).map(
                    (s) => (
                      <option key={s} value={s}>
                        {MAKEUP_STATUS_LABELS[s]}
                      </option>
                    ),
                  )}
                </select>
                <button
                  onClick={() => deleteMakeup(m)}
                  className="rounded-md p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                  aria-label="Sil"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {adding ? (
        <div className="rounded-lg border p-1">
          <MakeupForm
            orgId={orgId}
            customerId={customerId}
            packages={packages}
            usedPackageIds={usedPackageIds}
            onDone={(created) => {
              if (created) setMakeups((prev) => [created, ...prev]);
              setAdding(false);
            }}
          />
        </div>
      ) : (
        <button
          onClick={() => setAdding(true)}
          className="inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium hover:bg-muted"
        >
          <Plus className="h-4 w-4" />
          Telafi ekle
        </button>
      )}
    </div>
  );
}

function MakeupForm({
  orgId,
  customerId,
  packages,
  usedPackageIds,
  onDone,
}: {
  orgId: string;
  customerId: string;
  packages: PackageRef[];
  usedPackageIds: Set<string>;
  onDone: (result: Makeup | null) => void;
}) {
  const router = useRouter();
  const [packageId, setPackageId] = useState("");
  const [missedDate, setMissedDate] = useState("");
  const [makeupAt, setMakeupAt] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);

  function sameMonth(a: Date, b: Date) {
    return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth();
  }

  async function save() {
    if (!missedDate) {
      toast.error("Kaçırılan ders tarihi gerekli");
      return;
    }

    // Telafi kuralı: paket başına 1 hak, paketin alındığı ay içinde.
    if (packageId) {
      if (usedPackageIds.has(packageId)) {
        toast.error("Bu paketin telafi hakkı zaten kullanılmış (paket başına 1).");
        return;
      }
      const pkg = packages.find((p) => p.id === packageId);
      if (pkg && makeupAt) {
        const purchase = new Date(pkg.purchased_at);
        if (!sameMonth(new Date(makeupAt), purchase)) {
          toast.error(
            "Telafi, paketin alındığı ay içinde olmalı (telafi tarihini o aya al).",
          );
          return;
        }
      }
    }

    setLoading(true);
    const supabase = createClient();

    // Telafi tarihi verildiyse pakete SAYMAYAN bir randevu oluştur (package_id null).
    let appointmentId: string | null = null;
    const makeupIso = makeupAt ? new Date(makeupAt).toISOString() : null;
    if (makeupIso) {
      const { data: appt, error: apptErr } = await supabase
        .from("appointments")
        .insert({
          organization_id: orgId,
          customer_id: customerId,
          service_id: null,
          package_id: null, // telafi pakete saymaz
          start_at: makeupIso,
          duration_min: MAKEUP_DURATION_MIN,
          price: null,
          notes: "Telafi randevusu",
        })
        .select("id")
        .single();
      if (apptErr) {
        toast.error("Telafi randevusu oluşturulamadı", {
          description: apptErr.message,
        });
        setLoading(false);
        return;
      }
      appointmentId = (appt as { id: string }).id;
    }

    const { data, error } = await supabase
      .from("makeups")
      .insert({
        organization_id: orgId,
        customer_id: customerId,
        package_id: packageId || null,
        appointment_id: appointmentId,
        missed_date: missedDate,
        makeup_at: makeupIso,
        status: makeupIso ? "scheduled" : "pending",
        notes: notes.trim() || null,
      })
      .select(
        "id, customer_id, package_id, appointment_id, missed_date, makeup_at, status, notes",
      )
      .single();

    if (error) {
      toast.error("Telafi eklenemedi", { description: error.message });
      setLoading(false);
      return;
    }
    toast.success(
      makeupIso ? "Telafi eklendi ve randevu oluşturuldu" : "Telafi eklendi",
    );
    router.refresh();
    onDone(data as Makeup);
  }

  const selectedUsed = packageId !== "" && usedPackageIds.has(packageId);

  return (
    <div className="space-y-3 p-2">
      {packages.length > 0 && (
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">
            İlişkili paket (telafi hakkı bu pakete sayılır)
          </label>
          <select
            value={packageId}
            onChange={(e) => setPackageId(e.target.value)}
            className="w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <option value="">Pakete bağlama</option>
            {packages.map((p) => (
              <option key={p.id} value={p.id} disabled={usedPackageIds.has(p.id)}>
                {p.name}
                {usedPackageIds.has(p.id) ? " (telafi kullanıldı)" : ""}
              </option>
            ))}
          </select>
          {selectedUsed && (
            <p className="text-xs text-red-600 dark:text-red-400">
              Bu paketin telafi hakkı zaten kullanılmış.
            </p>
          )}
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">
            Kaçırılan randevu tarihi
          </label>
          <input
            type="date"
            value={missedDate}
            onChange={(e) => setMissedDate(e.target.value)}
            className="w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">
            Telafi tarihi/saati (opsiyonel)
          </label>
          <input
            type="datetime-local"
            value={makeupAt}
            onChange={(e) => setMakeupAt(e.target.value)}
            className="w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </div>
      </div>
      <p className="text-xs text-muted-foreground">
        Telafi tarihi girersen otomatik bir randevu oluşturulur — bu randevu
        paketten seans düşmez.
      </p>
      <div className="space-y-1">
        <label className="text-xs text-muted-foreground">Not</label>
        <input
          type="text"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Opsiyonel"
          className="w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
      </div>
      <div className="flex justify-end gap-2">
        <button
          onClick={() => onDone(null)}
          className="rounded-lg border px-3 py-2 text-sm hover:bg-muted"
          aria-label="İptal"
        >
          <X className="h-4 w-4" />
        </button>
        <button
          onClick={save}
          disabled={loading}
          className="inline-flex items-center gap-1 rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
        >
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Check className="h-4 w-4" />
          )}
          Kaydet
        </button>
      </div>
    </div>
  );
}
