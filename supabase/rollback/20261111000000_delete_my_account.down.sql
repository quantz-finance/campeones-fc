-- Deshace 20261111000000_delete_my_account.sql.
-- OJO: no restaura cuentas ya anonimizadas (nombre, correo, fotos, amistades).
-- Solo quita la RPC y la columna deleted_at.
drop function if exists public.delete_my_account(text);
alter table public.profiles drop column if exists deleted_at;
