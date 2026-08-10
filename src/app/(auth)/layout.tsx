import Link from "next/link";
import { SiteFooter } from "@/components/site-footer";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="border-b">
        <div className="mx-auto flex max-w-6xl items-center px-6 py-4">
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
        </div>
      </header>
      <main className="flex flex-1 items-center justify-center px-6 py-12">
        <div className="w-full max-w-md">{children}</div>
      </main>
      <SiteFooter />
    </div>
  );
}
