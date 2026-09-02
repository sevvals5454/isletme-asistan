-- ============================================================
-- Çalışanlar da mesaj şablonlarını düzenleyebilsin.
-- organizations UPDATE sahibe kilitli (isim, IBAN vb. korunsun). Bu yüzden
-- SADECE message_templates kolonunu güncelleyen güvenli bir RPC açıyoruz;
-- herhangi bir org üyesi (sahip/çalışan) kendi işletmesinin şablonlarını yazar.
-- Supabase → SQL Editor → Run. (idempotent)
-- ============================================================

create or replace function public.set_message_templates(p_templates jsonb)
returns void language plpgsql security definer set search_path = public as $$
begin
  update public.organizations o
     set message_templates = p_templates
   where o.id in (
     select organization_id
       from public.organization_members
      where user_id = auth.uid()
   );
end $$;

grant execute on function public.set_message_templates(jsonb) to authenticated;
