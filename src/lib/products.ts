// Ürün / stok satış takibi tipleri (sektör bağımsız).

export type Product = {
  id: string;
  name: string;
  price: number;
  cost: number | null;
  stock: number;
  low_stock_at: number;
  active: boolean;
};

export type ProductSale = {
  id: string;
  product_id: string | null;
  product_name: string;
  customer_id: string | null;
  staff_id: string | null;
  quantity: number;
  unit_price: number;
  total: number;
  note: string | null;
  sold_at: string;
  customers?: { name: string } | null;
  staff?: { name: string } | null;
};

/** Stok, düşük stok eşiğinin altında mı? (eşik 0 = uyarı kapalı) */
export function isLowStock(p: Pick<Product, "stock" | "low_stock_at">): boolean {
  return p.low_stock_at > 0 && p.stock <= p.low_stock_at;
}
