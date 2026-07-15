"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus, Trash2, Check, X, Pencil } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { formatPrice } from "@/lib/appointments";
import { formatTrDate } from "@/lib/time";
import {
  type Payment,
  type PaymentMethod,
  PAYMENT_METHOD_LABELS,
} from "@/lib/payments";

export function CustomerPayments({
  orgId,
  customerId,
  initialPayments,
}: {
  orgId: string;
  customerId: string;
  initialPayments: Payment[];
}) {
  const router = useRouter();
  const [payments, setPayments] = useState<Payment[]>(initialPayments);
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<Payment | null>(null);

  const total = payments.reduce((s, p) => s + p.amount, 0);

  async function remove(p: Payment) {
    if (!confirm("Bu ödeme kaydını silmek istiyor musun?")) return;
    const supabase = createClient();
    const { error } = await supabase.from("payments").delete().eq("id", p.id);
    if (error) {
      toast.error("Silme başarısız", { description: error.message });
      return;
    }
    setPayments((prev) => prev.filter((x) => x.id !== p.id));
    toast.success("Ödeme silindi");
    router.refresh();
  }

  return (
    <div className="space-y-4">
      {payments.length > 0 && (
        <>
          <div className="text-sm text-muted-foreground">
            Toplam tahsilat:{" "}
            <span className="font-semibold text-foreground">
              {formatPrice(total)}
            </span>
          </div>
          <ul className="space-y-2">
            {payments.map((p) => (
              <li
                key={p.id}
                className="flex items-center justify-between gap-3 rounded-lg border p-3 text-sm"
              >
                <div className="min-w-0">
                  <div className="font-medium">{formatPrice(p.amount)}</div>
                  <div className="truncate text-xs text-muted-foreground">
                    {PAYMENT_METHOD_LABELS[p.method]} · {formatTrDate(p.paid_at)}
                    {p.note ? ` · ${p.note}` : ""}
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <button
                    onClick={() => {
                      setEditing(p);
                      setAdding(false);
                    }}
                    className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                    aria-label="Düzenle"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => remove(p)}
                    className="rounded-md p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                    aria-label="Sil"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </>
      )}

      {adding || editing ? (
        <div className="rounded-lg border p-1">
          <PaymentForm
            orgId={orgId}
            customerId={customerId}
            editing={editing}
            onDone={(result, mode) => {
              if (result && mode === "created")
                setPayments((prev) => [result, ...prev]);
              if (result && mode === "updated")
                setPayments((prev) =>
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
          Ödeme ekle
        </button>
      )}
    </div>
  );
}

function PaymentForm({
  orgId,
  customerId,
  editing,
  onDone,
}: {
  orgId: string;
  customerId: string;
  editing?: Payment | null;
  onDone: (result: Payment | null, mode?: "created" | "updated") => void;
}) {
  const router = useRouter();
  const isEdit = !!editing;
  const [amount, setAmount] = useState(
    editing ? String(editing.amount) : "",
  );
  const [method, setMethod] = useState<PaymentMethod>(editing?.method ?? "cash");
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
    const payload = { amount: amt, method, note: note.trim() || null };

    if (isEdit && editing) {
      const { data, error } = await supabase
        .from("payments")
        .update(payload)
        .eq("id", editing.id)
        .select("id, customer_id, amount, method, note, paid_at")
        .single();
      if (error) {
        toast.error("Güncellenemedi", { description: error.message });
        setLoading(false);
        return;
      }
      toast.success("Ödeme güncellendi");
      router.refresh();
      onDone(data as Payment, "updated");
      return;
    }

    const { data, error } = await supabase
      .from("payments")
      .insert({ organization_id: orgId, customer_id: customerId, ...payload })
      .select("id, customer_id, amount, method, note, paid_at")
      .single();
    if (error) {
      toast.error("Eklenemedi", { description: error.message });
      setLoading(false);
      return;
    }
    toast.success("Ödeme eklendi");
    router.refresh();
    onDone(data as Payment, "created");
  }

  return (
    <div className="space-y-3 p-2">
      <div className="grid grid-cols-2 gap-3">
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
          <label className="text-xs text-muted-foreground">Yöntem</label>
          <select
            value={method}
            onChange={(e) => setMethod(e.target.value as PaymentMethod)}
            className="w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {(Object.keys(PAYMENT_METHOD_LABELS) as PaymentMethod[]).map((m) => (
              <option key={m} value={m}>
                {PAYMENT_METHOD_LABELS[m]}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className="space-y-1">
        <label className="text-xs text-muted-foreground">Not (opsiyonel)</label>
        <input
          type="text"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Örn. 10 seans paketi peşinatı"
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
