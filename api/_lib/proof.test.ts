import { Keypair } from '@stellar/stellar-sdk';
import { describe, expect, it } from 'vitest';
import { bindMessage, prefixedMessage, verifyBindProof, verifySignedMessage } from './proof';

const ISS = 'https://cavos.app/firebase';
const SUB = 'user-123';
const NONCE = 'a'.repeat(48);

function signCavos(kp: Keypair, message: string) {
  return kp.sign(prefixedMessage(message)).toString('base64');
}

describe('prueba de billetera (signMessage de Cavos)', () => {
  it('el prefijo coincide con el del kit: "Cavos Signed Message:\\n<bytes>\\n<mensaje>"', () => {
    expect(prefixedMessage('ñ').toString('utf8')).toBe('Cavos Signed Message:\n2\nñ');
  });

  it('acepta la firma con prefijo de la llave dueña de la billetera', () => {
    const kp = Keypair.random();
    const sig = signCavos(kp, bindMessage(ISS, SUB, NONCE));
    expect(verifyBindProof(ISS, SUB, { address: kp.publicKey(), publicKey: kp.publicKey(), signature: sig, nonce: NONCE })).toEqual({
      address: kp.publicKey(),
      nonce: NONCE,
    });
  });

  it('acepta también la firma sin prefijo', () => {
    const kp = Keypair.random();
    const message = bindMessage(ISS, SUB, NONCE);
    const sig = kp.sign(Buffer.from(message)).toString('base64');
    expect(() => verifySignedMessage({ address: kp.publicKey(), publicKey: kp.publicKey(), signature: sig, message })).not.toThrow();
  });

  it('rechaza la firma de otro nonce, otra identidad u otro issuer', () => {
    const kp = Keypair.random();
    const sig = signCavos(kp, bindMessage(ISS, SUB, NONCE));
    const p = { address: kp.publicKey(), publicKey: kp.publicKey(), signature: sig };
    expect(() => verifyBindProof(ISS, SUB, { ...p, nonce: 'b'.repeat(48) })).toThrow(/firma/);
    expect(() => verifyBindProof(ISS, 'user-999', { ...p, nonce: NONCE })).toThrow(/firma/);
    expect(() => verifyBindProof('https://accounts.google.com', SUB, { ...p, nonce: NONCE })).toThrow(/firma/);
  });

  it('rechaza una llave distinta a la dirección (no se aceptan signers extra)', () => {
    const owner = Keypair.random();
    const other = Keypair.random();
    const sig = signCavos(other, bindMessage(ISS, SUB, NONCE));
    expect(() => verifyBindProof(ISS, SUB, { address: owner.publicKey(), publicKey: other.publicKey(), signature: sig, nonce: NONCE })).toThrow();
  });

  it('rechaza pruebas incompletas o mal formadas', () => {
    const kp = Keypair.random();
    expect(() => verifyBindProof(ISS, SUB, { address: kp.publicKey(), publicKey: kp.publicKey(), signature: 'x', nonce: 'corto' })).toThrow(/incompleta/);
    expect(() => verifyBindProof(ISS, SUB, { address: 'GABC', publicKey: kp.publicKey(), signature: 'x', nonce: NONCE })).toThrow(/incompleta/);
    expect(() =>
      verifySignedMessage({ address: kp.publicKey(), publicKey: kp.publicKey(), signature: Buffer.alloc(10).toString('base64'), message: 'm' }),
    ).toThrow();
  });
});
