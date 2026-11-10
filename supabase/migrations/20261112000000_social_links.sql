-- Redes sociales del jugador (ADITIVO, no borra ni cambia datos existentes).
-- Solo para el proyecto campeones-fc (ncduberxgrvgbkruhkvr). Pendiente de aprobación de Rolando: NO aplicar sin su OK.
--
-- profiles.social_links: jsonb opcional { tiktok, instagram, youtube, twitch, kick, x: enlace https canónico; discord: usuario }.
-- Lectura: la política profiles_select existente (cualquier usuario autenticado; la página pública lee por la API del servidor).
-- Escritura: solo el dueño (política profiles_update existente + grant de la columna).
-- La base valida redes, dominios y formato (las mismas reglas que src/domain/social.ts).

create or replace function public.valid_social_links(links jsonb)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select links is null or (
    jsonb_typeof(links) = 'object'
    and pg_column_size(links) <= 2048
    and not exists (
      select 1
      from jsonb_each(links) as e(key, value)
      where e.key not in ('tiktok', 'instagram', 'youtube', 'twitch', 'kick', 'x', 'discord')
         or jsonb_typeof(e.value) <> 'string'
         or length(e.value #>> '{}') > 200
         or not (
           case e.key
             when 'tiktok'    then (e.value #>> '{}') ~ '^https://www\.tiktok\.com/@[A-Za-z0-9._]{2,24}$'
             when 'instagram' then (e.value #>> '{}') ~ '^https://www\.instagram\.com/[A-Za-z0-9._]{1,30}$'
             when 'youtube'   then (e.value #>> '{}') ~ '^https://www\.youtube\.com/(@[A-Za-z0-9._-]{3,30}|channel/UC[A-Za-z0-9_-]{22})$'
             when 'twitch'    then (e.value #>> '{}') ~ '^https://www\.twitch\.tv/[A-Za-z0-9_]{4,25}$'
             when 'kick'      then (e.value #>> '{}') ~ '^https://kick\.com/[A-Za-z0-9_]{3,25}$'
             when 'x'         then (e.value #>> '{}') ~ '^https://x\.com/[A-Za-z0-9_]{1,15}$'
             when 'discord'   then (e.value #>> '{}') ~ '^[a-z0-9_.]{2,32}$'
             else false
           end
         )
    )
  )
$$;

revoke all on function public.valid_social_links(jsonb) from public;
grant execute on function public.valid_social_links(jsonb) to anon, authenticated, service_role;

alter table public.profiles add column if not exists social_links jsonb;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'profiles_social_links_valid') then
    alter table public.profiles
      add constraint profiles_social_links_valid check (public.valid_social_links(social_links));
  end if;
end
$$;

-- Solo el dueño de la fila la cambia (profiles_update ya limita a id = auth.uid()).
grant update (social_links) on public.profiles to authenticated;

comment on column public.profiles.social_links is
  'Redes del jugador: enlaces https canónicos (tiktok, instagram, youtube, twitch, kick, x) y usuario de discord. Solo lo que el usuario escribió.';
