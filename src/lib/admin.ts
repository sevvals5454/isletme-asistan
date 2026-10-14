// Süper-admin (kurucu) e-postaları. Sadece bunlar /admin paneline erişir.
// Vercel'de ADMIN_EMAILS env'iyle değiştirilebilir (virgülle ayır); yoksa varsayılan.
const RAW = process.env.ADMIN_EMAILS || "veritechsoft@gmail.com";

export const ADMIN_EMAILS = RAW.split(",")
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);

export function isAdminEmail(email: string | null | undefined): boolean {
  return !!email && ADMIN_EMAILS.includes(email.toLowerCase());
}
