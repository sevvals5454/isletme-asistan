import { createClient } from "@/lib/supabase/server";

export type Role = "owner" | "employee";

// Giriş yapmış kullanıcının rolü (üye olduğu ilk org'da). Yoksa null.
export async function getUserRole(): Promise<Role | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase
    .from("organization_members")
    .select("role")
    .eq("user_id", user.id)
    .single();
  return (data?.role as Role | undefined) ?? null;
}
