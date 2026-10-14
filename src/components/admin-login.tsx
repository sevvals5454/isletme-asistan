"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, ShieldCheck, Eye, EyeOff } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export function AdminLogin({
  loggedInEmail,
}: {
  loggedInEmail: string | null;
}) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    setLoading(false);
    if (error) {
      toast.error("Giriş başarısız", { description: error.message });
      return;
    }
    // Server tekrar isAdmin kontrol eder; admin değilse yine bu ekran gelir.
    router.refresh();
  }

  return (
    <div className="mx-auto mt-10 max-w-sm">
      <div className="rounded-2xl border bg-card p-6 shadow-sm">
        <div className="mb-4 flex flex-col items-center text-center">
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-red-600 text-white">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <h1 className="text-lg font-semibold">Admin Girişi</h1>
          <p className="text-sm text-muted-foreground">
            Yönetim paneline erişmek için admin hesabıyla giriş yap
          </p>
        </div>

        {loggedInEmail && (
          <div className="mb-4 rounded-lg bg-amber-100 px-3 py-2 text-xs text-amber-900">
            Şu an <strong>{loggedInEmail}</strong> ile giriş yapılmış — bu hesap
            admin değil. Admin hesabıyla giriş yap.
          </div>
        )}

        <form onSubmit={submit} className="space-y-3">
          <input
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Admin e-posta"
            className="w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
          <div className="relative">
            <input
              type={show ? "text" : "password"}
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Şifre"
              className="w-full rounded-lg border bg-background px-3 py-2 pr-10 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
            <button
              type="button"
              onClick={() => setShow((v) => !v)}
              className="absolute inset-y-0 right-0 flex items-center px-3 text-muted-foreground hover:text-foreground"
              aria-label={show ? "Şifreyi gizle" : "Şifreyi göster"}
            >
              {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          <button
            type="submit"
            disabled={loading}
            className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-primary py-2.5 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
          >
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            Giriş yap
          </button>
        </form>
      </div>
    </div>
  );
}
