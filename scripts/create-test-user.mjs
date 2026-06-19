// Onaylanmış bir test kullanıcısı oluşturur (admin API, RLS bypass).
// Email confirm otomatik → direkt /login'den girilebilir.
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";

const env = Object.fromEntries(
  readFileSync(new URL("../.env.local", import.meta.url), "utf8")
    .split("\n")
    .filter((l) => l.includes("=") && !l.trim().startsWith("#"))
    .map((l) => {
      const i = l.indexOf("=");
      return [l.slice(0, i).trim(), l.slice(i + 1).trim()];
    }),
);

const supabase = createClient(
  env.NEXT_PUBLIC_SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } },
);

const EMAIL = "test@isletme.com";
const PASSWORD = "Test1234!";

const { data, error } = await supabase.auth.admin.createUser({
  email: EMAIL,
  password: PASSWORD,
  email_confirm: true,
  user_metadata: { organization_name: "Test İşletmem" },
});

if (error) {
  console.log("HATA:", error.message);
} else {
  console.log("✅ Kullanıcı oluşturuldu:", data.user.email);
  console.log("   Şifre:", PASSWORD);
}
