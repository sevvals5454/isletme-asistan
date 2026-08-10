"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Loader2,
  Plus,
  Trash2,
  Check,
  X,
  Pencil,
  Undo2,
} from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { formatPrice } from "@/lib/appointments";
import { formatTrDate, trDateKey } from "@/lib/time";
import {
  type PackageWithUsage,
  type PackageType,
  remainingSessions,
  isExpired,
} from "@/lib/packages";

type ServiceOption = { id: string; name: string };

// YYYY-MM-DD üretir (saat dilimi kaymasından kaçınmak için bileşenlerden).
function ymd(y: number, mZeroBased: number, d: number): string {
  const date = new Date(y, mZeroBased, d); // gün taşmasını JS düzeltir
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${mm}-${dd}`;
}

// Ayın "day" günü için bugünden sonraki ilk ödeme tarihi.
function nextBillingDate(day: number, from = new Date()): string {
  const y = from.getFullYear();
  const m = from.getMonth();
  if (day >= from.getDate()) return ymd(y, m, day);
  return ymd(y, m + 1, day);
}

// next_payment_at'ı bir ay ileri al (günü koru).
function advanceOneMonth(dateStr: string): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  return ymd(y, m - 1 + 1, d);
}

// next_payment_at'ı bir ay geri al (yanlış "Ödendi" işaretini geri almak için).
function retreatOneMonth(dateStr: string): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  return ymd(y, m - 1 - 1, d);
}

// Aylık üyelikte bu dönemin ödemesi alınmış mı?
// Sonraki ödeme tarihi bugünden ileride ise → dönem ödenmiş (Ödendi).
// Tarih bugüne gelmiş/geçmişse → ödeme bekleniyor (Beklemede).
function isPeriodPaid(pkg: { next_payment_at: string | null }): boolean {
  if (!pkg.next_payment_at) return false;
  return pkg.next_payment_at.slice(0, 10) > trDateKey(new Date());
}

export function CustomerPackages({
  orgId,
  customerId,
  initialPackages,
  services,
}: {
  orgId: string;
  customerId: string;
  initialPackages: PackageWithUsage[];
  services: ServiceOption[];
}) {
  const router = useRouter();
  const [packages, setPackages] = useState<PackageWithUsage[]>(initialPackages);
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<PackageWithUsage | null>(null);

  async function deletePackage(pkg: PackageWithUsage) {
    if (!confirm(`"${pkg.name}" paketini silmek istiyor musun?`)) return;
    const supabase = createClient();
    const { error } = await supabase
      .from("customer_packages")
      .delete()
      .eq("id", pkg.id);
    if (error) {
      toast.error("Silme başarısız", { description: error.message });
      return;
    }
    setPackages((prev) => prev.filter((p) => p.id !== pkg.id));
    toast.success("Paket silindi");
    router.refresh();
  }

  async function markPaid(pkg: PackageWithUsage) {
    if (!pkg.next_payment_at) return;
    const next = advanceOneMonth(pkg.next_payment_at);
    const supabase = createClient();
    const { error } = await supabase
      .from("customer_packages")
      .update({ next_payment_at: next })
      .eq("id", pkg.id);
    if (error) {
      toast.error("Güncellenemedi", { description: error.message });
      return;
    }
    setPackages((prev) =>
      prev.map((p) => (p.id === pkg.id ? { ...p, next_payment_at: next } : p)),
    );
    toast.success("Ödeme alındı olarak işaretlendi");
    router.refresh();
  }

  // "Beklemede'ye al" — yanlışlıkla ödendi işaretlendiyse bir ay geri al.
  async function markPending(pkg: PackageWithUsage) {
    if (!pkg.next_payment_at) return;
    const prevDate = retreatOneMonth(pkg.next_payment_at);
    const supabase = createClient();
    const { error } = await supabase
      .from("customer_packages")
      .update({ next_payment_at: prevDate })
      .eq("id", pkg.id);
    if (error) {
      toast.error("Güncellenemedi", { description: error.message });
      return;
    }
    setPackages((prev) =>
      prev.map((p) =>
        p.id === pkg.id ? { ...p, next_payment_at: prevDate } : p,
      ),
    );
    toast.success("Beklemede olarak işaretlendi");
    router.refresh();
  }

  function serviceName(serviceId: string | null) {
    if (!serviceId) return "Genel";
    return services.find((s) => s.id === serviceId)?.name ?? "Genel";
  }

  return (
    <div className="space-y-4">
      {packages.length > 0 && (
        <ul className="space-y-2">
          {packages.map((p) =>
            p.type === "monthly" ? (
              <MonthlyRow
                key={p.id}
                pkg={p}
                serviceName={serviceName(p.service_id)}
                onPaid={() => markPaid(p)}
                onPending={() => markPending(p)}
                onEdit={() => {
                  setEditing(p);
                  setAdding(false);
                }}
                onDelete={() => deletePackage(p)}
              />
            ) : (
              <SessionRow
                key={p.id}
                pkg={p}
                serviceName={serviceName(p.service_id)}
                onEdit={() => {
                  setEditing(p);
                  setAdding(false);
                }}
                onDelete={() => deletePackage(p)}
              />
            ),
          )}
        </ul>
      )}

      {adding || editing ? (
        <div className="rounded-lg border p-1">
          <PackageForm
            orgId={orgId}
            customerId={customerId}
            services={services}
            editing={editing}
            onDone={(result, mode) => {
              if (result && mode === "created")
                setPackages((prev) => [result, ...prev]);
              if (result && mode === "updated")
                setPackages((prev) =>
                  prev.map((x) => (x.id === result.id ? result : x)),
                );
              setAdding(false);
              setEditing(null);
            }}
          />
        </div>
      ) : (
        <button
          onClick={() => setAdding(true)}
          className="inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium hover:bg-muted"
        >
          <Plus className="h-4 w-4" />
          Paket / üyelik ekle
        </button>
      )}
    </div>
  );
}

function SessionRow({
  pkg,
  serviceName,
  onEdit,
  onDelete,
}: {
  pkg: PackageWithUsage;
  serviceName: string;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const remaining = remainingSessions(pkg);
  const depleted = remaining === 0;
  const expired = isExpired(pkg);
  return (
    <li className="flex items-center justify-between gap-3 rounded-lg border p-3 text-sm">
      <div className="min-w-0">
        <div className="font-medium">{pkg.name}</div>
        <div className="truncate text-xs text-muted-foreground">
          Seans paketi · {serviceName} · {formatPrice(pkg.price)}
          {pkg.expires_at && ` · son: ${formatTrDate(pkg.expires_at)}`}
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-3">
        <span
          className={
            depleted || expired
              ? "rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground"
              : "rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
          }
        >
          {expired ? "Süresi doldu" : `${remaining}/${pkg.total_sessions} kaldı`}
        </span>
        <button
          onClick={onEdit}
          className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
          aria-label="Düzenle"
        >
          <Pencil className="h-4 w-4" />
        </button>
        <button
          onClick={onDelete}
          className="rounded-md p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
          aria-label="Sil"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
    </li>
  );
}

function MonthlyRow({
  pkg,
  serviceName,
  onPaid,
  onPending,
  onEdit,
  onDelete,
}: {
  pkg: PackageWithUsage;
  serviceName: string;
  onPaid: () => void;
  onPending: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const paid = isPeriodPaid(pkg);
  const statusBadge = paid
    ? "rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700 dark:bg-green-900/30 dark:text-green-400"
    : "rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700 dark:bg-amber-900/30 dark:text-amber-400";
  const statusText = paid ? "Ödendi" : "Beklemede";
  return (
    <li className="flex items-center justify-between gap-3 rounded-lg border p-3 text-sm">
      <div className="min-w-0">
        <div className="font-medium">{pkg.name}</div>
        <div className="truncate text-xs text-muted-foreground">
          Aylık üyelik · {serviceName} · {formatPrice(pkg.price)}/ay
          {pkg.next_payment_at &&
            ` · ${paid ? "sonraki ödeme" : "ödeme günü"}: ${formatTrDate(pkg.next_payment_at)}`}
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        {pkg.next_payment_at && <span className={statusBadge}>{statusText}</span>}
        {paid ? (
          <button
            onClick={onPending}
            className="inline-flex items-center gap-1 rounded-lg border px-2 py-1 text-xs font-medium text-muted-foreground hover:bg-muted"
            title="Yanlış işaretlediysen beklemedeye geri al"
          >
            <Undo2 className="h-3.5 w-3.5" />
            Beklemede
          </button>
        ) : (
          <button
            onClick={onPaid}
            className="inline-flex items-center gap-1 rounded-lg bg-green-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-green-700"
            title="Ödeme alındı olarak işaretle"
          >
            <Check className="h-3.5 w-3.5" />
            Ödendi
          </button>
        )}
        <button
          onClick={onEdit}
          className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
          aria-label="Düzenle"
        >
          <Pencil className="h-4 w-4" />
        </button>
        <button
          onClick={onDelete}
          className="rounded-md p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
          aria-label="Sil"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
    </li>
  );
}

function PackageForm({
  orgId,
  customerId,
  services,
  editing,
  onDone,
}: {
  orgId: string;
  customerId: string;
  services: ServiceOption[];
  editing?: PackageWithUsage | null;
  onDone: (
    result: PackageWithUsage | null,
    mode?: "created" | "updated",
  ) => void;
}) {
  const router = useRouter();
  const isEdit = !!editing;
  const [type, setType] = useState<PackageType>(editing?.type ?? "session");
  const [name, setName] = useState(editing?.name ?? "");
  const [serviceId, setServiceId] = useState(editing?.service_id ?? "");
  const [totalSessions, setTotalSessions] = useState(
    editing?.total_sessions != null ? String(editing.total_sessions) : "10",
  );
  const [price, setPrice] = useState(
    editing?.price != null ? String(editing.price) : "",
  );
  const [expiresAt, setExpiresAt] = useState(
    editing?.expires_at ? editing.expires_at.slice(0, 10) : "",
  );
  const [billingDay, setBillingDay] = useState(
    editing?.next_payment_at
      ? String(Number(editing.next_payment_at.slice(8, 10)))
      : "1",
  );
  const [loading, setLoading] = useState(false);

  async function save() {
    if (!name.trim()) {
      toast.error("Paket adı gerekli");
      return;
    }

    let total: number | null = null;
    let nextPayment: string | null = null;

    if (type === "session") {
      total = parseInt(totalSessions, 10);
      if (!total || total <= 0) {
        toast.error("Seans sayısı 0'dan büyük olmalı");
        return;
      }
    } else {
      const day = parseInt(billingDay, 10);
      if (!day || day < 1 || day > 28) {
        toast.error("Ödeme günü 1 ile 28 arasında olmalı");
        return;
      }
      nextPayment = nextBillingDate(day);
    }

    setLoading(true);
    const supabase = createClient();
    const SELECT =
      "id, customer_id, service_id, name, type, total_sessions, price, purchased_at, next_payment_at, expires_at, notes";
    const payload = {
      service_id: serviceId || null,
      name: name.trim(),
      type,
      total_sessions: total,
      price: price.trim() === "" ? null : Number(price),
      next_payment_at: nextPayment,
      expires_at:
        type === "session" && expiresAt
          ? new Date(expiresAt).toISOString()
          : null,
    };

    if (isEdit && editing) {
      const { data, error } = await supabase
        .from("customer_packages")
        .update(payload)
        .eq("id", editing.id)
        .select(SELECT)
        .single();
      if (error) {
        toast.error("Güncellenemedi", { description: error.message });
        setLoading(false);
        return;
      }
      toast.success("Güncellendi");
      router.refresh();
      onDone(
        { ...(data as PackageWithUsage), used_sessions: editing.used_sessions },
        "updated",
      );
      return;
    }

    const { data, error } = await supabase
      .from("customer_packages")
      .insert({ organization_id: orgId, customer_id: customerId, ...payload })
      .select(SELECT)
      .single();
    if (error) {
      toast.error("Eklenemedi", { description: error.message });
      setLoading(false);
      return;
    }
    toast.success(type === "monthly" ? "Üyelik eklendi" : "Paket eklendi");
    router.refresh();
    onDone({ ...(data as PackageWithUsage), used_sessions: 0 }, "created");
  }

  return (
    <div className="space-y-3 p-2">
      <div className="space-y-1">
        <label className="text-xs text-muted-foreground">Tür</label>
        <div className="grid grid-cols-2 gap-2">
          <TypeButton
            active={type === "session"}
            onClick={() => setType("session")}
            title="Seans Paketi"
            desc="Ders hakkı bazlı · hak bitince ödeme"
          />
          <TypeButton
            active={type === "monthly"}
            onClick={() => setType("monthly")}
            title="Aylık Üyelik"
            desc="Her ay ödeme · dersler referans"
          />
        </div>
      </div>

      <div className="space-y-1">
        <label className="text-xs text-muted-foreground">
          {type === "monthly" ? "Üyelik adı" : "Paket adı"}
        </label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={type === "monthly" ? "Aylık Pilates" : "10 Seans Lazer"}
          className="w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
      </div>

      <div className="space-y-1">
        <label className="text-xs text-muted-foreground">Hizmet</label>
        <select
          value={serviceId}
          onChange={(e) => setServiceId(e.target.value)}
          className="w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <option value="">Genel (tüm hizmetlerde geçerli)</option>
          {services.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
      </div>

      {type === "session" ? (
        <>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">
                Seans sayısı
              </label>
              <input
                type="number"
                min={1}
                value={totalSessions}
                onChange={(e) => setTotalSessions(e.target.value)}
                className="w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">
                Paket fiyatı (₺)
              </label>
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
            <label className="text-xs text-muted-foreground">
              Son kullanım tarihi (opsiyonel)
            </label>
            <input
              type="date"
              value={expiresAt}
              onChange={(e) => setExpiresAt(e.target.value)}
              className="w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>
        </>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">
              Aylık ücret (₺)
            </label>
            <input
              type="number"
              min={0}
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder="—"
              className="w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">
              Ödeme günü (ayın kaçı)
            </label>
            <input
              type="number"
              min={1}
              max={28}
              value={billingDay}
              onChange={(e) => setBillingDay(e.target.value)}
              className="w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>
        </div>
      )}

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
          {isEdit ? "Güncelle" : "Kaydet"}
        </button>
      </div>
    </div>
  );
}

function TypeButton({
  active,
  onClick,
  title,
  desc,
}: {
  active: boolean;
  onClick: () => void;
  title: string;
  desc: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        active
          ? "rounded-lg border-2 border-primary bg-primary/5 p-2 text-left"
          : "rounded-lg border p-2 text-left hover:bg-muted"
      }
    >
      <div className="text-sm font-medium">{title}</div>
      <div className="text-xs text-muted-foreground">{desc}</div>
    </button>
  );
}
