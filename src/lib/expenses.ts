// Gider defteri tipleri (sektör bağımsız).

export type ExpenseCategory =
  | "rent"
  | "salary"
  | "supplies"
  | "bills"
  | "other";

export const EXPENSE_CATEGORY_LABELS: Record<ExpenseCategory, string> = {
  rent: "Kira",
  salary: "Maaş",
  supplies: "Malzeme",
  bills: "Fatura",
  other: "Diğer",
};

export type Expense = {
  id: string;
  amount: number;
  category: ExpenseCategory;
  note: string | null;
  spent_at: string;
};
