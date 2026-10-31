// Analítica: adaptador APAGADO. No hay proveedor instalado y no se envía nada.
//
// Reglas para cuando se conecte uno (p. ej. PostHog) más adelante:
//  1. Se activa solo si ANALYTICS_ENABLED es true Y la persona no se excluyó (optOut).
//  2. Mientras esté activo, la app muestra un aviso visible (ver AnalyticsNotice en ui/analytics-notice.tsx).
//  3. Sin grabación de sesión, sin autocaptura y sin correos ni nombres en los eventos.
//  4. La persona puede excluirse desde Perfil; la preferencia vive en el adaptador de almacenamiento.
import { storage } from './storage';

export const ANALYTICS_ENABLED = false;
const OPT_OUT_KEY = 'campeonesfc.analytics.optout';

export type AnalyticsProps = Record<string, string | number | boolean | null>;

/** El proveedor real implementa esto. Hoy no hay ninguno. */
export type AnalyticsProvider = {
  capture(event: string, properties?: AnalyticsProps): void;
  /** Debe dejar de enviar y borrar su identificador local. */
  optOut(): void;
};

let provider: AnalyticsProvider | null = null;

export function analyticsActive(): boolean {
  return ANALYTICS_ENABLED && provider != null && !isOptedOut();
}

export function isOptedOut(): boolean {
  return storage.get(OPT_OUT_KEY) === '1';
}

export function setOptOut(out: boolean) {
  storage.set(OPT_OUT_KEY, out ? '1' : null);
  if (out) provider?.optOut();
}

/** Punto único para conectar un proveedor más adelante. Sin grabación de sesión. */
export function initAnalytics(next?: AnalyticsProvider) {
  if (!ANALYTICS_ENABLED || !next) return;
  provider = next;
}

export function track(event: string, properties?: AnalyticsProps) {
  if (!analyticsActive()) return;
  provider!.capture(event, properties);
}
