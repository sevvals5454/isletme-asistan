"use client";

import { useState } from "react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";

export function EngagementSettings({
  orgId,
  initialDigest,
  initialInactive,
}: {
  orgId: string;
  initialDigest: boolean;
  initialInactive: boolean;
}) {
  const [digest, setDigest] = useState(initialDigest);
  const [inactive, setInactive] = useState(initialInactive);

  async function update(
    field: "notify_digest" | "notify_inactive",
    value: boolean,
    revert: (v: boolean) => void,
  ) {
    const supabase = createClient();
    const { error } = await supabase
      .from("organizations")
      .update({ [field]: value })
      .eq("id", orgId);
    if (error) {
      revert(!value);
      toast.error("Kaydedilemedi", {
        description: error.message.includes("notify")
          ? "Önce migration 034'ü çalıştırın."
          : error.message,
      });
    }
  }

  return (
    <div className="space-y-3">
      <Row
        label="Sabah özeti"
        desc="Her sabah o günkü randevu sayını bildirir."
        checked={digest}
        onChange={(v) => {
          setDigest(v);
          update("notify_digest", v, setDigest);
        }}
      />
      <Row
        label="“Geri dön” hatırlatması"
        desc="Birkaç gündür uğramadıysan nazik bir hatırlatma gönderir."
        checked={inactive}
        onChange={(v) => {
          setInactive(v);
          update("notify_inactive", v, setInactive);
        }}
      />
    </div>
  );
}

function Row({
  label,
  desc,
  checked,
  onChange,
}: {
  label: string;
  desc: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-start justify-between gap-3">
      <span className="min-w-0">
        <span className="text-sm font-medium">{label}</span>
        <span className="block text-xs text-muted-foreground">{desc}</span>
      </span>
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-1 h-4 w-4 shrink-0 rounded border-input accent-primary"
      />
    </label>
  );
}
