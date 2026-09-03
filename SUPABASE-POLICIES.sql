-- Eseguire una volta in Supabase > SQL Editor

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.admin_users where user_id = auth.uid());
$$;

-- Back office: accesso completo agli admin
create policy "Admin richieste" on public.richieste for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "Admin pagamenti" on public.pagamenti for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "Admin galleria" on public.galleria for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- Storage: solo admin può caricare/modificare/eliminare nel bucket galleria
create policy "Admin upload galleria" on storage.objects for insert to authenticated with check (bucket_id='galleria' and public.is_admin());
create policy "Admin update galleria" on storage.objects for update to authenticated using (bucket_id='galleria' and public.is_admin()) with check (bucket_id='galleria' and public.is_admin());
create policy "Admin delete galleria" on storage.objects for delete to authenticated using (bucket_id='galleria' and public.is_admin());
