-- Usuario de prueba compartido (api/demo.ts): no puede hacerse amigo de cuentas reales.
-- Solo agrega una función y un trigger; no borra ni cambia datos existentes.

create or replace function public.is_demo_login_account(uid uuid) returns boolean
  language sql stable security definer set search_path = public, auth as $$
  select coalesce((select (raw_app_meta_data ->> 'demo_login') = 'true' from auth.users where id = uid), false)
$$;

revoke all on function public.is_demo_login_account(uuid) from public;

create or replace function public.guard_demo_login_friendship() returns trigger
  language plpgsql security definer set search_path = public, auth as $$
declare
  demo_a boolean := public.is_demo_login_account(new.requester_id);
  demo_b boolean := public.is_demo_login_account(new.addressee_id);
begin
  -- Entre la cuenta de prueba y el mundo de ejemplo (is_demo) sí se vale; con gente real, no.
  if demo_a and not (demo_b or public.is_demo_user(new.addressee_id)) then
    raise exception 'La cuenta de prueba no puede agregar amigos reales. Crea tu cuenta para jugar con tus amigos.';
  end if;
  if demo_b and not (demo_a or public.is_demo_user(new.requester_id)) then
    raise exception 'La cuenta de prueba no puede agregar amigos reales. Crea tu cuenta para jugar con tus amigos.';
  end if;
  return new;
end;
$$;

drop trigger if exists friendships_demo_login_guard on public.friendships;
create trigger friendships_demo_login_guard
  before insert or update of status on public.friendships
  for each row execute function public.guard_demo_login_friendship();
