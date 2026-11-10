# Puente nativo de Cavos (diseño)

Documentación para el login en iPhone. No se contactó a Cavos. Nada de esto se ejecuta contra su API desde aquí: el kit solo habla con Cavos cuando una persona entra en un development build o en TestFlight, y la bandera va apagada por defecto.

Fuentes: README y tipados de `@cavos/kit` 0.4.4 (`@cavos/kit/react-native`), el tutorial de Stellar 2026 y las notas para agentes de docs.cavos.xyz (kit 0.5.2, actualizadas el 7 nov 2026).

## Qué cambia frente a la web

| | Web (hoy, `@cavos/kit/react`) | iOS nativo (`@cavos/kit/react-native`) |
|---|---|---|
| Dónde viven las llaves | Iframe en `vault.cavos.xyz` | Secure Enclave / Keychain. No hay iframe. |
| Cómo entra la persona | Google, Apple o código al correo | **Solo Google o Apple.** El código al correo no está disponible: el build nativo no puede verificar la attestación del enclave. `sendOtp` / `verifyOtp` lanzan `unsupported`. |
| Callback | `https://partido.campeonesfc.app/entrar` (o `/auth/callback`) | Exacto, sin comodines: `campeones-fc://cavos-auth` |
| Passkeys | `rpId` del entorno (hoy, por defecto, `campeones-fc.vercel.app`) | El mismo `rpId` más `https://<rpId>/.well-known/apple-app-site-association` y Associated Domains |
| Expo Go | No aplica | No sirve. Hace falta un development build o un build de EAS. iOS 16+. |
| Plugin | No | `["@cavos/kit", { "rpId", "scheme": "campeones-fc" }]` (ya queda en `app.config.js`) |

El `appSalt` (`campeones-fc`) no se toca: cambiarlo cambiaría la dirección de la billetera.

## Identidad: correo de la web vs Apple/Google en el iPhone

En la web, el camino principal es el código al correo. Esa cuenta queda ligada en `cavos_identities` por `(iss, sub)` de Cavos y, si el correo viene verificado, también se puede unir por email (`canLinkByEmail` en `/api/auth`). El relay privado de Apple (`@privaterelay.appleid.com`) **no** se usa para unir.

Riesgo: una persona que creó su cuenta solo con correo puede entrar en el iPhone con Apple o Google y **no ser la misma identidad**, si Cavos emite otro `sub` o si Apple oculta el correo. Entonces vería una cuenta nueva, otra billetera y perdería sus partidos en la app (los de la web siguen en esa cuenta).

Eso tiene que aclararlo Vitalik con Cavos (nosotros no los contactamos):

1. Si una cuenta creada con código al correo se puede vincular después con Apple o Google (mismo `userId` de Cavos y misma billetera).
2. Qué pasa si la persona oculta el correo en «Iniciar sesión con Apple».
3. Si hay un camino para agregar una passkey o un factor de recuperación en la web que luego sirva en el iPhone (el correo, por sí solo, no entra en RN).
4. Confirmar el `redirectUri` exacto `campeones-fc://cavos-auth` y, si hace falta, el `rpId` de passkeys para nativo, en el panel de la app Campeones FC. El panel no acepta comodines.
5. Si al subir a kit **0.5.2** (recomendado: acepta releases nuevas del enclave sin parche) el JWT del login nativo queda accesible para el integrador, o cómo debemos leerlo.

## Bloqueo técnico en kit 0.4.4 (por eso la bandera va apagada)

Nuestro `/api/auth` verifica el JWT de Cavos (JWKS + audiencia) y recién entonces acuña la sesión de Supabase. En la web el kit deja ese token en `sessionStorage` (`cavos-kit:token:<appId>`).

En React Native, `NativeCavosAuth` usa el JWT para armar la identidad y **no lo persiste ni lo expone**. `useCavos()` no tiene `token`. Si el callback trae `auth_data`, podemos leerlo (eso está implementado). El flujo actual de OAuth usa `cavos_auth_code` y el intercambio queda dentro del kit: en ese caso no tenemos JWT y no podemos acuñar la sesión de la app.

Hasta que Vitalik lo resuelva con Cavos (o se suba a un kit que exponga el token), `EXPO_PUBLIC_CAVOS_NATIVE` permanece apagado. El código del puente está en `src/lib/cavos/bridge.native.tsx` y no se carga en el export web (Metro usa `bridge.tsx` en web).

## Qué hay que registrar cuando se active

- En el panel de Cavos (Vitalik): callback `campeones-fc://cavos-auth`.
- Associated Domains y AASA en `partido.campeonesfc.app` (el Team ID de Apple es [PENDIENTE], lo pone Rolando cuando tenga la membresía).
- En la UI nativa: botones «Continuar con Apple» y «Continuar con Google» (la guía 4.8 de Apple exige Sign in with Apple si hay Google). Sin mencionar «billetera» de más, para bajar el riesgo de la 3.1.5 si la cuenta de desarrollador es de persona.
- Development build: `eas build --profile development --platform ios` (solo con el OK de Rolando; hace falta la membresía de Apple). No corre en Expo Go.

## Preguntas para Vitalik (él habla con Cavos)

1. ¿Una cuenta web de correo se puede vincular con Apple o Google en iOS, misma identidad y misma billetera?
2. ¿Cómo obtenemos el JWT de Cavos después de `login('apple'|'google')` en `@cavos/kit/react-native` 0.4.4 (o en 0.5.2) para `/api/auth`?
3. ¿Confirmas el callback `campeones-fc://cavos-auth` y el `rpId` de passkeys para nativo?
4. ¿Conviene subir a `@cavos/kit` 0.5.2 al armar el puente? (recomendado, no se hizo todavía)
