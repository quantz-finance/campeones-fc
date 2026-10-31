-- web2: consentimiento y edad al crear la cuenta (Ley 8968 de Costa Rica). ADITIVA: solo agrega una tabla y una RPC.
-- Guarda qué versión de los Términos y del Aviso de privacidad aceptó cada persona y cuándo, su año de nacimiento
-- (no la fecha completa) y, si tiene de 13 a 17 años, cuándo confirmó el permiso de su madre, padre o tutor.
-- Menores de 13: la RPC lo rechaza y no se guarda nada.

create table if not exists public.user_consents (
  user_id             uuid primary key references public.profiles (id) on delete cascade,
  terms_version       text not null check (char_length(terms_version) between 1 and 64),
  privacy_version     text not null check (char_length(privacy_version) between 1 and 64),
  terms_accepted_at   timestamptz not null default now(),
  privacy_accepted_at timestamptz not null default now(),
  birth_year          int not null check (birth_year between 1900 and 2100),
  age_band            text not null check (age_band in ('13_17', '18_plus')),
  parental_ack_at     timestamptz,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  check (age_band <> '13_17' or parental_ack_at is not null)
);
alter table public.user_consents enable row level security;
revoke all on public.user_consents from anon, authenticated;
grant select on public.user_consents to authenticated;
drop policy if exists user_consents_select_own on public.user_consents;
create policy user_consents_select_own on public.user_consents for select to authenticated
  using (user_id = (select auth.uid()));

-- Única forma de escribir: valida edad y casillas con la fecha completa, pero guarda solo el año.
create or replace function public.record_consent(
  p_birth_date date,
  p_terms boolean,
  p_privacy boolean,
  p_parental_ack boolean,
  p_terms_version text,
  p_privacy_version text
) returns text
language plpgsql
security definer
set search_path = ''
as $fn$
declare
  me uuid := auth.uid();
  years int;
  band text;
begin
  if me is null then
    raise exception 'Inicia sesión para seguir.' using errcode = '42501';
  end if;
  if p_birth_date is null or p_birth_date > current_date or p_birth_date < date '1900-01-01' then
    raise exception 'Escribe una fecha de nacimiento válida.' using errcode = '22023';
  end if;
  years := extract(year from age(current_date, p_birth_date))::int;
  if years < 13 then
    raise exception 'Necesitas tener al menos 13 años para usar Campeones FC.' using errcode = '22023';
  end if;
  band := case when years < 18 then '13_17' else '18_plus' end;
  if band = '13_17' and coalesce(p_parental_ack, false) is not true then
    raise exception 'Confirma que tu madre, padre o tutor te dio permiso.' using errcode = '22023';
  end if;
  if coalesce(p_terms, false) is not true or coalesce(p_privacy, false) is not true then
    raise exception 'Acepta los Términos de uso y el Aviso de privacidad para seguir.' using errcode = '22023';
  end if;
  insert into public.user_consents as c
    (user_id, terms_version, privacy_version, birth_year, age_band, parental_ack_at)
  values
    (me, left(p_terms_version, 64), left(p_privacy_version, 64), extract(year from p_birth_date)::int, band,
     case when band = '13_17' then now() end)
  on conflict (user_id) do update set
    terms_version = excluded.terms_version,
    privacy_version = excluded.privacy_version,
    terms_accepted_at = now(),
    privacy_accepted_at = now(),
    birth_year = excluded.birth_year,
    age_band = excluded.age_band,
    parental_ack_at = excluded.parental_ack_at,
    updated_at = now();
  return band;
end;
$fn$;
revoke all on function public.record_consent(date, boolean, boolean, boolean, text, text) from public, anon;
grant execute on function public.record_consent(date, boolean, boolean, boolean, text, text) to authenticated;
