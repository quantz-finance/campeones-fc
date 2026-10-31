# Camino a iOS

La app sigue siendo Expo + React Native; la web es un destino más.

- Sesión: `src/lib/storage.ts` es el adaptador de almacenamiento. En iOS, cambiar el almacén web por `expo-secure-store` (o AsyncStorage) sin tocar el resto.
- Login: `src/lib/auth/` concentra la entrada. En web usa `signInWithOAuth` (Google, PKCE). En iOS: obtener el `id_token` de Google con `expo-auth-session` o Google Sign-In nativo y abrir sesión con `supabase.auth.signInWithIdToken({ provider: 'google', token })`.
- Apple: la guía 4.8 del App Store probablemente exigirá «Iniciar sesión con Apple» si hay Google. El proveedor `apple` ya está declarado (desactivado) en `src/lib/auth/providers.ts`; falta implementarlo con `expo-apple-authentication` + `signInWithIdToken({ provider: 'apple' })` y activarlo en Supabase.
- La app es gratis y no tiene compras dentro de la app.
- Analítica: `src/lib/analytics.ts` es un stub apagado. Si se enciende, muestra un aviso visible, no graba sesiones y deja salir (opt-out).
