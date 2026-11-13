# Eliminar la cuenta

Apple (guía 5.1.1) pide que la persona pueda iniciar el borrado **dentro de la app**. El botón está en Perfil, con confirmación en dos pasos (continuar y escribir `ELIMINAR`). El endpoint es `POST /api/account` con el access token de Supabase de esa persona: el cuerpo no puede pedir borrar a otra cuenta.

## Qué se borra y qué se conserva

Se quitan los datos personales (nombre, usuario, foto, correo, amistades, invitaciones, avisos, trofeos, membresías e identidades de Cavos), se libera la fila de `wallets` y se corta el acceso: la cuenta queda baneada y se borran **todas** sus sesiones y refresh tokens, en todos los dispositivos. Como la billetera queda libre, la misma persona puede volver a registrarse con el mismo Google, Apple o correo (antes daba 409 `address_taken`, porque Cavos devuelve la misma dirección). Los partidos confirmados, las firmas y los grupos o torneos que esa persona creó se conservan porque el rival y la verificación en Stellar los necesitan. El perfil queda como «Cuenta eliminada», sin datos personales.

Las huellas (hash) ya escritas en la red de prueba de Stellar no se pueden borrar. La cuenta de Cavos y las llaves viven en Cavos: nosotros borramos nuestros datos y el vínculo, pero no la cuenta de Cavos.

La cuenta de prueba compartida y los perfiles de ejemplo no se pueden eliminar por este camino.

## Migraciones (aplicadas en campeones-fc el 12 nov 2026, 11:45 PM CR)

- `supabase/migrations/20261111000000_delete_my_account.sql`: `profiles.deleted_at` y la RPC `public.delete_my_account('ELIMINAR')` (solo `auth.uid()`).
- `supabase/migrations/20261113010000_delete_account_frees_wallet.sql`: la RPC además borra `wallets`, los nonces de login de sus identidades Cavos, banea la tumba y llama a `public.revoke_user_sessions(uuid)` (solo `service_role`), que borra `auth.sessions` y `auth.refresh_tokens`.

`/api/account` (camino que usa la app) hace lo mismo con la llave de servidor: borra fotos con la Storage API, la billetera, anonimiza, banea con `ban_duration` y al final llama a `revoke_user_sessions`. Los access tokens ya emitidos siguen siendo JWT válidos hasta que vencen (máx. 1 h), pero no se pueden refrescar y la cuenta está baneada.

Rollback: `supabase/rollback/20261113010000_delete_account_frees_wallet.down.sql` y luego `supabase/rollback/20261111000000_delete_my_account.down.sql` (no devuelven cuentas ya anonimizadas). No tocar meteorito-mvp ni meteorito-preview.
