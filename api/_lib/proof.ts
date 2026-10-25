// Prueba de control de la billetera: signMessage de Cavos (ed25519) sobre un mensaje con nonce.
// Cavos firma `"Cavos Signed Message:\n" + <bytes del mensaje en UTF-8> + "\n" + mensaje`.
// Aceptamos también la firma sin prefijo por si el kit cambia el formato.
import { Keypair, StrKey } from '@stellar/stellar-sdk';

export const CAVOS_MESSAGE_PREFIX = 'Cavos Signed Message:\n';

export function prefixedMessage(message: string): Buffer {
  const m = Buffer.from(message, 'utf8');
  return Buffer.concat([Buffer.from(CAVOS_MESSAGE_PREFIX, 'utf8'), Buffer.from(String(m.length), 'utf8'), Buffer.from('\n'), m]);
}

/** Referencia de la identidad dentro de un mensaje firmado: sin ':' ni espacios. */
export function identityRef(iss: string, sub: string): string {
  const host = (() => {
    try {
      return new URL(/^https?:/.test(iss) ? iss : `https://${iss}`).host;
    } catch {
      return 'iss';
    }
  })();
  return `${host}/${sub}`.replace(/[^A-Za-z0-9_./-]/g, '_').slice(0, 160);
}

export const bindMessage = (iss: string, sub: string, nonce: string) =>
  `campeones-fc:bind:${identityRef(iss, sub)}:${nonce}`;

export const isNonce = (n: unknown): n is string => typeof n === 'string' && /^[a-f0-9]{32,128}$/.test(n);
export const isAddress = (a: unknown): a is string => typeof a === 'string' && StrKey.isValidEd25519PublicKey(a);

export type ProofInput = { address?: unknown; publicKey?: unknown; signature?: unknown; nonce?: unknown };

export class ProofError extends Error {
  constructor(public code: string, message = 'firma inválida') {
    super(message);
  }
}

/**
 * Verifica que `signature` (base64) sea la firma ed25519 de `message` por `publicKey`, y que esa llave
 * sea la billetera misma (`publicKey === address`). Cuentas Cavos nativas (enclave/passkey) firman
 * con la llave del G…; no aceptamos signers adicionales.
 */
export function verifySignedMessage(p: { address: string; publicKey: string; signature: string; message: string }): void {
  if (!isAddress(p.address) || !isAddress(p.publicKey)) throw new ProofError('proof_bad_key');
  if (p.publicKey !== p.address) throw new ProofError('proof_not_owner', 'la llave no es la de la billetera');
  const sig = Buffer.from(p.signature, 'base64');
  if (sig.length !== 64) throw new ProofError('proof_bad_signature');
  const kp = Keypair.fromPublicKey(p.publicKey);
  const ok = kp.verify(prefixedMessage(p.message), sig) || kp.verify(Buffer.from(p.message, 'utf8'), sig);
  if (!ok) throw new ProofError('proof_bad_signature');
}

/** Valida la forma de la prueba de bind y su firma. El nonce lo consume quien llama (store). */
export function verifyBindProof(iss: string, sub: string, p: ProofInput): { address: string; nonce: string } {
  if (!isAddress(p.address) || !isAddress(p.publicKey) || typeof p.signature !== 'string' || !isNonce(p.nonce)) {
    throw new ProofError('proof_incomplete', 'prueba incompleta');
  }
  verifySignedMessage({ address: p.address, publicKey: p.publicKey, signature: p.signature, message: bindMessage(iss, sub, p.nonce) });
  return { address: p.address, nonce: p.nonce };
}
