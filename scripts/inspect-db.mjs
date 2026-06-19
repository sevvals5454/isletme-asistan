// Canlı Supabase DB'sini introspect eder: tablolar var mı, satır sayıları ne?
// service_role (secret) key ile çalışır → RLS bypass.
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";

// .env.local'i basitçe oku
const env = Object.fromEntries(
  readFileSync(new URL("../.env.local", import.meta.url), "utf8")
    .split("\n")
    .filter((l) => l.includes("=") && !l.trim().startsWith("#"))
    .map((l) => {
      const i = l.indexOf("=");
      return [l.slice(0, i).trim(), l.slice(i + 1).trim()];
    }),
);

const url = env.NEXT_PUBLIC_SUPABASE_URL;
const key = env.SUPABASE_SERVICE_ROLE_KEY;
console.log("URL:", url);

const supabase = createClient(url, key, {
  auth: { persistSession: false },
});

const tables = [
  "organizations",
  "organization_members",
  "customers",
  "messages",
  "ai_logs",
  "services",
  "appointments",
];

let anyExists = false;
for (const t of tables) {
  const { count, error } = await supabase
    .from(t)
    .select("*", { count: "exact", head: true });
  if (error) {
    console.log(`❌ ${t.padEnd(22)} → ${error.code ?? ""} ${error.message}`);
  } else {
    anyExists = true;
    console.log(`✅ ${t.padEnd(22)} → ${count} satır`);
  }
}

if (!anyExists) {
  console.log(
    "\n⚠️  Hiçbir tablo bulunamadı → schema.sql henüz SQL Editor'de çalıştırılmamış.",
  );
}
