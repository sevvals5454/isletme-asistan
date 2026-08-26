import {
  Wallet,
  CalendarCheck,
  Percent,
  UserX,
  Scissors,
  Users,
  Banknote,
  TrendingDown,
  Scale,
} from "lucide-react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getUserRole } from "@/lib/roles";
import { type AppointmentStatus, formatPrice } from "@/lib/appointments";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { TR_TZ, trMonthStart } from "@/lib/time";

type Row = {
  status: AppointmentStatus;
  price: number | null;
  start_at: string;
  services: { name: string } | null;
  customers: { name: string } | null;
  staff: { name: string } | null;
};

type PackageRow = {
  type: "session" | "monthly";
  price: number | null;
  purchased_at: string;
  expires_at: string | null;
  services: { name: string } | null;
};

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ ym?: string }>;
}) {
  if ((await getUserRole()) !== "owner") redirect("/dashboard");
  const { ym } = await searchParams;
  const supabase = await createClient();

  const [
    { data },
    { data: packageData },
    { data: paymentData },
    { data: expenseData },
  ] = await Promise.all([
      supabase
        .from("appointments")
        .select(
          "status, price, start_at, services(name), customers(name), staff(name)",
        ),
      supabase
        .from("customer_packages")
        .select("type, price, purchased_at, expires_at, services(name)"),
      supabase.from("payments").select("amount, paid_at"),
      supabase.from("expenses").select("amount, spent_at"),
    ]);

  const rows = (data ?? []) as unknown as Row[];
  const packageRows = (packageData ?? []) as unknown as PackageRow[];
  const paymentRows = (paymentData ?? []) as { amount: number; paid_at: string }[];
  const expenseRows = (expenseData ?? []) as {
    amount: number;
    spent_at: string;
  }[];

  const now = new Date();
  // Seçili ay: ?ym=YYYY-MM (yoksa içinde bulunulan Türkiye ayı).
  const curYm = new Intl.DateTimeFormat("en-CA", {
    timeZone: TR_TZ,
    year: "numeric",
    month: "2-digit",
  }).format(now); // "YYYY-MM"
  const activeYm = ym && /^\d{4}-\d{2}$/.test(ym) ? ym : curYm;
  const year = Number(activeYm.slice(0, 4));
  const month0 = Number(activeYm.slice(5, 7)) - 1;

  const monthStart = trMonthStart(year, month0);
  const nextMonthStart = trMonthStart(year, month0 + 1);
  const prevYm = new Date(Date.UTC(year, month0 - 1, 1))
    .toISOString()
    .slice(0, 7);
  const nextYm = new Date(Date.UTC(year, month0 + 1, 1))
    .toISOString()
    .slice(0, 7);

  const thisMonth = rows.filter((r) => {
    const d = new Date(r.start_at);
    return d >= monthStart && d < nextMonthStart;
  });

  // Bu ay satılan SEANS paketleri (satış anı = gelir). Paketli seanslar 0₺
  // olduğu için tek tek randevulardan ayrıca sayılmaz — çifte sayma olmaz.
  const monthSessionSales = packageRows
    .filter((p) => p.type !== "monthly")
    .filter((p) => {
      const d = new Date(p.purchased_at);
      return d >= monthStart && d < nextMonthStart;
    })
    .reduce((s, p) => s + (p.price ?? 0), 0);

  // Aylık üyelik aidatları: aktif (süresi dolmamış) üyeliklerin bu ayki ücreti.
  const monthlyMembershipFees = packageRows
    .filter((p) => p.type === "monthly")
    .filter((p) => !p.expires_at || new Date(p.expires_at) >= monthStart)
    .reduce((s, p) => s + (p.price ?? 0), 0);

  const monthRevenue =
    thisMonth
      .filter((r) => r.status === "completed")
      .reduce((s, r) => s + (r.price ?? 0), 0) +
    monthSessionSales +
    monthlyMembershipFees;
  const monthCount = thisMonth.length;

  // Bu ay fiilen tahsil edilen (ödeme defteri). Gelir tahmininden ayrı metrik.
  const monthCollected = paymentRows
    .filter((p) => {
      const d = new Date(p.paid_at);
      return d >= monthStart && d < nextMonthStart;
    })
    .reduce((s, p) => s + (p.amount ?? 0), 0);

  // Bu ay gider + net (gelir tahmini - gider).
  const monthExpenses = expenseRows
    .filter((e) => {
      const d = new Date(e.spent_at);
      return d >= monthStart && d < nextMonthStart;
    })
    .reduce((s, e) => s + (e.amount ?? 0), 0);
  const monthNet = monthRevenue - monthExpenses;
  const monthCompleted = thisMonth.filter(
    (r) => r.status === "completed",
  ).length;
  const monthNoShow = thisMonth.filter((r) => r.status === "no_show").length;
  const completionRate =
    monthCount > 0 ? Math.round((monthCompleted / monthCount) * 100) : 0;

  // En çok kazandıran hizmetler: tamamlanan randevu gelirleri + paket satışları.
  // (Paketli seanslar 0₺ olduğu için gelir paket satışından gelir.)
  const serviceRevenue = new Map<string, number>();
  for (const r of rows) {
    if (r.status !== "completed") continue;
    const name = r.services?.name ?? "Hizmet belirtilmedi";
    serviceRevenue.set(name, (serviceRevenue.get(name) ?? 0) + (r.price ?? 0));
  }
  for (const p of packageRows) {
    const name = p.services?.name ?? "Paket (genel)";
    serviceRevenue.set(name, (serviceRevenue.get(name) ?? 0) + (p.price ?? 0));
  }
  const topServices = [...serviceRevenue.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  // En sadık müşteriler (randevu sayısına göre, iptal hariç)
  const customerVisits = new Map<string, number>();
  for (const r of rows) {
    if (r.status === "cancelled") continue;
    const name = r.customers?.name;
    if (!name) continue;
    customerVisits.set(name, (customerVisits.get(name) ?? 0) + 1);
  }
  const topCustomers = [...customerVisits.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  // Çalışan performansı (bu ay): randevu sayısı (iptal hariç) + gelir (tamamlanan)
  const staffStats = new Map<string, { count: number; revenue: number }>();
  for (const r of thisMonth) {
    const name = r.staff?.name;
    if (!name) continue;
    const s = staffStats.get(name) ?? { count: 0, revenue: 0 };
    if (r.status !== "cancelled") s.count += 1;
    if (r.status === "completed") s.revenue += r.price ?? 0;
    staffStats.set(name, s);
  }
  const topStaff = [...staffStats.entries()].sort(
    (a, b) => b[1].revenue - a[1].revenue,
  );

  // Personel bordrosu (maaş + prim) — kolonlar yoksa (migration 016) boş kalır.
  let payroll: {
    name: string;
    revenue: number;
    salary: number;
    rate: number;
    commission: number;
    total: number;
  }[] = [];
  {
    const res = await supabase
      .from("staff")
      .select("name, base_salary, commission_rate");
    if (!res.error && res.data) {
      payroll = (
        res.data as {
          name: string;
          base_salary: number | null;
          commission_rate: number | null;
        }[]
      )
        .map((s) => {
          const revenue = staffStats.get(s.name)?.revenue ?? 0;
          const salary = s.base_salary ?? 0;
          const rate = s.commission_rate ?? 0;
          const commission = Math.round((revenue * rate) / 100);
          return {
            name: s.name,
            revenue,
            salary,
            rate,
            commission,
            total: salary + commission,
          };
        })
        .filter((p) => p.salary > 0 || p.rate > 0)
        .sort((a, b) => b.total - a.total);
    }
  }
  const payrollTotal = payroll.reduce((s, p) => s + p.total, 0);

  const monthLabel = new Date(Date.UTC(year, month0, 1)).toLocaleDateString(
    "tr-TR",
    { month: "long", year: "numeric", timeZone: "UTC" },
  );

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Raporlar</h1>
          <p className="text-sm text-muted-foreground">
            {monthLabel} özeti ve genel performans
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href={`/reports?ym=${prevYm}`}
            className="rounded-lg border p-1.5 hover:bg-muted"
            aria-label="Önceki ay"
          >
            <ChevronLeft className="h-4 w-4" />
          </Link>
          <div className="min-w-[130px] text-center text-sm font-medium">
            {monthLabel}
          </div>
          <Link
            href={`/reports?ym=${nextYm}`}
            className="rounded-lg border p-1.5 hover:bg-muted"
            aria-label="Sonraki ay"
          >
            <ChevronRight className="h-4 w-4" />
          </Link>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard
          icon={<Wallet className="h-5 w-5" />}
          label="Bu ay gelir (tahmini)"
          value={formatPrice(monthRevenue)}
        />
        <StatCard
          icon={<Banknote className="h-5 w-5" />}
          label="Bu ay tahsilat (defter)"
          value={formatPrice(monthCollected)}
        />
        <StatCard
          icon={<TrendingDown className="h-5 w-5" />}
          label="Bu ay gider"
          value={formatPrice(monthExpenses)}
        />
        <StatCard
          icon={<Scale className="h-5 w-5" />}
          label="Net (gelir − gider)"
          value={formatPrice(monthNet)}
        />
        <StatCard
          icon={<CalendarCheck className="h-5 w-5" />}
          label="Bu ay randevu"
          value={monthCount}
        />
        <StatCard
          icon={<Percent className="h-5 w-5" />}
          label="Tamamlanma oranı"
          value={`%${completionRate}`}
        />
        <StatCard
          icon={<UserX className="h-5 w-5" />}
          label="Gelmeyen (bu ay)"
          value={monthNoShow}
        />
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <div className="rounded-xl border bg-card p-6">
          <div className="mb-4 flex items-center gap-2">
            <Scissors className="h-4 w-4" />
            <h2 className="font-semibold">En çok kazandıran hizmetler</h2>
          </div>
          {topServices.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              Henüz tamamlanmış randevu yok.
            </p>
          ) : (
            <ul className="space-y-2">
              {topServices.map(([name, revenue]) => (
                <li
                  key={name}
                  className="flex items-center justify-between gap-3 text-sm"
                >
                  <span className="truncate">{name}</span>
                  <span className="shrink-0 font-medium">
                    {formatPrice(revenue)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="rounded-xl border bg-card p-6">
          <div className="mb-4 flex items-center gap-2">
            <Users className="h-4 w-4" />
            <h2 className="font-semibold">En sadık müşteriler</h2>
          </div>
          {topCustomers.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              Henüz randevu kaydı yok.
            </p>
          ) : (
            <ul className="space-y-2">
              {topCustomers.map(([name, visits]) => (
                <li
                  key={name}
                  className="flex items-center justify-between gap-3 text-sm"
                >
                  <span className="truncate">{name}</span>
                  <span className="shrink-0 text-muted-foreground">
                    {visits} randevu
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {topStaff.length > 0 && (
        <div className="rounded-xl border bg-card p-6">
          <div className="mb-4 flex items-center gap-2">
            <Users className="h-4 w-4" />
            <h2 className="font-semibold">Çalışan performansı ({monthLabel})</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[360px] text-sm">
              <thead className="border-b text-left text-xs text-muted-foreground">
                <tr>
                  <th className="py-2 font-medium">Çalışan</th>
                  <th className="py-2 font-medium">Randevu</th>
                  <th className="py-2 text-right font-medium">Gelir</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {topStaff.map(([name, s]) => (
                  <tr key={name}>
                    <td className="py-2 font-medium">{name}</td>
                    <td className="py-2 text-muted-foreground">{s.count}</td>
                    <td className="py-2 text-right font-medium">
                      {formatPrice(s.revenue)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {payroll.length > 0 && (
        <div className="rounded-xl border bg-card p-6">
          <div className="mb-1 flex items-center gap-2">
            <Banknote className="h-4 w-4" />
            <h2 className="font-semibold">Personel bordrosu ({monthLabel})</h2>
          </div>
          <p className="mb-4 text-sm text-muted-foreground">
            Maaş + prim (primi olanlar için: getirdiği tamamlanan randevu
            gelirinin %&apos;si)
          </p>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[460px] text-sm">
              <thead className="border-b text-left text-xs text-muted-foreground">
                <tr>
                  <th className="py-2 pr-3 font-medium">Çalışan</th>
                  <th className="py-2 pr-3 font-medium">Gelir</th>
                  <th className="py-2 pr-3 font-medium">Prim</th>
                  <th className="py-2 pr-3 font-medium">Maaş</th>
                  <th className="py-2 text-right font-medium">Toplam</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {payroll.map((p) => (
                  <tr key={p.name}>
                    <td className="py-2 pr-3 font-medium">{p.name}</td>
                    <td className="py-2 pr-3 text-muted-foreground">
                      {formatPrice(p.revenue)}
                    </td>
                    <td className="py-2 pr-3 text-muted-foreground">
                      {p.rate > 0
                        ? `${formatPrice(p.commission)} (%${p.rate})`
                        : "—"}
                    </td>
                    <td className="py-2 pr-3 text-muted-foreground">
                      {p.salary > 0 ? formatPrice(p.salary) : "—"}
                    </td>
                    <td className="py-2 text-right font-semibold">
                      {formatPrice(p.total)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="border-t">
                <tr>
                  <td className="py-2 pr-3 font-medium" colSpan={4}>
                    Toplam ödenecek
                  </td>
                  <td className="py-2 text-right font-bold text-primary">
                    {formatPrice(payrollTotal)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
}) {
  return (
    <div className="rounded-xl border bg-card p-6">
      <div className="mb-3 inline-flex h-9 w-9 items-center justify-center rounded-lg bg-muted text-muted-foreground">
        {icon}
      </div>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="text-2xl font-semibold">{value}</div>
    </div>
  );
}
