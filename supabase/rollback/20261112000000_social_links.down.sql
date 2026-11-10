-- Deshace 20261112000000_social_links.sql. OJO: borra las redes que hayan guardado los jugadores.
revoke update (social_links) on public.profiles from authenticated;
alter table public.profiles drop constraint if exists profiles_social_links_valid;
alter table public.profiles drop column if exists social_links;
drop function if exists public.valid_social_links(jsonb);
