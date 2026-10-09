"use client";

import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Loader2, MailCheck, ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    const supabase = createClient();
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/callback?next=/reset-password`,
    });

    setLoading(false);
    if (error) {
      toast.error("Gönderilemedi", { description: error.message });
      return;
    }
    // Güvenlik: e-posta kayıtlı olmasa da aynı ekranı göster (adres sızdırma yok).
    setSent(true);
  }

  if (sent) {
    return (
      <div className="space-y-6 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary">
          <MailCheck className="h-7 w-7" />
        </div>
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold">E-postanı kontrol et</h1>
          <p className="text-sm text-muted-foreground">
            Eğer{" "}
            <span className="font-medium text-foreground">{email}</span> adresine
            ait bir hesap varsa, şifre sıfırlama linkini gönderdik. Gelen
            kutundaki linke tıklayıp yeni şifreni belirle.
          </p>
          <p className="text-xs text-muted-foreground">
            Mail birkaç dakikada gelmezse <strong>Spam / Gereksiz</strong>{" "}
            klasörüne de bak.
          </p>
        </div>
        <Link
          href="/login"
          className="inline-flex w-full items-center justify-center rounded-lg border py-2.5 text-sm font-medium hover:bg-muted"
        >
          Giriş sayfasına dön
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2 text-center">
        <h1 className="text-2xl font-semibold">Şifreni mi unuttun?</h1>
        <p className="text-sm text-muted-foreground">
          E-posta adresini gir, sana sıfırlama linki gönderelim
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <label htmlFor="email" className="text-sm font-medium">
            E-posta
          </label>
          <input
            id="email"
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring"
            placeholder="ornek@isletmem.com"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-primary py-2.5 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
        >
          {loading && <Loader2 className="h-4 w-4 animate-spin" />}
          Sıfırlama linki gönder
        </button>
      </form>

      <Link
        href="/login"
        className="flex items-center justify-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Girişe dön
      </Link>
    </div>
  );
}
