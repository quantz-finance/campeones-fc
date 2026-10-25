import { Account, Contract, Keypair, nativeToScVal, Networks, StrKey, TransactionBuilder, xdr } from '@stellar/stellar-sdk';
import { describe, expect, it } from 'vitest';
import { validateEscrowTx } from './feebump';

const player = Keypair.random();
const cid = StrKey.encodeContract(Buffer.alloc(32, 7));
const other = StrKey.encodeContract(Buffer.alloc(32, 9));

function fundTx(p: { contract?: string; fn?: string; amount?: bigint; signer?: string; sign?: boolean } = {}) {
  const args = [
    nativeToScVal(p.signer ?? player.publicKey(), { type: 'address' }),
    xdr.ScVal.scvMap([]),
    nativeToScVal(p.amount ?? 1_000_000_000n, { type: 'i128' }),
  ];
  const tx = new TransactionBuilder(new Account(player.publicKey(), '1'), { fee: '100000', networkPassphrase: Networks.TESTNET })
    .addOperation(new Contract(p.contract ?? cid).call(p.fn ?? 'fund_escrow', ...args)).setTimeout(100).build();
  if (p.sign !== false) tx.sign(player);
  return tx.toXDR();
}
const ex = { contractId: cid, fn: 'fund_escrow', source: player.publicKey(), amountStroops: 1_000_000_000n };

describe('validateEscrowTx (fund_escrow signed by the player)', () => {
  it('accepts the exact deposit', () => {
    expect(() => validateEscrowTx(fundTx(), ex)).not.toThrow();
  });
  it('rejects a different amount, contract, function, signer or an unsigned tx', () => {
    expect(() => validateEscrowTx(fundTx({ amount: 1n }), ex)).toThrow(/monto/);
    expect(() => validateEscrowTx(fundTx({ contract: other }), ex)).toThrow(/Contrato/);
    expect(() => validateEscrowTx(fundTx({ fn: 'release_funds' }), ex)).toThrow(/Función/);
    expect(() => validateEscrowTx(fundTx({ signer: Keypair.random().publicKey() }), ex)).toThrow();
    expect(() => validateEscrowTx(fundTx({ sign: false }), ex)).toThrow(/sin firmar/);
    expect(() => validateEscrowTx(fundTx(), { ...ex, source: Keypair.random().publicKey() })).toThrow(/billetera/);
  });
});
