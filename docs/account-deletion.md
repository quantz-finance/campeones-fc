# Eliminar la cuenta (pendiente de aplicar en la base)

Apple (guía 5.1.1) pide que la persona pueda iniciar el borrado **dentro de la app**. El botón está en Perfil, con confirmación en dos pasos (continuar y escribir `ELIMINAR`). El endpoint es `POST /api/account` con el access token de Supabase de esa persona: el cuerpo no puede pedir borrar a otra cuenta.

## Qué se borra y qué se conserva

Se quitan los datos personales (nombre, usuario, foto, correo, amistades, invitaciones, avisos, trofeos, membresías e identidades de Cavos) y se corta el acceso. Los partidos confirmados, las firmas, la dirección pública de la billetera y los grupos o torneos que esa persona creó se conservan porque el rival y la verificación en Stellar los necesitan. El perfil queda como «Cuenta eliminada», sin datos personales.

Las huellas (hash) ya escritas en la red de prueba de Stellar no se pueden borrar. La cuenta de Cavos y las llaves viven en Cavos: nosotros borramos nuestros datos y el vínculo, pero no la cuenta de Cavos.

La cuenta de prueba compartida y los perfiles de ejemplo no se pueden eliminar por este camino.

## Migración

`supabase/migrations/20261111000000_delete_my_account.sql` agrega `profiles.deleted_at` y la RPC `public.delete_my_account('ELIMINAR')` (solo `auth.uid()`). **No está aplicada** en prod, preview ni en ninguna otra base. No tocar meteorito-mvp ni meteorito-preview.

Hasta que se aplique, `/api/account` hace el mismo trabajo con la llave de servidor, sin escribir `deleted_at`. Rollback: `supabase/rollback/20261111000000_delete_my_account.down.sql` (no devuelve una cuenta ya anonimizada).
