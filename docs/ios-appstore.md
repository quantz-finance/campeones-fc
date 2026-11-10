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

Esos entitlements obligan a firmar incluso en el simulador. En el development build local van apagados (el plugin de Cavos recibe `enableAssociatedDomains: false`) para poder correr `npm run ios` sin certificados. Cuando la membresía esté activa y vayamos a TestFlight, hay que poner `CFC_IOS_ASSOCIATED_DOMAINS=1` (en EAS o en el entorno) y el Team ID en la AASA.

## EAS

`eas.json` define los perfiles `development`, `preview` y `production`. No incluye credenciales, ni el `ascAppId` (se agrega cuando exista la ficha en App Store Connect). No subir de plan de Expo ni lanzar un build sin el OK de Rolando.

## Correrla en el simulador (Mac)

El kit nativo de Cavos no corre en Expo Go: hace falta un development build. En esta rama, con el `.env` local ya puesto, son dos comandos desde `~/Documents/campeones-ios`:

```
npm install
npm run ios
```

`npm run ios` ejecuta `expo run:ios` (prebuild + Xcode + simulador). La primera vez tarda varios minutos (CocoaPods y compilación). Hace falta Xcode con los simuladores y CocoaPods. No sube nada a EAS ni a la App Store.

Hace falta Node 22 (`nvm use` lee el `.nvmrc`). Si el `node` por defecto es más viejo, corre `nvm use` en esa carpeta antes de los dos comandos.

El login real con Apple o Google abre el navegador del simulador y requiere el callback `campeones-fc://cavos-auth` registrado en el panel de Cavos. La API de `/api` apunta a `https://partido.campeonesfc.app` (testnet). Los Associated Domains van apagados en este build local (sin certificados de Apple todavía).
