# Preparación iOS (rama local `ios-appstore`)

Identidad de la app para TestFlight y App Store. No se ha hecho `eas build` ni `eas submit`, ni se ha gastado nada.

## Identificadores

- iOS `bundleIdentifier`: `app.campeonesfc` (ya no lleva Quantz).
- Android `package`: `app.campeonesfc`.
- Solo iPhone: `supportsTablet: false` (así Apple no pide capturas de iPad en la primera versión).
- Scheme: `campeones-fc` (ya existía). Callback nativo de Cavos previsto: `campeones-fc://cavos-auth`.

## Splash y fotos

- `expo-splash-screen` usa `assets/splash-icon.png` sobre fondo `#37003C`.
- La app solo abre la fototeca (`expo-image-picker` / `launchImageLibraryAsync`), no la cámara. Por eso hay `NSPhotoLibraryUsageDescription` y no hay `NSCameraUsageDescription`.

## Associated Domains

En `app.json` quedan `applinks` y `webcredentials` para `partido.campeonesfc.app`.

El archivo `public/.well-known/apple-app-site-association` se sirve en esa ruta (el rewrite de Vercel no lo manda a `index.html`). El `TEAMID` es [PENDIENTE]: el Team ID de Apple aparece cuando Rolando tenga la membresía de Apple Developer. Hasta que no se reemplace, Apple no validará los dominios asociados ni las passkeys nativas.

## EAS

`eas.json` define los perfiles `development`, `preview` y `production`. No incluye credenciales, ni el `ascAppId` (se agrega cuando exista la ficha en App Store Connect). No subir de plan de Expo ni lanzar un build sin el OK de Rolando.
