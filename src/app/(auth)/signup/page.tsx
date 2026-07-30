"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export default function SignupPage() {
  const router = useRouter();
  const [orgName, setOrgName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    const supabase = createClient();
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { organization_name: orgName },
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (error) {
      const msg = /already registered|already exists|registered/i.test(
        error.message,
      )
        ? "Bu e-posta zaten kayıtlı. Lütfen giriş yapın veya başka bir e-posta kullanın."
        : error.message;
      toast.error("Kayıt başarısız", { description: msg });
      setLoading(false);
      return;
    }

    // Onay kapalıysa signUp doğrudan oturum döner → panele git.
    if (data.session) {
      toast.success("Hesabınız oluşturuldu!");
      router.push("/dashboard");
      router.refresh();
      return;
    }

    // Onay açıksa e-posta doğrulaması gerekir.
    toast.success("Kayıt başarılı", {
      description: "E-postanıza gelen onay linkine tıklayın.",
    });
    router.push("/login");
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2 text-center">
        <h1 className="text-2xl font-semibold">Hemen başlayın</h1>
        <p className="text-sm text-muted-foreground">
          Ücretsiz hesap oluşturun, dakikalar içinde kullanmaya başlayın
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <label htmlFor="orgName" className="text-sm font-medium">
            İşletme adı
          </label>
          <input
            id="orgName"
            type="text"
            required
            value={orgName}
            onChange={(e) => setOrgName(e.target.value)}
            className="w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring"
            placeholder="Örn: Lara Güzellik Salonu"
          />
        </div>

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

        <div className="space-y-2">
          <label htmlFor="password" className="text-sm font-medium">
            Şifre
          </label>
          <input
            id="password"
            type="password"
            required
            minLength={6}
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring"
            placeholder="En az 6 karakter"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-primary py-2.5 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
        >
          {loading && <Loader2 className="h-4 w-4 animate-spin" />}
          Hesap oluştur
        </button>

        <p className="text-center text-xs text-muted-foreground">
          Hesap oluşturarak{" "}
          <Link href="/kullanim-kosullari" className="underline hover:text-foreground">
            Kullanım Koşulları
          </Link>
          ,{" "}
          <Link href="/gizlilik" className="underline hover:text-foreground">
            Gizlilik Politikası
          </Link>{" "}
          ve{" "}
          <Link href="/kvkk" className="underline hover:text-foreground">
            KVKK Aydınlatma Metni
          </Link>
          ’ni kabul etmiş olursunuz.
        </p>
      </form>

      <p className="text-center text-sm text-muted-foreground">
        Zaten hesabınız var mı?{" "}
        <Link href="/login" className="font-medium text-foreground hover:underline">
          Giriş yapın
        </Link>
      </p>
    </div>
  );
}
