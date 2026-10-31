# Checklist manual: entrar con Google de verdad

Hazlo en la preview (o en producción cuando se publique), en una ventana privada y con una cuenta de Google de prueba.

Antes: en Supabase › Authentication › Providers, Google tiene que estar activo (client ID y secret de Google Cloud) y la URL de la preview tiene que estar en Redirect URLs.

1. Abre la portada. Solo hay un botón: «Entrar con Google». No hay billeteras ni nada de Stellar.
2. Sin marcar nada, el botón está desactivado.
3. Escribe una fecha de nacimiento de alguien de 12 años: sale «Todavía no puedes entrar» y el botón desaparece.
4. Escribe una fecha de 15 años: sale el aviso de permiso y hay que marcar la casilla del permiso.
5. Escribe una fecha de adulto, marca Términos y Aviso, toca «Entrar con Google».
6. Google te pide elegir cuenta y muestra el nombre de la app y el dominio de Supabase. Acepta.
7. Vuelves a `/auth/callback` y luego a Inicio con tu nombre de Google. No ves «Antes de seguir».
8. En Supabase, `user_consents` tiene tu fila con la hora, el año de nacimiento y la versión «2026-10-31-borrador».
9. Recarga la página: sigues dentro.
10. Perfil › Salir. Vuelves a la portada.
11. Entra otra vez con la misma cuenta: no vuelve a pedir el consentimiento.
12. Prueba «Cancelar» en la pantalla de Google: la app dice que no se pudo entrar y ofrece «Volver a intentar».
13. Con dos cuentas (dos navegadores), haz un partido completo: reto, aceptación, marcador, confirmación y Elo.
