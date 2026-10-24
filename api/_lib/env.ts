// Configuración del servidor (Vercel). Solo nombres y valores no secretos aquí.
import { Networks } from '@stellar/stellar-sdk';

const list = (v: string | undefined) =>
  (v ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

export type StellarNetwork = 'testnet' | 'mainnet';

export const env = {
  stellarNetwork(): StellarNetwork {
    return process.env.STELLAR_NETWORK === 'mainnet' ? 'mainnet' : 'testnet';
  },
  passphrase(): string {
    return env.stellarNetwork() === 'mainnet' ? Networks.PUBLIC : Networks.TESTNET;
  },
  horizon(): string {
    return (
      process.env.STELLAR_HORIZON_URL ??
      (env.stellarNetwork() === 'mainnet' ? 'https://horizon.stellar.org' : 'https://horizon-testnet.stellar.org')
    );
  },
  platformPublic: () => process.env.PLATFORM_PUBLIC ?? '',
  platformSecret: () => process.env.PLATFORM_SECRET ?? '',
  supabaseUrl: () => process.env.SUPABASE_URL ?? process.env.EXPO_PUBLIC_SUPABASE_URL ?? '',
  supabaseAnonKey: () => process.env.SUPABASE_ANON_KEY ?? process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '',
  supabaseServiceKey: () => process.env.SUPABASE_SERVICE_ROLE_KEY ?? '',
  /** JWKS de Cavos (tokens de Cavos/Firebase). Google y Apple usan sus propias llaves. */
  cavosJwks: () => process.env.CAVOS_JWKS_URL ?? 'https://cavos.xyz/.well-known/jwks.json',
  /** Lista CERRADA de issuers aceptados. */
  cavosIssuers: () => list(process.env.CAVOS_JWT_ISSUERS),
  /**
   * Issuer del login por correo (enclave), opcional y apagado por defecto. Solo se agrega tras
   * decodificar un token OTP real y confirmar su JWKS. Formato: "<issuer>|<jwks url>".
   */
  cavosExtraIssuer(): { iss: string; jwks: string } | null {
    const raw = (process.env.CAVOS_EXTRA_ISSUER ?? '').trim();
    if (!raw) return null;
    const [iss, jwks] = raw.split('|').map((s: string) => s.trim());
    if (!iss || !jwks || !/^https:\/\//.test(jwks)) return null;
    return { iss, jwks };
  },
  /** appId de Cavos. aud se exige siempre: sin esto el servidor no acepta ningún token. */
  cavosAudiences: () => list(process.env.CAVOS_JWT_AUDIENCE),
  /** Cliente OAuth de Cavos, aceptado como aud SOLO en tokens emitidos por Google / Apple. */
  googleAudiences: () => list(process.env.CAVOS_GOOGLE_AUDIENCE),
  appleAudiences: () => list(process.env.CAVOS_APPLE_AUDIENCE),
  cronSecret: () => process.env.CRON_SECRET ?? '',
  /** Horas que se espera la firma de los dos jugadores antes de anclar con las que haya. */
  attestWaitHours(): number {
    const n = Number(process.env.ANCHOR_ATTEST_WAIT_HOURS ?? '24');
    return Number.isFinite(n) && n >= 0 && n <= 24 * 14 ? n : 24;
  },
};

/** Nombres (nunca valores) de la configuración que falta para una ruta. */
export function missingEnv(names: string[]): string[] {
  return names.filter((n) => !(process.env[n] ?? '').trim());
}
