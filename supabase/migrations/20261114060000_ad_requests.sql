-- Solicitudes de anuncio («Quiero ver mi anuncio aquí»). Solo se agrega: tabla, bucket privado y políticas.
-- El cliente solo puede INSERTAR su propia solicitud; no puede leer ninguna (ni la suya).
-- El equipo las revisa con service_role y publica los anuncios a mano.
create table if not exists public.ad_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete set null,
  business text not null check (char_length(btrim(business)) between 2 and 80),
  contact_name text not null check (char_length(btrim(contact_name)) between 2 and 80),
  contact text not null check (char_length(btrim(contact)) between 5 and 120),
  section text not null check (section in ('inicio', 'grupos', 'torneos', 'trofeos')),
  message text not null check (char_length(btrim(message)) between 10 and 500),
  image_path text check (image_path is null or image_path ~ '^[0-9a-f-]{36}/[A-Za-z0-9._-]{1,80}$'),
  status text not null default 'en_revision' check (status in ('en_revision', 'aprobada', 'rechazada', 'publicada')),
  notified_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists ad_requests_user_created on public.ad_requests (user_id, created_at desc);
create index if not exists ad_requests_status_created on public.ad_requests (status, created_at desc);

alter table public.ad_requests enable row level security;
revoke all on public.ad_requests from public, anon, authenticated;
grant insert (id, user_id, business, contact_name, contact, section, message, image_path) on public.ad_requests to authenticated;

drop policy if exists ad_requests_insert_own on public.ad_requests;
create policy ad_requests_insert_own on public.ad_requests for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and status = 'en_revision'
    and notified_at is null
    and (image_path is null or split_part(image_path, '/', 1) = (select auth.uid())::text)
  );

-- Freno anti-spam: 3 por hora y 5 por día por persona, sin repetir el mismo texto en 24 h,
-- y un tope global de 60 por hora para cortar una avalancha.
create or replace function public.ad_requests_guard() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then
    return new; -- service_role (equipo) no tiene límite
  end if;
  if (select count(*) from ad_requests where user_id = uid and created_at > now() - interval '1 hour') >= 3
     or (select count(*) from ad_requests where user_id = uid and created_at > now() - interval '1 day') >= 5 then
    raise exception 'Ya nos enviaste varias solicitudes. Espera un rato y vuelve a intentarlo.' using errcode = 'P0001', hint = 'rate_limited';
  end if;
  if exists (select 1 from ad_requests where user_id = uid and created_at > now() - interval '1 day'
             and lower(btrim(message)) = lower(btrim(new.message))) then
    raise exception 'Ya recibimos esta solicitud. Te vamos a escribir pronto.' using errcode = 'P0001', hint = 'duplicate';
  end if;
  if (select count(*) from ad_requests where created_at > now() - interval '1 hour') >= 60 then
    raise exception 'Estamos recibiendo muchas solicitudes. Intenta de nuevo en un rato.' using errcode = 'P0001', hint = 'rate_limited';
  end if;
  new.business := btrim(new.business);
  new.contact_name := btrim(new.contact_name);
  new.contact := btrim(new.contact);
  new.message := btrim(new.message);
  return new;
end $$;
revoke all on function public.ad_requests_guard() from public, anon, authenticated;

drop trigger if exists ad_requests_guard on public.ad_requests;
create trigger ad_requests_guard before insert on public.ad_requests
  for each row execute function public.ad_requests_guard();

-- Imagen opcional: bucket PRIVADO. Cada quien sube solo a su carpeta <uid>/; nadie la lee desde la app.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('ad-requests', 'ad-requests', false, 1048576, array['image/webp', 'image/jpeg', 'image/png'])
on conflict (id) do nothing;

drop policy if exists ad_requests_upload on storage.objects;
create policy ad_requests_upload on storage.objects for insert to authenticated
  with check (bucket_id = 'ad-requests' and (storage.foldername(name))[1] = (select auth.uid())::text);
