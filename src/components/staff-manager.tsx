"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus, Pencil, Trash2, Check, X } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";

export type Staff = {
  id: string;
  name: string;
  active: boolean;
};

export function StaffManager({
  orgId,
  initialStaff,
}: {
  orgId: string;
  initialStaff: Staff[];
}) {
  const router = useRouter();
  const [staff, setStaff] = useState<Staff[]>(initialStaff);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);

  async function toggleActive(s: Staff) {
    const supabase = createClient();
    const { error } = await supabase
      .from("staff")
      .update({ active: !s.active })
      .eq("id", s.id);
    if (error) {
      toast.error("Güncelleme başarısız", { description: error.message });
      return;
    }
    setStaff((prev) =>
      prev.map((x) => (x.id === s.id ? { ...x, active: !x.active } : x)),
    );
    router.refresh();
  }

  async function deleteStaff(s: Staff) {
    if (!confirm(`"${s.name}" çalışanını silmek istiyor musun?`)) return;
    const supabase = createClient();
    const { error } = await supabase.from("staff").delete().eq("id", s.id);
    if (error) {
      toast.error("Silme başarısız", { description: error.message });
      return;
    }
    setStaff((prev) => prev.filter((x) => x.id !== s.id));
    toast.success("Çalışan silindi");
    router.refresh();
  }

  return (
    <div className="space-y-4">
      {staff.length > 0 && (
        <div className="divide-y rounded-lg border">
          {staff.map((s) =>
            editingId === s.id ? (
              <StaffRowForm
                key={s.id}
                orgId={orgId}
                staff={s}
                onDone={(updated) => {
                  if (updated)
                    setStaff((prev) =>
                      prev.map((x) => (x.id === updated.id ? updated : x)),
                    );
                  setEditingId(null);
                }}
              />
            ) : (
              <div key={s.id} className="flex items-center gap-3 p-3 text-sm">
                <div className="flex-1 font-medium">{s.name}</div>
                <button
                  onClick={() => toggleActive(s)}
                  className={
                    s.active
                      ? "rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700 dark:bg-green-900/30 dark:text-green-400"
                      : "rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground"
                  }
                >
                  {s.active ? "Aktif" : "Pasif"}
                </button>
                <button
                  onClick={() => setEditingId(s.id)}
                  className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                  aria-label="Düzenle"
                >
                  <Pencil className="h-4 w-4" />
                </button>
                <button
                  onClick={() => deleteStaff(s)}
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
          <StaffRowForm
            orgId={orgId}
            onDone={(created) => {
              if (created) setStaff((prev) => [...prev, created]);
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
          Çalışan ekle
        </button>
      )}
    </div>
  );
}

function StaffRowForm({
  orgId,
  staff,
  onDone,
}: {
  orgId: string;
  staff?: Staff;
  onDone: (result: Staff | null) => void;
}) {
  const router = useRouter();
  const [name, setName] = useState(staff?.name ?? "");
  const [loading, setLoading] = useState(false);

  async function save() {
    if (!name.trim()) {
      toast.error("Çalışan adı gerekli");
      return;
    }
    setLoading(true);
    const supabase = createClient();
    if (staff) {
      const { data, error } = await supabase
        .from("staff")
        .update({ name: name.trim() })
        .eq("id", staff.id)
        .select("id, name, active")
        .single();
      if (error) {
        toast.error("Güncelleme başarısız", { description: error.message });
        setLoading(false);
        return;
      }
      toast.success("Çalışan güncellendi");
      router.refresh();
      onDone(data as Staff);
    } else {
      const { data, error } = await supabase
        .from("staff")
        .insert({ name: name.trim(), organization_id: orgId })
        .select("id, name, active")
        .single();
      if (error) {
        toast.error("Ekleme başarısız", { description: error.message });
        setLoading(false);
        return;
      }
      toast.success("Çalışan eklendi");
      router.refresh();
      onDone(data as Staff);
    }
  }

  return (
    <div className="flex items-end gap-2 p-2">
      <div className="flex-1 space-y-1">
        <label className="text-xs text-muted-foreground">Çalışan adı</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Çalışan adı"
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
