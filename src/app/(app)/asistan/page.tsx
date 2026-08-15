import {
  Sparkles,
  UserMinus,
  Info,
  Wallet,
  Scissors,
  Package,
  TrendingUp,
  TrendingDown,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import {
  analyzeChurn,
  analyzeRevenue,
  analyzeServices,
} from "@/lib/insights";
import {
  type CustomerPackage,
  withUsage,
  remainingSessions,
} from "@/lib/packages";
import { formatPrice } from "@/lib/appointments";
import { ChurnList } from "@/components/insights/churn-list";
import {
  PackageList,
  type EndingPackage,
} from "@/components/insights/package-list";

export const metadata = { title: "Akıllı Asistan — TechİŞ" };

function NoData({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2 rounded-lg bg-muted/50 p-4 text-sm text-muted-foreground">
      <Info className="mt-0.5 h-4 w-4 shrink-0" />
      <span>{children}</span>
    </div>
  );
}

export default async function AsistanPage() {
  const supabase = await createClient();
  const now = new Date();

  const [
    { data: customers },
    { data: appointments },
    { data: packages },
    { data: org },
    { data: orgTpl },
  ] = await Promise.all([
    supabase.from("customers").select("id, name, phone"),
    supabase
      .from("appointments")
      .select(
        "customer_id, start_at, status, price, package_id, services(name)",
      ),
    supabase
      .from("customer_packages")
      .select(
        "id, customer_id, service_id, name, type, total_sessions, price, purchased_at, next_payment_at, expires_at, notes, customers(name, phone)",
      ),
    supabase.from("organizations").select("name").single(),
    supabase.from("organizations").select("message_templates").single(),
  ]);

  const templates =
    (orgTpl as { message_templates?: Record<string, string> | null } | null)
      ?.message_templates ?? null;
  const orgName = org?.name ?? "";
  const appts = (appointments ?? []) as never[];

  // --- Analizler ---
  const churn = analyzeChurn({
    now,
    customers: (customers ?? []) as {
      id: string;
      name: string;
      phone: string | null;
    }[],
    appointments: appts,
    packages: (packages ?? []) as never,
  });

  const revenue = analyzeRevenue({
    now,
    appointments: appts,
    packages: (packages ?? []) as never,
  });
  const services = analyzeServices({ now, appointments: appts });

  // --- Paket bitiş: kullanım + son kullanım hesapla ---
  const usedByPkg = new Map<string, number>();
  const lastUseByPkg = new Map<string, string>();
  for (const a of (appointments ?? []) as {
    package_id: string | null;
    status: string;
    start_at: string;
  }[]) {
    if (!a.package_id || a.status !== "completed") continue;
    usedByPkg.set(a.package_id, (usedByPkg.get(a.package_id) ?? 0) + 1);
    const cur = lastUseByPkg.get(a.package_id);
    if (!cur || new Date(cur) < new Date(a.start_at))
      lastUseByPkg.set(a.package_id, a.start_at);
  }
  const enriched = withUsage(
    (packages ?? []) as unknown as CustomerPackage[],
    usedByPkg,
  );
  const endingPackages: EndingPackage[] = enriched
    .filter((p) => p.type === "session")
    .map((p) => ({ p, remaining: remainingSessions(p) }))
    .filter((x) => x.remaining > 0 && x.remaining <= 2)
    .sort((a, b) => a.remaining - b.remaining)
    .map(({ p, remaining }) => {
      const cust = (p as unknown as {
        customers: { name: string; phone: string | null } | null;
      }).customers;
      return {
        id: p.id,
        customerName: cust?.name ?? "Müşteri",
        phone: cust?.phone ?? null,
        packageName: p.name,
        remaining,
        total: p.total_sessions,
        expiresAt: p.expires_at,
        lastUse: lastUseByPkg.get(p.id) ?? null,
      };
    });

  return (
    <div className="space-y-8">
      <div>
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          <h1 className="text-2xl font-semibold">Akıllı Asistan</h1>
        </div>
        <p className="text-sm text-muted-foreground">
          İşletmenin gerçek verilerinden çıkarılan analizler ve öneriler
        </p>
      </div>

      {/* GELİR ANALİZİ */}
      <section className="rounded-xl border bg-card p-6">
        <div className="mb-1 flex items-center gap-2">
          <Wallet className="h-4 w-4" />
          <h2 className="font-semibold">Gelir analizi</h2>
        </div>
        <p className="mb-4 text-sm text-muted-foreground">
          Bu ayın gerçek gelir verisinden çıkarımlar
        </p>
        {!revenue.enough ? (
          <NoData>
            Bu ay için yeterli tamamlanmış randevu yok. Randevular tamamlandıkça
            gelir analizi burada oluşacak.
          </NoData>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-lg border p-4">
              <div className="text-xs text-muted-foreground">Bu ay gelir</div>
              <div className="mt-0.5 text-2xl font-bold text-primary">
                {formatPrice(revenue.monthRevenue)}
              </div>
              {revenue.changePct != null && (
                <div
                  className={`mt-1 inline-flex items-center gap-1 text-xs font-medium ${
                    revenue.changePct >= 0 ? "text-green-600" : "text-red-600"
                  }`}
                >
                  {revenue.changePct >= 0 ? (
                    <TrendingUp className="h-3.5 w-3.5" />
                  ) : (
                    <TrendingDown className="h-3.5 w-3.5" />
                  )}
                  Geçen aya göre %{Math.abs(Math.round(revenue.changePct))}
                  {revenue.changePct >= 0 ? " arttı" : " düştü"}
                </div>
              )}
            </div>
            {revenue.avgSpend != null && (
              <div className="rounded-lg border p-4">
                <div className="text-xs text-muted-foreground">
                  Ortalama müşteri harcaması
                </div>
                <div className="mt-0.5 text-2xl font-bold">
                  {formatPrice(revenue.avgSpend)}
                </div>
              </div>
            )}
            {revenue.topService && (
              <div className="rounded-lg border p-4">
                <div className="text-xs text-muted-foreground">
                  En çok gelir getiren hizmet
                </div>
                <div className="mt-0.5 font-semibold">
                  🏆 {revenue.topService.name}
                </div>
                <div className="text-xs text-muted-foreground">
                  {formatPrice(revenue.topService.revenue)}
                </div>
              </div>
            )}
            {revenue.bestDay && (
              <div className="rounded-lg border p-4">
                <div className="text-xs text-muted-foreground">
                  En çok gelir getiren gün
                </div>
                <div className="mt-0.5 font-semibold">
                  {revenue.bestDay.name}
                </div>
                <div className="text-xs text-muted-foreground">
                  {formatPrice(revenue.bestDay.revenue)}
                </div>
              </div>
            )}
          </div>
        )}
      </section>

      {/* HİZMET ANALİZİ */}
      <section className="rounded-xl border bg-card p-6">
        <div className="mb-1 flex items-center gap-2">
          <Scissors className="h-4 w-4" />
          <h2 className="font-semibold">Hizmet analizi</h2>
        </div>
        <p className="mb-4 text-sm text-muted-foreground">
          Hangi hizmet ne kadar tercih ediliyor, gelir getiriyor
        </p>
        {!services.enough ? (
          <NoData>
            Hizmet analizi için yeterli tamamlanmış randevu yok.
          </NoData>
        ) : (
          <div className="space-y-3">
            <div className="flex flex-wrap gap-3 text-sm">
              {services.top && (
                <div className="rounded-lg bg-green-50 px-3 py-2 text-green-700 dark:bg-green-900/20 dark:text-green-400">
                  🏆 En çok tercih edilen: <strong>{services.top.name}</strong> (
                  {services.top.count} işlem)
                </div>
              )}
              {services.bottom && (
                <div className="rounded-lg bg-amber-50 px-3 py-2 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400">
                  ⚠️ En az tercih edilen:{" "}
                  <strong>{services.bottom.name}</strong> ({services.bottom.count}{" "}
                  işlem)
                </div>
              )}
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[420px] text-sm">
                <thead>
                  <tr className="border-b text-left text-xs text-muted-foreground">
                    <th className="py-2 pr-3 font-medium">Hizmet</th>
                    <th className="py-2 pr-3 font-medium">İşlem</th>
                    <th className="py-2 pr-3 font-medium">Gelir</th>
                    <th className="py-2 pr-3 font-medium">Ort.</th>
                    <th className="py-2 font-medium">30g</th>
                  </tr>
                </thead>
                <tbody>
                  {services.services.map((s) => (
                    <tr key={s.name} className="border-b last:border-0">
                      <td className="py-2 pr-3">{s.name}</td>
                      <td className="py-2 pr-3">{s.count}</td>
                      <td className="py-2 pr-3">{formatPrice(s.revenue)}</td>
                      <td className="py-2 pr-3">{formatPrice(s.avgRevenue)}</td>
                      <td className="py-2">
                        {s.change30Pct == null ? (
                          <span className="text-muted-foreground">—</span>
                        ) : (
                          <span
                            className={
                              s.change30Pct >= 0
                                ? "text-green-600"
                                : "text-red-600"
                            }
                          >
                            {s.change30Pct >= 0 ? "▲" : "▼"} %
                            {Math.abs(s.change30Pct)}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </section>

      {/* PAKET BİTİŞ */}
      <section className="rounded-xl border bg-card p-6">
        <div className="mb-1 flex items-center gap-2">
          <Package className="h-4 w-4" />
          <h2 className="font-semibold">Paket bitiş uyarıları</h2>
        </div>
        <p className="mb-4 text-sm text-muted-foreground">
          Seansı bitmek üzere olan müşteriler — tek tıkla yenileme mesajı
        </p>
        {endingPackages.length === 0 ? (
          <NoData>Şu an bitmek üzere (≤2 seans) paket yok.</NoData>
        ) : (
          <PackageList
            items={endingPackages}
            orgName={orgName}
            templates={templates}
          />
        )}
      </section>

      {/* MÜŞTERİ KAYBI */}
      <section className="rounded-xl border bg-card p-6">
        <div className="mb-1 flex items-center gap-2">
          <UserMinus className="h-4 w-4" />
          <h2 className="font-semibold">Müşteri kaybı analizi</h2>
        </div>
        <p className="mb-4 text-sm text-muted-foreground">
          Düzenli gelirken ziyaret aralığını aşan, kaybetme riski olan müşteriler
        </p>
        {!churn.enough ? (
          <NoData>
            Bu analiz için daha fazla müşteri ve ziyaret verisine ihtiyaç var.
            Müşteriler düzenli randevu aldıkça risk analizi burada görünecek.
          </NoData>
        ) : churn.customers.length === 0 ? (
          <div className="flex items-start gap-2 rounded-lg bg-green-50 p-4 text-sm text-green-700 dark:bg-green-900/20 dark:text-green-400">
            <Info className="mt-0.5 h-4 w-4 shrink-0" />
            <span>
              Şu an kaybetme riski yüksek müşteri görünmüyor. Müşterilerin düzenli
              geliyor 👍
            </span>
          </div>
        ) : (
          <>
            <p className="mb-3 text-sm">
              <strong>{churn.customers.length}</strong> müşteri normal ziyaret
              aralığını aşmış görünüyor.
            </p>
            <ChurnList
              customers={churn.customers}
              orgName={orgName}
              templates={templates}
            />
          </>
        )}
      </section>
    </div>
  );
}
