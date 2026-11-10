-- Escudo (grupos) y trofeo (torneos) elegidos del set v5 (ADITIVO: no borra ni cambia datos existentes).
-- Solo para el proyecto campeones-fc (ncduberxgrvgbkruhkvr). Pendiente de aprobación de Rolando: NO aplicar sin su OK.
-- Nunca en meteorito-mvp ni meteorito-preview.
--
-- groups.logo / tournaments.logo: text opcional con el id de la pieza (src/content/crests.ts). null = la app usa
-- un escudo/trofeo por defecto, determinista por id. Si alguien sube una foto (photo_url), la foto manda.
-- Lectura: las políticas select existentes (select('*') de la app ya trae la columna).
-- Escritura: solo por set_logo(), con el mismo permiso que las fotos (can_edit_photo: dueño del grupo o
-- creador del torneo). Elegir un escudo quita la foto subida, para que se vea lo que se eligió.
-- Rollback: supabase/rollback/20261113000000_entity_logos.down.sql

alter table public.groups add column if not exists logo text;
alter table public.tournaments add column if not exists logo text;

alter table public.groups drop constraint if exists groups_logo_valid;
alter table public.groups add constraint groups_logo_valid check (
  logo is null or logo in ('leon', 'aguila', 'toro', 'lobo', 'corona', 'rayo', 'balon', 'llama', 'estrella', 'montana', 'ola', 'cohete', 'tigre', 'caballo', 'oso', 'halcon', 'dragon', 'tiburon', 'pantera', 'jaguar', 'castillo', 'espadas-cruzadas', 'balon-alado')
);

alter table public.tournaments drop constraint if exists tournaments_logo_valid;
alter table public.tournaments add constraint tournaments_logo_valid check (
  logo is null or logo in ('copa-clasica', 'copa-asas', 'copa-grande', 'escudo', 'medalla', 'cinturon', 'trofeo-estrella', 'laurel')
);

create or replace function public.set_logo(kind text, target uuid, logo text) returns text
language plpgsql security definer set search_path = public as $$
begin
  if kind not in ('groups', 'tournaments') then
    raise exception 'Tipo de logo inválido.' using errcode = '22023';
  end if;
  if not public.can_edit_photo(kind, target::text) then
    raise exception 'No puedes cambiar este escudo.' using errcode = '42501';
  end if;
  -- El check de cada tabla valida el id (23514 si no es del set).
  if kind = 'groups' then
    update groups set logo = set_logo.logo, photo_url = null where id = target;
  else
    update tournaments set logo = set_logo.logo, photo_url = null where id = target;
  end if;
  return logo;
end $$;
revoke all on function public.set_logo(text, uuid, text) from public, anon;
grant execute on function public.set_logo(text, uuid, text) to authenticated;
