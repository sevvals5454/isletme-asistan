import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { type ReactNode } from "react";
import { SiteFooter } from "@/components/site-footer";

export function LegalShell({
  title,
  updated,
  children,
}: {
  title: string;
  updated: string;
  children: ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="border-b">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-6 py-4">
          <Link href="/" className="flex items-center gap-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/icon.svg"
              alt="TechİŞ"
              width={36}
              height={36}
              className="h-9 w-9 rounded-lg"
            />
            <div className="leading-tight">
              <div className="font-semibold">
                Tech<span className="text-primary">İŞ</span>
              </div>
              <div className="text-[11px] text-muted-foreground">
                İşletme Asistanı
              </div>
            </div>
          </Link>
          <Link
            href="/"
            className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Ana sayfa
          </Link>
        </div>
      </header>

      <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-12">
        <h1 className="text-3xl font-semibold tracking-tight">{title}</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Son güncelleme: {updated}
        </p>
        <div className="legal-prose mt-8 space-y-6 text-sm leading-relaxed text-foreground/90">
          {children}
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}

// Yasal metinlerde tekrar eden başlık + paragraf yardımcıları.
export function LegalSection({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="space-y-2">
      <h2 className="text-lg font-semibold text-foreground">{title}</h2>
      <div className="space-y-2 text-muted-foreground">{children}</div>
    </section>
  );
}
