# Resumen para Harvey: privacidad, términos y edad mínima (BORRADOR)
Rama `legal`. Textos en `src/content/legal.ts` (ES y EN). Páginas `/terminos`, `/privacidad` y `/consentimiento`.
Todavía no hay nada en prod. La migración `supabase/migrations/20261110000000_user_consents.sql` está escrita, pero no aplicada.

## Qué dice
- **Quién puede usarla:** mayores de 13 años. De 13 a 17 años se necesita el permiso de la madre, el padre o el tutor (es una casilla que la persona marca).
- **Menores de 13:** si la fecha de nacimiento da menos de 13 años, la cuenta y sus datos se borran en el acto y la fecha no se guarda. Así lo aprobaste.
- **Qué datos tratamos:**
  - De la entrada con Cavos (Google, Apple o código por correo): el correo y el nombre.
  - La dirección pública de la billetera de Stellar. Las llaves no las tenemos nosotros.
  - Perfil: nombre de jugador, usuario, avatar y foto.
  - Uso: partidos, resultados, amistades, grupos, torneos, Elo y trofeos.
  - Consentimiento: solo el año de nacimiento y el rango de edad.
  - Analítica (PostHog): eventos y errores, sin grabar la sesión.
- **Stellar testnet:** solo se escribe una huella digital (hash) del resultado. No lleva nombres ni correos y no se puede borrar. La página pública de verificación muestra los ids internos y las direcciones de las billeteras, sin nombres.
- **Proveedores:** Vercel, Supabase, Cavos, PostHog y la red Stellar. Pueden estar fuera de Costa Rica.
- **Fase de prueba:** no hay dinero real, apuestas, premios ni compras. Se pueden perder datos de prueba.
- **Base legal:** consentimiento expreso (art. 5 de la Ley 8968).
- **Derechos:** acceso, rectificación, supresión y oposición, más una copia de los datos. Se piden por correo, y si la persona no queda conforme puede ir a PRODHAB.
- **Retención:** mientras exista la cuenta. Al borrarla se eliminan de la base, salvo lo que la ley obligue a conservar.
- **Ley aplicable:** Costa Rica.

## Qué falta que definan Rolando y Harvey
1. `[PENDIENTE: nombre legal y cédula jurídica del responsable]`
2. `[PENDIENTE: correo de privacidad]`: a ese correo llegarán las solicitudes de borrado y de copia de datos. No lo inventé.
3. Si basta una casilla para el permiso parental de 13 a 17 años, o si hace falta algo más fuerte.
4. Plazo de respuesta a las solicitudes. Hoy dice «el plazo que fija la ley».
5. Si hace falta un aviso aparte para la analítica (opt-out). Hoy está dentro del Aviso.

## Cómo funciona en la app
- Al entrar con Cavos por primera vez, la persona ve «Antes de seguir»: pone su fecha de nacimiento y marca las casillas. Hasta que acepta no puede usar la app.
- Si cambian los textos, se sube la versión y se vuelve a pedir la aceptación.
- La cuenta de prueba compartida no pide consentimiento.
- Si un menor de 13 ya tenía partidos (cuentas creadas antes de este aviso), no se puede borrar automáticamente: queda bloqueada y anotada para revisión manual.
- La cuenta de Cavos y la billetera viven en Cavos. Nosotros borramos nuestros datos, pero no la cuenta de Cavos.
