import { createClient } from "@/lib/supabase/server";
import { NotesView, type Note } from "@/components/notes-view";

export const metadata = { title: "Notlar — TechİŞ" };

export default async function NotlarPage() {
  const supabase = await createClient();

  const { data: membership } = await supabase
    .from("organization_members")
    .select("organization_id")
    .single();
  const orgId = membership?.organization_id ?? "";

  // migration 019 çalışmamışsa tablo yok → boş liste (kırılmaz).
  const { data: notes } = await supabase
    .from("notes")
    .select("id, content, created_at")
    .order("created_at", { ascending: false });

  return <NotesView orgId={orgId} initialNotes={(notes ?? []) as Note[]} />;
}
