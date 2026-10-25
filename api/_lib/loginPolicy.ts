// Reglas de entrada (puras, con tests). Ver api/auth.ts.
//
// Firmado (lo normal): el token de Cavos + una firma de la billetera de ESTE dispositivo. Liga la billetera
//   (la primera gana) y puede ligar por correo verificado.
// Solo token (dispositivo sin la llave: otro navegador, o una billetera sin passkey): solo con
//   CAVOS_TOKEN_ONLY_LOGIN=allow, con el token recién emitido y de un solo uso; nunca liga por correo
//   ni liga billetera. Riesgo aceptado mientras Cavos comparta el aud entre apps y el registro no responda:
//   el operador de otra app de Cavos que reciba el token de una persona podría reusarlo aquí.
import { HttpError } from './http';

export const TOKEN_ONLY_MAX_AGE_S = 15 * 60;

export type WalletBind = 'bound' | 'same' | 'other_wallet' | 'address_taken';

/** ¿Se acepta la entrada solo con token? Lanza HttpError si no. */
export function assertTokenOnlyAllowed(opts: { enabled: boolean; iat: number | null; nowS: number }): void {
  if (!opts.enabled) {
    throw new HttpError(409, 'Este dispositivo todavía no tiene tu billetera de Cavos. Entra desde el dispositivo donde la creaste.', 'device_not_authorized');
  }
  if (opts.iat === null || opts.nowS - opts.iat > TOKEN_ONLY_MAX_AGE_S || opts.iat - opts.nowS > 60) {
    throw new HttpError(401, 'Tu sesión de Cavos venció. Vuelve a entrar.', 'session_expired');
  }
}

/**
 * Resultado de ligar la billetera firmada. La primera billetera de la cuenta queda como la de anclaje.
 * other_wallet (la misma persona entró con otro método de Cavos, p. ej. Google y luego correo, y Cavos le dio
 * otra billetera): se deja entrar sin cambiar la billetera de anclaje, pero solo si la cuenta se resolvió por
 * su propia identidad o por correo verificado, y solo si el registro de Cavos confirmó la billetera (o está activo
 * CAVOS_TOKEN_ONLY_LOGIN, que ya acepta ese riesgo). address_taken (esa billetera es de OTRA cuenta): nunca.
 */
export function walletOutcome(bind: WalletBind, opts: { allowOtherWallet: boolean }): { status: 'bound' | 'same' | 'other_wallet' } {
  if (bind === 'address_taken') throw new HttpError(409, 'Esa billetera ya está ligada a otra cuenta.', 'address_taken');
  // Sin registro confirmado, una billetera distinta podría ser la de quien reusa un token de otra app.
  if (bind === 'other_wallet' && !opts.allowOtherWallet) {
    throw new HttpError(409, 'Tu cuenta usa otra billetera de Cavos. Entra con el mismo método que usaste la primera vez.', 'other_wallet');
  }
  return { status: bind };
}
