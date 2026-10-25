#!/usr/bin/env node
// Pone al día el registro en Stellar: encola los partidos confirmados viejos ("sin firma"), los ancla por lotes
// y arma/ancla las actas diarias que falten. Llama a los endpoints del servidor con CRON_SECRET (nunca lo imprime).
//   CRON_SECRET=... node scripts/chain/backfill.mjs [--base https://campeones-fc.vercel.app] [--batch 40] [--max-calls 400]
const args = process.argv.slice(2);
const opt = (name, def) => {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : def;
};
const BASE = opt('--base', process.env.CFC_BASE ?? 'https://campeones-fc.vercel.app').replace(/\/$/, '');
const BATCH = Number(opt('--batch', '40'));
const MAX_CALLS = Number(opt('--max-calls', '400'));
const secret = (process.env.CRON_SECRET ?? '').trim();
if (!secret) {
  console.error('Falta CRON_SECRET en el entorno.');
  process.exit(2);
}

async function call(path) {
  const r = await fetch(`${BASE}${path}`, { headers: { Authorization: `Bearer ${secret}` } });
  const body = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(`${path}: HTTP ${r.status} ${body.code ?? ''}`);
  return body;
}

const tally = (results) =>
  Object.values(results ?? {}).reduce((acc, s) => ((acc[s] = (acc[s] ?? 0) + 1), acc), {});

let calls = 0;
// 1. Partidos.
for (;;) {
  if (++calls > MAX_CALLS) throw new Error('demasiadas llamadas; revisa el estado y vuelve a correr');
  const r = await call(`/api/anchor?backfill=${BATCH}`);
  const b = r.backlog;
  console.log(`[partidos] red=${r.network} encolados=${r.queuedNow} procesados=${r.processed} ${JSON.stringify(tally(r.results))} faltan: sin encolar=${b.unqueued} en cola=${b.queued} fallidos=${b.failed}`);
  if (b.unqueued === 0 && b.queued === 0) break;
  if (r.processed === 0 && r.queuedNow === 0) await new Promise((s) => setTimeout(s, 15_000));
}
// 2. Actas diarias.
for (;;) {
  if (++calls > MAX_CALLS) throw new Error('demasiadas llamadas; revisa el estado y vuelve a correr');
  const r = await call('/api/daily');
  console.log(`[actas] red=${r.network} armadas=${r.built.length} ${JSON.stringify(tally(r.results))} pendientes=${r.pending}`);
  if (r.pending === 0 && r.built.length === 0) break;
}
console.log('Listo.');
