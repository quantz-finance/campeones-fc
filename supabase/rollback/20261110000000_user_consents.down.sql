-- Deshace 20261110000000_user_consents.sql. OJO: borra los consentimientos guardados.
drop function if exists public.record_consent(date, boolean, boolean, boolean, text, text);
drop table if exists public.consent_blocked;
drop table if exists public.user_consents;
