-- Deshace 20261113000000_entity_logos.sql. OJO: borra los escudos/trofeos elegidos (la app vuelve al de por defecto).
-- Las fotos que se quitaron al elegir un escudo no se recuperan (siguen en Storage, pero sin photo_url).
drop function if exists public.set_logo(text, uuid, text);
alter table public.tournaments drop constraint if exists tournaments_logo_valid;
alter table public.groups drop constraint if exists groups_logo_valid;
alter table public.tournaments drop column if exists logo;
alter table public.groups drop column if exists logo;
