"use client";

import { Lock } from "lucide-react";
import { PlanChooser } from "@/components/plan-chooser";

export function AccessLock({
  role,
  orgId,
}: {
  role: "owner" | "employee";
  orgId: string;
}) {
  // Çalışan: ödeme kararı patronundur.
  if (role === "employee") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-muted/30 p-4">
        <div className="w-full max-w-sm rounded-2xl border bg-card p-6 text-center shadow-sm">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400">
            <Lock className="h-7 w-7" />
          </div>
          <h1 className="text-xl font-semibold">Deneme süresi doldu</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            İşletmenin deneme süresi sona erdi. Kullanmaya devam edebilmek için{" "}
            <strong>işletme sahibinin bir paket seçmesi</strong> gerekiyor.
            Lütfen yöneticinle iletişime geç.
          </p>
        </div>
      </div>
    );
  }

  // Patron: paket seçim ekranı.
  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 p-4">
      <div className="w-full max-w-xl">
        <div className="mb-5 rounded-2xl border bg-card p-6 text-center shadow-sm">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400">
            <Lock className="h-7 w-7" />
          </div>
          <h1 className="text-xl font-semibold">Deneme süren doldu</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            14 günlük ücretsiz denemen sona erdi. Kaldığın yerden devam etmek
            için bir paket seç — verilerin güvende ve seni bekliyor.
          </p>
        </div>
        <PlanChooser orgId={orgId} />
        <p className="mt-5 text-center text-xs text-muted-foreground">
          Sorun için: veritechsoft@gmail.com
        </p>
      </div>
    </div>
  );
}
