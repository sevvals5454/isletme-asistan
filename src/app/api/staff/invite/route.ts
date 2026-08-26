// Bir staff kaydına çalışan girişi oluşturur. Yalnız o org'un SAHİBİ çağırabilir.
// service_role ile auth kullanıcısı yaratılır; app_metadata trigger'ı org'a bağlar.
import { createClient } from "@/lib/supabase/server";
import { createClient as createAdmin } from "@supabase/supabase-js";

export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return Response.json({ ok: false }, { status: 401 });

  const body = (await req.json().catch(() => null)) as {
    staff_id?: string;
    email?: string;
    password?: string;
  } | null;
  if (!body?.staff_id || !body.email || !body.password) {
    return Response.json({ ok: false, error: "Eksik bilgi" }, { status: 400 });
  }
  if (body.password.length < 6) {
    return Response.json(
      { ok: false, error: "Şifre en az 6 karakter olmalı" },
      { status: 400 },
    );
  }

  // staff kaydı + çağıranın o org'un SAHİBİ olduğunu doğrula
  const { data: staff } = await supabase
    .from("staff")
    .select("id, organization_id, user_id, name")
    .eq("id", body.staff_id)
    .single();
  if (!staff) return Response.json({ ok: false }, { status: 404 });
  if (staff.user_id) {
    return Response.json(
      { ok: false, error: "Bu çalışanın zaten girişi var" },
      { status: 400 },
    );
  }
  const { data: membership } = await supabase
    .from("organization_members")
    .select("role")
    .eq("user_id", user.id)
    .eq("organization_id", staff.organization_id)
    .single();
  if (membership?.role !== "owner") {
    return Response.json({ ok: false, error: "Yetki yok" }, { status: 403 });
  }

  const service = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!service || !url) {
    return Response.json({ ok: false, error: "Sunucu yapılandırılmamış" }, { status: 500 });
  }
  const admin = createAdmin(url, service, {
    auth: { persistSession: false },
  });

  const { data: created, error } = await admin.auth.admin.createUser({
    email: body.email.trim(),
    password: body.password,
    email_confirm: true,
    app_metadata: {
      invited_to_org: staff.organization_id,
      staff_id: staff.id,
    },
  });
  if (error || !created?.user) {
    return Response.json(
      { ok: false, error: error?.message ?? "Kullanıcı oluşturulamadı" },
      { status: 400 },
    );
  }
  const newId = created.user.id;

  // handle_new_user trigger'ı, GoTrue app_metadata'yı insert'ten SONRA yazdığı
  // için genelde bu kullanıcıya boş bir "yeni org + owner" açar. Bağlamayı burada
  // service_role ile deterministik yapıyoruz: sahte org'u temizle, çalışan olarak bağla.
  try {
    const { data: strayMems } = await admin
      .from("organization_members")
      .select("organization_id")
      .eq("user_id", newId);

    for (const m of strayMems ?? []) {
      await admin
        .from("organization_members")
        .delete()
        .eq("user_id", newId)
        .eq("organization_id", m.organization_id);
      // Bu org yalnız bu kullanıcı için açıldıysa (başka üyesi kalmadıysa) sil.
      const { count } = await admin
        .from("organization_members")
        .select("*", { count: "exact", head: true })
        .eq("organization_id", m.organization_id);
      if (!count) {
        await admin.from("organizations").delete().eq("id", m.organization_id);
      }
    }

    // Çalışan olarak gerçek org'a bağla.
    const { error: linkErr } = await admin
      .from("organization_members")
      .insert({
        user_id: newId,
        organization_id: staff.organization_id,
        role: "member", // owner dışı = çalışan (organization_members role check'i 'member' kabul eder)
      });
    if (linkErr) throw linkErr;

    const { error: stErr } = await admin
      .from("staff")
      .update({ user_id: newId })
      .eq("id", staff.id);
    if (stErr) throw stErr;
  } catch (e) {
    // Bağlama başarısızsa yarım kullanıcı bırakma — geri al.
    await admin.auth.admin.deleteUser(newId);
    return Response.json(
      { ok: false, error: (e as Error).message ?? "Bağlama başarısız" },
      { status: 500 },
    );
  }

  return Response.json({ ok: true });
}
