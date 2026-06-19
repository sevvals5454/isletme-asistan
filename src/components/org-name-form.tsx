"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Save } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";

export function OrgNameForm({
  orgId,
  initialName,
}: {
  orgId: string;
  initialName: string;
}) {
  const router = useRouter();
  const [name, setName] = useState(initialName);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (name.trim().length === 0) {
      toast.error("İşletme adı boş olamaz");
      return;
    }

    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase
      .from("organizations")
      .update({ name: name.trim() })
      .eq("id", orgId);

    if (error) {
      toast.error("Kaydedilemedi", { description: error.message });
      setLoading(false);
      return;
    }

    toast.success("İşletme adı güncellendi");
    router.refresh();
    setLoading(false);
  }

  return (
    <form onSubmit={handleSubmit} className="flex items-end gap-3">
      <div className="flex-1 space-y-2">
        <label htmlFor="orgName" className="text-sm font-medium">
          İşletme adı
        </label>
        <input
          id="orgName"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
      </div>
      <button
        type="submit"
        disabled={loading || name === initialName}
        className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
      >
        {loading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Save className="h-4 w-4" />
        )}
        Kaydet
      </button>
    </form>
  );
}
