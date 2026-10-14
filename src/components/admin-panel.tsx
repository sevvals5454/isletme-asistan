"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Loader2, Search, Check, Lock } from "lucide-react";
import { formatTrDate } from "@/lib/time";
import { PLANS } from "@/lib/plans";

export type AdminOrg = {
  id: string;
  name: string;
  access_status: string | null;
  plan: string | null;
  trial_ends_at: string | null;
  subscription_ends_at: string | null;
  last_active_at: string | null;
  created_at: string;
};

const DURATIONS = [
  { label: "1 ay", months: 1 },
  { label: "3 ay", months: 3 },
  { label: "6 ay", months: 6 },
  { label: "1 yıl", months: 12 },
  { label: "Süresiz", months: 0 },
];

function endDateFromMonths(months: number): string | null {
  if (months <= 0) return null;
  const d = new Date();
  d.setMonth(d.getMonth() + months);
  return d.toISOString();
}

export function AdminPanel({ initialOrgs }: { initialOrgs: AdminOrg[] }) {
  const [orgs, setOrgs] = useState<AdminOrg[]>(initialOrgs);
  const [q, setQ] = useState("");

  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return orgs;
    return orgs.filter((o) => o.name.toLowerCase().includes(t));
  }, [orgs, q]);

  function applyLocal(id: string, patch: Partial<AdminOrg>) {
    setOrgs((prev) => prev.map((o) => (o.id === id ? { ...o, ...patch } : o)));
  }

  const activeCount = orgs.filter((o) => o.access_status === "active").length;
  const trialCount = orgs.filter((o) => o.access_status === "trial").length;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="İşletme ara…"
            className="w-full rounded-lg border bg-background py-2 pl-9 pr-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </div>
        <div className="text-xs text-muted-foreground">
          Toplam {orgs.length} · Aktif {activeCount} · Deneme {trialCount}
        </div>
      </div>

      <div className="space-y-3">
        {filtered.map((o) => (
          <OrgCard key={o.id} org={o} onApply={applyLocal} />
        ))}
        {filtered.length === 0 && (
          <p className="py-8 text-center text-sm text-muted-foreground">
            Eşleşen işletme yok.
          </p>
        )}
      </div>
    </div>
  );
}

function statusBadge(status: string | null) {
  if (status === "active")
    return "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400";
  if (status === "trial")
    return "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400";
  return "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400";
}

function OrgCard({
  org,
  onApply,
}: {
  org: AdminOrg;
  onApply: (id: string, patch: Partial<AdminOrg>) => void;
}) {
  const [plan, setPlan] = useState<string>(org.plan ?? "pro");
  const [months, setMonths] = useState<number>(1);
  const [busy, setBusy] = useState<"" | "activate" | "lock">("");

  async function send(
    body: Record<string, unknown>,
    patch: Partial<AdminOrg>,
    which: "activate" | "lock",
  ) {
    setBusy(which);
    try {
      const res = await fetch("/api/admin/update", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ orgId: org.id, ...body }),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (!data.ok) {
        toast.error("Güncellenemedi", { description: data.error });
        return;
      }
      onApply(org.id, patch);
      toast.success("Güncellendi");
    } catch {
      toast.error("Güncellenemedi");
    } finally {
      setBusy("");
    }
  }

  function activate() {
    const ends = endDateFromMonths(months);
    send(
      { access_status: "active", plan, subscription_ends_at: ends },
      { access_status: "active", plan, subscription_ends_at: ends },
      "activate",
    );
  }

  function lock() {
    send(
      { access_status: "blocked", subscription_ends_at: null },
      { access_status: "blocked", subscription_ends_at: null },
      "lock",
    );
  }

  const planName = PLANS.find((p) => p.id === org.plan)?.name ?? org.plan ?? "—";

  return (
    <div className="rounded-xl border bg-card p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="truncate font-medium">{org.name}</span>
            <span
              className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${statusBadge(
                org.access_status,
              )}`}
            >
              {org.access_status ?? "—"}
            </span>
          </div>
          <div className="mt-0.5 text-xs text-muted-foreground">
            Paket: {planName}
            {org.subscription_ends_at
              ? ` · Bitiş: ${formatTrDate(org.subscription_ends_at)}`
              : org.access_status === "trial" && org.trial_ends_at
                ? ` · Deneme: ${formatTrDate(org.trial_ends_at)}`
                : ""}
            {org.last_active_at
              ? ` · Son giriş: ${formatTrDate(org.last_active_at)}`
              : ""}
          </div>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <select
          value={plan}
          onChange={(e) => setPlan(e.target.value)}
          className="rounded-lg border bg-background px-2 py-1.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {PLANS.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
        <select
          value={months}
          onChange={(e) => setMonths(Number(e.target.value))}
          className="rounded-lg border bg-background px-2 py-1.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {DURATIONS.map((d) => (
            <option key={d.label} value={d.months}>
              {d.label}
            </option>
          ))}
        </select>
        <button
          onClick={activate}
          disabled={busy !== ""}
          className="inline-flex items-center gap-1.5 rounded-lg bg-green-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
        >
          {busy === "activate" ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Check className="h-4 w-4" />
          )}
          Aktive et
        </button>
        <button
          onClick={lock}
          disabled={busy !== ""}
          className="inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm font-medium hover:bg-muted disabled:opacity-50"
        >
          {busy === "lock" ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Lock className="h-4 w-4" />
          )}
          Kilitle
        </button>
      </div>
    </div>
  );
}
