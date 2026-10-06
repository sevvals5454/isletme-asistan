import Link from "next/link";
import {
  ChevronLeft,
  Calendar,
  Package,
  RotateCcw,
  Wallet,
  Scale,
} from "lucide-react";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { CustomerForm } from "@/components/customer-form";
import { DeleteCustomerButton } from "@/components/delete-customer-button";
import { CustomerPackages } from "@/components/customer-packages";
import { CustomerMakeups } from "@/components/customer-makeups";
import { CustomerPayments } from "@/components/customer-payments";
import { type Payment } from "@/lib/payments";
import {
  type AppointmentStatus,
  STATUS_LABELS,
  STATUS_STYLES,
  formatPrice,
  formatAppointmentWhen,
} from "@/lib/appointments";
import { type CustomerPackage, type Makeup, withUsage } from "@/lib/packages";

type CustomerAppointment = {
  id: string;
  start_at: string;
  duration_min: number;
  status: AppointmentStatus;
  price: number | null;
  services: { name: string } | null;
};

export default async function CustomerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: customer } = await supabase
    .from("customers")
    .select("*")
    .eq("id", id)
    .single();

  if (!customer) notFound();

  const [
    { data: appointmentsData },
    { data: packagesData },
    { data: servicesData },
    { data: usedRows },
    { data: makeupsData },
    { data: staffData },
    { data: paymentsData },
    { data: chargeApptsData },
  ] = await Promise.all([
    supabase
      .from("appointments")
      .select("id, start_at, duration_min, status, price, services(name)")
      .eq("customer_id", id)
      .order("start_at", { ascending: false })
      .limit(10),
    supabase
      .from("customer_packages")
      .select(
        "id, customer_id, service_id, name, type, total_sessions, price, purchased_at, next_payment_at, expires_at, notes",
      )
      .eq("customer_id", id)
      .order("purchased_at", { ascending: false }),
    supabase
      .from("services")
      .select("id, name")
      .eq("active", true)
      .order("name", { ascending: true }),
    supabase
      .from("appointments")
      .select("package_id")
      .eq("customer_id", id)
      .eq("status", "completed")
      .not("package_id", "is", null),
    supabase
      .from("makeups")
      .select(
        "id, customer_id, package_id, appointment_id, missed_date, makeup_at, status, notes",
      )
      .eq("customer_id", id)
      .order("missed_date", { ascending: false }),
    supabase
      .from("staff")
      .select("id, name")
      .eq("active", true)
      .order("name", { ascending: true }),
    supabase
      .from("payments")
      .select("id, customer_id, amount, method, note, paid_at")
      .eq("customer_id", id)
      .order("paid_at", { ascending: false }),
    // Açık hesap için: paketsiz tamamlanmış hizmetlerin TÜM fiyatları (sayfa dışı).
    supabase
      .from("appointments")
      .select("price")
      .eq("customer_id", id)
      .eq("status", "completed")
      .is("package_id", null),
  ]);

  const appointments = (appointmentsData ?? []) as unknown as CustomerAppointment[];

  // Her paketin kaç seansının kullanıldığını say (tamamlanmış randevulardan).
  const usedByPackageId = new Map<string, number>();
  for (const r of (usedRows ?? []) as { package_id: string | null }[]) {
    if (!r.package_id) continue;
    usedByPackageId.set(
      r.package_id,
      (usedByPackageId.get(r.package_id) ?? 0) + 1,
    );
  }
  const packages = withUsage(
    (packagesData ?? []) as unknown as CustomerPackage[],
    usedByPackageId,
  );
  const services = (servicesData ?? []) as { id: string; name: string }[];
  const makeups = (makeupsData ?? []) as unknown as Makeup[];
  const staffList = (staffData ?? []) as { id: string; name: string }[];
  const payments = (paymentsData ?? []) as unknown as Payment[];

  // Açık hesap (borç/alacak): toplam borç − toplam ödeme.
  // Borç = satılan paketlerin fiyatı + paketsiz tamamlanmış hizmetlerin fiyatı.
  const apptCharges = ((chargeApptsData ?? []) as { price: number | null }[]).reduce(
    (s, a) => s + (Number(a.price) || 0),
    0,
  );
  const pkgCharges = packages.reduce((s, p) => s + (Number(p.price) || 0), 0);
  const totalCharges = apptCharges + pkgCharges;
  const totalPaid = payments.reduce((s, p) => s + (Number(p.amount) || 0), 0);
  const balance = totalCharges - totalPaid; // >0 borç, <0 fazla ödeme/alacaklı

  return (
    <div className="space-y-6">
      <Link
        href="/customers"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft className="h-4 w-4" />
        Müşteriler
      </Link>

      <div>
        <h1 className="text-2xl font-semibold">{customer.name}</h1>
        <p className="text-sm text-muted-foreground">
          {customer.phone || customer.email || "İletişim bilgisi yok"}
        </p>
      </div>

      <div className="rounded-xl border bg-card p-6">
        <CustomerForm customer={customer} staff={staffList} />
      </div>

      <div className="rounded-xl border bg-card p-6">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            <h2 className="font-semibold">Randevu geçmişi</h2>
          </div>
          <Link
            href="/appointments"
            className="text-xs text-muted-foreground hover:text-foreground"
          >
            Randevular
          </Link>
        </div>

        {appointments.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            Bu müşteriye ait randevu yok.
          </p>
        ) : (
          <ul className="space-y-2">
            {appointments.map((a) => (
              <li
                key={a.id}
                className="flex items-center justify-between gap-3 rounded-lg border p-3 text-sm"
              >
                <div className="min-w-0">
                  <div className="font-medium">
                    {formatAppointmentWhen(a.start_at)}
                  </div>
                  <div className="truncate text-xs text-muted-foreground">
                    {a.services?.name ?? "Hizmet belirtilmedi"} · {a.duration_min} dk
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  <span className="text-xs text-muted-foreground">
                    {formatPrice(a.price)}
                  </span>
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLES[a.status]}`}
                  >
                    {STATUS_LABELS[a.status]}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="rounded-xl border bg-card p-6">
        <div className="mb-4 flex items-center gap-2">
          <Package className="h-4 w-4" />
          <h2 className="font-semibold">Paketler</h2>
        </div>
        <CustomerPackages
          orgId={customer.organization_id}
          customerId={customer.id}
          initialPackages={packages}
          services={services}
        />
      </div>

      <div className="rounded-xl border bg-card p-6">
        <div className="mb-4 flex items-center gap-2">
          <RotateCcw className="h-4 w-4" />
          <h2 className="font-semibold">Telafiler</h2>
        </div>
        <CustomerMakeups
          orgId={customer.organization_id}
          customerId={customer.id}
          initialMakeups={makeups}
          packages={packages}
        />
      </div>

      <div className="rounded-xl border bg-card p-6">
        <div className="mb-4 flex items-center gap-2">
          <Scale className="h-4 w-4" />
          <h2 className="font-semibold">Hesap durumu</h2>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <div className="rounded-lg border p-3">
            <div className="text-xs text-muted-foreground">Toplam borç</div>
            <div className="mt-0.5 text-lg font-semibold tabular-nums">
              {formatPrice(totalCharges)}
            </div>
          </div>
          <div className="rounded-lg border p-3">
            <div className="text-xs text-muted-foreground">Toplam ödeme</div>
            <div className="mt-0.5 text-lg font-semibold tabular-nums">
              {formatPrice(totalPaid)}
            </div>
          </div>
          <div
            className={`col-span-2 rounded-lg border p-3 sm:col-span-1 ${
              balance > 0
                ? "border-amber-300 bg-amber-50 dark:border-amber-900/50 dark:bg-amber-900/20"
                : balance < 0
                  ? "border-emerald-300 bg-emerald-50 dark:border-emerald-900/50 dark:bg-emerald-900/20"
                  : ""
            }`}
          >
            <div className="text-xs text-muted-foreground">Kalan</div>
            <div
              className={`mt-0.5 text-lg font-semibold tabular-nums ${
                balance > 0
                  ? "text-amber-700 dark:text-amber-400"
                  : balance < 0
                    ? "text-emerald-700 dark:text-emerald-400"
                    : "text-muted-foreground"
              }`}
            >
              {balance > 0
                ? `${formatPrice(balance)} borç`
                : balance < 0
                  ? `${formatPrice(-balance)} fazla`
                  : "Hesap kapalı ✓"}
            </div>
          </div>
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          Borç = satılan paketler + tamamlanmış hizmetler; toplam ödeme düşülür.
          Ödemeyi aşağıdan girersin.
        </p>
      </div>

      <div className="rounded-xl border bg-card p-6">
        <div className="mb-4 flex items-center gap-2">
          <Wallet className="h-4 w-4" />
          <h2 className="font-semibold">Tahsilat / Ödemeler</h2>
        </div>
        <CustomerPayments
          orgId={customer.organization_id}
          customerId={customer.id}
          initialPayments={payments}
        />
      </div>

      <div className="rounded-xl border border-destructive/30 bg-card p-6">
        <h3 className="mb-1 font-semibold text-destructive">Tehlikeli alan</h3>
        <p className="mb-4 text-sm text-muted-foreground">
          Bu müşteriyi sildiğinizde tüm geçmiş kayıtları da silinir.
        </p>
        <DeleteCustomerButton customerId={customer.id} />
      </div>
    </div>
  );
}
