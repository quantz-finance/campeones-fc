-- La cuenta de prueba compartida (api/demo.ts, app_metadata.demo_login) no ve a la gente real
-- y no puede cambiar su nombre, usuario, avatar ni foto.
-- Solo AGREGA: una función, políticas RESTRICTIVE (se suman con AND a las que ya existen) y un trigger.
-- Para cuentas reales no cambia nada: la condición nueva siempre es verdadera para ellas.
-- El servidor (service_role) no pasa por RLS: el modo espectador y /api/demo siguen igual.
-- Rollback: supabase/rollback/20261109060000_demo_login_privacy.down.sql

create or replace function public.viewer_is_demo_login() returns boolean
  language sql stable security definer set search_path = public, auth as $$
  select coalesce(public.is_demo_login_account(auth.uid()), false)
$$;
revoke all on function public.viewer_is_demo_login() from public, anon;
grant execute on function public.viewer_is_demo_login() to authenticated;

-- Perfiles: la cuenta de prueba solo se ve a sí misma y al mundo de ejemplo (is_demo).
create policy profiles_demo_login_restrict on public.profiles
  as restrictive for select to authenticated
  using (not (select public.viewer_is_demo_login()) or id = (select auth.uid()) or is_demo);

-- Billeteras: la cuenta de prueba solo ve la suya.
create policy wallets_demo_login_restrict on public.wallets
  as restrictive for select to authenticated
  using (not (select public.viewer_is_demo_login()) or user_id = (select auth.uid()));

-- Fotos: la cuenta de prueba no sube ni reemplaza archivos.
create policy photos_demo_login_no_insert on storage.objects
  as restrictive for insert to authenticated
  with check (bucket_id <> 'photos' or not (select public.viewer_is_demo_login()));
create policy photos_demo_login_no_update on storage.objects
  as restrictive for update to authenticated
  using (bucket_id <> 'photos' or not (select public.viewer_is_demo_login()));

-- La cuenta de prueba no puede renombrarse ni cambiar su avatar o foto (sí puede cambiar show_demo).
-- Solo aplica cuando la propia cuenta de prueba hace el cambio (auth.uid()); el servidor no se ve afectado.
create or replace function public.guard_demo_login_profile() returns trigger
  language plpgsql security definer set search_path = public, auth as $$
begin
  if auth.uid() = old.id and public.is_demo_login_account(old.id)
     and (new.username is distinct from old.username
       or new.display_name is distinct from old.display_name
       or new.avatar_key is distinct from old.avatar_key
       or new.photo_url is distinct from old.photo_url) then
    raise exception 'La cuenta de prueba no se puede editar. Crea tu cuenta para tener tu propio perfil.'
      using errcode = '42501';
  end if;
  return new;
end;
$$;
revoke all on function public.guard_demo_login_profile() from public, anon, authenticated;

drop trigger if exists profiles_demo_login_guard on public.profiles;
create trigger profiles_demo_login_guard
  before update on public.profiles
  for each row execute function public.guard_demo_login_profile();
