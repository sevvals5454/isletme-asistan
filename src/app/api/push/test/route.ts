// Giriş yapan kullanıcının KENDİ işletmesindeki kayıtlı cihazlara test push'u.
// Güvenli: oturum şart; yalnız kendi org'una gönderir (başka işletmeyi rahatsız etmez).
import { createClient as createServer } from "@/lib/supabase/server";
import { createClient } from "@supabase/supabase-js";
import webpush from "web-push";

export const dynamic = "force-dynamic";

export async function POST() {
  const supabase = await createServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return Response.json({ ok: false }, { status: 401 });

  const { data: membership } = await supabase
    .from("organization_members")
    .select("organization_id")
    .eq("user_id", user.id)
    .maybeSingle();
  const orgId = membership?.organization_id;
  if (!orgId) return Response.json({ ok: false, error: "no org" });

  const pub = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const priv = process.env.VAPID_PRIVATE_KEY;
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const supaUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!pub || !priv || !service || !supaUrl)
    return Response.json({ ok: false, error: "not configured" });

  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT || "mailto:veritechsoft@gmail.com",
    pub,
    priv,
  );
  const admin = createClient(supaUrl, service, {
    auth: { persistSession: false },
  });

  const { data: subs } = await admin
    .from("push_subscriptions")
    .select("id, endpoint, p256dh, auth")
    .eq("organization_id", orgId);
  const list = (subs ?? []) as {
    id: string;
    endpoint: string;
    p256dh: string;
    auth: string;
  }[];

  const payload = JSON.stringify({
    title: "Test bildirimi 🔔",
    body: "Harika! Bildirimler çalışıyor.",
    url: "/dashboard",
  });

  let sent = 0;
  for (const s of list) {
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

  return Response.json({ ok: true, sent, total: list.length });
}
