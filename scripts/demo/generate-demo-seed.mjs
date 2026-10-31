// Genera supabase/seed/demo-seed.sql: ~50 jugadores ficticios, grupos, torneos, amistades,
// cientos de partidos confirmados en los últimos seis meses, algunos pendientes y trofeos.
// Determinista (misma semilla => mismo SQL). Uso: node scripts/demo/generate-demo-seed.mjs
// Las fechas son relativas a now() del momento en que se corre el SQL.
// El Elo NO se escribe aquí: el SQL termina con public.recompute_ratings(), que repite todos los
// partidos confirmados en orden con la misma lógica FIDE que usa la app y guarda en cada partido
// el rating previo y el cambio Elo (rating_*_before, rating_delta_*), que la cinta muestra como +16 Elo.
import { createHash } from 'node:crypto';
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const OUT = join(root, 'supabase/seed/demo-seed.sql');

// ---------- utilidades ----------
let seed = 20261024;
const rand = () => {
  seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
const pick = (arr) => arr[Math.floor(rand() * arr.length)];
const gauss = () => Math.sqrt(-2 * Math.log(rand() + 1e-12)) * Math.cos(2 * Math.PI * rand());
const uuid = (key) => {
  const h = createHash('sha1').update('campeones-fc-demo:' + key).digest('hex');
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-5${h.slice(13, 16)}-${((parseInt(h[16], 16) & 3) | 8).toString(16)}${h.slice(17, 20)}-${h.slice(20, 32)}`;
};
const q = (s) => (s == null ? 'null' : `'${String(s).replace(/'/g, "''")}'`);
const DAY = 86400;
const SPAN = 182 * DAY; // seis meses
// Segundos "hace" -> expresión SQL relativa a now().
const ago = (s) => `now() - interval '${Math.max(1, Math.round(s))} seconds'`;
const after = (s) => `now() + interval '${Math.round(s)} seconds'`;

// ---------- jugadores ----------
const AVATARS = ['rayo', 'ola', 'volcan', 'quetzal', 'estrella', 'luna', 'fuego', 'montana'];
const PEOPLE = [
  ['diegorojas', 'Diego Rojas'], ['elpibe10', 'El Pibe 10'], ['vale_mora', 'Valeria Mora'], ['chepe_cr', 'Chepe Vargas'],
  ['tavo_gol', 'Gustavo Solís'], ['naty_ps', 'Natalia Jiménez'], ['kevin_ac', 'Kevin Araya'], ['majo_fc', 'María José Chaves'],
  ['luisfer', 'Luis Fernando Mata'], ['andres_q', 'Andrés Quesada'], ['pao_rm', 'Paola Ramírez'], ['eltico', 'El Tico'],
  ['santi_vg', 'Santiago Vega'], ['cami_lo', 'Camila López'], ['juanpa', 'Juan Pablo Herrera'], ['dani_cr7', 'Daniela Castro'],
  ['mono_rv', 'Mono Rivera'], ['fabi_m', 'Fabiola Méndez'], ['pollo_gt', 'Pollo Gutiérrez'], ['nico_pz', 'Nicolás Pérez'],
  ['sofi_ag', 'Sofía Aguilar'], ['bryan_cz', 'Bryan Cruz'], ['memo_sl', 'Memo Salazar'], ['ari_bm', 'Ariana Brenes'],
  ['charlie_nv', 'Carlos Navarro'], ['tefa_ul', 'Estefanía Ulate'], ['jeison', 'Jeison Monge'], ['lu_cam', 'Lucía Campos'],
  ['beto_ch', 'Alberto Chacón'], ['moni_sg', 'Mónica Segura'], ['rata_volante', 'Rata Volante'], ['emi_ortiz', 'Emiliano Ortiz'],
  ['gabo_ft', 'Gabriel Fonseca'], ['isa_bl', 'Isabel Blanco'], ['toño_', 'Toño Alfaro'], ['ximena_r', 'Ximena Rodríguez'],
  ['mateo_lz', 'Mateo Lizano'], ['caro_vb', 'Carolina Villalobos'], ['franco_mx', 'Franco Medina'], ['juli_es', 'Julián Espinoza'],
  ['zurdo_ag', 'El Zurdo Arguedas'], ['ale_pr', 'Alejandra Porras'], ['oscar_ds', 'Óscar Delgado'], ['nacho_cb', 'Ignacio Cubero'],
  ['vivi_hz', 'Viviana Hernández'], ['tito_gm', 'Tito Gómez'], ['renata_s', 'Renata Sánchez'], ['joel_mr', 'Joel Marín'],
  ['pipe_co', 'Felipe Cordero'], ['kike_lp', 'Kike Leiva'],
];
const players = PEOPLE.map(([username, name], i) => {
  const u = username.normalize('NFD').replace(/[^a-z0-9_]/g, '').slice(0, 12);
  return {
    i, id: uuid('user:' + i), username: u.length >= 3 ? u : 'jugador' + i, name,
    avatar: AVATARS[i % AVATARS.length],
    skill: Math.round(gauss() * 170), activity: 0.4 + rand() * 1.6,
    // Día (desde el inicio) en que se unió: la mayoría al arranque, algunos después.
    start: i < 34 ? Math.floor(rand() * 20) : 20 + Math.floor(rand() * 100),
  };
});
const P = (i) => players[i];

// ---------- grupos ----------
const GROUPS = [
  { key: 'barrio', name: 'Los del barrio', members: [0, 1, 3, 4, 11, 16, 18, 22, 30, 40, 45, 49] },
  { key: 'oficina', name: 'Oficina', members: [2, 5, 8, 9, 10, 24, 25, 28, 29, 42] },
  { key: 'primos', name: 'Primos', members: [0, 12, 13, 14, 15, 36, 37, 44] },
  { key: 'u', name: 'La U', members: [6, 7, 17, 19, 20, 21, 23, 26, 27, 31, 32, 33, 38, 47] },
  { key: 'viernes', name: 'Liga del viernes', members: [1, 4, 6, 21, 34, 35, 39, 41, 43, 46] },
  { key: 'heredia', name: 'Los de Heredia', members: [9, 13, 26, 34, 48, 35, 42, 15] },
];
for (const g of GROUPS) {
  g.id = uuid('group:' + g.key);
  g.created = Math.min(...g.members.map((m) => P(m).start)) * DAY;
  g.owner = g.members.reduce((a, b) => (P(a).start <= P(b).start ? a : b));
}
const loners = players.filter((p) => !GROUPS.some((g) => g.members.includes(p.i))).map((p) => p.i);

// ---------- amistades ----------
const pairKey = (a, b) => (a < b ? `${a}-${b}` : `${b}-${a}`);
const friends = new Map(); // key -> {a,b,status,at}
const addFriend = (a, b, status = 'accepted') => {
  const k = pairKey(a, b);
  if (a === b || friends.has(k)) return;
  const at = Math.max(P(a).start, P(b).start) * DAY + rand() * 5 * DAY;
  friends.set(k, { a, b, status, at });
};
for (const g of GROUPS) for (const a of g.members) for (const b of g.members) if (a < b && rand() < 0.85) addFriend(a, b);
// Los que no están en grupos tienen amigos sueltos.
for (const l of loners) for (let n = 0; n < 4; n++) addFriend(l, Math.floor(rand() * 34));
// Solicitudes pendientes.
for (let n = 0; n < 9; n++) addFriend(Math.floor(rand() * 50), Math.floor(rand() * 50), 'pending');
const areFriends = (a, b) => friends.get(pairKey(a, b))?.status === 'accepted';

// ---------- rivalidades ----------
const RIVALS = new Set(['0-1', '3-4', '2-5', '8-9', '6-7', '19-20', '12-13', '21-34', '26-27', '30-40', '14-15', '35-39'].map((k) => {
  const [a, b] = k.split('-').map(Number); return pairKey(a, b);
}));

// ---------- partidos ----------
const matches = [];
const usedTimes = new Set();
const uniqueTime = (s) => { let t = Math.round(s); while (usedTimes.has(t)) t += 7; usedTimes.add(t); return t; };
function playScore(a, b, allowDraw = true) {
  const pA = 1 / (1 + 10 ** ((P(b).skill - P(a).skill) / 400));
  const drawP = allowDraw ? 0.22 * (1 - Math.abs(2 * pA - 1)) + 0.04 : 0;
  const r = rand();
  if (r < drawP) { const g = pick([0, 1, 1, 1, 2, 2, 2, 3, 3, 4]); return { winner: null, ga: g, gb: g }; }
  const aWins = rand() < pA;
  const w = pick([1, 2, 2, 2, 3, 3, 3, 4, 4, 5, 6]);
  const l = Math.max(0, Math.min(w - 1, Math.floor(rand() * w * (0.5 + rand() * 0.6))));
  return aWins ? { winner: a, ga: w, gb: l } : { winner: b, ga: l, gb: w };
}
// t = segundos desde el inicio del periodo; se convierte a "hace" al escribir.
function addMatch({ a, b, t, group = null, tournament = null, slot = null, status = 'confirmed', score, key }) {
  const id = uuid('match:' + (key ?? matches.length));
  const s = score ?? (status === 'confirmed' ? playScore(a, b) : null);
  const created = t - (600 + rand() * 3000);
  const m = { id, a, b, t: uniqueTime(t), created, group, tournament, slot, status, score: s };
  matches.push(m);
  return m;
}
// Tarde/noche en Costa Rica (UTC-6): 18:00-23:30 entre semana, todo el día el fin de semana.
function eveningTime(day) {
  const base = day * DAY;
  return base + (rand() < 0.75 ? (18 + rand() * 5.5) : (11 + rand() * 7)) * 3600 + 6 * 3600;
}

// Candidatos: pares del mismo grupo (con group_id) y amigos sueltos (sin grupo).
const candidates = [];
for (const g of GROUPS) for (const a of g.members) for (const b of g.members) if (a < b) {
  const w = P(a).activity * P(b).activity * (RIVALS.has(pairKey(a, b)) ? 7 : 1);
  candidates.push({ a, b, group: g, w });
}
for (const f of friends.values()) if (f.status === 'accepted' && !GROUPS.some((g) => g.members.includes(f.a) && g.members.includes(f.b))) {
  candidates.push({ a: f.a, b: f.b, group: null, w: P(f.a).activity * P(f.b).activity * 0.8 });
}

// ---------- torneos ----------
const tournaments = [];
const slots = [];
function shuffled(arr) { const a = arr.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
function singleElim(key, name, groupKey, size, startDay) {
  const g = GROUPS.find((x) => x.key === groupKey);
  const ids = shuffled(g.members.filter((m) => P(m).start < startDay)).slice(0, size);
  const tr = { id: uuid('tournament:' + key), key, name, group: g, format: 'single_elim', size, ids, created: startDay * DAY, status: 'completed', winner: null };
  tournaments.push(tr);
  const rounds = size === 4 ? 2 : size === 8 ? 3 : 4;
  let current = [];
  for (let p = 0; p < size / 2; p++) current.push([ids[2 * p], ids[2 * p + 1]]);
  let day = startDay;
  for (let r = 1; r <= rounds; r++) {
    const winners = [];
    current.forEach(([a, b], pos) => {
      const slotId = uuid(`slot:${key}:${r}:${pos}`);
      const m = addMatch({ a, b, t: eveningTime(day + Math.floor(rand() * 2)), group: g, tournament: tr, slot: slotId, score: playScore(a, b, false), key: `t:${key}:${r}:${pos}` });
      slots.push({ id: slotId, tr, round: r, pos, a, b, winner: m.score.winner, match: m });
      winners.push(m.score.winner);
      if (r === rounds) tr.winner = m.score.winner, tr.endT = m.t;
    });
    current = [];
    for (let p = 0; p < winners.length / 2; p++) current.push([winners[2 * p], winners[2 * p + 1]]);
    day += 3;
  }
}
function roundRobinPairs(ids) {
  const list = ids.length % 2 ? [...ids, null] : ids.slice();
  const n = list.length, out = [];
  let rot = list.slice();
  for (let r = 0; r < n - 1; r++) {
    for (let i = 0; i < n / 2; i++) if (rot[i] != null && rot[n - 1 - i] != null) out.push([rot[i], rot[n - 1 - i]]);
    rot = [rot[0], rot[n - 1], ...rot.slice(1, n - 1)];
  }
  return out;
}
function roundRobin(key, name, groupKey, size, startDay, openCount = 0) {
  const g = GROUPS.find((x) => x.key === groupKey);
  const ids = shuffled(g.members.filter((m) => P(m).start < startDay)).slice(0, size);
  const tr = { id: uuid('tournament:' + key), key, name, group: g, format: 'round_robin', size: null, ids, created: startDay * DAY, status: openCount ? 'in_progress' : 'completed', winner: null };
  tournaments.push(tr);
  const pairs = roundRobinPairs(ids);
  const nowDay = SPAN / DAY;
  pairs.forEach(([a, b], pos) => {
    const slotId = uuid(`slot:${key}:1:${pos}`);
    const open = pos >= pairs.length - openCount;
    const day = Math.min(nowDay - 1, startDay + Math.floor((pos / pairs.length) * 12));
    const m = open
      ? addMatch({ a, b, t: SPAN - (2 + rand() * 30) * 3600, group: g, tournament: tr, slot: slotId, status: pos % 2 ? 'pending_accept' : 'in_progress', key: `t:${key}:1:${pos}` })
      : addMatch({ a, b, t: eveningTime(day), group: g, tournament: tr, slot: slotId, key: `t:${key}:1:${pos}` });
    slots.push({ id: slotId, tr, round: 1, pos, a, b, winner: m.score?.winner ?? null, match: m });
  });
  if (!openCount) {
    // Líder único con la misma regla que el servidor (puntos, diferencia, goles a favor).
    const table = ids.map((id) => ({ id, pts: 0, gd: 0, gf: 0 }));
    for (const s of slots.filter((x) => x.tr === tr)) {
      const { ga, gb, winner } = s.match.score;
      const A = table.find((r) => r.id === s.a), B = table.find((r) => r.id === s.b);
      A.gf += ga; B.gf += gb; A.gd += ga - gb; B.gd += gb - ga;
      if (winner === null) { A.pts++; B.pts++; } else (winner === s.a ? A : B).pts += 3;
    }
    table.sort((x, y) => y.pts - x.pts || y.gd - x.gd || y.gf - x.gf);
    const [f, s] = table;
    tr.winner = s && f.pts === s.pts && f.gd === s.gd && f.gf === s.gf ? null : f.id;
    tr.endT = Math.max(...slots.filter((x) => x.tr === tr).map((x) => x.match.t));
  }
}
singleElim('relampago', 'Relámpago de mayo', 'barrio', 8, 30);
roundRobin('liga-oficina', 'Liga de la oficina', 'oficina', 5, 62);
singleElim('primos', 'Clásico de los primos', 'primos', 4, 96);
singleElim('noche-u', 'Noche de eliminación', 'u', 8, 128);
roundRobin('viernes-t2', 'Liga del viernes T2', 'viernes', 6, 170, 4);

// ---------- partidos amistosos ----------
const TARGET = 780;
let guard = 0;
while (matches.filter((m) => m.status === 'confirmed').length < TARGET && guard++ < 100000) {
  // Más actividad con el tiempo (la app fue creciendo).
  const u = rand();
  const day = Math.min(181, Math.floor(181 * Math.sqrt(u) * 0.75 + 181 * u * 0.25));
  const t = eveningTime(day);
  if (t > SPAN - 4 * 3600) continue;
  const elig = candidates.filter((c) => Math.max(P(c.a).start, P(c.b).start) * DAY + DAY < t && (!c.group || c.group.created < t));
  if (!elig.length) continue;
  const total = elig.reduce((s, c) => s + c.w, 0);
  let r = rand() * total, c = elig[0];
  for (const x of elig) { r -= x.w; if (r <= 0) { c = x; break; } }
  const [a, b] = rand() < 0.5 ? [c.a, c.b] : [c.b, c.a];
  addMatch({ a, b, t, group: c.group });
}
// Algunos expirados y cancelados (historial realista).
for (let n = 0; n < 14; n++) {
  const c = pick(candidates);
  addMatch({ a: c.a, b: c.b, t: eventTimeSafe(), group: c.group, status: n % 3 ? 'expired' : 'cancelled' });
}
function eventTimeSafe() { return eveningTime(20 + Math.floor(rand() * 155)); }
// Pendientes de confirmar: pares distintos sin otro partido abierto.
const openPairs = new Set(matches.filter((m) => ['pending_accept', 'in_progress', 'disputed'].includes(m.status)).map((m) => pairKey(m.a, m.b)));
let pendings = 0;
for (const c of shuffled(candidates)) {
  if (pendings >= 9) break;
  const k = pairKey(c.a, c.b);
  if (openPairs.has(k)) continue;
  openPairs.add(k);
  const status = pendings < 5 ? 'in_progress' : pendings < 8 ? 'pending_accept' : 'disputed';
  addMatch({ a: c.a, b: c.b, t: SPAN - (1 + rand() * 9) * 3600, group: c.group, status, key: 'open:' + pendings });
  pendings++;
}

// ---------- trofeos ----------
const confirmed = matches.filter((m) => m.status === 'confirmed').sort((x, y) => x.t - y.t || (x.id < y.id ? -1 : 1));
const achievements = [];
for (const p of players) {
  const mine = confirmed.filter((m) => m.a === p.i || m.b === p.i);
  const firstWin = mine.find((m) => m.score.winner === p.i);
  if (firstWin) achievements.push({ p: p.i, code: 'first_win', t: firstWin.t, ref: null });
  let run = 0;
  for (const m of mine) {
    run = m.score.winner === p.i ? run + 1 : 0;
    if (run === 5) { achievements.push({ p: p.i, code: 'streak_5', t: m.t, ref: null }); break; }
  }
  const won = tournaments.filter((tr) => tr.status === 'completed' && tr.winner === p.i).sort((x, y) => x.created - y.created)[0];
  if (won) achievements.push({ p: p.i, code: 'tournament_champion', t: won.endT, ref: won.id });
}

// ---------- SQL ----------
const A = (s) => ago(SPAN - s); // segundos desde el inicio -> "hace"
const out = [];
out.push(`-- Campeones FC: datos de demo (GENERADO por scripts/demo/generate-demo-seed.mjs, no editar a mano).
-- ${players.length} jugadores, ${GROUPS.length} grupos, ${tournaments.length} torneos, ${matches.length} partidos (${confirmed.length} confirmados).
-- Todo queda registrado en public.demo_seed; supabase/seed/demo-cleanup.sql lo borra.
-- Los jugadores demo no pueden entrar: sin contraseña, sin cuenta de Google, correo @demo.campeonesfc.invalid.
begin;

create table if not exists public.demo_seed (
  kind text not null check (kind in ('user', 'group', 'tournament', 'match', 'friendship', 'attached_user')),
  id uuid not null,
  created_at timestamptz not null default now(),
  primary key (kind, id)
);
alter table public.demo_seed enable row level security;
revoke all on public.demo_seed from public, anon, authenticated;

do $chk$
begin
  if exists (select 1 from public.demo_seed where kind = 'user') then
    raise exception 'La demo ya está sembrada. Corre supabase/seed/demo-cleanup.sql antes de volver a sembrar.';
  end if;
end
$chk$;
`);
const rows = (table, cols, list) => {
  for (let i = 0; i < list.length; i += 200) {
    out.push(`insert into ${table} (${cols}) values\n${list.slice(i, i + 200).join(',\n')};`);
  }
};
const tok = `'', '', '', '', '', '', '', ''`;
rows('auth.users', 'instance_id, id, aud, role, email, encrypted_password, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, confirmation_token, recovery_token, email_change_token_new, email_change, email_change_token_current, phone_change, phone_change_token, reauthentication_token, banned_until',
  players.map((p) => `('00000000-0000-0000-0000-000000000000', '${p.id}', 'authenticated', 'authenticated', '${p.username.replace(/_/g, '-')}.${p.i}@demo.campeonesfc.invalid', '', '{"provider":"demo","providers":[],"demo":true}', ${q(JSON.stringify({ username: p.username, display_name: p.name, demo: true }))}, ${A(p.start * DAY)}, ${A(p.start * DAY)}, ${tok}, now() + interval '100 years')`));
out.push(`insert into public.demo_seed (kind, id) values\n${players.map((p) => `('user', '${p.id}')`).join(',\n')};`);
// El trigger handle_new_user creó perfil y rating; ajustamos nombre, usuario, avatar y fecha.
out.push(`update public.profiles p set username = v.username, display_name = v.display_name, avatar_key = v.avatar, created_at = v.created
from (values\n${players.map((p) => `('${p.id}'::uuid, ${q(p.username)}, ${q(p.name)}, ${q(p.avatar)}, ${A(p.start * DAY)})`).join(',\n')}
) as v(id, username, display_name, avatar, created) where p.id = v.id;`);

rows('public.groups', 'id, name, created_by, created_at', GROUPS.map((g) => `('${g.id}', ${q(g.name)}, '${P(g.owner).id}', ${A(g.created)})`));
out.push(`insert into public.demo_seed (kind, id) values\n${GROUPS.map((g) => `('group', '${g.id}')`).join(',\n')};`);
rows('public.group_members', 'group_id, user_id, role, joined_at', GROUPS.flatMap((g) => g.members.map((m) =>
  `('${g.id}', '${P(m).id}', '${m === g.owner ? 'owner' : 'member'}', ${A(Math.max(g.created, P(m).start * DAY) + 60)})`)));

const fr = [...friends.values()];
rows('public.friendships', 'id, requester_id, addressee_id, status, created_at, responded_at', fr.map((f, n) => {
  f.id = uuid('friend:' + pairKey(f.a, f.b));
  const at = Math.min(f.at, SPAN - 3600);
  return `('${f.id}', '${P(f.a).id}', '${P(f.b).id}', '${f.status}', ${A(at)}, ${f.status === 'accepted' ? A(at + 3600) : 'null'})`;
}));
out.push(`insert into public.demo_seed (kind, id) values\n${fr.map((f) => `('friendship', '${f.id}')`).join(',\n')};`);

rows('public.tournaments', 'id, group_id, name, format, size, status, created_by, winner_id, created_at, player_ids', tournaments.map((tr) =>
  `('${tr.id}', '${tr.group.id}', ${q(tr.name)}, '${tr.format}', ${tr.size ?? 'null'}, '${tr.status}', '${P(tr.group.owner).id}', ${tr.winner != null ? `'${P(tr.winner).id}'` : 'null'}, ${A(tr.created)}, array[${tr.ids.map((i) => `'${P(i).id}'`).join(',')}]::uuid[])`));
out.push(`insert into public.demo_seed (kind, id) values\n${tournaments.map((tr) => `('tournament', '${tr.id}')`).join(',\n')};`);
// Rondas siguientes de eliminación: los slots ya traen a ambos jugadores (se jugaron).
rows('public.tournament_slots', 'id, tournament_id, round, position, player_a_id, player_b_id, winner_id, match_id', slots.map((s) =>
  `('${s.id}', '${s.tr.id}', ${s.round}, ${s.pos}, '${P(s.a).id}', '${P(s.b).id}', ${s.winner != null ? `'${P(s.winner).id}'` : 'null'}, '${s.match.id}')`));

const matchRow = (m) => {
  const conf = m.status === 'confirmed';
  const s = m.score;
  const accepted = ['confirmed', 'in_progress', 'disputed'].includes(m.status);
  const ttl = m.tournament ? 72 * 3600 : 12 * 3600;
  const expires = m.status === 'pending_accept' ? after(ttl - (SPAN - m.created)) : A(m.created + ttl);
  return `('${m.id}', '${P(m.a).id}', '${P(m.b).id}', '${m.status}', ${m.group ? `'${m.group.id}'` : 'null'}, ${m.tournament ? `'${m.tournament.id}'` : 'null'}, ${m.slot ? `'${m.slot}'` : 'null'}, ${conf && s.winner != null ? `'${P(s.winner).id}'` : 'null'}, ${conf && s.winner == null}, ${conf ? s.ga : 'null'}, ${conf ? s.gb : 'null'}, ${A(m.created)}, ${expires}, ${accepted ? A(m.created + 300) : 'null'}, ${conf ? A(m.t) : 'null'})`;
};
rows('public.matches', 'id, player_a_id, player_b_id, status, group_id, tournament_id, tournament_slot_id, winner_id, is_draw, goals_a, goals_b, created_at, expires_at, accepted_at, confirmed_at', matches.map(matchRow));
out.push(`insert into public.demo_seed (kind, id) select 'match', id from public.matches where id in (${matches.map((m) => `'${m.id}'`).join(',')});`);

// Reportes: dos por partido confirmado, uno en los que esperan confirmación, dos distintos en disputa.
const reports = [];
for (const m of matches) {
  if (m.status === 'confirmed') {
    const s = m.score;
    for (const who of [m.a, m.b]) reports.push(`('${m.id}', '${P(who).id}', ${s.winner != null ? `'${P(s.winner).id}'` : 'null'}, ${s.winner == null}, ${s.ga}, ${s.gb}, ${A(m.t - (who === m.a ? 120 : 0))})`);
  } else if (m.status === 'in_progress' && !m.slot) {
    const s = playScore(m.a, m.b);
    reports.push(`('${m.id}', '${P(m.a).id}', ${s.winner != null ? `'${P(s.winner).id}'` : 'null'}, ${s.winner == null}, ${s.ga}, ${s.gb}, ${A(m.created + 1800)})`);
  } else if (m.status === 'disputed') {
    reports.push(`('${m.id}', '${P(m.a).id}', '${P(m.a).id}', false, 3, 2, ${A(m.created + 1800)})`);
    reports.push(`('${m.id}', '${P(m.b).id}', '${P(m.b).id}', false, 2, 3, ${A(m.created + 2000)})`);
  }
}
rows('public.match_reports', 'match_id, reporter_id, winner_id, is_draw, goals_a, goals_b, updated_at', reports);

rows('public.achievements', 'user_id, code, earned_at, ref_id', achievements.map((a) => `('${P(a.p).id}', '${a.code}', ${A(a.t)}, ${a.ref ? `'${a.ref}'` : 'null'})`));

out.push(`-- Elo FIDE: repite todos los partidos confirmados en orden cronológico (misma lógica que la app)
-- y guarda en cada uno el rating previo y el cambio Elo (rating_*_before, rating_delta_*).
select public.recompute_ratings();

commit;
`);
writeFileSync(OUT, out.join('\n\n'));
const byStatus = matches.reduce((acc, m) => ((acc[m.status] = (acc[m.status] ?? 0) + 1), acc), {});
console.log(JSON.stringify({ players: players.length, groups: GROUPS.length, loners: loners.length, friendships: fr.length, tournaments: tournaments.length, slots: slots.length, matches: matches.length, byStatus, reports: reports.length, achievements: achievements.length, bytes: out.join('\n\n').length }));
