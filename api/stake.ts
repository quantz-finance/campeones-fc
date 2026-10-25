// Apuesta por partido con Trustless Work (SOLO testnet).
// POST /api/stake  (Authorization: Bearer <access_token de Supabase>)
//   { action: 'propose', matchId, amount }   el retador pone el monto
//   { action: 'accept' | 'decline', matchId } el rival acepta (despliega el escrow) o no
//   { action: 'fund_xdr', matchId }           -> { unsignedXdr } para firmar con Cavos signXdr
//   { action: 'fund', matchId, signedXdr }    valida + fee-bump + envía el depósito
//   { action: 'settle', matchId }             liquida si ya hay resultado confirmado (idempotente)
//   { action: 'trustline_xdr' } / { action: 'trustline', signedXdr }  activa USDC de prueba (reserva patrocinada)
//   { action: 'faucet' }                       manda STAKE_FAUCET_UNITS test USDC desde la tesorería (demo)
// GET /api/stake  (Authorization: Bearer <CRON_SECRET>) -> barre depósitos vencidos, resultados y reintentos.
import { explorerTxUrl } from '../src/domain/match-proof';
import { adminClient, supabaseUserFromToken } from './_lib/db';
import { env, missingEnv } from './_lib/env';
import { bearer, body, fail, HttpError, json } from './_lib/http';
import * as flow from './_lib/stakeFlow';
import { assertTestnet } from './_lib/tw';
import { buildTrustlineTx, faucetTx, submitTrustlineTx, usdcBalance, validateTrustlineTx, walletState } from './_lib/trustline';

const REQUIRED = ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'PLATFORM_PUBLIC', 'PLATFORM_SECRET', 'TRUSTLESS_WORK_API_KEY', 'STAKE_RESOLVER_SECRET'];
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function myWallet(userId: string) {
  const { data } = await adminClient().from('wallets').select('address').eq('user_id', userId).maybeSingle();
  if (!data?.address) throw new HttpError(409, 'Primero crea tu billetera de Stellar.', 'wallet_missing');
  return data.address as string;
}

export default async function handler(req: any, res: any) {
  try {
    assertTestnet();
    if (process.env.STAKES_ENABLED !== '1') throw new HttpError(404, 'Las apuestas no están activas.', 'disabled');
    const missing = missingEnv(REQUIRED);
    if (missing.length) throw new HttpError(503, 'Las apuestas todavía no están configuradas.', 'config_missing', { missing });
    if (req.method === 'GET') {
      if (!env.cronSecret() || bearer(req) !== env.cronSecret()) throw new HttpError(401, 'no autorizado', 'unauthorized');
      return json(res, 200, { ok: true, results: await flow.sweep(20) });
    }
    if (req.method !== 'POST') return json(res, 405, { error: 'method' });
    const userId = await supabaseUserFromToken(bearer(req));
    const b = body(req);
    const needMatch = () => {
      if (typeof b.matchId !== 'string' || !UUID.test(b.matchId)) throw new HttpError(400, 'Partido inválido.', 'bad_match');
      return b.matchId as string;
    };
    switch (b.action) {
      case 'propose': return json(res, 200, await flow.propose(userId, needMatch(), b.amount));
      case 'accept': return json(res, 200, await flow.accept(userId, needMatch()));
      case 'decline': return json(res, 200, await flow.decline(userId, needMatch()));
      case 'fund_xdr': return json(res, 200, await flow.fundXdr(userId, needMatch()));
      case 'fund': return json(res, 200, await flow.fund(userId, needMatch(), b.signedXdr));
      case 'settle': {
        const r: any = await flow.settle(needMatch());
        return json(res, 200, { ...r, url: r.settleTx && r.settleTx !== 'onchain' ? explorerTxUrl(r.settleTx, 'testnet') : null });
      }
      case 'trustline_xdr': {
        const addr = await myWallet(userId);
        const st = await walletState(addr);
        if (st === 'ready') return json(res, 200, { ready: true, balance: await usdcBalance(addr) });
        return json(res, 200, { ready: false, unsignedXdr: (await buildTrustlineTx(addr, st)).toXDR() });
      }
      case 'trustline': {
        const addr = await myWallet(userId);
        if (typeof b.signedXdr !== 'string' || b.signedXdr.length > 20_000) throw new HttpError(400, 'XDR inválido', 'bad_xdr');
        return json(res, 200, { ready: true, tx: await submitTrustlineTx(validateTrustlineTx(b.signedXdr, addr)) });
      }
      case 'faucet': {
        const units = Number(process.env.STAKE_FAUCET_UNITS ?? '0');
        if (!(units > 0)) throw new HttpError(404, 'El faucet de prueba está apagado.', 'faucet_off');
        const addr = await myWallet(userId);
        if ((await walletState(addr)) !== 'ready') throw new HttpError(409, 'Activa USDC de prueba primero.', 'trustline_missing');
        if ((await usdcBalance(addr)) >= units) return json(res, 200, { skipped: true, reason: 'ya tienes saldo de prueba' });
        return json(res, 200, { tx: await faucetTx(addr, units) });
      }
      default: throw new HttpError(400, 'Acción no permitida.', 'bad_action');
    }
  } catch (e) {
    return fail(res, e);
  }
}
