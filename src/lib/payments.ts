// Ödeme defteri tipleri (sektör bağımsız).

export type PaymentMethod = "cash" | "card" | "transfer" | "other";

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  cash: "Nakit",
  card: "Kart",
  transfer: "Havale/EFT",
  other: "Diğer",
};

export type Payment = {
  id: string;
  customer_id: string | null;
  amount: number;
  method: PaymentMethod;
  note: string | null;
  paid_at: string;
};
