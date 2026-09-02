import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { MessageTemplatesManager } from "@/components/message-templates-manager";
import type { MessageKind } from "@/lib/templates";

export default async function MessageTemplatesPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: membership } = await supabase
    .from("organization_members")
    .select("organization_id")
    .eq("user_id", user?.id ?? "")
    .maybeSingle();

  let initial: Partial<Record<MessageKind, string>> = {};
  if (membership) {
    const { data: org } = await supabase
      .from("organizations")
      .select("message_templates")
      .eq("id", membership.organization_id)
      .maybeSingle();
    initial =
      ((org as { message_templates?: Partial<Record<MessageKind, string>> | null } | null)
        ?.message_templates ?? {}) as Partial<Record<MessageKind, string>>;
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <Link
          href="/messages/bulk"
          className="mb-3 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Toplu mesaj
        </Link>
        <h1 className="text-2xl font-semibold">Mesaj şablonları</h1>
        <p className="text-sm text-muted-foreground">
          Müşterilere giden hazır mesajları kendi dilinle düzenle. İsim her zaman
          otomatik eklenir.
        </p>
      </div>
      <MessageTemplatesManager initial={initial} />
    </div>
  );
}
