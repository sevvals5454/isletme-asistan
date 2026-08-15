import { Sparkles, UserMinus, Info } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { analyzeChurn } from "@/lib/insights";
import { ChurnList } from "@/components/insights/churn-list";

export const metadata = { title: "Akıllı Asistan — TechİŞ" };

export default async function AsistanPage() {
  const supabase = await createClient();
  const now = new Date();

  const [
    { data: customers },
    { data: appointments },
    { data: packages },
    { data: org },
  ] = await Promise.all([
    supabase.from("customers").select("id, name, phone"),
    supabase
      .from("appointments")
      .select("customer_id, start_at, status, price, services(name)"),
    supabase.from("customer_packages").select("customer_id, type, price, expires_at"),
    supabase.from("organizations").select("name").single(),
  ]);

  // Özel şablonlar (tolerant — kolon yoksa varsayılana düşer).
  const { data: orgTpl } = await supabase
    .from("organizations")
    .select("message_templates")
    .single();
  const templates =
    (orgTpl as { message_templates?: Record<string, string> | null } | null)
      ?.message_templates ?? null;

  const churn = analyzeChurn({
    now,
    customers: (customers ?? []) as {
      id: string;
      name: string;
      phone: string | null;
    }[],
    appointments: (appointments ?? []) as never,
    packages: (packages ?? []) as never,
  });

  return (
    <div className="space-y-8">
      <div>
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          <h1 className="text-2xl font-semibold">Akıllı Asistan</h1>
        </div>
        <p className="text-sm text-muted-foreground">
          İşletmenin gerçek verilerinden çıkarılan analizler ve öneriler
        </p>
      </div>

      {/* Müşteri Kaybı Analizi */}
      <section className="rounded-xl border bg-card p-6">
        <div className="mb-1 flex items-center gap-2">
          <UserMinus className="h-4 w-4" />
          <h2 className="font-semibold">Müşteri kaybı analizi</h2>
        </div>
        <p className="mb-4 text-sm text-muted-foreground">
          Düzenli gelirken ziyaret aralığını aşan, kaybetme riski olan müşteriler
        </p>

        {!churn.enough ? (
          <div className="flex items-start gap-2 rounded-lg bg-muted/50 p-4 text-sm text-muted-foreground">
            <Info className="mt-0.5 h-4 w-4 shrink-0" />
            <span>
              Bu analiz için daha fazla müşteri ve ziyaret verisine ihtiyaç var.
              Müşteriler düzenli randevu aldıkça risk analizi burada görünecek.
            </span>
          </div>
        ) : churn.customers.length === 0 ? (
          <div className="flex items-start gap-2 rounded-lg bg-green-50 p-4 text-sm text-green-700 dark:bg-green-900/20 dark:text-green-400">
            <Info className="mt-0.5 h-4 w-4 shrink-0" />
            <span>
              Şu an kaybetme riski yüksek müşteri görünmüyor. Müşterilerin düzenli
              geliyor 👍
            </span>
          </div>
        ) : (
          <>
            <p className="mb-3 text-sm">
              <strong>{churn.customers.length}</strong> müşteri normal ziyaret
              aralığını aşmış görünüyor.
            </p>
            <ChurnList
              customers={churn.customers}
              orgName={org?.name ?? ""}
              templates={templates}
            />
          </>
        )}
      </section>
    </div>
  );
}
