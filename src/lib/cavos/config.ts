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

/** Callback exacto que hay que registrar en el panel de Cavos (sin comodines) para el login nativo. */
export const CAVOS_NATIVE_REDIRECT = 'campeones-fc://cavos-auth';

/**
 * Puente nativo (@cavos/kit/react-native). En iOS se enciende con EXPO_PUBLIC_CAVOS_NATIVE=1
 * (el .env local de la Mac lo trae). En la web permanece apagado: Metro usa bridge.tsx.
 * El JWT se captura en identityFromAuthData (ver install-native-jwt-capture.ts).
 */
export const cavosNativeEnabled =
  Platform.OS !== 'web' && /^(1|true)$/i.test(process.env.EXPO_PUBLIC_CAVOS_NATIVE ?? '');
export const cavosSupported = Platform.OS === 'web' || cavosNativeEnabled;
export const cavosConfigured = () => cavosSupported && CAVOS_APP_ID.length > 0;

/**
 * Igual que Meteorito (lib/config.ts): recuperación social de Cavos apagada hasta habilitarla en el dashboard.
 * Sin ella la passkey es el ÚNICO respaldo de la billetera, así que se pide al crear la cuenta ('required');
 * si no, la billetera queda atada a un solo navegador.
 */
export function cavosRecoveryConfig(v: string | undefined) {
  const social = /^(1|true)$/i.test(v ?? '');
  return { social, secureStep: (social ? 'optional' : 'required') as 'optional' | 'required' };
}
const RECOVERY = cavosRecoveryConfig(process.env.EXPO_PUBLIC_CAVOS_SOCIAL_RECOVERY);
export const CAVOS_SOCIAL_RECOVERY = RECOVERY.social;
export const CAVOS_SECURE_STEP = RECOVERY.secureStep;
