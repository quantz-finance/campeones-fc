-- Deshace 20261109060000_demo_login_privacy.sql (solo quita lo que esa migración agregó).
drop trigger if exists profiles_demo_login_guard on public.profiles;
drop function if exists public.guard_demo_login_profile();
drop policy if exists photos_demo_login_no_update on storage.objects;
drop policy if exists photos_demo_login_no_insert on storage.objects;
drop policy if exists wallets_demo_login_restrict on public.wallets;
drop policy if exists profiles_demo_login_restrict on public.profiles;
drop function if exists public.viewer_is_demo_login();
