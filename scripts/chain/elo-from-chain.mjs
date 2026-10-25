#!/usr/bin/env node
// Recalcula el Elo de Campeones FC desde las actas diarias ancladas en Stellar. Cualquiera puede correrlo:
//   node scripts/chain/elo-from-chain.mjs [--base https://campeones-fc.vercel.app] [--json] [--no-chain]
// Para cada acta: (1) el hash del acta coincide con su contenido, (2) cada acta apunta a la anterior,
// (3) la raíz Merkle sale de los resultados publicados, (4) el memo hash de la transacción en Stellar
// es el hash del acta. Después repite el Elo FIDE con esos resultados. Sale con código 1 si algo no cuadra.
import { canonicalJson, merkleRoot, recordHash, replayElo, resultDigest, txMemoHex } from './lib.mjs';

const args = process.argv.slice(2);
const opt = (name, def) => {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : def;
};
const BASE = (opt('--base', process.env.CFC_BASE ?? 'https://campeones-fc.vercel.app')).replace(/\/$/, '');
const asJson = args.includes('--json');
const checkChain = !args.includes('--no-chain');

async function get(path) {
  for (let i = 0; ; i++) {
    const r = await fetch(`${BASE}${path}`);
    if (r.ok) return r.json();
    if (i >= 3 || r.status < 500) throw new Error(`${path}: HTTP ${r.status}`);
    await new Promise((s) => setTimeout(s, 1000 * (i + 1)));
  }
}

const problems = [];
const index = await get('/api/verificar?index=1');
const horizon = index.horizon;
const results = [];
let prev = null;
let anchored = 0;
for (const rec of index.records) {
  const where = `acta ${rec.day}`;
  if (recordHash(rec.record) !== rec.record_hash) problems.push(`${where}: el hash no corresponde al contenido`);
  if ((rec.record.prev ?? null) !== prev) problems.push(`${where}: no apunta al acta anterior`);
  prev = rec.record_hash;
  const day = await get(`/api/verificar?day=${rec.day}`);
  const digests = day.results.map(resultDigest);
  if (merkleRoot(digests) !== rec.record.root) problems.push(`${where}: la raíz Merkle no sale de los resultados publicados`);
  if (day.results.length !== rec.record.count) problems.push(`${where}: faltan resultados (${day.results.length} de ${rec.record.count})`);
  if (checkChain) {
    if (rec.status !== 'anchored' || !rec.tx) problems.push(`${where}: todavía no está anclada en Stellar`);
    else {
      const memo = await txMemoHex(horizon, rec.tx).catch((e) => (problems.push(`${where}: ${e.message}`), null));
      if (memo && memo !== rec.record_hash) problems.push(`${where}: el memo en Stellar no es el hash del acta`);
      if (memo === rec.record_hash) anchored++;
    }
  }
  results.push(...day.results);
}

const elo = replayElo(results);
const table = Object.entries(elo)
  .map(([user, s]) => ({ user, ...s }))
  .sort((a, b) => b.rating - a.rating || a.user.localeCompare(b.user));

if (asJson) {
  console.log(canonicalJson({ network: index.network, records: index.records.length, anchored, results: results.length, problems, ratings: table }));
} else {
  console.log(`Red: ${index.network} · actas: ${index.records.length} (verificadas en Stellar: ${checkChain ? anchored : 'omitido'}) · partidos: ${results.length}`);
  console.log('Elo recalculado (jugador = id público, sin nombres):');
  for (const r of table) console.log(`  ${String(r.rating).padStart(5)}  ${String(r.games).padStart(4)} partidos  ${r.user}`);
  console.log(problems.length ? `\nProblemas (${problems.length}):\n  - ${problems.join('\n  - ')}` : '\nTodo cuadra.');
}
process.exit(problems.length ? 1 : 0);
