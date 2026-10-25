-- "Modo prueba": cada usuario decide si ve los datos de demo (jugadores, partidos, grupos y torneos sembrados).
-- Apagado por defecto para todos. Los datos de demo se marcan con is_demo a partir de public.demo_seed
-- (y un trigger marca lo que se siembre después). is_demo NO es editable por los clientes; show_demo solo por su dueño.

alter table public.profiles    add column if not exists is_demo boolean not null default false;
alter table public.profiles    add column if not exists show_demo boolean not null default false;
alter table public.matches     add column if not exists is_demo boolean not null default false;
alter table public.groups      add column if not exists is_demo boolean not null default false;
alter table public.tournaments add column if not exists is_demo boolean not null default false;

-- Solo el dueño cambia show_demo (la política profiles_update ya limita a la fila propia).
grant update (show_demo) on public.profiles to authenticated;

create or replace function public.mark_demo_row()
returns trigger
language plpgsql
security definer
set search_path = ''
as $fn$
begin
  if new.kind = 'user' then update public.profiles set is_demo = true where id = new.id;
  elsif new.kind = 'match' then update public.matches set is_demo = true where id = new.id;
  elsif new.kind = 'group' then update public.groups set is_demo = true where id = new.id;
  elsif new.kind = 'tournament' then update public.tournaments set is_demo = true where id = new.id;
  end if;
  return new;
end;
$fn$;
revoke all on function public.mark_demo_row() from public, anon, authenticated;

do $mig$
begin
  if to_regclass('public.demo_seed') is not null then
    update public.profiles p    set is_demo = true from public.demo_seed d where d.kind = 'user' and d.id = p.id;
    update public.matches m     set is_demo = true from public.demo_seed d where d.kind = 'match' and d.id = m.id;
    update public.groups g      set is_demo = true from public.demo_seed d where d.kind = 'group' and d.id = g.id;
    update public.tournaments t set is_demo = true from public.demo_seed d where d.kind = 'tournament' and d.id = t.id;
    drop trigger if exists demo_seed_mark on public.demo_seed;
    create trigger demo_seed_mark after insert on public.demo_seed for each row execute function public.mark_demo_row();
  end if;
end
$mig$;
