"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Sparkles,
  Users,
  StickyNote,
  Calendar,
  CalendarDays,
  Bell,
  BellRing,
  BarChart3,
  TrendingDown,
  Package,
  Send,
  LogOut,
  Settings,
  CreditCard,
  HelpCircle,
  Menu,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";

type NavItem = {
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
  color: string; // ikon kutusu rengi (statik Tailwind sınıfları)
  ownerOnly?: boolean;
};

// Menü, kullanıcı kafasında net otursun diye başlıklı gruplara ayrıldı.
// Her maddeye ayırt etmesi kolay olsun diye renkli ikon verildi.
const navSections: { title?: string; items: NavItem[] }[] = [
  {
    items: [
      {
        href: "/dashboard",
        label: "Ana Sayfa",
        icon: LayoutDashboard,
        color: "bg-indigo-500 text-white",
      },
    ],
  },
  {
    title: "Müşteri & Randevu",
    items: [
      {
        href: "/customers",
        label: "Müşteriler",
        icon: Users,
        color: "bg-blue-500 text-white",
      },
      {
        href: "/appointments",
        label: "Randevular",
        icon: Calendar,
        color: "bg-violet-500 text-white",
      },
      {
        href: "/calendar",
        label: "Takvim",
        icon: CalendarDays,
        color: "bg-fuchsia-500 text-white",
      },
      {
        href: "/reminders",
        label: "Hatırlatmalar",
        icon: Bell,
        color: "bg-amber-500 text-white",
      },
      {
        href: "/notlar",
        label: "Notlar",
        icon: StickyNote,
        color: "bg-yellow-500 text-white",
      },
    ],
  },
  {
    title: "İşletme",
    items: [
      {
        href: "/asistan",
        label: "Akıllı Asistan",
        icon: Sparkles,
        color: "bg-sky-500 text-white",
        ownerOnly: true,
      },
      {
        href: "/reports",
        label: "Raporlar",
        icon: BarChart3,
        color: "bg-green-500 text-white",
        ownerOnly: true,
      },
      {
        href: "/expenses",
        label: "Giderler",
        icon: TrendingDown,
        color: "bg-rose-500 text-white",
        ownerOnly: true,
      },
      {
        href: "/urunler",
        label: "Ürünler & Stok",
        icon: Package,
        color: "bg-orange-500 text-white",
      },
    ],
  },
  {
    title: "Mesaj & Bildirim",
    items: [
      {
        href: "/messages/bulk",
        label: "Toplu Mesaj",
        icon: Send,
        color: "bg-teal-500 text-white",
      },
      {
        href: "/bildirimler",
        label: "Bildirimleri Aç",
        icon: BellRing,
        color: "bg-pink-500 text-white",
      },
    ],
  },
  {
    title: "Ayarlar",
    items: [
      {
        href: "/abonelik",
        label: "Abonelik",
        icon: CreditCard,
        color: "bg-emerald-500 text-white",
        ownerOnly: true,
      },
      {
        href: "/settings",
        label: "Ayarlar",
        icon: Settings,
        color: "bg-slate-500 text-white",
        ownerOnly: true,
      },
      {
        href: "/rehber",
        label: "Yardım",
        icon: HelpCircle,
        color: "bg-cyan-500 text-white",
      },
    ],
  },
];

export function Sidebar({
  orgName,
  userEmail,
  role = "owner",
}: {
  orgName: string;
  userEmail: string;
  role?: "owner" | "employee";
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  // Not: mobil menü her nav link tıklamasında onClick ile zaten kapanıyor.

  // Çalışan: gelir-gider/rapor/asistan/ayarlar menülerini görmez.
  // Rol'e göre filtrele; içi boşalan grup başlığı gösterilmez.
  const sections = navSections
    .map((s) => ({
      ...s,
      items:
        role === "owner" ? s.items : s.items.filter((i) => !i.ownerOnly),
    }))
    .filter((s) => s.items.length > 0);
  const items = sections.flatMap((s) => s.items);

  // Önek çakışmasında (örn. /messages vs /messages/bulk) en uzun eşleşen aktif.
  const activeHref = items
    .filter((i) => pathname === i.href || pathname.startsWith(i.href + "/"))
    .sort((a, b) => b.href.length - a.href.length)[0]?.href;

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  const header = (
    <div className="border-b p-4">
      <div className="flex items-center gap-2">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/icon.png"
          alt="TechİŞ"
          width={32}
          height={32}
          className="h-8 w-8 rounded-lg"
        />
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-semibold">{orgName}</div>
          <div className="truncate text-xs text-muted-foreground">
            {userEmail}
          </div>
        </div>
      </div>
    </div>
  );

  const nav = (
    <nav className="flex-1 overflow-y-auto p-3">
      {sections.map((section, si) => (
        <div key={section.title ?? si} className={si > 0 ? "mt-4" : undefined}>
          {section.title && (
            <div className="px-3 pb-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground/70">
              {section.title}
            </div>
          )}
          <div className="space-y-1">
            {section.items.map((item) => {
              const Icon = item.icon;
              const active = item.href === activeHref;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-2 py-1.5 text-sm transition-colors",
                    active
                      ? "bg-background font-medium text-foreground shadow-sm"
                      : "text-muted-foreground hover:bg-background/50 hover:text-foreground",
                  )}
                >
                  <span
                    className={cn(
                      "flex h-7 w-7 shrink-0 items-center justify-center rounded-lg",
                      item.color,
                    )}
                  >
                    <Icon className="h-4 w-4" />
                  </span>
                  {item.label}
                </Link>
              );
            })}
          </div>
        </div>
      ))}
    </nav>
  );

  const logout = (
    <div className="border-t p-3">
      <button
        onClick={handleLogout}
        className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-background/50 hover:text-foreground"
      >
        <LogOut className="h-4 w-4" />
        Çıkış yap
      </button>
    </div>
  );

  return (
    <>
      {/* Mobil üst bar */}
      <div className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b bg-background px-4 md:hidden">
        <button
          onClick={() => setOpen(true)}
          className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
          aria-label="Menüyü aç"
        >
          <Menu className="h-5 w-5" />
        </button>
        <div className="flex min-w-0 items-center gap-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/icon.png"
            alt="TechİŞ"
            width={28}
            height={28}
            className="h-7 w-7 shrink-0 rounded-lg"
          />
          <span className="truncate text-sm font-semibold">{orgName}</span>
        </div>
      </div>

      {/* Mobil açılır menü (drawer) */}
      {open && (
        <div className="md:hidden">
          <div
            className="fixed inset-0 z-40 bg-black/40"
            onClick={() => setOpen(false)}
          />
          <aside className="fixed inset-y-0 left-0 z-50 flex w-64 flex-col bg-background shadow-xl">
            <div className="flex items-center justify-between border-b p-2 pl-4">
              <span className="text-sm font-semibold">Menü</span>
              <button
                onClick={() => setOpen(false)}
                className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                aria-label="Menüyü kapat"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            {header}
            {nav}
            {logout}
          </aside>
        </div>
      )}

      {/* Masaüstü kenar çubuğu (sabit) */}
      <aside className="fixed inset-y-0 left-0 z-20 hidden w-64 flex-col border-r bg-muted/30 md:flex">
        {header}
        {nav}
        {logout}
      </aside>
    </>
  );
}
