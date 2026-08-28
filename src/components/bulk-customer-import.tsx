"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Loader2, Upload, Check, X, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { formatTurkishPhone } from "@/lib/phone";

/** Ham telefonu 0XXXXXXXXXX rakam dizisine indirger (karşılaştırma için). */
function normalizePhone(raw: string): string {
  let d = raw.replace(/\D/g, "");
  if (d.startsWith("90") && d.length === 12) d = "0" + d.slice(2);
  else if (d.length === 10 && d[0] === "5") d = "0" + d;
  return d;
}

type Status = "yeni" | "var" | "gecersiz";
type Row = { name: string; phone: string | null; status: Status };

function parseLines(text: string, existing: Set<string>): Row[] {
  const seen = new Set(existing);
  const seenNames = new Set<string>();
  const rows: Row[] = [];
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line) continue;

    // Satırdaki telefon adayını bul (en az ~10 haneli rakam dizisi).
    let name = line;
    let phone: string | null = null;
    const m = line.match(/(\+?\d[\d\s().\-/]{8,}\d)/);
    if (m && m.index !== undefined) {
      const nd = normalizePhone(m[1]);
      if (nd.length === 10 || nd.length === 11) {
        phone = formatTurkishPhone(nd);
        name = line.slice(0, m.index) + line.slice(m.index + m[1].length);
      }
    }

    // İsim temizliği: ayraçlar ve fazla boşluklar.
    name = name
      .replace(/[,;:\t]+/g, " ")
      .replace(/\s*-\s*/g, " ")
      .replace(/\s+/g, " ")
      .trim();

    let status: Status;
    if (!name) {
      status = "gecersiz";
    } else if (phone) {
      const key = normalizePhone(phone);
      if (seen.has(key)) status = "var";
      else {
        status = "yeni";
        seen.add(key);
      }
    } else {
      // Telefonsuz: aynı isim iki kez yapıştırıldıysa mükerrer sayma.
      const nk = name.toLowerCase();
      if (seenNames.has(nk)) status = "var";
      else {
        status = "yeni";
        seenNames.add(nk);
      }
    }
    rows.push({ name: name || "(isim yok)", phone, status });
  }
  return rows;
}

export function BulkCustomerImport({
  orgId,
  existingPhones,
}: {
  orgId: string;
  existingPhones: string[];
}) {
  const router = useRouter();
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);

  const existingSet = useMemo(
    () => new Set(existingPhones.map(normalizePhone).filter(Boolean)),
    [existingPhones],
  );

  const rows = useMemo(
    () => parseLines(text, existingSet),
    [text, existingSet],
  );
  const counts = useMemo(() => {
    let yeni = 0,
      varr = 0,
      gecersiz = 0;
    for (const r of rows) {
      if (r.status === "yeni") yeni++;
      else if (r.status === "var") varr++;
      else gecersiz++;
    }
    return { yeni, varr, gecersiz };
  }, [rows]);

  async function doImport() {
    const toAdd = rows.filter((r) => r.status === "yeni");
    if (!toAdd.length) {
      toast.error("Eklenecek yeni müşteri yok");
      return;
    }
    setLoading(true);
    const supabase = createClient();
    const payload = toAdd.map((r) => ({
      organization_id: orgId,
      name: r.name,
      phone: r.phone,
      kvkk_consent: false, // Toplu içe aktarımda pazarlama izni verilmez (KVKK güvenli).
    }));
    // Büyük listeler için 500'lük parçalar hâlinde ekle.
    let added = 0;
    for (let i = 0; i < payload.length; i += 500) {
      const chunk = payload.slice(i, i + 500);
      const { error } = await supabase.from("customers").insert(chunk);
      if (error) {
        setLoading(false);
        toast.error("İçe aktarma sırasında hata", {
          description: `${added} eklendi, sonra durdu: ${error.message}`,
        });
        return;
      }
      added += chunk.length;
    }
    setLoading(false);
    toast.success(`${added} müşteri eklendi 🎉`);
    router.push("/customers");
    router.refresh();
  }

  const statusPill: Record<Status, string> = {
    yeni: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
    var: "bg-muted text-muted-foreground",
    gecersiz:
      "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  };
  const statusLabel: Record<Status, string> = {
    yeni: "Yeni",
    var: "Zaten var",
    gecersiz: "İsim yok",
  };

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/customers"
          className="mb-3 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Müşteriler
        </Link>
        <h1 className="text-2xl font-semibold">Toplu müşteri ekle</h1>
        <p className="text-sm text-muted-foreground">
          Her satıra bir müşteri yaz: <strong>ad ve telefon</strong>. Elindeki
          listeyi (defter, Excel, WhatsApp) buraya yapıştırman yeterli.
        </p>
      </div>

      <div className="rounded-xl border bg-card p-4 sm:p-6">
        <label className="mb-2 block text-sm font-medium">Müşteri listesi</label>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={10}
          placeholder={
            "Ayşe Yılmaz 0532 123 45 67\nMehmet Demir, 0505 987 65 43\nZeynep Kaya\n..."
          }
          className="w-full rounded-lg border bg-background px-3 py-2 font-mono text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
        <p className="mt-2 text-xs text-muted-foreground">
          Telefon otomatik ayrılır; telefonu olmayan müşteriyi de ekleyebilirsin.
          Aynı telefon zaten kayıtlıysa tekrar eklenmez.
        </p>
      </div>

      {rows.length > 0 && (
        <div className="rounded-xl border bg-card">
          <div className="flex flex-wrap items-center gap-2 border-b p-4 text-sm">
            <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2.5 py-1 font-medium text-green-700 dark:bg-green-900/30 dark:text-green-400">
              <Check className="h-3.5 w-3.5" /> {counts.yeni} yeni
            </span>
            {counts.varr > 0 && (
              <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 font-medium text-muted-foreground">
                {counts.varr} zaten var
              </span>
            )}
            {counts.gecersiz > 0 && (
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-1 font-medium text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                <AlertTriangle className="h-3.5 w-3.5" /> {counts.gecersiz} isimsiz
                (atlanır)
              </span>
            )}
          </div>

          <div className="max-h-80 overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 border-b bg-muted/30 text-left text-xs text-muted-foreground">
                <tr>
                  <th className="px-4 py-2 font-medium">Ad</th>
                  <th className="px-4 py-2 font-medium">Telefon</th>
                  <th className="px-4 py-2 font-medium">Durum</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {rows.slice(0, 300).map((r, i) => (
                  <tr key={i} className={r.status === "gecersiz" ? "opacity-60" : ""}>
                    <td className="px-4 py-2 font-medium">{r.name}</td>
                    <td className="px-4 py-2 text-muted-foreground">
                      {r.phone ?? "—"}
                    </td>
                    <td className="px-4 py-2">
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusPill[r.status]}`}
                      >
                        {statusLabel[r.status]}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {rows.length > 300 && (
              <p className="p-3 text-center text-xs text-muted-foreground">
                +{rows.length - 300} satır daha (hepsi eklenecek)
              </p>
            )}
          </div>

          <div className="flex items-center justify-between gap-3 border-t p-4">
            <button
              onClick={() => setText("")}
              className="inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm hover:bg-muted"
            >
              <X className="h-4 w-4" />
              Temizle
            </button>
            <button
              onClick={doImport}
              disabled={loading || counts.yeni === 0}
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Upload className="h-4 w-4" />
              )}
              {counts.yeni} müşteriyi ekle
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
