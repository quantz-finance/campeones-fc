-- Eliminar cuenta: liberar la billetera y cerrar TODAS las sesiones (auditoría de login 2026-11-12, A1 y A2).
-- Aprobado por Rolando el 12 nov 2026, 11:38 PM (CR).
-- Requiere 20261111000000_delete_my_account.sql (profiles.deleted_at y la RPC original).
-- Solo para campeones-fc (ncduberxgrvgbkruhkvr). No tocar meteorito-mvp ni meteorito-preview.
--
-- 1) public.revoke_user_sessions(uuid): borra auth.refresh_tokens y auth.sessions de una cuenta.
--    Solo service_role (la usa /api/account después de anonimizar y banear).
-- 2) public.delete_my_account('ELIMINAR'): igual que antes, y además
--      * borra la fila de public.wallets (antes quedaba y volver a registrarse daba 409 address_taken),
--      * borra los nonces de login de sus identidades Cavos,
--      * banea la tumba (banned_until) y revoca todas las sesiones,
--      * ya no falla si Storage bloquea el DELETE directo de fotos (protect_delete).
-- Rollback: supabase/rollback/20261113010000_delete_account_frees_wallet.down.sql

create or replace function public.revoke_user_sessions(p_user uuid)
returns integer
language plpgsql
security definer
set search_path = ''
as $fn$
declare
  n integer;
begin
  if p_user is null then
    return 0;
  end if;
  delete from auth.refresh_tokens where user_id = p_user::text;
  delete from auth.sessions where user_id = p_user;
  get diagnostics n = row_count;
  return n;
end;
$fn$;

revoke all on function public.revoke_user_sessions(uuid) from public, anon, authenticated;
grant execute on function public.revoke_user_sessions(uuid) to service_role;

create or replace function public.delete_my_account(p_confirm text)
returns text
language plpgsql
security definer
set search_path = ''
as $fn$
declare
  me uuid := auth.uid();
  demo_login boolean;
  is_demo boolean;
  already timestamptz;
  uname text;
  tombstone_email text;
begin
  if me is null then
    raise exception 'Inicia sesión para continuar.' using errcode = '42501';
  end if;
  if p_confirm is distinct from 'ELIMINAR' then
    raise exception 'Para confirmar, escribe ELIMINAR.' using errcode = '22023';
  end if;

  select public.is_demo_login_account(me) into demo_login;
  if coalesce(demo_login, false) then
    raise exception 'La cuenta de prueba compartida no se puede eliminar.' using errcode = '42501';
  end if;

  select p.is_demo, p.deleted_at into is_demo, already
  from public.profiles p
  where p.id = me;
  if not found then
    raise exception 'No encontramos tu cuenta.' using errcode = 'P0002';
  end if;
  if already is not null then
    raise exception 'Esta cuenta ya estaba eliminada.' using errcode = 'P0001';
  end if;
  if is_demo then
    raise exception 'Las cuentas de ejemplo no se pueden eliminar.' using errcode = '42501';
  end if;

  update public.matches
     set status = 'cancelled'
   where status in ('pending_accept', 'in_progress', 'disputed')
     and (player_a_id = me or player_b_id = me);

  -- Storage bloquea DELETE directo (storage.protect_delete). /api/account borra los archivos con la
  -- Storage API; aquí solo se intenta y, si Storage lo bloquea, se sigue (photo_url queda en null).
  begin
    delete from storage.objects
     where bucket_id = 'photos'
       and name like ('users/' || me::text || '/%');
  exception when insufficient_privilege then
    null;
  end;

  delete from public.friendships
   where requester_id = me or addressee_id = me;
  delete from public.invite_links where creator_id = me;
  delete from public.notifications where user_id = me or actor_id = me;
  delete from public.achievements where user_id = me;
  delete from public.group_members where user_id = me;
  delete from public.session_nonces n
   using public.cavos_identities c
   where c.user_id = me and n.iss = c.iss and n.sub = c.sub;
  delete from public.cavos_identities where user_id = me;
  -- Libera UNIQUE(address): Cavos devuelve la misma dirección si la persona vuelve con la misma cuenta.
  delete from public.wallets where user_id = me;

  uname := 'x' || substr(replace(me::text, '-', ''), 1, 15);
  update public.profiles
     set username = uname,
         display_name = 'Cuenta eliminada',
         photo_url = null,
         show_demo = false,
         avatar_key = 'rayo',
         deleted_at = now()
   where id = me;

  tombstone_email := 'deleted-' || replace(me::text, '-', '') || '@deleted.campeonesfc.invalid';
  update auth.users
     set email = tombstone_email,
         email_confirmed_at = null,
         phone = null,
         raw_user_meta_data = '{}'::jsonb,
         raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb) || jsonb_build_object('deleted', true),
         banned_until = now() + interval '100 years'
   where id = me;
  delete from auth.identities where user_id = me;
  -- Todas las sesiones y refresh tokens, en todos los dispositivos.
  perform public.revoke_user_sessions(me);

  return 'anonymized';
end;
$fn$;

revoke all on function public.delete_my_account(text) from public, anon;
grant execute on function public.delete_my_account(text) to authenticated;
