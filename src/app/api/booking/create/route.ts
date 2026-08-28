// Online randevu oluşturma — güvenli create_booking RPC'sini service_role ile
// çağırır, başarılıysa işletme sahibine ANINDA push bildirim gönderir.
// (create_booking anon'dan revoke edildiği için tüm online randevular buradan geçer.)
import { createClient as createAdmin } from "@supabase/supabase-js";
import webpush from "web-push";

export const dynamic = "force-dynamic";

type Sub = { id: string; endpoint: string; p256dh: string; auth: string };

function trDateTime(iso: string): string {
  try {
    return new Intl.DateTimeFormat("tr-TR", {
      timeZone: "Europe/Istanbul",
      day: "2-digit",
      month: "long",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as {
    org?: string;
    service?: string;
    staff?: string | null;
    start?: string;
    name?: string;
    phone?: string;
    serviceName?: string;
  } | null;

  if (!body?.org || !body.service || !body.start || !body.name) {
    return Response.json({ ok: false, error: "Eksik bilgi" }, { status: 400 });
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !service) {
    return Response.json(
      { ok: false, error: "Sunucu yapılandırılmamış" },
      { status: 200 },
    );
  }
  const admin = createAdmin(url, service, { auth: { persistSession: false } });

  const { data, error } = await admin.rpc("create_booking", {
    p_org: body.org,
    p_service: body.service,
    p_staff: body.staff || null,
    p_start: body.start,
    p_name: body.name,
    p_phone: body.phone || null,
  });

  const res = data as
    | { ok: boolean; error?: string; id?: string; token?: string; pending?: boolean }
    | null;

  if (error) {
    return Response.json(
      { ok: false, error: "Randevu oluşturulamadı, lütfen tekrar deneyin." },
      { status: 200 },
    );
  }
  if (!res?.ok) {
    return Response.json(res ?? { ok: false }, { status: 200 });
  }

  // Sahibe anında push (en iyi çaba — başarısız olsa da randevu geçerli).
  try {
    const pub = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    const priv = process.env.VAPID_PRIVATE_KEY;
    if (pub && priv) {
      webpush.setVapidDetails(
        process.env.VAPID_SUBJECT || "mailto:veritechsoft@gmail.com",
        pub,
        priv,
      );
      const { data: subsData } = await admin
        .from("push_subscriptions")
        .select("id, endpoint, p256dh, auth")
        .eq("organization_id", body.org);
      const subs = (subsData ?? []) as Sub[];
      const when = trDateTime(body.start);
      const svc = body.serviceName ? " · " + body.serviceName : "";
      const payload = JSON.stringify({
        title: res.pending ? "Onay bekleyen randevu 🔔" : "Yeni online randevu 📅",
        body: `${body.name} · ${when}${svc}`,
        url: "/appointments",
      });
      await Promise.all(
        subs.map((s) =>
          webpush
            .sendNotification(
              { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
              payload,
            )
            .catch(async (e: unknown) => {
              const code = (e as { statusCode?: number })?.statusCode;
              if (code === 404 || code === 410) {
                await admin.from("push_subscriptions").delete().eq("id", s.id);
              }
            }),
        ),
      );
    }
  } catch {
    // push atlandı
  }

  return Response.json(res, { status: 200 });
}
