"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Save, X } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { formatTurkishPhone, isValidTurkishMobile } from "@/lib/phone";

type Customer = {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  notes: string | null;
  kvkk_consent?: boolean | null;
  staff_id?: string | null;
  tags?: string[] | null;
  birth_date?: string | null;
};

export function CustomerForm({
  customer,
  staff = [],
}: {
  customer?: Customer;
  staff?: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [name, setName] = useState(customer?.name ?? "");
  const [phone, setPhone] = useState(
    customer?.phone ? formatTurkishPhone(customer.phone) : "",
  );
  const [email, setEmail] = useState(customer?.email ?? "");
  const [notes, setNotes] = useState(customer?.notes ?? "");
  const [kvkk, setKvkk] = useState(customer?.kvkk_consent ?? false);
  const [staffId, setStaffId] = useState(customer?.staff_id ?? "");
  const [birthDate, setBirthDate] = useState(customer?.birth_date ?? "");
  const [tags, setTags] = useState<string[]>(customer?.tags ?? []);
  const [tagInput, setTagInput] = useState("");
  const [loading, setLoading] = useState(false);

  const phoneInvalid = phone.trim() !== "" && !isValidTurkishMobile(phone);

  function addTag(raw: string) {
    const t = raw.trim().toLowerCase();
    if (t && !tags.includes(t)) setTags((prev) => [...prev, t]);
    setTagInput("");
  }
  function onTagKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addTag(tagInput);
    } else if (e.key === "Backspace" && !tagInput && tags.length) {
      setTags((prev) => prev.slice(0, -1));
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!customer && !kvkk) {
      toast.error("Devam etmek için KVKK aydınlatma onayı gerekli");
      return;
    }

    setLoading(true);

    const supabase = createClient();
    const consentGiven = kvkk && !(customer?.kvkk_consent ?? false);

    if (customer) {
      const { error } = await supabase
        .from("customers")
        .update({
          name,
          phone: phone || null,
          email: email || null,
          notes: notes || null,
          staff_id: staffId || null,
          birth_date: birthDate || null,
          tags,
          kvkk_consent: kvkk,
          // Onay yeni verildiyse zaman damgası bas; kaldırıldıysa temizle
          ...(consentGiven
            ? { kvkk_consent_at: new Date().toISOString() }
            : kvkk
              ? {}
              : { kvkk_consent_at: null }),
        })
        .eq("id", customer.id);

      if (error) {
        toast.error("Güncelleme başarısız", { description: error.message });
        setLoading(false);
        return;
      }

      toast.success("Müşteri güncellendi");
      router.refresh();
      setLoading(false);
    } else {
      const { data: membership } = await supabase
        .from("organization_members")
        .select("organization_id")
        .single();

      if (!membership) {
        toast.error("Organizasyon bulunamadı");
        setLoading(false);
        return;
      }

      const { data: created, error } = await supabase
        .from("customers")
        .insert({
          organization_id: membership.organization_id,
          name,
          phone: phone || null,
          email: email || null,
          notes: notes || null,
          staff_id: staffId || null,
          birth_date: birthDate || null,
          tags,
          kvkk_consent: kvkk,
          kvkk_consent_at: kvkk ? new Date().toISOString() : null,
        })
        .select("id")
        .single();

      if (error) {
        toast.error("Kayıt başarısız", { description: error.message });
        setLoading(false);
        return;
      }

      toast.success("Müşteri eklendi");
      router.push(`/customers/${created.id}`);
      router.refresh();
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <label htmlFor="name" className="text-sm font-medium">
            İsim *
          </label>
          <input
            id="name"
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
            placeholder="Ayşe Yılmaz"
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="phone" className="text-sm font-medium">
            Telefon
          </label>
          <input
            id="phone"
            type="tel"
            inputMode="tel"
            value={phone}
            onChange={(e) => setPhone(formatTurkishPhone(e.target.value))}
            className="w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
            placeholder="0532 123 45 67"
          />
          {phoneInvalid && (
            <p className="text-xs text-amber-600 dark:text-amber-500">
              Geçerli bir cep numarası girin (05XX XXX XX XX)
            </p>
          )}
        </div>

        <div className="space-y-2 md:col-span-2">
          <label htmlFor="email" className="text-sm font-medium">
            E-posta
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
            placeholder="ornek@email.com"
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="birth" className="text-sm font-medium">
            Doğum tarihi
          </label>
          <input
            id="birth"
            type="date"
            value={birthDate}
            onChange={(e) => setBirthDate(e.target.value)}
            className="w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
          <p className="text-xs text-muted-foreground">
            Doğum günü kutlama hatırlatması için (opsiyonel)
          </p>
        </div>

        {staff.length > 0 && (
          <div className="space-y-2 md:col-span-2">
            <label htmlFor="staff" className="text-sm font-medium">
              Sorumlu çalışan
            </label>
            <select
              id="staff"
              value={staffId}
              onChange={(e) => setStaffId(e.target.value)}
              className="w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <option value="">Atanmadı</option>
              {staff.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="space-y-2 md:col-span-2">
          <label htmlFor="notes" className="text-sm font-medium">
            Notlar
          </label>
          <textarea
            id="notes"
            rows={4}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
            placeholder="Müşteri hakkında önemli notlar, tercihler, alerjiler..."
          />
        </div>

        <div className="space-y-2 md:col-span-2">
          <label htmlFor="tags" className="text-sm font-medium">
            Etiketler
          </label>
          <div className="flex flex-wrap items-center gap-1.5 rounded-lg border bg-background px-2 py-1.5">
            {tags.map((t) => (
              <span
                key={t}
                className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-xs"
              >
                {t}
                <button
                  type="button"
                  onClick={() => setTags((prev) => prev.filter((x) => x !== t))}
                  aria-label={`${t} etiketini kaldır`}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))}
            <input
              id="tags"
              type="text"
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={onTagKeyDown}
              onBlur={() => tagInput && addTag(tagInput)}
              placeholder={tags.length ? "" : "vip, yeni… (Enter ile ekle)"}
              className="min-w-[120px] flex-1 bg-transparent px-1 py-0.5 text-sm outline-none"
            />
          </div>
          <p className="text-xs text-muted-foreground">
            Toplu mesajda segment olarak kullanılır. Enter veya virgülle ekle.
          </p>
        </div>
      </div>

      <label className="flex items-start gap-3 rounded-lg border bg-muted/30 p-3">
        <input
          type="checkbox"
          checked={kvkk}
          onChange={(e) => setKvkk(e.target.checked)}
          className="mt-0.5 h-4 w-4 shrink-0 rounded border-input"
        />
        <span className="text-xs text-muted-foreground">
          Müşterinin kişisel verilerinin (ad, telefon, e-posta) randevu ve
          iletişim amacıyla işlenmesi için <strong>KVKK kapsamında açık
          rıza</strong> alındığını onaylıyorum. Yeni müşteri için zorunludur.
        </span>
      </label>

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
        >
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Save className="h-4 w-4" />
          )}
          {customer ? "Değişiklikleri kaydet" : "Müşteri ekle"}
        </button>
      </div>
    </form>
  );
}
