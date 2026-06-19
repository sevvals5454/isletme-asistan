"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus, Pencil, Trash2, Check, X } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";

export type Service = {
  id: string;
  name: string;
  duration_min: number;
  price: number | null;
  active: boolean;
};

export function ServicesManager({
  orgId,
  initialServices,
}: {
  orgId: string;
  initialServices: Service[];
}) {
  const router = useRouter();
  const [services, setServices] = useState<Service[]>(initialServices);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);

  function formatPrice(price: number | null) {
    if (price == null) return "—";
    return price.toLocaleString("tr-TR", {
      style: "currency",
      currency: "TRY",
      maximumFractionDigits: 0,
    });
  }

  async function toggleActive(service: Service) {
    const supabase = createClient();
    const { error } = await supabase
      .from("services")
      .update({ active: !service.active })
      .eq("id", service.id);
    if (error) {
      toast.error("Güncelleme başarısız", { description: error.message });
      return;
    }
    setServices((prev) =>
      prev.map((s) =>
        s.id === service.id ? { ...s, active: !s.active } : s,
      ),
    );
    router.refresh();
  }

  async function deleteService(service: Service) {
    if (!confirm(`"${service.name}" hizmetini silmek istiyor musun?`)) return;
    const supabase = createClient();
    const { error } = await supabase
      .from("services")
      .delete()
      .eq("id", service.id);
    if (error) {
      toast.error("Silme başarısız", { description: error.message });
      return;
    }
    setServices((prev) => prev.filter((s) => s.id !== service.id));
    toast.success("Hizmet silindi");
    router.refresh();
  }

  return (
    <div className="space-y-4">
      {services.length > 0 && (
        <div className="divide-y rounded-lg border">
          {services.map((service) =>
            editingId === service.id ? (
              <ServiceRowForm
                key={service.id}
                orgId={orgId}
                service={service}
                onDone={(updated) => {
                  if (updated) {
                    setServices((prev) =>
                      prev.map((s) => (s.id === updated.id ? updated : s)),
                    );
                  }
                  setEditingId(null);
                }}
              />
            ) : (
              <div
                key={service.id}
                className="flex items-center gap-3 p-3 text-sm"
              >
                <div className="flex-1">
                  <div className="font-medium">{service.name}</div>
                  <div className="text-xs text-muted-foreground">
                    {service.duration_min} dk · {formatPrice(service.price)}
                  </div>
                </div>
                <button
                  onClick={() => toggleActive(service)}
                  className={
                    service.active
                      ? "rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700 dark:bg-green-900/30 dark:text-green-400"
                      : "rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground"
                  }
                >
                  {service.active ? "Aktif" : "Pasif"}
                </button>
                <button
                  onClick={() => setEditingId(service.id)}
                  className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                  aria-label="Düzenle"
                >
                  <Pencil className="h-4 w-4" />
                </button>
                <button
                  onClick={() => deleteService(service)}
                  className="rounded-md p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                  aria-label="Sil"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ),
          )}
        </div>
      )}

      {adding ? (
        <div className="rounded-lg border p-1">
          <ServiceRowForm
            orgId={orgId}
            onDone={(created) => {
              if (created) setServices((prev) => [...prev, created]);
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
          Hizmet ekle
        </button>
      )}
    </div>
  );
}

function ServiceRowForm({
  orgId,
  service,
  onDone,
}: {
  orgId: string;
  service?: Service;
  onDone: (result: Service | null) => void;
}) {
  const router = useRouter();
  const [name, setName] = useState(service?.name ?? "");
  const [duration, setDuration] = useState(String(service?.duration_min ?? 30));
  const [price, setPrice] = useState(
    service?.price != null ? String(service.price) : "",
  );
  const [loading, setLoading] = useState(false);

  async function save() {
    if (!name.trim()) {
      toast.error("Hizmet adı gerekli");
      return;
    }
    const durationNum = parseInt(duration, 10);
    if (!durationNum || durationNum <= 0) {
      toast.error("Süre 0'dan büyük olmalı");
      return;
    }
    setLoading(true);
    const supabase = createClient();
    const payload = {
      name: name.trim(),
      duration_min: durationNum,
      price: price.trim() === "" ? null : Number(price),
    };

    if (service) {
      const { data, error } = await supabase
        .from("services")
        .update(payload)
        .eq("id", service.id)
        .select("id, name, duration_min, price, active")
        .single();
      if (error) {
        toast.error("Güncelleme başarısız", { description: error.message });
        setLoading(false);
        return;
      }
      toast.success("Hizmet güncellendi");
      router.refresh();
      onDone(data as Service);
    } else {
      const { data, error } = await supabase
        .from("services")
        .insert({ ...payload, organization_id: orgId })
        .select("id, name, duration_min, price, active")
        .single();
      if (error) {
        toast.error("Ekleme başarısız", { description: error.message });
        setLoading(false);
        return;
      }
      toast.success("Hizmet eklendi");
      router.refresh();
      onDone(data as Service);
    }
  }

  return (
    <div className="flex flex-wrap items-end gap-2 p-2">
      <div className="min-w-[140px] flex-1 space-y-1">
        <label className="text-xs text-muted-foreground">Hizmet adı</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Saç kesimi"
          className="w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
      </div>
      <div className="w-24 space-y-1">
        <label className="text-xs text-muted-foreground">Süre (dk)</label>
        <input
          type="number"
          min={1}
          value={duration}
          onChange={(e) => setDuration(e.target.value)}
          className="w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
      </div>
      <div className="w-28 space-y-1">
        <label className="text-xs text-muted-foreground">Fiyat (₺)</label>
        <input
          type="number"
          min={0}
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          placeholder="—"
          className="w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
      </div>
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
      <button
        onClick={() => onDone(null)}
        className="rounded-lg border px-3 py-2 text-sm hover:bg-muted"
        aria-label="İptal"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
