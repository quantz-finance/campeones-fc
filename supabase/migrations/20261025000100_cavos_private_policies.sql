-- Aviso de Supabase (rls_enabled_no_policy): dejar explícito que cavos_identities y session_nonces
-- son solo del servidor. service_role ignora RLS; anon y authenticated no ven ni escriben nada.
create policy cavos_identities_server_only on public.cavos_identities
  as restrictive for all to anon, authenticated using (false) with check (false);
create policy session_nonces_server_only on public.session_nonces
  as restrictive for all to anon, authenticated using (false) with check (false);
