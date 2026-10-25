#!/usr/bin/env node
// Paso de testnet a mainnet del registro en Stellar. Solo Node 22. No crea ni fondea cuentas, nunca lee ni imprime secretos.
//
//   node scripts/chain/mainnet-cutover.mjs check  --address G...        1. la cuenta existe en mainnet y tiene saldo (si no, se niega)
//   VERCEL_TOKEN=... node scripts/chain/mainnet-cutover.mjs switch --address G...
//                                                                       2. comprueba PLATFORM_PUBLIC/PLATFORM_SECRET en Vercel (production),
//                                                                          pone STELLAR_NETWORK y EXPO_PUBLIC_STELLAR_NETWORK=mainnet en
//                                                                          production (preview sigue en testnet) y redespliega
//   node scripts/chain/mainnet-cutover.mjs verify --address G...        3. producción ya responde mainnet, con esa cuenta y con saldo
//   CRON_SECRET=... node scripts/chain/mainnet-cutover.mjs backfill --address G...
//                                                                       4. repite verify y vuelve a anclar todo el historial en mainnet
//                                                                          (lo de testnet queda archivado) y arma la cadena de actas nueva
// Cada paso vuelve a correr `check`: si la cuenta no está fondeada en mainnet, nada sigue.
import { spawnSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const [, , step, ...rest] = process.argv;
const opt = (name, def) => {
  const i = rest.indexOf(name);
  return i >= 0 ? rest[i + 1] : def;
};
const BASE = opt('--base', 'https://campeones-fc.vercel.app').replace(/\/$/, '');
const PROJECT = opt('--project', 'campeones-fc');
const TEAM = opt('--team', process.env.VERCEL_TEAM_ID ?? '');
const ADDRESS = opt('--address', process.env.PLATFORM_PUBLIC ?? '');
const MIN_XLM = Math.max(2.5, Number(opt('--min-xlm', '5')));
const HORIZON_MAINNET = 'https://horizon.stellar.org';
const TESTNET_PLATFORM = 'GCV7BH45ZTACITJKW7VR5YZ5JGXKXOHGRNJ4E5MVHD77WP6G7ZWNNBCP';

const die = (msg) => {
  console.error(`✗ ${msg}`);
  process.exit(1);
};
const ok = (msg) => console.log(`✓ ${msg}`);

async function check() {
  if (!/^G[A-Z2-7]{55}$/.test(ADDRESS)) die('Pasa --address con la dirección pública G… de la cuenta de mainnet.');
  const r = await fetch(`${HORIZON_MAINNET}/accounts/${ADDRESS}`);
  if (r.status === 404) die(`${ADDRESS} no existe en mainnet. Hay que crearla y fondearla (≈10 XLM) antes del cambio.`);
  if (!r.ok) die(`Horizon mainnet respondió ${r.status}.`);
  const a = await r.json();
  const xlm = Number((a.balances ?? []).find((b) => b.asset_type === 'native')?.balance ?? 0);
  if (xlm < MIN_XLM) die(`${ADDRESS} tiene ${xlm} XLM en mainnet; hacen falta al menos ${MIN_XLM}.`);
  if (a.signers?.length > 1 || a.thresholds?.med_threshold > 1) console.log('! La cuenta tiene varios firmantes o umbrales: el servidor firma solo con PLATFORM_SECRET.');
  if (ADDRESS === TESTNET_PLATFORM) console.log('! Es la misma llave que la cuenta de testnet; lo recomendado es una cuenta nueva solo para mainnet.');
  ok(`Cuenta de mainnet ${ADDRESS} existe con ${xlm} XLM (mínimo ${MIN_XLM}).`);
}

async function vercel(path, init = {}) {
  const token = (process.env.VERCEL_TOKEN ?? '').trim();
  if (!token) die('Falta VERCEL_TOKEN (o haz el paso 2 a mano, ver docs/mainnet-cutover.md).');
  const sep = path.includes('?') ? '&' : '?';
  const r = await fetch(`https://api.vercel.com${path}${TEAM ? `${sep}teamId=${TEAM}` : ''}`, {
    ...init,
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', ...(init.headers ?? {}) },
  });
  const body = await r.json().catch(() => ({}));
  if (!r.ok) die(`Vercel ${init.method ?? 'GET'} ${path.split('?')[0]}: ${r.status} ${body?.error?.code ?? ''}`);
  return body;
}

async function switchEnv() {
  const { envs } = await vercel(`/v10/projects/${PROJECT}/env`);
  const prod = (key) => envs.filter((e) => e.key === key && e.target?.includes('production'));
  const [pub] = prod('PLATFORM_PUBLIC');
  if (!pub) die('PLATFORM_PUBLIC no está en production.');
  if (!prod('PLATFORM_SECRET').length) die('PLATFORM_SECRET no está en production.');
  const pubValue = (await vercel(`/v1/projects/${PROJECT}/env/${pub.id}`)).value;
  if (pubValue !== ADDRESS) die('PLATFORM_PUBLIC en production no es la dirección que pasaste.');
  if (pub.target.includes('preview')) die('PLATFORM_PUBLIC de mainnet también está en preview: déjalo solo en production (preview usa la cuenta de testnet).');
  ok('PLATFORM_PUBLIC y PLATFORM_SECRET de mainnet están en production.');
  for (const key of ['STELLAR_NETWORK', 'EXPO_PUBLIC_STELLAR_NETWORK']) {
    for (const e of envs.filter((x) => x.key === key)) {
      // Separar: production -> mainnet; lo demás sigue en testnet.
      const others = e.target.filter((t) => t !== 'production');
      if (e.target.includes('production')) {
        if (others.length) await vercel(`/v9/projects/${PROJECT}/env/${e.id}`, { method: 'PATCH', body: JSON.stringify({ target: others }) });
        else await vercel(`/v9/projects/${PROJECT}/env/${e.id}`, { method: 'DELETE' });
      }
    }
    await vercel(`/v10/projects/${PROJECT}/env?upsert=true`, {
      method: 'POST',
      body: JSON.stringify({ key, value: 'mainnet', type: 'encrypted', target: ['production'] }),
    });
    ok(`${key}=mainnet en production.`);
  }
  const { deployments } = await vercel(`/v6/deployments?projectId=${PROJECT}&target=production&state=READY&limit=1`);
  if (!deployments?.length) die('No encontré un deploy de production para redesplegar.');
  const d = await vercel('/v13/deployments?forceNew=1', {
    method: 'POST',
    body: JSON.stringify({ name: PROJECT, deploymentId: deployments[0].uid, target: 'production' }),
  });
  ok(`Redespliegue pedido: ${d.url ?? d.id}. Espera a que quede READY y corre "verify".`);
}

async function verify() {
  const s = await (await fetch(`${BASE}/api/verificar?status=1`, { cache: 'no-store' })).json();
  if (s.network !== 'mainnet') die(`Producción todavía dice red=${s.network}. ¿Ya terminó el redespliegue?`);
  if (s.horizon !== HORIZON_MAINNET) die(`Producción usa Horizon ${s.horizon}.`);
  if (s.platform?.address !== ADDRESS) die('Producción usa otra cuenta de la plataforma.');
  if (!s.platform?.funded) die('Producción ve la cuenta sin saldo suficiente.');
  const auth = await (await fetch(`${BASE}/api/auth`)).json().catch(() => ({}));
  if (auth.network && auth.network !== 'mainnet') die(`/api/auth dice red=${auth.network}.`);
  ok(`Producción: red mainnet, Horizon ${s.horizon}, cuenta ${ADDRESS} con ${s.platform.balance} XLM.`);
}

async function backfill() {
  if (!(process.env.CRON_SECRET ?? '').trim()) die('Falta CRON_SECRET en el entorno.');
  const script = join(dirname(fileURLToPath(import.meta.url)), 'backfill.mjs');
  const r = spawnSync(process.execPath, [script, '--base', BASE, '--batch', '40', '--max-calls', '800'], { stdio: 'inherit', env: process.env });
  if (r.status !== 0) die('El backfill no terminó; vuelve a correr este paso (es idempotente).');
  ok('Historial anclado en mainnet y cadena de actas nueva. Prueba: node scripts/chain/elo-from-chain.mjs');
}

const steps = { check, switch: switchEnv, verify, backfill };
if (!steps[step]) die('Uso: mainnet-cutover.mjs check|switch|verify|backfill --address G…');
await check();
if (step === 'switch') await switchEnv();
if (step === 'verify') await verify();
if (step === 'backfill') {
  await verify();
  await backfill();
}
