// Configuración pública de Cavos (se incrusta en el bundle).
import { Platform } from 'react-native';

export const CAVOS_APP_ID = (process.env.EXPO_PUBLIC_CAVOS_APP_ID ?? '').trim();
/** rpId para passkeys. No se cambia después de lanzar sin migrar passkeys. */
export const CAVOS_RP_ID = (process.env.EXPO_PUBLIC_CAVOS_RP_ID ?? 'campeones-fc.vercel.app').trim();
export const STELLAR_NETWORK: 'testnet' | 'mainnet' = process.env.EXPO_PUBLIC_STELLAR_NETWORK === 'mainnet' ? 'mainnet' : 'testnet';
/** Ranura de la llave del dispositivo y sal de HKDF de la billetera. NUNCA cambiarla: cambiaría la dirección. */
export const APP_SALT = 'campeones-fc';
/** Entorno de la app en la consola de Cavos. Igual que el kit: production salvo que se pida development. */
export const CAVOS_ENVIRONMENT: 'development' | 'production' =
  process.env.EXPO_PUBLIC_CAVOS_ENVIRONMENT === 'development' ? 'development' : 'production';

/** Por ahora solo web (PWA). En nativo hace falta un development build con el plugin de Cavos. */
export const cavosSupported = Platform.OS === 'web';
export const cavosConfigured = () => cavosSupported && CAVOS_APP_ID.length > 0;
