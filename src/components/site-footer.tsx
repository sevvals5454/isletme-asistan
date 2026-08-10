import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="border-t">
      <div className="mx-auto flex max-w-6xl flex-col gap-4 px-6 py-8 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
        <div>
          © {"2026"} TechİŞ · Küçük işletmeler için randevu & müşteri yönetimi
          <div className="mt-0.5 text-xs">
            Bir <span className="font-medium text-foreground">VeriTechSoft</span>{" "}
            ürünüdür
          </div>
        </div>
        <nav className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <Link href="/gizlilik" className="hover:text-foreground">
            Gizlilik
          </Link>
          <Link href="/kullanim-kosullari" className="hover:text-foreground">
            Kullanım Koşulları
          </Link>
          <Link href="/kvkk" className="hover:text-foreground">
            KVKK Aydınlatma
          </Link>
          <a
            href="mailto:veritechsoft@gmail.com"
            className="hover:text-foreground"
          >
            İletişim
          </a>
        </nav>
      </div>
    </footer>
  );
}
