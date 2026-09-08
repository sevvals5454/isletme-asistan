import { BellRing } from "lucide-react";
import { PushToggle } from "@/components/push-toggle";

export default function BildirimlerPage() {
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Bildirimler</h1>
        <p className="text-sm text-muted-foreground">
          Randevu hatırlatmaları ve her sabah günün özeti telefonuna gelsin.
        </p>
      </div>

      <div className="space-y-4 rounded-xl border bg-card p-6">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
            <BellRing className="h-5 w-5" />
          </div>
          <div>
            <p className="font-medium">Bu cihazda bildirimleri aç</p>
            <p className="text-sm text-muted-foreground">
              Randevu saatinden önce hatırlatma + her sabah{" "}
              <strong>“Bugün X randevun var”</strong> özeti alırsın — uygulama
              kapalı olsa bile.
            </p>
          </div>
        </div>

        <PushToggle />

        <div className="rounded-lg bg-muted/50 p-3 text-xs text-muted-foreground">
          <strong>iPhone kullanıyorsan:</strong> Safari&apos;de alttaki{" "}
          <strong>Paylaş</strong> ikonuna bas →{" "}
          <strong>“Ana Ekrana Ekle”</strong> de, uygulamayı ana ekrandan aç,
          sonra buradan <strong>“Bildirimleri aç”</strong>a bas. (Apple&apos;ın
          kuralı: iPhone&apos;da bildirim yalnız ana ekrana eklenen uygulamada
          çalışır.)
        </div>
      </div>

      <p className="text-xs text-muted-foreground">
        Not: Her cihazda ayrı ayrı açman gerekir (telefon, tablet, bilgisayar).
        Bildirimler yalnız izin verdiğin cihaza gelir.
      </p>
    </div>
  );
}
