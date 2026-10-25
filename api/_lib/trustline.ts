// Trustline USDC (testnet) de la billetera Cavos del jugador. NO custodial: el changeTrust lo firma el jugador con
// signXdr; la cuenta platform PATROCINA la reserva (CAP-33) y paga el fee. Adaptado de Meteorito api/_lib/wallet.ts.
import { FeeBumpTransaction, Horizon, Keypair, Networks, Operation, TransactionBuilder, type Transaction } from '@stellar/stellar-sdk';
import { env } from './env';
import { HttpError } from './http';
import { feeBumpAndSend } from './feebump';
import { twEnv, usdc } from './tw';
import { withRetry } from './retry';

export type WalletState = 'ready' | 'no_account' | 'no_trustline';

export async function walletState(address: string): Promise<WalletState & string> {
  let acct: any;
  try { acct = await withRetry('Horizon loadAccount', () => new Horizon.Server(env.horizon()).loadAccount(address)); }
  catch (e: any) {
    if (e?.response?.status === 404 || e?.name === 'NotFoundError') return 'no_account';
    throw new HttpError(502, 'Stellar no respondió. Intenta de nuevo.', 'horizon_error');
  }
  return (acct.balances ?? []).some((b: any) => b.asset_code === 'USDC' && b.asset_issuer === twEnv.usdcIssuer()) ? 'ready' : 'no_trustline';
}

export async function usdcBalance(address: string): Promise<number> {
  const a: any = await new Horizon.Server(env.horizon()).loadAccount(address).catch(() => null);
  const b = (a?.balances ?? []).find((x: any) => x.asset_code === 'USDC' && x.asset_issuer === twEnv.usdcIssuer());
  return b ? Number(b.balance) : 0;
}

/** source = platform (fee + reserva), changeTrust con source = jugador. El jugador firma con Cavos signXdr. */
export async function buildTrustlineTx(player: string, state: Exclude<WalletState, 'ready'>): Promise<Transaction> {
  const src = await new Horizon.Server(env.horizon()).loadAccount(env.platformPublic());
  const b = new TransactionBuilder(src, { fee: '1000', networkPassphrase: Networks.TESTNET })
    .addOperation(Operation.beginSponsoringFutureReserves({ sponsoredId: player }));
  if (state === 'no_account') b.addOperation(Operation.createAccount({ destination: player, startingBalance: '0' }));
  b.addOperation(Operation.changeTrust({ asset: usdc(), source: player }))
    .addOperation(Operation.endSponsoringFutureReserves({ source: player }));
  return b.setTimeout(120).build();
}

/** Valida EXACTAMENTE la forma de buildTrustlineTx antes de que la platform la firme. */
export function validateTrustlineTx(xdr: string, player: string): Transaction {
  let tx: Transaction | FeeBumpTransaction;
  try { tx = TransactionBuilder.fromXDR(xdr, Networks.TESTNET); } catch { throw new HttpError(400, 'XDR inválido', 'bad_xdr'); }
  if (tx instanceof FeeBumpTransaction || tx.source !== env.platformPublic() || Number(tx.fee) > 10_000) throw new HttpError(400, 'XDR inválido', 'bad_xdr');
  const ops: any[] = tx.operations, n = ops.length;
  const ok = (n === 3 || n === 4)
    && ops[0].type === 'beginSponsoringFutureReserves' && ops[0].sponsoredId === player && (ops[0].source ?? tx.source) === tx.source
    && (n === 3 || (ops[1].type === 'createAccount' && ops[1].destination === player && Number(ops[1].startingBalance) === 0 && (ops[1].source ?? tx.source) === tx.source))
    && ops[n - 2].type === 'changeTrust' && ops[n - 2].source === player && ops[n - 2].line?.code === 'USDC' && ops[n - 2].line?.issuer === twEnv.usdcIssuer()
    && ops[n - 1].type === 'endSponsoringFutureReserves' && ops[n - 1].source === player;
  if (!ok) throw new HttpError(400, 'Operación no permitida.', 'bad_xdr');
  const hint = Keypair.fromPublicKey(player).signatureHint();
  if (!tx.signatures.some((s) => Buffer.from(s.hint()).equals(Buffer.from(hint)))) throw new HttpError(400, 'Falta tu firma.', 'bad_xdr');
  return tx;
}

export async function submitTrustlineTx(tx: Transaction) {
  tx.sign(Keypair.fromSecret(env.platformSecret()));
  return (await feeBumpAndSend(tx)).hash;
}

/** Faucet de demo: la cuenta platform (tesorería) manda test USDC al jugador. Se recarga con faucet.circle.com
 *  (20 USDC cada 2 h por dirección). Monto por env STAKE_FAUCET_UNITS (default 0 = apagado). */
export async function faucetTx(player: string, units: number) {
  const src = await new Horizon.Server(env.horizon()).loadAccount(env.platformPublic());
  const tx = new TransactionBuilder(src, { fee: '1000', networkPassphrase: Networks.TESTNET })
    .addOperation(Operation.payment({ destination: player, asset: usdc(), amount: units.toFixed(7) }))
    .setTimeout(60).build();
  tx.sign(Keypair.fromSecret(env.platformSecret()));
  const r: any = await new Horizon.Server(env.horizon()).submitTransaction(tx);
  return r.hash as string;
}
