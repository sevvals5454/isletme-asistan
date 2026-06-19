"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  Calendar,
  CalendarDays,
  Bell,
  BarChart3,
  Send,
  LogOut,
  Sparkles,
  Settings,
  Menu,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";

const navItems = [
  { href: "/dashboard", label: "Panel", icon: LayoutDashboard },
  { href: "/customers", label: "Müşteriler", icon: Users },
  { href: "/appointments", label: "Randevular", icon: Calendar },
  { href: "/calendar", label: "Takvim", icon: CalendarDays },
  { href: "/reminders", label: "Hatırlatmalar", icon: Bell },
  { href: "/reports", label: "Raporlar", icon: BarChart3 },
  { href: "/messages/bulk", label: "Toplu Mesaj", icon: Send },
  { href: "/settings", label: "Ayarlar", icon: Settings },
];

export function Sidebar({
  orgName,
  userEmail,
}: {
  orgName: string;
  userEmail: string;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);

  // Sayfa değişince mobil menüyü kapat.
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  // Önek çakışmasında (örn. /messages vs /messages/bulk) en uzun eşleşen aktif.
  const activeHref = navItems
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
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <Sparkles className="h-4 w-4" />
        </div>
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
    <nav className="flex-1 space-y-1 overflow-y-auto p-3">
      {navItems.map((item) => {
        const Icon = item.icon;
        const active = item.href === activeHref;
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={() => setOpen(false)}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
              active
                ? "bg-background font-medium text-foreground shadow-sm"
                : "text-muted-foreground hover:bg-background/50 hover:text-foreground",
            )}
          >
            <Icon className="h-4 w-4" />
            {item.label}
          </Link>
        );
      })}
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
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Sparkles className="h-4 w-4" />
          </div>
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
