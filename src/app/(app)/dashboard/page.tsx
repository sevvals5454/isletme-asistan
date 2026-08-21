import Link from "next/link";
import {
  Users,
  Calendar,
  Wallet,
  ArrowRight,
  Sparkles,
  Bell,
  MessageCircle,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { formatRelativeTime } from "@/lib/utils";
import {
  type AppointmentStatus,
  STATUS_LABELS,
  STATUS_STYLES,
  formatPrice,
} from "@/lib/appointments";
import {
  trStartOfDay,
  trStartOfWeek,
  addDays,
  formatTrTime,
  trDateKey,
  formatTrDate,
} from "@/lib/time";
import { WEEKDAY_LABELS } from "@/lib/hours";
import { type CustomerPackage, remainingSessions } from "@/lib/packages";
import {
  buildBusinessSummary,
  TONE_DOT,
  type SummaryLine,
} from "@/lib/insights";
import {
  buildNotifications,
  type NotificationItem,
  type Severity,
} from "@/lib/notifications";
import {
  OnboardingGuide,
  type OnboardingStatus,
} from "@/components/onboarding-guide";

type TodayAppointment = {
  id: string;
  start_at: string;
  status: AppointmentStatus;
  price: number | null;
  customer_id: string;
  customers: { name: string; phone: string | null } | null;
  services: { name: string } | null;
};

type PkgRow = CustomerPackage & {
  customers: { name: string; phone: string | null } | null;
};

export default async function DashboardPage() {
  const supabase = await createClient();

  const now = new Date();
  // Tüm gün/hafta sınırları Türkiye saatine göre (sunucu UTC'de çalışsa bile).
  const startOfToday = trStartOfDay();
  const endOfToday = addDays(startOfToday, 1);
  const startOfWeek = trStartOfWeek();
  const endOfWeek = addDays(startOfWeek, 7);

  const [
    { count: customerCount },
    { data: recent },
    { data: todayAppointments },
    { data: weekAppointments },
    { data: packagesData },
    { data: packageUsedRows },
    { data: org },
    { data: allCustomers },
    { data: retentionAppts },
    { data: hoursRows },
    { count: servicesCount },
    { count: staffCount },
  ] = await Promise.all([
    supabase.from("customers").select("*", { count: "exact", head: true }),
    supabase
      .from("customers")
      .select("id, name, created_at, phone, email")
      .order("created_at", { ascending: false })
      .limit(5),
    supabase
      .from("appointments")
      .select(
        "id, start_at, status, price, customer_id, customers(name, phone), services(name)",
      )
      .gte("start_at", startOfToday.toISOString())
      .lt("start_at", endOfToday.toISOString())
      .order("start_at", { ascending: true }),
    supabase
      .from("appointments")
      .select("price, status")
      .gte("start_at", startOfWeek.toISOString())
      .lt("start_at", endOfWeek.toISOString())
      .in("status", ["scheduled", "completed"]),
    supabase
      .from("customer_packages")
      .select(
        "id, customer_id, service_id, name, type, total_sessions, price, purchased_at, next_payment_at, expires_at, notes, customers(name, phone)",
      ),
    supabase
      .from("appointments")
      .select("package_id")
      .eq("status", "completed")
      .not("package_id", "is", null),
    supabase.from("organizations").select("name, iban, iban_name").single(),
    supabase.from("customers").select("id, name, phone, birth_date"),
    supabase.from("appointments").select("customer_id, start_at, status"),
    supabase.from("business_hours").select("weekday, is_open"),
    supabase.from("services").select("*", { count: "exact", head: true }),
    supabase.from("staff").select("*", { count: "exact", head: true }),
  ]);

  const today = (todayAppointments ?? []) as unknown as TodayAppointment[];
  const weekRevenue =
    weekAppointments?.reduce((sum, a) => sum + (a.price ?? 0), 0) ?? 0;
  const orgName = org?.name ?? "";

  // Özel mesaj şablonları (yeni kolon; migration çalışmamışsa varsayılana düşer).
  const { data: orgTpl } = await supabase
    .from("organizations")
    .select("message_templates")
    .single();
  const messageTemplates =
    (orgTpl as { message_templates?: Record<string, string> | null } | null)
      ?.message_templates ?? null;

  // Onay bekleyen gelecek randevular (akıllı özet için).
  const { count: awaitingConfirm } = await supabase
    .from("appointments")
    .select("*", { count: "exact", head: true })
    .eq("status", "scheduled")
    .gt("start_at", now.toISOString())
    .is("client_response", null);

  // Takip zamanı gelen/geçen notlar (migration 019/020 yoksa 0).
  const { count: dueNotes } = await supabase
    .from("notes")
    .select("*", { count: "exact", head: true })
    .not("remind_at", "is", null)
    .lt("remind_at", endOfToday.toISOString());

  // Başlangıç rehberi durumu — hangi adımlar tamamlandı?
  const onboardingStatus: OnboardingStatus = {
    services: (servicesCount ?? 0) > 0,
    customers: (customerCount ?? 0) > 0,
    appointment: (retentionAppts?.length ?? 0) > 0,
    staff: (staffCount ?? 0) > 0,
    branding:
      !!org?.iban ||
      (!!messageTemplates && Object.keys(messageTemplates).length > 0),
  };

  // Paketleri kullanım sayısıyla zenginleştir (kalan = toplam - tamamlanan).
  const pkgUsed = new Map<string, number>();
  for (const r of (packageUsedRows ?? []) as { package_id: string | null }[]) {
    if (!r.package_id) continue;
    pkgUsed.set(r.package_id, (pkgUsed.get(r.package_id) ?? 0) + 1);
  }
  const pkgRows = (packagesData ?? []) as unknown as PkgRow[];
  const packagesForNotif = pkgRows.map((p) => ({
    ...p,
    used_sessions: pkgUsed.get(p.id) ?? 0,
  }));

  // Retention: her müşterinin son ziyareti + gelecek randevusu olanlar.
  const lastVisit = new Map<string, string>();
  const futureCustomerIds = new Set<string>();
  for (const a of (retentionAppts ?? []) as {
    customer_id: string;
    start_at: string;
    status: AppointmentStatus;
  }[]) {
    if (a.status === "cancelled") continue;
    const t = new Date(a.start_at);
    if (t <= now) {
      const cur = lastVisit.get(a.customer_id);
      if (!cur || new Date(cur) < t) lastVisit.set(a.customer_id, a.start_at);
    } else if (a.status === "scheduled") {
      futureCustomerIds.add(a.customer_id);
    }
  }

  // Bildirim Merkezi: yaklaşan randevu + ödeme + paket + kaybetmek üzere + doğum günü.
  const notifications = buildNotifications({
    now,
    orgName,
    iban: org?.iban ?? null,
    ibanName: org?.iban_name ?? null,
    customers: (allCustomers ?? []) as {
      id: string;
      name: string;
      phone: string | null;
      birth_date: string | null;
    }[],
    lastVisit,
    futureCustomerIds,
    upcomingAppointments: today
      .filter((a) => a.status === "scheduled" && new Date(a.start_at) > now)
      .map((a) => ({
        id: a.id,
        start_at: a.start_at,
        customer_id: a.customer_id,
        customers: a.customers,
        services: a.services,
      })),
    packages: packagesForNotif,
    templates: messageTemplates,
  });

  // ---- Akıllı İşletme Özeti (Faz 1) ----
  const INACTIVE_DAYS = 45;
  // 1 seans kalan seans paketleri
  const packagesEndingSoon = packagesForNotif.filter(
    (p) => p.type === "session" && remainingSessions(p) === 1,
  ).length;
  // Eşik günü aşan, gelecek randevusu olmayan müşteriler
  let inactiveCount = 0;
  for (const [cid, iso] of lastVisit) {
    if (futureCustomerIds.has(cid)) continue;
    const days = Math.floor((now.getTime() - new Date(iso).getTime()) / 86400000);
    if (days >= INACTIVE_DAYS) inactiveCount++;
  }
  // Bugünkü tahmini ciro + randevu sayısı
  const todayRevenue = today
    .filter((a) => a.status === "scheduled" || a.status === "completed")
    .reduce((s, a) => s + (a.price ?? 0), 0);
  const todayApptCount = today.filter((a) => a.status !== "cancelled").length;
  // Bu hafta vs geçen hafta (aynı süre) randevu trendi
  const weekMs = 7 * 86400000;
  const nowT = now.getTime();
  const swT = startOfWeek.getTime();
  let thisWk = 0;
  let lastWk = 0;
  for (const a of (retentionAppts ?? []) as {
    start_at: string;
    status: AppointmentStatus;
  }[]) {
    if (a.status === "cancelled") continue;
    const t = new Date(a.start_at).getTime();
    if (t >= swT && t <= nowT) thisWk++;
    else if (t >= swT - weekMs && t <= nowT - weekMs) lastWk++;
  }
  const weekTrendPct = lastWk > 0 ? ((thisWk - lastWk) / lastWk) * 100 : null;

  const summary: SummaryLine[] = buildBusinessSummary({
    packagesEndingSoon,
    awaitingConfirm: awaitingConfirm ?? 0,
    inactiveCount,
    inactiveDays: INACTIVE_DAYS,
    todayRevenue,
    todayAppointments: todayApptCount,
    weekTrendPct,
    dueNotes: dueNotes ?? 0,
  });

  // Bu hafta boş günler: business_hours'ta açık ama randevusuz + bugünden itibaren.
  const openByWeekday = new Map(
    ((hoursRows ?? []) as { weekday: number; is_open: boolean }[]).map((h) => [
      h.weekday,
      h.is_open,
    ]),
  );
  const apptCountByDay = new Map<string, number>();
  for (const a of (retentionAppts ?? []) as {
    start_at: string;
    status: AppointmentStatus;
  }[]) {
    if (a.status === "cancelled") continue;
    const k = trDateKey(new Date(a.start_at));
    apptCountByDay.set(k, (apptCountByDay.get(k) ?? 0) + 1);
  }
  const todayKey = trDateKey(now);
  const emptyDays: { key: string; label: string }[] = [];
  if (openByWeekday.size > 0) {
    for (let i = 0; i < 7; i++) {
      const key = trDateKey(addDays(startOfWeek, i));
      if (key < todayKey) continue;
      const [y, mo, dd] = key.split("-").map(Number);
      const weekday = (new Date(Date.UTC(y, mo - 1, dd)).getUTCDay() + 6) % 7;
      if (openByWeekday.get(weekday) !== true) continue;
      if ((apptCountByDay.get(key) ?? 0) > 0) continue;
      emptyDays.push({ key, label: WEEKDAY_LABELS[weekday] });
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold">Hoş geldiniz</h1>
        <p className="text-sm text-muted-foreground">
          İşletmenizin genel durumu
        </p>
      </div>

      <OnboardingGuide status={onboardingStatus} />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard
          icon={<Users className="h-5 w-5" />}
          label="Toplam müşteri"
          value={customerCount ?? 0}
          href="/customers"
        />
        <StatCard
          icon={<Calendar className="h-5 w-5" />}
          label="Bugün randevu"
          value={today.length}
          href="/appointments"
        />
        <StatCard
          icon={<Wallet className="h-5 w-5" />}
          label="Bu hafta gelir tahmini"
          value={formatPrice(weekRevenue)}
          href="/appointments"
        />
      </div>

      {/* Akıllı İşletme Özeti — bugün işletmende ne oluyor? */}
      {summary.length > 0 && (
        <div className="rounded-xl border bg-card p-6">
          <div className="mb-3 flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            <h2 className="font-semibold">Bugün işletmen için önemli olanlar</h2>
          </div>
          <ul className="space-y-2.5">
            {summary.map((s, i) => {
              const row = (
                <span className="flex items-start gap-2.5 text-sm">
                  <span
                    className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${TONE_DOT[s.tone]}`}
                  />
                  <span className="flex-1">{s.text}</span>
                </span>
              );
              return (
                <li key={i}>
                  {s.href ? (
                    <Link
                      href={s.href}
                      className="block rounded-lg px-1 py-0.5 hover:bg-muted/50"
                    >
                      {row}
                    </Link>
                  ) : (
                    <div className="px-1 py-0.5">{row}</div>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {notifications.length > 0 && (
        <div className="rounded-xl border bg-card p-6">
          <div className="mb-1 flex items-center gap-2">
            <Bell className="h-4 w-4" />
            <h2 className="font-semibold">Bugün ne yapmalısın?</h2>
            <span className="text-xs text-muted-foreground">
              ({notifications.length})
            </span>
          </div>
          <p className="mb-4 text-sm text-muted-foreground">
            Önem sırasına göre yapman gerekenler — her biri için hazır WhatsApp
            mesajı
          </p>
          <ul className="space-y-2">
            {notifications.slice(0, 5).map((n) => (
              <NotificationCard key={n.id} item={n} />
            ))}
          </ul>
          {notifications.length > 5 && (
            <p className="mt-3 text-xs text-muted-foreground">
              +{notifications.length - 5} tane daha var
            </p>
          )}
        </div>
      )}

      {emptyDays.length > 0 && (
        <div className="rounded-xl border bg-card p-6">
          <div className="mb-1 flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            <h2 className="font-semibold">Bu hafta boş günler</h2>
          </div>
          <p className="mb-4 text-sm text-muted-foreground">
            Açık ama hiç randevusu olmayan günler — doldurmak için randevu ekle
            veya kampanya yap
          </p>
          <div className="flex flex-wrap gap-2">
            {emptyDays.map((d) => (
              <Link
                key={d.key}
                href={`/appointments?date=${d.key}`}
                className="inline-flex items-center gap-2 rounded-lg border px-3 py-1.5 text-sm hover:bg-muted"
              >
                <span className="font-medium">{d.label}</span>
                <span className="text-xs text-muted-foreground">
                  {formatTrDate(d.key)}
                </span>
              </Link>
            ))}
          </div>
        </div>
      )}

      <div className="rounded-xl border bg-card p-6">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            <h2 className="font-semibold">Bugünün randevuları</h2>
          </div>
          <Link
            href="/appointments"
            className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
          >
            Tümünü gör
            <ArrowRight className="h-3 w-3" />
          </Link>
        </div>

        {today.length === 0 ? (
          <div className="py-8 text-center text-sm text-muted-foreground">
            Bugün için randevu yok.{" "}
            <Link
              href="/appointments"
              className="font-medium text-foreground hover:underline"
            >
              Yeni randevu ekleyin
            </Link>
          </div>
        ) : (
          <ul className="space-y-2">
            {today.map((a) => (
              <li
                key={a.id}
                className="flex items-center justify-between gap-3 rounded-lg border p-3 text-sm"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="shrink-0 font-medium tabular-nums">
                    {formatTrTime(a.start_at)}
                  </div>
                  <div className="min-w-0">
                    <div className="truncate font-medium">
                      {a.customers?.name ?? "—"}
                    </div>
                    <div className="truncate text-xs text-muted-foreground">
                      {a.services?.name ?? "Hizmet belirtilmedi"}
                    </div>
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

      <div className="grid gap-6 md:grid-cols-2">
        <div className="rounded-xl border bg-card p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-semibold">Son eklenen müşteriler</h2>
            <Link
              href="/customers"
              className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
            >
              Tümünü gör
              <ArrowRight className="h-3 w-3" />
            </Link>
          </div>

          {!recent || recent.length === 0 ? (
            <div className="py-8 text-center text-sm text-muted-foreground">
              Henüz müşteri yok.{" "}
              <Link
                href="/customers/new"
                className="font-medium text-foreground hover:underline"
              >
                İlk müşterinizi ekleyin
              </Link>
            </div>
          ) : (
            <ul className="space-y-3">
              {recent.map((c) => (
                <li key={c.id}>
                  <Link
                    href={`/customers/${c.id}`}
                    className="flex items-center justify-between gap-3 rounded-lg p-2 -m-2 hover:bg-muted/50"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-sm font-medium">
                        {c.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <div className="truncate text-sm font-medium">
                          {c.name}
                        </div>
                        <div className="truncate text-xs text-muted-foreground">
                          {c.phone || c.email || "—"}
                        </div>
                      </div>
                    </div>
                    <div className="shrink-0 text-xs text-muted-foreground">
                      {formatRelativeTime(c.created_at)}
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="rounded-xl border bg-card p-6">
          <div className="mb-4 flex items-center gap-2">
            <Sparkles className="h-4 w-4" />
            <h2 className="font-semibold">Hızlı eylemler</h2>
          </div>
          <div className="space-y-2">
            <QuickAction
              href="/customers/new"
              title="Yeni müşteri ekle"
              description="Müşteri kartı oluşturun"
            />
            <QuickAction
              href="/appointments"
              title="Randevu oluştur"
              description="Yeni randevu planlayın"
            />
            <QuickAction
              href="/reminders"
              title="Hatırlatmalar"
              description="Bugün/yarın randevu hatırlatmaları"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

const SEVERITY_DOT: Record<Severity, string> = {
  danger: "bg-red-500",
  warning: "bg-amber-500",
  info: "bg-blue-500",
};

function NotificationCard({ item }: { item: NotificationItem }) {
  return (
    <li className="flex items-center justify-between gap-3 rounded-lg border p-3 text-sm">
      <div className="flex min-w-0 items-center gap-3">
        <span
          className={`mt-0.5 h-2 w-2 shrink-0 rounded-full ${SEVERITY_DOT[item.severity]}`}
        />
        <div className="min-w-0">
          <Link
            href={`/customers/${item.customerId}`}
            className="truncate font-medium hover:underline"
          >
            {item.title}
          </Link>
          <div className="truncate text-xs text-muted-foreground">
            {item.detail}
          </div>
        </div>
      </div>
      {item.whatsappUrl ? (
        <a
          href={item.whatsappUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-green-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-green-700"
        >
          <MessageCircle className="h-3.5 w-3.5" />
          Mesaj Gönder
        </a>
      ) : (
        <span className="shrink-0 text-xs text-muted-foreground">
          Telefon yok
        </span>
      )}
    </li>
  );
}

function StatCard({
  icon,
  label,
  value,
  href,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  href?: string;
}) {
  const content = (
    <div className="rounded-xl border bg-card p-6 transition-colors hover:bg-muted/30">
      <div className="mb-3 inline-flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
        {icon}
      </div>
      <div className="text-xs font-medium text-muted-foreground">{label}</div>
      <div className="text-3xl font-bold text-primary">{value}</div>
    </div>
  );
  return href ? <Link href={href}>{content}</Link> : content;
}

function QuickAction({
  href,
  title,
  description,
}: {
  href: string;
  title: string;
  description: string;
}) {
  return (
    <Link
      href={href}
      className="flex items-center justify-between gap-3 rounded-lg border p-3 transition-colors hover:bg-muted/50"
    >
      <div>
        <div className="text-sm font-medium">{title}</div>
        <div className="text-xs text-muted-foreground">{description}</div>
      </div>
      <ArrowRight className="h-4 w-4 text-muted-foreground" />
    </Link>
  );
}
