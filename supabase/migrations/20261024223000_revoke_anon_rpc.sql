-- Supabase da EXECUTE a anon por privilegios por defecto en public, y
-- "revoke ... from public" no lo quita. Ninguna RPC sirve sin sesión:
-- quitamos anon de todas las funciones SECURITY DEFINER expuestas.
revoke execute on function public.are_friends(uuid, uuid) from public, anon;
revoke execute on function public.is_group_member(uuid, uuid) from public, anon;
revoke execute on function public.match_visible(uuid) from public, anon;
revoke execute on function public.slot_visible(uuid) from public, anon;
revoke execute on function public.send_friend_request(text) from public, anon;
revoke execute on function public.respond_friend_request(uuid, boolean) from public, anon;
revoke execute on function public.create_invite() from public, anon;
revoke execute on function public.redeem_invite(text) from public, anon;
revoke execute on function public.create_match(uuid, uuid) from public, anon;
revoke execute on function public.accept_match(uuid) from public, anon;
revoke execute on function public.decline_match(uuid) from public, anon;
revoke execute on function public.submit_match_report(uuid, boolean, uuid, int, int) from public, anon;
revoke execute on function public.create_group(text, uuid[]) from public, anon;
revoke execute on function public.create_tournament(uuid, text, text, uuid[]) from public, anon;
revoke execute on function public.reopen_tournament_match(uuid) from public, anon;
revoke execute on function public.expire_pending_matches() from public, anon;

-- Las funciones nuevas de este esquema no quedan ejecutables por anon.
alter default privileges in schema public revoke execute on functions from public, anon;
