-- Fotos de jugadores, grupos y torneos en Storage (bucket público de lectura).
-- Rutas: users/<uid>/<ver>.webp · groups/<gid>/<ver>.webp · tournaments/<tid>/<ver>.webp
-- (la versión en la ruta rompe caché: una foto nueva se ve al instante).
alter table public.profiles add column if not exists photo_url text;
alter table public.groups add column if not exists photo_url text;
alter table public.tournaments add column if not exists photo_url text;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('photos', 'photos', true, 307200, array['image/webp', 'image/jpeg', 'image/png'])
on conflict (id) do update set public = true, file_size_limit = 307200, allowed_mime_types = excluded.allowed_mime_types;

create or replace function public.can_edit_photo(kind text, target text) returns boolean
language sql stable security definer set search_path = public as $$
  select case kind
    when 'users' then target = auth.uid()::text
    when 'groups' then exists (
      select 1 from groups g where g.id::text = target
        and (g.created_by = auth.uid()
          or exists (select 1 from group_members m where m.group_id = g.id and m.user_id = auth.uid() and m.role = 'owner')))
    when 'tournaments' then exists (select 1 from tournaments t where t.id::text = target and t.created_by = auth.uid())
    else false
  end
$$;
revoke all on function public.can_edit_photo(text, text) from public, anon;
grant execute on function public.can_edit_photo(text, text) to authenticated;

create policy photos_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'photos' and public.can_edit_photo((storage.foldername(name))[1], (storage.foldername(name))[2]));
create policy photos_update on storage.objects for update to authenticated
  using (bucket_id = 'photos' and public.can_edit_photo((storage.foldername(name))[1], (storage.foldername(name))[2]));
create policy photos_delete on storage.objects for delete to authenticated
  using (bucket_id = 'photos' and public.can_edit_photo((storage.foldername(name))[1], (storage.foldername(name))[2]));

-- Guarda la URL pública solo si quien llama puede editar esa entidad y la URL apunta a su carpeta del bucket.
create or replace function public.set_photo(kind text, target uuid, url text) returns text
language plpgsql security definer set search_path = public as $$
begin
  if not public.can_edit_photo(kind, target::text) then
    raise exception 'No puedes cambiar esta foto.' using errcode = '42501';
  end if;
  if url is not null and url !~ ('/storage/v1/object/public/photos/' || kind || '/' || target::text || '/[A-Za-z0-9._-]+$') then
    raise exception 'URL de foto inválida.' using errcode = '22023';
  end if;
  if kind = 'users' then update profiles set photo_url = url where id = target;
  elsif kind = 'groups' then update groups set photo_url = url where id = target;
  elsif kind = 'tournaments' then update tournaments set photo_url = url where id = target;
  end if;
  return url;
end $$;
revoke all on function public.set_photo(text, uuid, text) from public, anon;
grant execute on function public.set_photo(text, uuid, text) to authenticated;
