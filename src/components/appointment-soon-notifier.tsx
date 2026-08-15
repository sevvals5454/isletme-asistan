"use client";

import { useEffect, useRef } from "react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import {
  resolveTemplates,
  renderMessage,
  type MessageKind,
} from "@/lib/templates";
import { whatsAppReminderUrl } from "@/lib/phone";
import { formatTrTime } from "@/lib/time";

type SoonAppt = {
  id: string;
  start_at: string;
  customers: { name: string; phone: string | null } | null;
  services: { name: string } | null;
};

// Uygulama AÇIKKEN yaklaşan randevular için canlı bildirim gösterir.
// "Ayşe — randevuya 45 dk kaldı" + tek tık WhatsApp hatırlatma.
export function AppointmentSoonNotifier({
  orgName,
  templates,
  windowMinutes = 60,
}: {
  orgName: string;
  templates?: Partial<Record<MessageKind, string>> | null;
  windowMinutes?: number;
}) {
  const alerted = useRef<Set<string>>(new Set());
  const t = resolveTemplates(templates);

  useEffect(() => {
    let active = true;
    const supabase = createClient();

    async function check() {
      const now = new Date();
      const until = new Date(now.getTime() + windowMinutes * 60000);
      const { data } = await supabase
        .from("appointments")
        .select("id, start_at, customers(name, phone), services(name)")
        .eq("status", "scheduled")
        .gte("start_at", now.toISOString())
        .lte("start_at", until.toISOString())
        .order("start_at", { ascending: true });

      if (!active || !data) return;
      for (const a of data as unknown as SoonAppt[]) {
        if (alerted.current.has(a.id)) continue;
        alerted.current.add(a.id);
        const name = a.customers?.name ?? "Müşteri";
        const mins = Math.max(
          0,
          Math.round((new Date(a.start_at).getTime() - Date.now()) / 60000),
        );
        const msg = renderMessage(t.appointment_soon, {
          ad: name,
          saat: formatTrTime(a.start_at),
          hizmet: a.services?.name ?? "",
          isletme: orgName,
        });
        const waUrl = whatsAppReminderUrl(a.customers?.phone, msg);
        toast(`${name} — randevuya ${mins} dk kaldı`, {
          description: a.services?.name
            ? `${formatTrTime(a.start_at)} · ${a.services.name}`
            : formatTrTime(a.start_at),
          duration: 20000,
          action: waUrl
            ? {
                label: "Hatırlat",
                onClick: () => window.open(waUrl, "_blank"),
              }
            : undefined,
        });
      }
    }

    check();
    const interval = setInterval(check, 3 * 60 * 1000); // 3 dk'da bir
    const onFocus = () => check();
    window.addEventListener("focus", onFocus);
    return () => {
      active = false;
      clearInterval(interval);
      window.removeEventListener("focus", onFocus);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orgName, windowMinutes]);

  return null;
}
