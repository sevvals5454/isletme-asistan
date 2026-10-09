"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { Loader2, Eye, EyeOff, KeyRound } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);
  const [hasSession, setHasSession] = useState(false);

  // Sıfırlama linkiyle gelince geçerli bir oturum olmalı; yoksa uyar.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const supabase = createClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!cancelled) {
        setHasSession(!!session);
        setChecking(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 6) {
      toast.error("Şifre en az 6 karakter olmalı");
      return;
    }
    if (password !== confirm) {
      toast.error("Şifreler eşleşmiyor");
      return;
    }
    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) {
      toast.error("Güncellenemedi", { description: error.message });
      return;
    }
    toast.success("Şifren güncellendi");
    router.push("/dashboard");
    router.refresh();
  }

  if (checking) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!hasSession) {
    return (
      <div className="space-y-6 text-center">
        <h1 className="text-2xl font-semibold">Bağlantı geçersiz</h1>
        <p className="text-sm text-muted-foreground">
          Şifre sıfırlama bağlantısı geçersiz veya süresi dolmuş olabilir.
          Lütfen yeni bir sıfırlama linki iste.
        </p>
        <Link
          href="/forgot-password"
          className="inline-flex w-full items-center justify-center rounded-lg bg-primary py-2.5 text-sm font-medium text-primary-foreground hover:opacity-90"
        >
          Yeni link iste
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2 text-center">
        <div className="mx-auto mb-2 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary">
          <KeyRound className="h-7 w-7" />
        </div>
        <h1 className="text-2xl font-semibold">Yeni şifre belirle</h1>
        <p className="text-sm text-muted-foreground">
          Hesabın için yeni bir şifre oluştur
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <label htmlFor="password" className="text-sm font-medium">
            Yeni şifre
          </label>
          <div className="relative">
            <input
              id="password"
              type={showPassword ? "text" : "password"}
              required
              minLength={6}
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg border bg-background px-3 py-2 pr-10 text-sm outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring"
              placeholder="En az 6 karakter"
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="absolute inset-y-0 right-0 flex items-center px-3 text-muted-foreground hover:text-foreground"
              aria-label={showPassword ? "Şifreyi gizle" : "Şifreyi göster"}
            >
              {showPassword ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </button>
          </div>
        </div>

        <div className="space-y-2">
          <label htmlFor="confirm" className="text-sm font-medium">
            Yeni şifre (tekrar)
          </label>
          <input
            id="confirm"
            type={showPassword ? "text" : "password"}
            required
            minLength={6}
            autoComplete="new-password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            className="w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring"
            placeholder="Şifreni tekrar gir"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-primary py-2.5 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
        >
          {loading && <Loader2 className="h-4 w-4 animate-spin" />}
          Şifreyi güncelle
        </button>
      </form>
    </div>
  );
}
