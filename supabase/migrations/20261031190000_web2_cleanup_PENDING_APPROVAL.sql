-- ============================================================================================
-- PENDIENTE DE APROBACIÓN. NO APLICAR sin el visto bueno explícito de Rolando.
-- Limpieza destructiva de la era cripto (Cavos, Stellar, Trustless Work) para la app web2.
--
-- La app web2 ya NO usa nada de esto y funciona con estas tablas todavía presentes.
-- Esta migración BORRA tablas, columnas, funciones, triggers y sus datos. No se puede deshacer.
-- Haz un respaldo antes (Supabase › Database › Backups, o pg_dump de estas tablas).
--
-- Candado: si se corre sin la variable de abajo, falla y no cambia nada (también protege
-- contra un `supabase db push` accidental). Para aplicarla a mano en el SQL Editor:
--   set cfc.approve_web2_cleanup = 'yes';   -- en la MISMA sesión, justo antes
--   <pega el resto del archivo>
-- ============================================================================================

do $guard$
begin
  if coalesce(current_setting('cfc.approve_web2_cleanup', true), '') <> 'yes' then
    raise exception 'web2_cleanup: migración destructiva pendiente de aprobación. Ver el encabezado del archivo.';
  end if;
end
$guard$;

-- 1. Apuestas (Trustless Work). Sale sola de la publicación supabase_realtime al borrar la tabla.
drop table if exists public.match_stakes cascade;

-- 2. Cavos: identidades, nonces de entrada y búsqueda de usuario por correo.
drop table if exists public.cavos_identities cascade;
drop table if exists public.session_nonces cascade;
drop function if exists public.cavos_user_by_email(text);

-- 3. Billeteras y firmas de resultados.
drop table if exists public.match_attestations cascade;
drop table if exists public.wallets cascade;

-- 4. Anclaje en Stellar: actas diarias (Merkle), archivo por red, cola y trigger.
drop table if exists public.chain_daily_records cascade;
drop table if exists public.chain_anchor_archive cascade;
drop trigger if exists matches_queue_anchor on public.matches;
drop function if exists public.queue_match_anchor();
drop function if exists public.queue_chain_backfill(int, text);
drop function if exists public.queue_chain_backfill(int);
drop index if exists public.matches_chain_queue;

alter table public.matches
  drop column if exists chain_status,
  drop column if exists chain_hash,
  drop column if exists chain_payload,
  drop column if exists chain_tx,
  drop column if exists chain_max_time,
  drop column if exists chain_attempts,
  drop column if exists chain_claimed_at,
  drop column if exists chain_error,
  drop column if exists anchored_at,
  drop column if exists chain_backfill,
  drop column if exists chain_network;
