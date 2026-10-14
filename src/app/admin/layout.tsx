import { ShieldCheck } from "lucide-react";

export const metadata = {
  title: "TechİŞ Admin",
};

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-muted/20">
      <header className="border-b bg-background">
        <div className="mx-auto flex max-w-5xl items-center gap-2 px-4 py-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-600 text-white">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div className="leading-tight">
            <div className="text-sm font-semibold">
              Tech<span className="text-red-600">İŞ</span> Admin
            </div>
            <div className="text-[11px] text-muted-foreground">
              Yönetim paneli
            </div>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-6">{children}</main>
    </div>
  );
}
