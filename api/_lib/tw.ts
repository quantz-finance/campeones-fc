// Cliente mínimo de Trustless Work (API V1 en testnet: dev.api.trustlesswork.com), probado en Meteorito.
// TW arma XDR SIN firmar; el servidor firma con la llave del rol y lo envía con /helper/send-transaction.
// SOLO testnet: si STELLAR_NETWORK=mainnet, todo lo de apuestas se niega.
import { Account, Asset, Contract, Horizon, Keypair, Networks, rpc, scValToNative, nativeToScVal, TransactionBuilder, type Transaction } from '@stellar/stellar-sdk';
import { env } from './env';
import { HttpError } from './http';
import { withRetry } from './retry';

export const twEnv = {
  base: () => process.env.TRUSTLESS_WORK_API_URL || 'https://dev.api.trustlesswork.com',
  key: () => process.env.TRUSTLESS_WORK_API_KEY ?? '',
  sorobanRpc: () => process.env.SOROBAN_RPC_URL || 'https://soroban-testnet.stellar.org',
  usdcIssuer: () => process.env.STAKE_USDC_ISSUER || 'GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5', // Circle testnet
  resolverSecret: () => process.env.STAKE_RESOLVER_SECRET ?? '',
};
export const usdc = () => new Asset('USDC', twEnv.usdcIssuer());

export function assertTestnet() {
  if (env.stellarNetwork() !== 'testnet') throw new HttpError(403, 'Las apuestas solo existen en testnet.', 'testnet_only');
}

async function tw<T = any>(path: string, body?: unknown, method = 'POST'): Promise<T> {
  assertTestnet();
  if (!twEnv.key()) throw new HttpError(503, 'Falta configurar Trustless Work.', 'config_missing', { missing: ['TRUSTLESS_WORK_API_KEY'] });
  const once = async () => {
    const r = await fetch(twEnv.base() + path, {
      method,
      headers: { 'Content-Type': 'application/json', 'x-api-key': twEnv.key() },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const text = await r.text();
    if (!r.ok) throw Object.assign(new Error(`TW ${path.split('?')[0]} ${r.status}: ${text.slice(0, 400)}`), { status: r.status });
    return (text ? JSON.parse(text) : {}) as T;
  };
  // send-transaction tiene efectos: un solo intento (sendSigned verifica on-chain antes de reintentar).
  return path === '/helper/send-transaction' ? once() : withRetry(`TW ${method} ${path.split('?')[0]}`, once);
}

export interface Roles {
  approver: string; serviceProvider: string; releaseSigner: string;
  platformAddress: string; disputeResolver: string; receiver: string;
}

/** Roles de un escrow de apuesta. La cuenta platform tiene todos menos el dispute resolver: el contrato no deja que el
 *  resolver abra la disputa (DisputeResolverCannotDisputeTheEscrow), así que son dos llaves. release_funds nunca se usa. */
export function stakeRoles(): Roles {
  const platform = env.platformPublic();
  const resolver = resolverPublic();
  if (!platform || !resolver) throw new HttpError(503, 'Falta configurar las cuentas del escrow.', 'config_missing', { missing: ['PLATFORM_PUBLIC', 'STAKE_RESOLVER_SECRET'] });
  if (platform === resolver) throw new HttpError(503, 'El dispute resolver debe ser otra cuenta.', 'config_invalid');
  return { approver: platform, serviceProvider: platform, releaseSigner: platform, platformAddress: platform, receiver: platform, disputeResolver: resolver };
}
export function resolverPublic(): string {
  try { return twEnv.resolverSecret() ? Keypair.fromSecret(twEnv.resolverSecret()).publicKey() : ''; } catch { return ''; }
}

/** Despliega el escrow (firma y paga la cuenta platform). amount = pozo total; platformFee 0. */
export async function deployStakeEscrow(p: { matchId: string; potUnits: number; title: string }) {
  const signer = env.platformPublic();
  const r = await tw<{ unsignedTransaction: string }>('/deployer/single-release', {
    signer,
    engagementId: `cfc-${p.matchId}`,
    title: p.title.slice(0, 80),
    description: 'Apuesta de partido en Campeones FC (testnet). Se paga al ganador confirmado por los dos jugadores.',
    roles: stakeRoles(),
    amount: p.potUnits,
    platformFee: 0,
    milestones: [{ description: 'Resultado confirmado por los dos jugadores' }],
    trustline: { address: twEnv.usdcIssuer(), symbol: 'USDC' },
  });
  const sent = await signAndSend(r.unsignedTransaction, env.platformSecret());
  if (!sent.contractId) throw new Error('TW deploy: sin contractId');
  return { contractId: sent.contractId, hash: sent.hash };
}

/** XDR sin firmar de fund_escrow con el jugador como signer (lo firma su Cavos con signXdr). */
export async function fundEscrowXdr(contractId: string, signer: string, units: number) {
  const r = await tw<{ unsignedTransaction: string }>('/escrow/single-release/fund-escrow', { contractId, signer, amount: units });
  return r.unsignedTransaction;
}

/** Abre la disputa (firma la cuenta platform como approver). Directo a Horizon, no por send-transaction (Meteorito). */
export async function disputeEscrow(contractId: string) {
  const r = await tw<{ unsignedTransaction: string }>('/escrow/single-release/dispute-escrow', { contractId, signer: env.platformPublic() });
  return signAndSubmitHorizon(r.unsignedTransaction, env.platformSecret());
}

/** Reparte el saldo (firma el dispute resolver, que paga su propio fee). La suma debe ser EXACTAMENTE el saldo. */
export async function resolveDispute(contractId: string, distributions: { address: string; amount: number }[]) {
  const r = await tw<{ unsignedTransaction: string }>('/escrow/single-release/resolve-dispute', {
    contractId, disputeResolver: resolverPublic(), distributions,
  });
  return signAndSubmitHorizon(r.unsignedTransaction, twEnv.resolverSecret());
}

/** Firma una tx de TW con una llave del servidor y la envía directo a Horizon. Antes de reintentar mira si ya entró. */
export async function signAndSubmitHorizon(unsignedXdr: string, secret: string): Promise<{ hash: string }> {
  const tx = TransactionBuilder.fromXDR(unsignedXdr, Networks.TESTNET) as Transaction;
  tx.sign(Keypair.fromSecret(secret));
  const hash = Buffer.from(tx.hash()).toString('hex');
  const h = new Horizon.Server(env.horizon());
  try {
    await withRetry('Horizon submit', () => h.submitTransaction(tx), { landed: async () => ((await landedTx(hash)) ? ({} as any) : null) });
  } catch (e: any) {
    if (await landedTx(hash).catch(() => null)) return { hash };
    throw new Error(`envío falló: ${JSON.stringify(e?.response?.data?.extras?.result_codes ?? e?.message ?? String(e)).slice(0, 300)}`);
  }
  return { hash };
}

/** Deploy: firma con una llave del servidor y envía por TW (devuelve el contractId). El hash se calcula local (TW no lo devuelve). */
export async function signAndSend(unsignedXdr: string, secret: string) {
  const tx = TransactionBuilder.fromXDR(unsignedXdr, Networks.TESTNET) as Transaction;
  tx.sign(Keypair.fromSecret(secret));
  const hash = Buffer.from(tx.hash()).toString('hex');
  const send = async () => {
    const r = await tw<{ status: string; message?: string; contractId?: string }>('/helper/send-transaction', { signedXdr: tx.toXDR() });
    // TW a veces responde 200 con "timed out": transitorio.
    if (r.status !== 'SUCCESS' && /timed? ?out/i.test(String(r.message ?? ''))) throw new Error(`TW send-transaction timed out: ${r.message}`);
    if (r.status !== 'SUCCESS') throw new Error(`TW send-transaction: ${r.status} ${r.message ?? ''}`);
    return r;
  };
  const r = await withRetry('TW send-transaction', send, { landed: () => landedTx(hash) });
  return { ...r, hash };
}

const server = () => new rpc.Server(twEnv.sorobanRpc());

export async function landedTx(hash: string): Promise<{ status: string; contractId?: string } | null> {
  const r: any = await server().getTransaction(hash);
  if (r?.status !== 'SUCCESS') return null;
  let contractId: string | undefined;
  try { const v = r.returnValue ? scValToNative(r.returnValue) : undefined; if (typeof v === 'string' && /^C[A-Z2-7]{55}$/.test(v)) contractId = v; } catch {}
  return { status: 'SUCCESS', contractId };
}

async function simulate(contractId: string, fn: string, ...args: any[]) {
  const tx = new TransactionBuilder(new Account(Keypair.random().publicKey(), '0'), { fee: '100', networkPassphrase: Networks.TESTNET })
    .addOperation(new Contract(contractId).call(fn, ...args)).setTimeout(30).build();
  const r: any = await withRetry(`Soroban simulate ${fn}`, () => server().simulateTransaction(tx));
  if (r.error || !r.result?.retval) throw new Error(`${fn} falló: ${String(r.error ?? 'sin retval').slice(0, 200)}`);
  return scValToNative(r.result.retval);
}

/** Estado del escrow DIRECTO del contrato (el indexador de TW no ve las tx con fee-bump). */
export async function onChainEscrow(contractId: string): Promise<any> {
  return simulate(contractId, 'get_escrow');
}
export async function escrowFlags(contractId: string) {
  const f = (await onChainEscrow(contractId))?.flags ?? {};
  return { disputed: !!f.disputed, released: !!f.released, resolved: !!f.resolved };
}

/** Saldo USDC del escrow en stroops, leído del contrato del token (SAC), no del indexador. */
export async function escrowBalanceStroops(contractId: string): Promise<bigint> {
  const sac = usdc().contractId(Networks.TESTNET);
  const v = await simulate(sac, 'balance', nativeToScVal(contractId, { type: 'address' }));
  return BigInt(v);
}
