import {
  Scissors,
  Users,
  Wallet,
  Clock,
  CalendarX,
  MessageSquare,
  RefreshCw,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { OrgNameForm } from "@/components/org-name-form";
import { OrgIbanForm } from "@/components/org-iban-form";
import { ServicesManager } from "@/components/services-manager";
import { StaffManager } from "@/components/staff-manager";
import { BusinessHoursManager } from "@/components/business-hours-manager";
import { MessageTemplatesManager } from "@/components/message-templates-manager";
import { UpdateButton } from "@/components/update-button";
import {
  ClosedDaysManager,
  type ClosedDay,
} from "@/components/closed-days-manager";
import { type DayHours } from "@/lib/hours";
import { type MessageKind } from "@/lib/templates";

export default async function SettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: membership } = await supabase
    .from("organization_members")
    .select(
      "organization_id, role, organizations(id, name, plan, iban, iban_name, created_at)",
    )
    .eq("user_id", user!.id)
    .single();

  const org = membership?.organizations as unknown as {
    id: string;
    name: string;
    plan: string;
    iban: string | null;
    iban_name: string | null;
    created_at: string;
  } | null;

  // Yeni/opsiyonel kolonlar (migration çalışmamış olabilir) — hata olursa varsayılana düş.
  let reviewUrl = "";
  let messageTemplates: Partial<Record<MessageKind, string>> = {};
  if (org) {
    const { data: orgExtra } = await supabase
      .from("organizations")
      .select("google_review_url, message_templates")
      .eq("id", org.id)
      .single();
    reviewUrl =
      (orgExtra as { google_review_url?: string | null } | null)
        ?.google_review_url ?? "";
    messageTemplates =
      (orgExtra as {
        message_templates?: Partial<Record<MessageKind, string>> | null;
      } | null)?.message_templates ?? {};
  }

  const [{ data: services }, { data: staff }, { data: hours }] =
    await Promise.all([
      supabase
        .from("services")
        .select("id, name, duration_min, price, active")
        .order("created_at", { ascending: true }),
      supabase
        .from("staff")
        .select("id, name, active")
        .order("created_at", { ascending: true }),
      supabase
        .from("business_hours")
        .select("weekday, is_open, open_time, close_time")
        .order("weekday", { ascending: true }),
    ]);

  // Kapalı günler + personel izinleri — staff_id kolonu yoksa (migration 016
  // çalışmadıysa) staff_id'siz geri düş (mevcut kayıtlar kaybolmaz).
  let closed: ClosedDay[] = [];
  {
    const withStaff = await supabase
      .from("closed_days")
      .select("id, date, reason, staff_id")
      .order("date", { ascending: true });
    if (withStaff.error) {
      const fallback = await supabase
        .from("closed_days")
        .select("id, date, reason")
        .order("date", { ascending: true });
      closed = (fallback.data ?? []) as ClosedDay[];
    } else {
      closed = (withStaff.data ?? []) as unknown as ClosedDay[];
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold">Ayarlar</h1>
        <p className="text-sm text-muted-foreground">
          İşletme bilgilerinizi ve kullanım istatistiklerinizi görüntüleyin
        </p>
      </div>

      <section className="rounded-xl border bg-card p-6">
        <h2 className="mb-1 font-semibold">İşletme bilgileri</h2>
        <p className="mb-4 text-sm text-muted-foreground">
          Sidebar ve raporlarda görünecek isim
        </p>
        {org && <OrgNameForm orgId={org.id} initialName={org.name} />}
      </section>

      <section className="rounded-xl border bg-card p-6">
        <div className="mb-1 flex items-center gap-2">
          <Wallet className="h-4 w-4" />
          <h2 className="font-semibold">Ödeme & Değerlendirme</h2>
        </div>
        <p className="mb-4 text-sm text-muted-foreground">
          Ödeme mesajlarındaki IBAN ve değerlendirme mesajındaki Google yorum
          linki
        </p>
        {org && (
          <OrgIbanForm
            orgId={org.id}
            initialIban={org.iban ?? ""}
            initialIbanName={org.iban_name ?? ""}
            initialReviewUrl={reviewUrl}
          />
        )}
      </section>

      <section className="rounded-xl border bg-card p-6">
        <div className="mb-1 flex items-center gap-2">
          <MessageSquare className="h-4 w-4" />
          <h2 className="font-semibold">Mesaj şablonları</h2>
        </div>
        <p className="mb-4 text-sm text-muted-foreground">
          Müşterilere gönderilen WhatsApp mesajlarını kendi dilinize göre
          düzenleyin. İsim otomatik eklenir.
        </p>
        {org && (
          <MessageTemplatesManager
            orgId={org.id}
            initial={messageTemplates}
          />
        )}
      </section>

      <section className="rounded-xl border bg-card p-6">
        <div className="mb-1 flex items-center gap-2">
          <Scissors className="h-4 w-4" />
          <h2 className="font-semibold">Hizmetler</h2>
        </div>
        <p className="mb-4 text-sm text-muted-foreground">
          Randevu oluştururken seçilecek hizmet kataloğu (süre ve fiyat)
        </p>
        {org && (
          <ServicesManager orgId={org.id} initialServices={services ?? []} />
        )}
      </section>

      <section className="rounded-xl border bg-card p-6">
        <div className="mb-1 flex items-center gap-2">
          <Users className="h-4 w-4" />
          <h2 className="font-semibold">Çalışanlar</h2>
        </div>
        <p className="mb-4 text-sm text-muted-foreground">
          Müşteri ve randevu atanacak çalışanlar (eğitmen, uzman vb.)
        </p>
        {org && <StaffManager orgId={org.id} initialStaff={staff ?? []} />}
      </section>

      <section className="rounded-xl border bg-card p-6">
        <div className="mb-1 flex items-center gap-2">
          <Clock className="h-4 w-4" />
          <h2 className="font-semibold">Çalışma saatleri</h2>
        </div>
        <p className="mb-4 text-sm text-muted-foreground">
          Randevu oluştururken saat dışı/kapalı gün uyarısı için (boş bırakırsan
          kısıt olmaz)
        </p>
        {org && (
          <BusinessHoursManager
            orgId={org.id}
            initialHours={(hours ?? []) as DayHours[]}
          />
        )}
      </section>

      <section className="rounded-xl border bg-card p-6">
        <div className="mb-1 flex items-center gap-2">
          <CalendarX className="h-4 w-4" />
          <h2 className="font-semibold">Kapalı günler & personel izni</h2>
        </div>
        <p className="mb-4 text-sm text-muted-foreground">
          Resmi tatil/işletme kapalı günleri veya bir çalışanın izinli/gelemediği
          günler (sebebiyle). Puantaj/kontrol için kayıt altında kalır.
        </p>
        {org && (
          <ClosedDaysManager
            orgId={org.id}
            initialClosedDays={(closed ?? []) as ClosedDay[]}
            staff={(staff ?? []).map((s) => ({ id: s.id, name: s.name }))}
          />
        )}
      </section>

      <section className="rounded-xl border bg-card p-6">
        <div className="mb-1 flex items-center gap-2">
          <RefreshCw className="h-4 w-4" />
          <h2 className="font-semibold">Uygulama güncellemesi</h2>
        </div>
        <p className="mb-4 text-sm text-muted-foreground">
          Güncellemeler otomatik gelir. Yine de en son sürümde olduğundan emin
          olmak istersen buradan kontrol edebilirsin.
        </p>
        <UpdateButton />
      </section>

      <section className="rounded-xl border bg-card p-6">
        <h2 className="mb-1 font-semibold">Hesap</h2>
        <div className="space-y-1 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">E-posta</span>
            <span>{user?.email}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Rol</span>
            <span className="capitalize">{membership?.role ?? "—"}</span>
          </div>
        </div>
      </section>
    </div>
  );
}
