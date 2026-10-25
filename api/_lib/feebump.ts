// El jugador firma el XDR de TW con Cavos (signXdr); la cuenta platform lo envuelve en fee-bump y paga el fee.
// Adaptado de Meteorito api/_lib/feebump.ts. El jugador nunca necesita XLM.
import { Address, FeeBumpTransaction, Horizon, Keypair, Networks, scValToNative, Transaction, TransactionBuilder } from '@stellar/stellar-sdk';
import { env } from './env';
import { HttpError } from './http';

export interface Expect { contractId: string; fn: string; source: string; amountStroops?: bigint }

/** UNA invocación a NUESTRO escrow, con la función permitida, source = jugador y (fund_escrow) el monto exacto. */
export function validateEscrowTx(signedXdr: string, ex: Expect): Transaction {
  let tx: Transaction | FeeBumpTransaction;
  try { tx = TransactionBuilder.fromXDR(signedXdr, Networks.TESTNET); } catch { throw new HttpError(400, 'XDR inválido', 'bad_xdr'); }
  if (tx instanceof FeeBumpTransaction) throw new HttpError(400, 'No se aceptan fee-bumps del cliente.', 'bad_xdr');
  if (tx.networkPassphrase !== Networks.TESTNET) throw new HttpError(400, 'Red incorrecta.', 'bad_xdr');
  if (tx.source !== ex.source) throw new HttpError(400, 'La transacción no es de tu billetera.', 'bad_xdr');
  if (tx.operations.length !== 1 || tx.operations[0].type !== 'invokeHostFunction') throw new HttpError(400, 'Operación no permitida.', 'bad_xdr');
  const op: any = tx.operations[0];
  if (op.source && op.source !== ex.source) throw new HttpError(400, 'Operación no permitida.', 'bad_xdr');
  const { cid, name, args } = invoked(op.func);
  if (cid !== ex.contractId) throw new HttpError(400, 'Contrato distinto al del partido.', 'bad_xdr');
  if (name !== ex.fn) throw new HttpError(400, `Función no permitida: ${name}`, 'bad_xdr');
  if (ex.amountStroops != null) {
    // fund_escrow(signer, expected_escrow, amount): el monto es el último argumento (i128 en stroops).
    let amt: bigint | null = null, signer = '';
    try { amt = BigInt(scValToNative(args[args.length - 1])); signer = String(scValToNative(args[0])); } catch {}
    if (amt !== ex.amountStroops) throw new HttpError(400, 'El monto no coincide con la apuesta.', 'bad_amount');
    if (signer !== ex.source) throw new HttpError(400, 'El depósito no sale de tu billetera.', 'bad_xdr');
  }
  if (!tx.signatures.length) throw new HttpError(400, 'XDR sin firmar.', 'bad_xdr');
  if (Number(tx.fee) > Number(process.env.FEEBUMP_MAX_INNER_FEE ?? '20000000')) throw new HttpError(400, 'Fee demasiado alto.', 'bad_xdr');
  return tx;
}

function invoked(f: any): { cid: string; name: string; args: any[] } {
  if (typeof f?.switch !== 'function' || f.switch().name !== 'hostFunctionTypeInvokeContract') throw new HttpError(400, 'Host function no permitida.', 'bad_xdr');
  const ic = f.invokeContract();
  const name = ic.functionName();
  return { cid: Address.fromScAddress(ic.contractAddress()).toString(), name: typeof name === 'string' ? name : Buffer.from(name).toString(), args: ic.args() };
}

export async function feeBumpAndSend(inner: Transaction): Promise<{ hash: string; innerHash: string }> {
  const platform = Keypair.fromSecret(env.platformSecret());
  const fb = TransactionBuilder.buildFeeBumpTransaction(platform, String(Number(inner.fee) + 1000), inner, Networks.TESTNET);
  fb.sign(platform);
  try {
    // El inner lo firmó el jugador (no podemos cambiar sus timebounds): un solo intento.
    const r: any = await new Horizon.Server(env.horizon()).submitTransaction(fb);
    return { hash: r.hash, innerHash: Buffer.from(inner.hash()).toString('hex') };
  } catch (e: any) {
    throw new HttpError(502, 'No se pudo enviar el depósito. Intenta de nuevo.', 'submit_failed', { codes: e?.response?.data?.extras?.result_codes ?? null });
  }
}
