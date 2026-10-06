"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Search, Tag, Send, X, Scale } from "lucide-react";
import { formatRelativeTime } from "@/lib/utils";
import { formatPrice } from "@/lib/appointments";

type Customer = {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  created_at: string;
  tags?: string[] | null;
  balance?: number;
};

export function CustomerList({ customers }: { customers: Customer[] }) {
  const [query, setQuery] = useState("");
  const [activeTag, setActiveTag] = useState<string | null>(null);
  const [debtorsOnly, setDebtorsOnly] = useState(false);

  // Toplam alacak (pozitif bakiyelerin toplamı) + borçlu sayısı.
  const { totalReceivable, debtorCount } = useMemo(() => {
    let total = 0,
      n = 0;
    for (const c of customers)
      if ((c.balance ?? 0) > 0) {
        total += c.balance as number;
        n++;
      }
    return { totalReceivable: total, debtorCount: n };
  }, [customers]);

  // Tüm etiketler (grup/segment) — kullanan işletmede görünür, yoksa gizli.
  const allTags = useMemo(() => {
    const set = new Set<string>();
    for (const c of customers) for (const t of c.tags ?? []) set.add(t);
    return [...set].sort((a, b) => a.localeCompare(b, "tr"));
  }, [customers]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return customers.filter((c) => {
      if (debtorsOnly && (c.balance ?? 0) <= 0) return false;
      if (activeTag && !(c.tags ?? []).includes(activeTag)) return false;
      if (!q) return true;
      return (
        c.name.toLowerCase().includes(q) ||
        (c.phone?.toLowerCase().includes(q) ?? false) ||
        (c.email?.toLowerCase().includes(q) ?? false)
      );
    });
  }, [customers, query, activeTag, debtorsOnly]);

  return (
    <div className="rounded-xl border bg-card">
      <div className="space-y-3 border-b p-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="İsim, telefon veya e-posta ile ara..."
            className="w-full rounded-lg border bg-background py-2 pl-9 pr-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </div>

        {/* Borçlular — yalnız borçlu müşteri varsa görünür */}
        {debtorCount > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-2">
            <button
              onClick={() => setDebtorsOnly((v) => !v)}
              className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium transition-colors ${
                debtorsOnly
                  ? "bg-amber-500 text-white"
                  : "border border-amber-300 text-amber-700 hover:bg-amber-50 dark:text-amber-400 dark:hover:bg-amber-900/20"
              }`}
            >
              <Scale className="h-3.5 w-3.5" />
              Borçlular ({debtorCount})
            </button>
            <span className="text-xs text-muted-foreground">
              Toplam alacak:{" "}
              <strong className="text-amber-700 dark:text-amber-400">
                {formatPrice(totalReceivable)}
              </strong>
            </span>
          </div>
        )}

        {/* Etiket (grup) filtreleri — yalnız etiket varsa görünür */}
        {allTags.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              onClick={() => setActiveTag(null)}
              className={`rounded-full px-2.5 py-1 text-xs font-medium transition-colors ${
                activeTag === null
                  ? "bg-primary text-primary-foreground"
                  : "border text-muted-foreground hover:bg-muted"
              }`}
            >
              Tümü ({customers.length})
            </button>
            {allTags.map((t) => {
              const count = customers.filter((c) =>
                (c.tags ?? []).includes(t),
              ).length;
              return (
                <button
                  key={t}
                  onClick={() => setActiveTag(activeTag === t ? null : t)}
                  className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium transition-colors ${
                    activeTag === t
                      ? "bg-primary text-primary-foreground"
                      : "border text-muted-foreground hover:bg-muted"
                  }`}
                >
                  <Tag className="h-3 w-3" />
                  {t} ({count})
                </button>
              );
            })}
          </div>
        )}

        {/* Seçili gruba tek tıkla mesaj */}
        {activeTag && (
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-muted/40 px-3 py-2 text-sm">
            <span className="text-muted-foreground">
              <strong className="text-foreground">{activeTag}</strong> grubunda{" "}
              {filtered.length} kişi
            </span>
            <div className="flex items-center gap-2">
              <Link
                href={`/messages/bulk?tag=${encodeURIComponent(activeTag)}`}
                className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:opacity-90"
              >
                <Send className="h-3.5 w-3.5" />
                Bu gruba mesaj gönder
              </Link>
              <button
                onClick={() => setActiveTag(null)}
                className="inline-flex items-center gap-1 rounded-lg border px-2 py-1.5 text-xs hover:bg-muted"
              >
                <X className="h-3.5 w-3.5" />
                Filtreyi kaldır
              </button>
            </div>
          </div>
        )}
      </div>

      {filtered.length === 0 ? (
        <div className="p-12 text-center text-sm text-muted-foreground">
          {activeTag
            ? `"${activeTag}" grubunda eşleşen müşteri yok`
            : `"${query}" ile eşleşen müşteri bulunamadı`}
        </div>
      ) : (
        <ul className="divide-y">
          {filtered.map((c) => (
            <li key={c.id}>
              <Link
                href={`/customers/${c.id}`}
                className="flex items-center justify-between gap-4 p-4 transition-colors hover:bg-muted/50"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-muted font-medium">
                    {c.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <div className="truncate font-medium">{c.name}</div>
                    <div className="truncate text-xs text-muted-foreground">
                      {c.phone || c.email || "İletişim bilgisi yok"}
                    </div>
                    {(c.tags?.length ?? 0) > 0 && (
                      <div className="mt-1 flex flex-wrap gap-1">
                        {c.tags!.map((t) => (
                          <span
                            key={t}
                            className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground"
                          >
                            {t}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1">
                  {(c.balance ?? 0) > 0 && (
                    <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-medium text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                      {formatPrice(c.balance as number)} borç
                    </span>
                  )}
                  <span className="text-xs text-muted-foreground">
                    {formatRelativeTime(c.created_at)}
                  </span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
