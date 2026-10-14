// Admin: bir işletmenin erişim durumunu/paketini/bitiş tarihini günceller.
// Güvenlik: yalnızca ADMIN_EMAILS listesindeki hesap çağırabilir.
import { createClient as createServer } from "@/lib/supabase/server";
import { createClient } from "@supabase/supabase-js";
import { isAdminEmail } from "@/lib/admin";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const supabase = await createServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!isAdminEmail(user?.email)) {
    return Response.json({ ok: false, error: "yetkisiz" }, { status: 403 });
  }

  const body = (await req.json()) as {
    orgId?: string;
    access_status?: string;
    plan?: string | null;
    subscription_ends_at?: string | null;
  };
  if (!body.orgId) {
    return Response.json({ ok: false, error: "orgId gerekli" }, { status: 400 });
  }

  const service = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const supaUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!service || !supaUrl) {
    return Response.json({ ok: false, error: "not configured" });
  }
  const admin = createClient(supaUrl, service, {
    auth: { persistSession: false },
  });

  const update: Record<string, unknown> = {};
  if (body.access_status !== undefined) update.access_status = body.access_status;
  if (body.plan !== undefined) update.plan = body.plan;
  if (body.subscription_ends_at !== undefined)
    update.subscription_ends_at = body.subscription_ends_at;

  const { error } = await admin
    .from("organizations")
    .update(update)
    .eq("id", body.orgId);
  if (error) {
    return Response.json({ ok: false, error: error.message }, { status: 500 });
  }
  return Response.json({ ok: true });
}
