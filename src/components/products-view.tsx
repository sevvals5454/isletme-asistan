"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Loader2,
  Plus,
  Trash2,
  Check,
  X,
  Package,
  ShoppingCart,
  Pencil,
  AlertTriangle,
} from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { formatPrice } from "@/lib/appointments";
import { formatTrDate, trStartOfMonth, trAddMonths } from "@/lib/time";
import { type Product, type ProductSale, isLowStock } from "@/lib/products";

type Option = { id: string; name: string };

export function ProductsView({
  orgId,
  initialProducts,
  initialSales,
  customers,
  staff,
}: {
  orgId: string;
  initialProducts: Product[];
  initialSales: ProductSale[];
  customers: Option[];
  staff: Option[];
}) {
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>(initialProducts);
  const [sales, setSales] = useState<ProductSale[]>(initialSales);
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [selling, setSelling] = useState<Product | null>(null);

  const monthSales = useMemo(() => {
    const start = trStartOfMonth();
    const end = trAddMonths(new Date(), 1);
    return sales
      .filter((s) => {
        const d = new Date(s.sold_at);
        return d >= start && d < end;
      })
      .reduce((sum, s) => sum + s.total, 0);
  }, [sales]);

  const lowStockCount = products.filter(
    (p) => p.active && isLowStock(p),
  ).length;

  async function removeProduct(p: Product) {
    if (
      !confirm(
        `"${p.name}" ürününü silmek istiyor musun? (Satış geçmişi korunur.)`,
      )
    )
      return;
    const supabase = createClient();
    const { error } = await supabase.from("products").delete().eq("id", p.id);
    if (error) {
      toast.error("Silinemedi", { description: error.message });
      return;
    }
    setProducts((prev) => prev.filter((x) => x.id !== p.id));
    toast.success("Ürün silindi");
    router.refresh();
  }

  function onSold(sale: ProductSale, newStock: number) {
    setSales((prev) => [sale, ...prev]);
    setProducts((prev) =>
      prev.map((p) =>
        p.id === sale.product_id ? { ...p, stock: newStock } : p,
      ),
    );
    setSelling(null);
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Ürünler & Stok</h1>
          <p className="text-sm text-muted-foreground">
            Ürün satışı, stok takibi — satışlar gelire yazılır
          </p>
        </div>
        <div className="rounded-xl border bg-card px-4 py-2 text-right">
          <div className="text-xs text-muted-foreground">Bu ay ürün satışı</div>
          <div className="text-xl font-semibold">{formatPrice(monthSales)}</div>
        </div>
      </div>

      {lowStockCount > 0 && (
        <div className="flex items-center gap-2 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:border-amber-900/50 dark:bg-amber-900/20 dark:text-amber-300">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          {lowStockCount} üründe stok azaldı — yenilemen gerekebilir.
        </div>
      )}

      {adding || editing ? (
        <div className="rounded-xl border bg-card p-2">
          <ProductForm
            orgId={orgId}
            editing={editing}
            onDone={(result, mode) => {
              if (result)
                setProducts((prev) => {
                  const next =
                    mode === "updated"
                      ? prev.map((x) => (x.id === result.id ? result : x))
                      : [result, ...prev];
                  return next.sort((a, b) => a.name.localeCompare(b.name, "tr"));
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
          Ürün ekle
        </button>
      )}

      {/* Satış modalı */}
      {selling && (
        <SellDialog
          product={selling}
          customers={customers}
          staff={staff}
          onClose={() => setSelling(null)}
          onSold={onSold}
        />
      )}

      {/* Ürün listesi */}
      {products.length === 0 ? (
        <div className="rounded-xl border bg-card p-12 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
            <Package className="h-6 w-6 text-muted-foreground" />
          </div>
          <p className="text-sm text-muted-foreground">
            Henüz ürün yok. Satmak istediğin ürünleri ekle.
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border bg-card">
          <ul className="divide-y">
            {products.map((p) => {
              const low = isLowStock(p);
              return (
                <li
                  key={p.id}
                  className="flex items-center justify-between gap-3 p-3 text-sm"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 font-medium">
                      <span className="truncate">{p.name}</span>
                      {!p.active && (
                        <span className="rounded bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">
                          pasif
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {formatPrice(p.price)} ·{" "}
                      <span
                        className={
                          low ? "font-medium text-amber-600" : undefined
                        }
                      >
                        {p.stock} adet stok
                      </span>
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    <button
                      onClick={() => setSelling(p)}
                      disabled={p.stock < 1}
                      className="inline-flex items-center gap-1 rounded-md bg-green-600 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      <ShoppingCart className="h-3.5 w-3.5" />
                      Sat
                    </button>
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
                      onClick={() => removeProduct(p)}
                      className="rounded-md p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                      aria-label="Sil"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {/* Son satışlar */}
      {sales.length > 0 && (
        <div>
          <h2 className="mb-2 text-sm font-semibold">Son satışlar</h2>
          <div className="overflow-hidden rounded-xl border bg-card">
            <ul className="divide-y">
              {sales.slice(0, 20).map((s) => (
                <li
                  key={s.id}
                  className="flex items-center justify-between gap-3 p-3 text-sm"
                >
                  <div className="min-w-0">
                    <div className="truncate font-medium">
                      {s.product_name}
                      {s.quantity > 1 ? ` ×${s.quantity}` : ""}
                    </div>
                    <div className="truncate text-xs text-muted-foreground">
                      {formatTrDate(s.sold_at)}
                      {s.customers?.name ? ` · ${s.customers.name}` : ""}
                      {s.staff?.name ? ` · ${s.staff.name}` : ""}
                      {s.note ? ` · ${s.note}` : ""}
                    </div>
                  </div>
                  <div className="shrink-0 font-medium">
                    {formatPrice(s.total)}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}

function ProductForm({
  orgId,
  editing,
  onDone,
}: {
  orgId: string;
  editing?: Product | null;
  onDone: (result: Product | null, mode?: "created" | "updated") => void;
}) {
  const router = useRouter();
  const isEdit = !!editing;
  const [name, setName] = useState(editing?.name ?? "");
  const [price, setPrice] = useState(editing ? String(editing.price) : "");
  const [cost, setCost] = useState(
    editing?.cost != null ? String(editing.cost) : "",
  );
  const [stock, setStock] = useState(editing ? String(editing.stock) : "0");
  const [lowStockAt, setLowStockAt] = useState(
    editing ? String(editing.low_stock_at) : "0",
  );
  const [active, setActive] = useState(editing?.active ?? true);
  const [loading, setLoading] = useState(false);

  async function save() {
    if (!name.trim()) {
      toast.error("Ürün adı gerekli");
      return;
    }
    const priceNum = Number(price || 0);
    if (isNaN(priceNum) || priceNum < 0) {
      toast.error("Geçerli bir fiyat gir");
      return;
    }
    setLoading(true);
    const supabase = createClient();
    const payload = {
      name: name.trim(),
      price: priceNum,
      cost: cost.trim() ? Number(cost) : null,
      stock: Math.max(0, Math.trunc(Number(stock || 0))),
      low_stock_at: Math.max(0, Math.trunc(Number(lowStockAt || 0))),
      active,
    };
    const sel = "id, name, price, cost, stock, low_stock_at, active";

    if (isEdit && editing) {
      const { data, error } = await supabase
        .from("products")
        .update(payload)
        .eq("id", editing.id)
        .select(sel)
        .single();
      if (error) {
        toast.error("Güncellenemedi", { description: error.message });
        setLoading(false);
        return;
      }
      toast.success("Ürün güncellendi");
      router.refresh();
      onDone(data as Product, "updated");
      return;
    }

    const { data, error } = await supabase
      .from("products")
      .insert({ organization_id: orgId, ...payload })
      .select(sel)
      .single();
    if (error) {
      toast.error("Eklenemedi", {
        description: error.message.includes("products")
          ? "Önce migration 032'yi çalıştırın."
          : error.message,
      });
      setLoading(false);
      return;
    }
    toast.success("Ürün eklendi");
    router.refresh();
    onDone(data as Product, "created");
  }

  return (
    <div className="space-y-3 p-2">
      <div className="space-y-1">
        <label className="text-xs text-muted-foreground">Ürün adı</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Örn. Protein bar"
          className="w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">Satış fiyatı (₺)</label>
          <input
            type="number"
            min={0}
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            className="w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">
            Alış maliyeti (₺, ops.)
          </label>
          <input
            type="number"
            min={0}
            value={cost}
            onChange={(e) => setCost(e.target.value)}
            className="w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">Stok adedi</label>
          <input
            type="number"
            min={0}
            value={stock}
            onChange={(e) => setStock(e.target.value)}
            className="w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">
            Az stok uyarısı
          </label>
          <input
            type="number"
            min={0}
            value={lowStockAt}
            onChange={(e) => setLowStockAt(e.target.value)}
            placeholder="0 = kapalı"
            className="w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </div>
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={active}
          onChange={(e) => setActive(e.target.checked)}
          className="h-4 w-4 rounded border"
        />
        Satışta (aktif)
      </label>
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

function SellDialog({
  product,
  customers,
  staff,
  onClose,
  onSold,
}: {
  product: Product;
  customers: Option[];
  staff: Option[];
  onClose: () => void;
  onSold: (sale: ProductSale, newStock: number) => void;
}) {
  const [quantity, setQuantity] = useState("1");
  const [customerId, setCustomerId] = useState("");
  const [staffId, setStaffId] = useState("");
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);

  const qtyNum = Math.max(1, Math.trunc(Number(quantity || 1)));
  const total = product.price * qtyNum;

  async function confirm() {
    if (qtyNum > product.stock) {
      toast.error(`Yetersiz stok (kalan: ${product.stock})`);
      return;
    }
    setLoading(true);
    const supabase = createClient();
    const { data, error } = await supabase.rpc("sell_product", {
      p_product_id: product.id,
      p_quantity: qtyNum,
      p_customer_id: customerId || null,
      p_staff_id: staffId || null,
      p_note: note.trim() || null,
    });
    setLoading(false);
    const res = data as
      | { ok: boolean; error?: string; sale_id?: string; stock?: number }
      | null;
    if (error || !res?.ok) {
      toast.error("Satış kaydedilemedi", {
        description: res?.error ?? error?.message,
      });
      return;
    }
    const cust = customers.find((c) => c.id === customerId);
    const stf = staff.find((s) => s.id === staffId);
    const sale: ProductSale = {
      id: res.sale_id ?? crypto.randomUUID(),
      product_id: product.id,
      product_name: product.name,
      customer_id: customerId || null,
      staff_id: staffId || null,
      quantity: qtyNum,
      unit_price: product.price,
      total,
      note: note.trim() || null,
      sold_at: new Date().toISOString(),
      customers: cust ? { name: cust.name } : null,
      staff: stf ? { name: stf.name } : null,
    };
    toast.success("Satış kaydedildi");
    onSold(sale, res.stock ?? product.stock - qtyNum);
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm rounded-2xl border bg-card p-5 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-semibold">Satış: {product.name}</h2>
          <button
            onClick={onClose}
            className="rounded-md p-1 text-muted-foreground hover:bg-muted"
            aria-label="Kapat"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="space-y-3">
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">
              Adet (stok: {product.stock})
            </label>
            <input
              type="number"
              min={1}
              max={product.stock}
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              className="w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">
              Müşteri (opsiyonel)
            </label>
            <select
              value={customerId}
              onChange={(e) => setCustomerId(e.target.value)}
              className="w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <option value="">— Seçilmedi —</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          {staff.length > 0 && (
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">
                Satan (opsiyonel)
              </label>
              <select
                value={staffId}
                onChange={(e) => setStaffId(e.target.value)}
                className="w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <option value="">— Seçilmedi —</option>
                {staff.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
          )}
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">
              Not (opsiyonel)
            </label>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>
          <div className="flex items-center justify-between rounded-lg bg-muted/50 px-3 py-2 text-sm">
            <span className="text-muted-foreground">Toplam</span>
            <span className="font-semibold">{formatPrice(total)}</span>
          </div>
          <button
            onClick={confirm}
            disabled={loading || qtyNum > product.stock}
            className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-green-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <ShoppingCart className="h-4 w-4" />
            )}
            Satışı kaydet
          </button>
        </div>
      </div>
    </div>
  );
}
