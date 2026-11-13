-- Deshace 20261113010000_delete_account_frees_wallet.sql.
-- Vuelve delete_my_account a la versión de 20261111000000 y quita revoke_user_sessions.
-- OJO: no devuelve billeteras ni sesiones ya borradas.
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

  delete from storage.objects
   where bucket_id = 'photos'
     and name like ('users/' || me::text || '/%');

  delete from public.friendships
   where requester_id = me or addressee_id = me;
  delete from public.invite_links where creator_id = me;
  delete from public.notifications where user_id = me or actor_id = me;
  delete from public.achievements where user_id = me;
  delete from public.group_members where user_id = me;
  delete from public.cavos_identities where user_id = me;

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
         raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb) || jsonb_build_object('deleted', true)
   where id = me;
  delete from auth.identities where user_id = me;
  delete from auth.sessions where user_id = me;

  return 'anonymized';
end;
$fn$;

revoke all on function public.delete_my_account(text) from public, anon;
grant execute on function public.delete_my_account(text) to authenticated;

drop function if exists public.revoke_user_sessions(uuid);
