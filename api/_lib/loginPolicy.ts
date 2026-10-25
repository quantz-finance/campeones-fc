// Reglas de entrada (puras, con tests). Ver api/auth.ts. Mismo modelo que Meteorito (api/_lib/auth.ts):
// el servidor NUNCA llama a la API HTTP de Cavos. La confianza sale de dos pruebas que verificamos nosotros:
//   1) el JWT (firma contra el JWKS del issuer + lista cerrada de iss + aud), y
//   2) una firma ed25519 de la billetera de ESTE dispositivo sobre un nonce de un solo uso (5 min) que nombra
//      la identidad (iss, sub). La primera billetera de la cuenta queda ligada y nunca se reemplaza al entrar.
//
// Por qué no hay "entrada solo con token": el aud de Cavos es compartido entre apps (cavos-email, el cliente
// OAuth de Google/Apple de Cavos), así que el token solo prueba quién es la persona, no que entró a ESTA app.
// Sin la firma de la billetera ligada, el operador de otra app de Cavos que reciba el token podría reusarlo aquí.
import { HttpError } from './http';

export type WalletBind = 'bound' | 'same' | 'other_wallet' | 'address_taken';

/** Este navegador no tiene la llave de la billetera y no hay passkey para traerla: no hay prueba, no hay sesión. */
export function deviceNotAuthorized(): HttpError {
  return new HttpError(
    409,
    'Este navegador no tiene tu billetera de Cavos. Entra desde el dispositivo donde creaste tu cuenta.',
    'device_not_authorized',
  );
}

/**
 * Resultado de ligar la billetera firmada. La primera billetera de la cuenta queda como la de anclaje.
 * other_wallet (la cuenta ya tiene otra billetera; p. ej. entró con Google y luego con correo y Cavos le dio otra):
 *   nunca se acepta, porque es exactamente lo que vería quien reusa un token de otra app con su propia billetera.
 * address_taken (esa billetera es de OTRA cuenta): nunca.
 */
export function walletOutcome(bind: WalletBind): { status: 'bound' | 'same' } {
  if (bind === 'address_taken') throw new HttpError(409, 'Esa billetera ya está ligada a otra cuenta.', 'address_taken');
  if (bind === 'other_wallet') {
    throw new HttpError(409, 'Tu cuenta usa otra billetera de Cavos. Entra con el mismo método que usaste la primera vez.', 'other_wallet');
  }
  return { status: bind };
}
