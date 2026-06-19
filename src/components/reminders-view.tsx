"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { MessageCircle, Check, Bell } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { formatAppointmentWhen } from "@/lib/appointments";
import { formatTrTime, trStartOfDay, addDays } from "@/lib/time";
import { whatsAppReminderUrl, buildReminderMessage } from "@/lib/phone";

type ReminderRow = {
  id: string;
  start_at: string;
  reminder_sent_at: string | null;
  customers: { name: string; phone: string | null } | null;
  services: { name: string } | null;
};

export function RemindersView({
  initial,
  orgName,
}: {
  initial: ReminderRow[];
  orgName: string;
}) {
  const router = useRouter();
  const [rows, setRows] = useState<ReminderRow[]>(initial);

  const { todayRows, tomorrowRows } = useMemo(() => {
    const startToday = trStartOfDay();
    const startTomorrow = addDays(startToday, 1);
    const startDayAfter = addDays(startToday, 2);
    const today: ReminderRow[] = [];
    const tomorrow: ReminderRow[] = [];
    for (const r of rows) {
      const d = new Date(r.start_at);
      if (d >= startToday && d < startTomorrow) today.push(r);
      else if (d >= startTomorrow && d < startDayAfter) tomorrow.push(r);
    }
    return { todayRows: today, tomorrowRows: tomorrow };
  }, [rows]);

  async function markSent(row: ReminderRow) {
    const supabase = createClient();
    const sentAt = new Date().toISOString();
    const { error } = await supabase
      .from("appointments")
      .update({ reminder_sent_at: sentAt })
      .eq("id", row.id);
    if (error) {
      toast.error("İşaretlenemedi", { description: error.message });
      return;
    }
    setRows((prev) =>
      prev.map((r) =>
        r.id === row.id ? { ...r, reminder_sent_at: sentAt } : r,
      ),
    );
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Hatırlatmalar</h1>
        <p className="text-sm text-muted-foreground">
          Bugün ve yarınki randevular — müşterilere WhatsApp&apos;tan hatırlat,
          gönderdiklerini işaretle
        </p>
      </div>

      <Section
        title="Bugün"
        rows={todayRows}
        orgName={orgName}
        onSent={markSent}
      />
      <Section
        title="Yarın"
        rows={tomorrowRows}
        orgName={orgName}
        onSent={markSent}
      />
    </div>
  );
}

function Section({
  title,
  rows,
  orgName,
  onSent,
}: {
  title: string;
  rows: ReminderRow[];
  orgName: string;
  onSent: (row: ReminderRow) => void;
}) {
  return (
    <div className="rounded-xl border bg-card p-6">
      <div className="mb-4 flex items-center gap-2">
        <Bell className="h-4 w-4" />
        <h2 className="font-semibold">{title}</h2>
        <span className="text-xs text-muted-foreground">
          ({rows.length} randevu)
        </span>
      </div>

      {rows.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted-foreground">
          {title} için randevu yok.
        </p>
      ) : (
        <ul className="space-y-2">
          {rows.map((r) => {
            const url = whatsAppReminderUrl(
              r.customers?.phone,
              buildReminderMessage({
                customerName: r.customers?.name ?? "",
                whenText: formatAppointmentWhen(r.start_at),
                serviceName: r.services?.name,
                orgName,
              }),
            );
            const sent = r.reminder_sent_at != null;
            return (
              <li
                key={r.id}
                className="flex items-center justify-between gap-3 rounded-lg border p-3 text-sm"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="shrink-0 font-medium tabular-nums">
                    {formatTrTime(r.start_at)}
                  </div>
                  <div className="min-w-0">
                    <div className="truncate font-medium">
                      {r.customers?.name ?? "—"}
                    </div>
                    <div className="truncate text-xs text-muted-foreground">
                      {r.services?.name ?? "Hizmet belirtilmedi"}
                    </div>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  {sent && (
                    <span className="inline-flex items-center gap-1 text-xs text-green-700 dark:text-green-400">
                      <Check className="h-3.5 w-3.5" />
                      Gönderildi
                    </span>
                  )}
                  {url ? (
                    <a
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() => !sent && onSent(r)}
                      className={
                        sent
                          ? "inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium hover:bg-muted"
                          : "inline-flex items-center gap-1.5 rounded-lg bg-green-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-green-700"
                      }
                    >
                      <MessageCircle className="h-3.5 w-3.5" />
                      {sent ? "Tekrar gönder" : "Hatırlat"}
                    </a>
                  ) : (
                    <span className="text-xs text-muted-foreground">
                      Telefon yok
                    </span>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
