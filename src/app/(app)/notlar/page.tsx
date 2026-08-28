import { createClient } from "@/lib/supabase/server";
import { NotesView, type Note } from "@/components/notes-view";

export const metadata = { title: "Notlar — TechİŞ" };

export default async function NotlarPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: membership } = await supabase
    .from("organization_members")
    .select("organization_id")
    .eq("user_id", user?.id ?? "")
    .maybeSingle();
  const orgId = membership?.organization_id ?? "";

  // migration 019/020 çalışmamışsa tablo/kolon yoksa → boş/eksik liste (kırılmaz).
  let notes: Note[] = [];
  const withRemind = await supabase
    .from("notes")
    .select("id, content, created_at, remind_at")
    .order("created_at", { ascending: false });
  if (withRemind.error) {
    const fallback = await supabase
      .from("notes")
      .select("id, content, created_at")
      .order("created_at", { ascending: false });
    notes = (fallback.data ?? []) as Note[];
  } else {
    notes = (withRemind.data ?? []) as Note[];
  }

  return <NotesView orgId={orgId} initialNotes={notes} />;
}
