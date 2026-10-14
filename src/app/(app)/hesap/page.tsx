import { createClient } from "@/lib/supabase/server";
import { ChangePassword } from "@/components/change-password";
import { LogoutButton } from "@/components/logout-button";

export default async function HesapPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: membership } = await supabase
    .from("organization_members")
    .select("role")
    .eq("user_id", user?.id ?? "")
    .maybeSingle();
  const role = membership?.role === "owner" ? "Sahip" : "Çalışan";

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Hesabım</h1>
        <p className="text-sm text-muted-foreground">
          Hesap bilgilerin ve şifren
        </p>
      </div>

      <div className="rounded-xl border bg-card p-6">
        <div className="space-y-1 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">E-posta</span>
            <span>{user?.email}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Rol</span>
            <span>{role}</span>
          </div>
        </div>
        <ChangePassword />
      </div>

      <LogoutButton />
    </div>
  );
}
