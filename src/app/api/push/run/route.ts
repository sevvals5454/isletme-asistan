// Zamanlanmış görev: yaklaşan randevular için push bildirim gönderir.
// Dışarıdan bir cron (ör. cron-job.org) her ~15 dk'da bir çağırır:
//   GET /api/push/run?key=PUSH_CRON_SECRET
// Güvenli: secret olmadan çalışmaz. service_role ile RLS'i aşar.
import { createClient } from "@supabase/supabase-js";
import webpush from "web-push";

export const dynamic = "force-dynamic";

type Appt = {
  id: string;
  start_at: string;
  organization_id: string;
  customers: { name: string } | null;
  services: { name: string } | null;
};
type Sub = { id: string; endpoint: string; p256dh: string; auth: string };

export async function GET(req: Request) {
  const url = new URL(req.url);
  const key = url.searchParams.get("key") || req.headers.get("x-cron-secret");
  if (!process.env.PUSH_CRON_SECRET || key !== process.env.PUSH_CRON_SECRET) {
    return Response.json({ ok: false }, { status: 401 });
  }
  const pub = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const priv = process.env.VAPID_PRIVATE_KEY;
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const supaUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!pub || !priv || !service || !supaUrl) {
    return Response.json({ ok: false, error: "not configured" }, { status: 200 });
  }
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT || "mailto:veritechsoft@gmail.com",
    pub,
    priv,
  );
  const admin = createClient(supaUrl, service, {
    auth: { persistSession: false },
  });

  const now = Date.now();
  const soon = new Date(now + 60 * 60000).toISOString(); // önümüzdeki 60 dk
  const { data: appts } = await admin
    .from("appointments")
    .select(
      "id, start_at, organization_id, customers(name), services(name)",
    )
    .eq("status", "scheduled")
    .is("push_reminder_sent_at", null)
    .gte("start_at", new Date(now).toISOString())
    .lte("start_at", soon);

  const list = (appts ?? []) as unknown as Appt[];
  let sent = 0;

  // Org bazında abonelikleri önbelleğe al.
  const subsByOrg = new Map<string, Sub[]>();
  async function subsFor(org: string): Promise<Sub[]> {
    if (subsByOrg.has(org)) return subsByOrg.get(org)!;
    const { data } = await admin
      .from("push_subscriptions")
      .select("id, endpoint, p256dh, auth")
      .eq("organization_id", org);
    const s = (data ?? []) as Sub[];
    subsByOrg.set(org, s);
    return s;
  }

  for (const a of list) {
    const subs = await subsFor(a.organization_id);
    if (subs.length === 0) {
      // abone yok → yine de işaretle (boşuna tekrar sorgulamayalım)
      await admin
        .from("appointments")
        .update({ push_reminder_sent_at: new Date().toISOString() })
        .eq("id", a.id);
      continue;
    }
    const mins = Math.max(
      0,
      Math.round((new Date(a.start_at).getTime() - Date.now()) / 60000),
    );
    const name = a.customers?.name ?? "Müşteri";
    const payload = JSON.stringify({
      title: "Yaklaşan randevu",
      body: `${name} — randevuya ${mins} dk kaldı${a.services?.name ? " · " + a.services.name : ""}`,
      url: "/appointments",
    });
    for (const s of subs) {
      try {
        await webpush.sendNotification(
          { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
          payload,
        );
        sent++;
      } catch (e: unknown) {
        const code = (e as { statusCode?: number })?.statusCode;
        if (code === 404 || code === 410) {
          await admin.from("push_subscriptions").delete().eq("id", s.id);
        }
      }
    }
    await admin
      .from("appointments")
      .update({ push_reminder_sent_at: new Date().toISOString() })
      .eq("id", a.id);
  }

  return Response.json({ ok: true, checked: list.length, sent });
}
