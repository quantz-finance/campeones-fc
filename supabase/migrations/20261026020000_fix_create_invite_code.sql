-- Arregla "column reference code is ambiguous": la variable local se llamaba igual que la columna.
create or replace function public.create_invite()
returns text
language plpgsql
security definer
set search_path = public
as $fn$
declare
  me uuid := auth.uid();
  existing text;
  new_code text;
begin
  if me is null then
    raise exception 'Tienes que iniciar sesión.';
  end if;
  select il.code into existing
  from public.invite_links il
  where il.creator_id = me and il.expires_at > now()
  order by il.created_at desc
  limit 1;
  if existing is not null then
    return existing;
  end if;
  new_code := public.make_invite_code();
  while exists (select 1 from public.invite_links il where il.code = new_code) loop
    new_code := public.make_invite_code();
  end loop;
  insert into public.invite_links (code, creator_id, expires_at)
  values (new_code, me, now() + interval '14 days');
  return new_code;
end;
$fn$;
