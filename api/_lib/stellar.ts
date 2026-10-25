// Anclaje en Stellar desde la cuenta platform: memo hash + manageData con el mismo hash.
// La clave de manageData es fija ('cfc:last') y se sobrescribe: las reservas de la cuenta no crecen.
import { Horizon, Keypair, Memo, Operation, TransactionBuilder, type Transaction } from '@stellar/stellar-sdk';
import { env } from './env';
import { withRetry } from './retry';
import { txWindowS } from './timebounds';

export const DATA_KEY = 'cfc:last';
/** Clave del acta diaria (también se sobrescribe). */
export const DAILY_DATA_KEY = 'cfc:day';
export const MAX_FEE_STROOPS = '1000';

export type TxStatus = 'success' | 'failed' | 'missing';

export interface Chain {
  txStatus(hash: string): Promise<TxStatus>;
  ledgerCloseS(): Promise<number>;
  buildAnchor(hashHex: string, dataKey?: string): Promise<{ tx: Transaction; hash: string; maxTime: number }>;
  submit(tx: Transaction): Promise<{ hash: string }>;
}

export class SubmitError extends Error {
  constructor(
    message: string,
    public codes: unknown,
    public retryable: boolean,
  ) {
    super(message);
  }
}

export function buildAnchorTx(p: {
  source: { accountId(): string; sequenceNumber(): string; incrementSequenceNumber(): void };
  hashHex: string;
  passphrase: string;
  windowS: number;
  dataKey?: string;
}): Transaction {
  if (!/^[a-f0-9]{64}$/.test(p.hashHex)) throw new Error('hash inválido');
  const value = Buffer.from(p.hashHex, 'hex');
  return new TransactionBuilder(p.source as any, { fee: MAX_FEE_STROOPS, networkPassphrase: p.passphrase })
    .addMemo(Memo.hash(value))
    .addOperation(Operation.manageData({ name: p.dataKey ?? DATA_KEY, value }))
    .setTimeout(p.windowS)
    .build();
}

export function horizonChain(): Chain {
  const server = new Horizon.Server(env.horizon());
  const secret = env.platformSecret();
  return {
    async txStatus(hash) {
      try {
        const t: any = await withRetry('Horizon tx', () => server.transactions().transaction(hash).call());
        return t?.successful ? 'success' : 'failed';
      } catch (e: any) {
        if (e?.response?.status === 404 || e?.name === 'NotFoundError') return 'missing';
        throw e;
      }
    },
    async ledgerCloseS() {
      const r: any = await withRetry('Horizon ledger', () => server.ledgers().order('desc').limit(1).call());
      return Math.floor(Date.parse(r.records[0].closed_at) / 1000);
    },
    async buildAnchor(hashHex, dataKey) {
      const kp = Keypair.fromSecret(secret);
      if (env.platformPublic() && kp.publicKey() !== env.platformPublic()) throw new Error('PLATFORM_SECRET no corresponde a PLATFORM_PUBLIC');
      const account = await withRetry('Horizon account', () => server.loadAccount(kp.publicKey()));
      const tx = buildAnchorTx({ source: account, hashHex, dataKey, passphrase: env.passphrase(), windowS: txWindowS() });
      tx.sign(kp);
      return { tx, hash: Buffer.from(tx.hash()).toString('hex'), maxTime: Number(tx.timeBounds?.maxTime ?? 0) };
    },
    async submit(tx) {
      const hash = Buffer.from(tx.hash()).toString('hex');
      try {
        const r: any = await withRetry('Horizon submit', () => server.submitTransaction(tx), {
          landed: async () => ((await this.txStatus(hash)) === 'success' ? ({ hash } as any) : null),
        });
        return { hash: r.hash ?? hash };
      } catch (e: any) {
        const codes = e?.response?.data?.extras?.result_codes ?? null;
        const txCode = String((codes as any)?.transaction ?? '');
        const retryable = txCode === 'tx_bad_seq' || txCode === 'tx_too_late' || txCode === 'tx_insufficient_fee' || !codes;
        throw new SubmitError(`envío falló: ${JSON.stringify(codes ?? e?.message ?? String(e)).slice(0, 300)}`, codes, retryable);
      }
    },
  };
}
