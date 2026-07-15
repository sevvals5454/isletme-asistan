"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Loader2,
  Plus,
  Trash2,
  Check,
  X,
  TrendingDown,
  Pencil,
} from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { formatPrice } from "@/lib/appointments";
import { formatTrDate, trStartOfMonth, trAddMonths, trDateKey } from "@/lib/time";
import {
  type Expense,
  type ExpenseCategory,
  EXPENSE_CATEGORY_LABELS,
} from "@/lib/expenses";

export function ExpensesView({
  orgId,
  initialExpenses,
}: {
  orgId: string;
  initialExpenses: Expense[];
}) {
  const router = useRouter();
  const [expenses, setExpenses] = useState<Expense[]>(initialExpenses);
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<Expense | null>(null);

  const monthTotal = useMemo(() => {
    const start = trStartOfMonth();
    const end = trAddMonths(new Date(), 1);
    return expenses
      .filter((e) => {
        const d = new Date(e.spent_at);
        return d >= start && d < end;
      })
      .reduce((s, e) => s + e.amount, 0);
  }, [expenses]);

  async function remove(e: Expense) {
    if (!confirm("Bu gider kaydını silmek istiyor musun?")) return;
    const supabase = createClient();
    const { error } = await supabase.from("expenses").delete().eq("id", e.id);
    if (error) {
      toast.error("Silme başarısız", { description: error.message });
      return;
    }
    setExpenses((prev) => prev.filter((x) => x.id !== e.id));
    toast.success("Gider silindi");
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Giderler</h1>
          <p className="text-sm text-muted-foreground">
            Kira, maaş, malzeme gibi işletme giderleri
          </p>
        </div>
        <div className="rounded-xl border bg-card px-4 py-2 text-right">
          <div className="text-xs text-muted-foreground">Bu ay toplam gider</div>
          <div className="text-xl font-semibold">{formatPrice(monthTotal)}</div>
        </div>
      </div>

      {adding || editing ? (
        <div className="rounded-xl border bg-card p-2">
          <ExpenseForm
            orgId={orgId}
            editing={editing}
            onDone={(result, mode) => {
              if (result)
                setExpenses((prev) => {
                  const next =
                    mode === "updated"
                      ? prev.map((x) => (x.id === result.id ? result : x))
                      : [result, ...prev];
                  return next.sort(
                    (a, b) =>
                      new Date(b.spent_at).getTime() -
                      new Date(a.spent_at).getTime(),
                  );
                });
              setAdding(false);
              setEditing(null);
            }}
          />
        </div>
      ) : (
        <button
          onClick={() => setAdding(true)}
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
        >
          <Plus className="h-4 w-4" />
          Gider ekle
        </button>
      )}

      {expenses.length === 0 ? (
        <div className="rounded-xl border bg-card p-12 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
            <TrendingDown className="h-6 w-6 text-muted-foreground" />
          </div>
          <p className="text-sm text-muted-foreground">Henüz gider kaydı yok.</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border bg-card">
          <ul className="divide-y">
            {expenses.map((e) => (
              <li
                key={e.id}
                className="flex items-center justify-between gap-3 p-3 text-sm"
              >
                <div className="min-w-0">
                  <div className="font-medium">{formatPrice(e.amount)}</div>
                  <div className="truncate text-xs text-muted-foreground">
                    {EXPENSE_CATEGORY_LABELS[e.category]} ·{" "}
                    {formatTrDate(e.spent_at)}
                    {e.note ? ` · ${e.note}` : ""}
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <button
                    onClick={() => {
                      setEditing(e);
                      setAdding(false);
                    }}
                    className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                    aria-label="Düzenle"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => remove(e)}
                    className="rounded-md p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                    aria-label="Sil"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function ExpenseForm({
  orgId,
  editing,
  onDone,
}: {
  orgId: string;
  editing?: Expense | null;
  onDone: (result: Expense | null, mode?: "created" | "updated") => void;
}) {
  const router = useRouter();
  const isEdit = !!editing;
  const [amount, setAmount] = useState(editing ? String(editing.amount) : "");
  const [category, setCategory] = useState<ExpenseCategory>(
    editing?.category ?? "rent",
  );
  const [spentAt, setSpentAt] = useState(
    editing ? trDateKey(new Date(editing.spent_at)) : trDateKey(new Date()),
  );
  const [note, setNote] = useState(editing?.note ?? "");
  const [loading, setLoading] = useState(false);

  async function save() {
    const amt = Number(amount);
    if (!amount.trim() || isNaN(amt) || amt < 0) {
      toast.error("Geçerli bir tutar gir");
      return;
    }
    setLoading(true);
    const supabase = createClient();
    const payload = {
      amount: amt,
      category,
      note: note.trim() || null,
      spent_at: spentAt ? new Date(spentAt).toISOString() : undefined,
    };

    if (isEdit && editing) {
      const { data, error } = await supabase
        .from("expenses")
        .update(payload)
        .eq("id", editing.id)
        .select("id, amount, category, note, spent_at")
        .single();
      if (error) {
        toast.error("Güncellenemedi", { description: error.message });
        setLoading(false);
        return;
      }
      toast.success("Gider güncellendi");
      router.refresh();
      onDone(data as Expense, "updated");
      return;
    }

    const { data, error } = await supabase
      .from("expenses")
      .insert({ organization_id: orgId, ...payload })
      .select("id, amount, category, note, spent_at")
      .single();
    if (error) {
      toast.error("Eklenemedi", { description: error.message });
      setLoading(false);
      return;
    }
    toast.success("Gider eklendi");
    router.refresh();
    onDone(data as Expense, "created");
  }

  return (
    <div className="space-y-3 p-2">
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">Tutar (₺)</label>
          <input
            type="number"
            min={0}
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">Kategori</label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value as ExpenseCategory)}
            className="w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {(Object.keys(EXPENSE_CATEGORY_LABELS) as ExpenseCategory[]).map(
              (c) => (
                <option key={c} value={c}>
                  {EXPENSE_CATEGORY_LABELS[c]}
                </option>
              ),
            )}
          </select>
        </div>
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">Tarih</label>
          <input
            type="date"
            value={spentAt}
            onChange={(e) => setSpentAt(e.target.value)}
            className="w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </div>
      </div>
      <div className="space-y-1">
        <label className="text-xs text-muted-foreground">Not (opsiyonel)</label>
        <input
          type="text"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Örn. Haziran kirası"
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
          {isEdit ? "Güncelle" : "Kaydet"}
        </button>
      </div>
    </div>
  );
}
