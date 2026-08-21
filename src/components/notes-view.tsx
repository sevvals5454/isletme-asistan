"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Loader2,
  Plus,
  Trash2,
  Pencil,
  Check,
  X,
  CalendarClock,
} from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { formatTrDate, formatTrTime, trDateKey } from "@/lib/time";

export type Note = {
  id: string;
  content: string;
  created_at: string;
  remind_at?: string | null;
};

export function NotesView({
  orgId,
  initialNotes,
}: {
  orgId: string;
  initialNotes: Note[];
}) {
  const router = useRouter();
  const [notes, setNotes] = useState<Note[]>(initialNotes);
  const [draft, setDraft] = useState("");
  const [remindDate, setRemindDate] = useState("");
  const [remindTime, setRemindTime] = useState("");
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");

  async function add() {
    const content = draft.trim();
    if (!content) return;
    setAdding(true);
    const supabase = createClient();
    const remind_at = remindDate
      ? new Date(`${remindDate}T${remindTime || "09:00"}`).toISOString()
      : null;
    const SEL = "id, content, created_at, remind_at";
    let res = await supabase
      .from("notes")
      .insert({ organization_id: orgId, content, remind_at })
      .select(SEL)
      .single();
    // migration 020 yoksa remind_at kolonu yok → tarihsiz kaydet
    if (res.error && /remind_at/i.test(res.error.message)) {
      if (remind_at)
        toast.info("Takip tarihi için güncelleme (020) gerekli; not tarihsiz kaydedildi.");
      res = await supabase
        .from("notes")
        .insert({ organization_id: orgId, content })
        .select("id, content, created_at")
        .single();
    }
    setAdding(false);
    if (res.error) {
      toast.error("Not eklenemedi", { description: res.error.message });
      return;
    }
    setNotes((prev) => [res.data as Note, ...prev]);
    setDraft("");
    setRemindDate("");
    setRemindTime("");
    router.refresh();
  }

  // Takip tarihi rozeti rengi (geçmiş=kırmızı, bugün=amber, gelecek=nötr).
  function remindBadge(iso: string) {
    const day = iso.slice(0, 10);
    const today = trDateKey(new Date());
    if (day < today)
      return "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400";
    if (day === today)
      return "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400";
    return "bg-primary/10 text-primary";
  }

  async function saveEdit(id: string) {
    const content = editText.trim();
    if (!content) return;
    const supabase = createClient();
    const { error } = await supabase
      .from("notes")
      .update({ content })
      .eq("id", id);
    if (error) {
      toast.error("Güncellenemedi", { description: error.message });
      return;
    }
    setNotes((prev) =>
      prev.map((n) => (n.id === id ? { ...n, content } : n)),
    );
    setEditingId(null);
    router.refresh();
  }

  async function remove(id: string) {
    if (!confirm("Bu notu silmek istiyor musun?")) return;
    const supabase = createClient();
    const { error } = await supabase.from("notes").delete().eq("id", id);
    if (error) {
      toast.error("Silme başarısız", { description: error.message });
      return;
    }
    setNotes((prev) => prev.filter((n) => n.id !== id));
    toast.success("Not silindi");
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Notlar</h1>
        <p className="text-sm text-muted-foreground">
          Randevusuz görüşmeler, işletmeyi görmeye gelenler, hatırlatmalar — hızlıca
          not al
        </p>
      </div>

      {/* Yeni not */}
      <div className="rounded-xl border bg-card p-4">
        <textarea
          rows={3}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Örn. Ayşe Hanım bugün uğradı, salonu görmek istedi, fiyat sordu — Cuma tekrar gelecek."
          className="w-full resize-none rounded-lg border bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
        <div className="mt-2 flex flex-wrap items-end justify-between gap-3">
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">
              Takip / hatırlatma tarihi (opsiyonel)
            </label>
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={remindDate}
                onChange={(e) => setRemindDate(e.target.value)}
                className="rounded-lg border bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
              <input
                type="time"
                value={remindTime}
                onChange={(e) => setRemindTime(e.target.value)}
                disabled={!remindDate}
                className="rounded-lg border bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
              />
            </div>
          </div>
          <button
            onClick={add}
            disabled={adding || !draft.trim()}
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
          >
            {adding ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Plus className="h-4 w-4" />
            )}
            Not ekle
          </button>
        </div>
      </div>

      {/* Liste */}
      {notes.length === 0 ? (
        <div className="rounded-xl border bg-card p-12 text-center text-sm text-muted-foreground">
          Henüz not yok. Yukarıdan ilk notunu ekle.
        </div>
      ) : (
        <ul className="space-y-3">
          {notes.map((n) => (
            <li key={n.id} className="rounded-xl border bg-card p-4">
              {editingId === n.id ? (
                <div className="space-y-2">
                  <textarea
                    rows={3}
                    value={editText}
                    onChange={(e) => setEditText(e.target.value)}
                    className="w-full resize-none rounded-lg border bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  />
                  <div className="flex justify-end gap-2">
                    <button
                      onClick={() => setEditingId(null)}
                      className="inline-flex items-center gap-1 rounded-lg border px-3 py-1.5 text-xs hover:bg-muted"
                    >
                      <X className="h-3.5 w-3.5" />
                      Vazgeç
                    </button>
                    <button
                      onClick={() => saveEdit(n.id)}
                      className="inline-flex items-center gap-1 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:opacity-90"
                    >
                      <Check className="h-3.5 w-3.5" />
                      Kaydet
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="whitespace-pre-wrap text-sm">{n.content}</p>
                    <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                      <span>
                        {formatTrDate(n.created_at)} · {formatTrTime(n.created_at)}
                      </span>
                      {n.remind_at && (
                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-medium ${remindBadge(n.remind_at)}`}
                        >
                          <CalendarClock className="h-3 w-3" />
                          Takip: {formatTrDate(n.remind_at)}{" "}
                          {formatTrTime(n.remind_at)}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    <button
                      onClick={() => {
                        setEditingId(n.id);
                        setEditText(n.content);
                      }}
                      className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                      aria-label="Düzenle"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => remove(n.id)}
                      className="rounded-md p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                      aria-label="Sil"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
