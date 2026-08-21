"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus, Trash2, Pencil, Check, X } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { formatTrDate, formatTrTime } from "@/lib/time";

export type Note = { id: string; content: string; created_at: string };

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
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");

  async function add() {
    const content = draft.trim();
    if (!content) return;
    setAdding(true);
    const supabase = createClient();
    const { data, error } = await supabase
      .from("notes")
      .insert({ organization_id: orgId, content })
      .select("id, content, created_at")
      .single();
    setAdding(false);
    if (error) {
      toast.error("Not eklenemedi", { description: error.message });
      return;
    }
    setNotes((prev) => [data as Note, ...prev]);
    setDraft("");
    router.refresh();
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
        <div className="mt-2 flex justify-end">
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
                    <p className="mt-2 text-xs text-muted-foreground">
                      {formatTrDate(n.created_at)} · {formatTrTime(n.created_at)}
                    </p>
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
