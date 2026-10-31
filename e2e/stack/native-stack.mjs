// Supabase local SIN Docker para las pruebas e2e: Postgres (embedded-postgres), GoTrue (supabase/auth),
// PostgREST y un proxy en :54321 con las mismas rutas que Supabase (/auth/v1, /rest/v1).
// Datos aislados y desechables: nunca toca la base compartida. Con Docker usa mejor `supabase start`.
//
//   node e2e/stack/native-stack.mjs up      # arranca, aplica migraciones + seed demo y escribe e2e/.stack.json
//   node e2e/stack/native-stack.mjs down    # apaga y borra los datos
//
// Variables: E2E_STACK_DIR (binarios y datos; por defecto e2e/.stack), E2E_WITH_CLEANUP=1 para aplicar también
// la migración destructiva pendiente (sirve para comprobar que la app sigue funcionando después de aplicarla).
import { execFileSync, spawn } from 'node:child_process';
import { createHmac, randomBytes } from 'node:crypto';
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, symlinkSync, writeFileSync, openSync } from 'node:fs';
import http from 'node:http';
import { basename, dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '../..');
const dir = resolve(process.env.E2E_STACK_DIR ?? join(root, 'e2e/.stack'));
const out = join(root, 'e2e/.stack.json');
const PORTS = { db: 54322, auth: 9999, rest: 54330, api: 54321 };
const VERSIONS = { auth: 'v2.197.0', postgrest: 'v12.2.12', pg: '17.11.0-beta.19' };

const sh = (cmd, args, opts = {}) => execFileSync(cmd, args, { stdio: 'inherit', ...opts });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function b64url(input) {
  return Buffer.from(input).toString('base64').replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_');
}
function signJwt(payload, secret) {
  const head = b64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const body = b64url(JSON.stringify(payload));
  const sig = createHmac('sha256', secret).update(`${head}.${body}`).digest('base64url');
  return `${head}.${body}.${sig}`;
}

function fetchBinaries() {
  const bin = join(dir, 'bin');
  mkdirSync(bin, { recursive: true });
  if (!existsSync(join(bin, 'auth'))) {
    const tgz = join(dir, 'auth.tgz');
    sh('curl', ['-fsSL', '-o', tgz, `https://github.com/supabase/auth/releases/download/${VERSIONS.auth}/auth-${VERSIONS.auth}-x86.tar.gz`]);
    sh('tar', ['xzf', tgz, '-C', bin]);
  }
  if (!existsSync(join(bin, 'postgrest'))) {
    const txz = join(dir, 'pgrst.txz');
    sh('curl', ['-fsSL', '-o', txz, `https://github.com/PostgREST/postgrest/releases/download/${VERSIONS.postgrest}/postgrest-${VERSIONS.postgrest}-linux-static-x86-64.tar.xz`]);
    sh('tar', ['xJf', txz, '-C', bin]);
  }
  const pgDir = join(dir, 'pg');
  if (!existsSync(join(pgDir, 'package/native/bin/postgres'))) {
    mkdirSync(pgDir, { recursive: true });
    sh('npm', ['pack', `@embedded-postgres/linux-x64@${VERSIONS.pg}`], { cwd: pgDir });
    const tgz = readdirSync(pgDir).find((f) => f.endsWith('.tgz'));
    sh('tar', ['xzf', join(pgDir, tgz), '-C', pgDir]);
    const links = JSON.parse(readFileSync(join(pgDir, 'package/native/pg-symlinks.json'), 'utf8'));
    for (const l of links) {
      const target = join(pgDir, 'package', l.target);
      if (!existsSync(target)) symlinkSync(basename(l.source), target);
    }
  }
  return { bin, pgBin: join(pgDir, 'package/native/bin') };
}

function start(name, cmd, args, env = {}) {
  const log = openSync(join(dir, `${name}.log`), 'a');
  const child = spawn(cmd, args, { env: { ...process.env, ...env }, stdio: ['ignore', log, log], detached: true });
  child.unref();
  writeFileSync(join(dir, `${name}.pid`), String(child.pid));
  return child;
}

async function waitFor(url, label, tries = 120) {
  for (let i = 0; i < tries; i++) {
    try {
      const res = await fetch(url);
      if (res.status < 500) return;
    } catch {}
    await sleep(500);
  }
  throw new Error(`${label} no arrancó (${url}). Revisa ${dir}/*.log`);
}

async function db(sql, user = 'postgres') {
  const client = new pg.Client({ host: '127.0.0.1', port: PORTS.db, user, password: 'e2e', database: 'postgres' });
  await client.connect();
  try {
    return await client.query(sql);
  } finally {
    await client.end();
  }
}

async function up() {
  if (existsSync(out)) throw new Error('Ya hay un stack corriendo (e2e/.stack.json). Corre `down` primero.');
  mkdirSync(dir, { recursive: true });
  const { bin, pgBin } = fetchBinaries();
  const data = join(dir, 'data');
  rmSync(data, { recursive: true, force: true });
  const pw = join(dir, 'pw');
  writeFileSync(pw, 'e2e');
  sh(join(pgBin, 'initdb'), ['-D', data, '-U', 'postgres', '--pwfile', pw, '-A', 'md5', '-E', 'UTF8', '--locale=C'], { stdio: 'ignore' });
  start('postgres', join(pgBin, 'postgres'), ['-D', data, '-p', String(PORTS.db), '-k', dir, '-c', 'listen_addresses=127.0.0.1', '-c', 'wal_level=logical']);
  for (let i = 0; ; i++) {
    try {
      await db('select 1');
      break;
    } catch (e) {
      if (i > 60) throw e;
      await sleep(500);
    }
  }
  await db(readFileSync(join(here, 'bootstrap.sql'), 'utf8'));

  const secret = randomBytes(32).toString('hex');
  const now = Math.floor(Date.now() / 1000);
  const anon = signJwt({ iss: 'supabase', ref: 'e2e-local', role: 'anon', iat: now, exp: now + 10 * 365 * 86400 }, secret);
  const service = signJwt({ iss: 'supabase', ref: 'e2e-local', role: 'service_role', iat: now, exp: now + 10 * 365 * 86400 }, secret);
  const apiUrl = `http://127.0.0.1:${PORTS.api}`;

  const authEnv = {
    GOTRUE_API_HOST: '127.0.0.1',
    PORT: String(PORTS.auth),
    API_EXTERNAL_URL: `${apiUrl}/auth/v1`,
    GOTRUE_DB_DRIVER: 'postgres',
    DATABASE_URL: `postgres://supabase_auth_admin:e2e@127.0.0.1:${PORTS.db}/postgres?search_path=auth&sslmode=disable`,
    GOTRUE_DB_NAMESPACE: 'auth',
    GOTRUE_DB_MIGRATIONS_PATH: join(bin, 'migrations'),
    GOTRUE_SITE_URL: 'http://127.0.0.1:8421',
    GOTRUE_URI_ALLOW_LIST: 'http://127.0.0.1:*/**,http://localhost:*/**,https://*.vercel.app/**',
    GOTRUE_JWT_SECRET: secret,
    GOTRUE_JWT_EXP: '3600',
    GOTRUE_JWT_AUD: 'authenticated',
    GOTRUE_JWT_ADMIN_ROLES: 'service_role',
    GOTRUE_JWT_DEFAULT_GROUP_NAME: 'authenticated',
    GOTRUE_DISABLE_SIGNUP: 'false',
    GOTRUE_EXTERNAL_EMAIL_ENABLED: 'true',
    GOTRUE_MAILER_AUTOCONFIRM: 'true',
    GOTRUE_RATE_LIMIT_HEADER: '',
    GOTRUE_LOG_LEVEL: 'warn',
  };
  sh(join(bin, 'auth'), ['migrate'], { env: { ...process.env, ...authEnv }, stdio: 'ignore' });
  start('auth', join(bin, 'auth'), ['serve'], authEnv);
  await waitFor(`http://127.0.0.1:${PORTS.auth}/health`, 'GoTrue');

  // Migraciones del repo en orden (la destructiva pendiente solo con E2E_WITH_CLEANUP=1), luego el mundo demo.
  const migDir = join(root, 'supabase/migrations');
  const withCleanup = process.env.E2E_WITH_CLEANUP === '1';
  for (const f of readdirSync(migDir).filter((x) => x.endsWith('.sql')).sort()) {
    const pending = /PENDING_APPROVAL/.test(f);
    if (pending && !withCleanup) continue;
    const sql = readFileSync(join(migDir, f), 'utf8');
    await db(pending ? `set cfc.approve_web2_cleanup = 'yes';\n${sql}` : sql);
    console.log('[stack] migración', f);
  }
  await db(readFileSync(join(root, 'supabase/seed/demo-seed.sql'), 'utf8'));
  // En producción el seed se cargó antes que demo_mode: se vuelve a correr (es idempotente) para marcar is_demo.
  await db(readFileSync(join(migDir, '20261026010000_demo_mode.sql'), 'utf8'));
  console.log('[stack] seed demo cargado');

  const conf = join(dir, 'postgrest.conf');
  writeFileSync(
    conf,
    [
      `db-uri = "postgres://authenticator:e2e@127.0.0.1:${PORTS.db}/postgres"`,
      'db-schemas = "public"',
      'db-anon-role = "anon"',
      'db-extra-search-path = "public, extensions"',
      `jwt-secret = "${secret}"`,
      `server-host = "127.0.0.1"`,
      `server-port = ${PORTS.rest}`,
      'db-max-rows = 1000',
    ].join('\n'),
  );
  start('postgrest', join(bin, 'postgrest'), [conf]);
  await waitFor(`http://127.0.0.1:${PORTS.rest}/`, 'PostgREST');

  start('proxy', process.execPath, [join(here, 'proxy.mjs')], {
    E2E_PROXY_PORT: String(PORTS.api),
    E2E_AUTH_PORT: String(PORTS.auth),
    E2E_REST_PORT: String(PORTS.rest),
  });
  await waitFor(`${apiUrl}/auth/v1/health`, 'proxy');

  writeFileSync(out, JSON.stringify({ url: apiUrl, anonKey: anon, serviceKey: service, withCleanup }, null, 2));
  console.log(`[stack] listo en ${apiUrl} (claves locales en e2e/.stack.json; no son de producción)`);
}

function down() {
  for (const name of ['proxy', 'postgrest', 'auth', 'postgres']) {
    const f = join(dir, `${name}.pid`);
    if (!existsSync(f)) continue;
    try {
      process.kill(-Number(readFileSync(f, 'utf8')), 'SIGTERM');
    } catch {
      try {
        process.kill(Number(readFileSync(f, 'utf8')), 'SIGTERM');
      } catch {}
    }
    rmSync(f, { force: true });
  }
  rmSync(out, { force: true });
  setTimeout(() => rmSync(join(dir, 'data'), { recursive: true, force: true }), 1500);
  console.log('[stack] apagado');
}

const cmd = process.argv[2];
if (cmd === 'up') await up().catch((e) => { console.error(e); down(); process.exit(1); });
else if (cmd === 'down') down();
else {
  console.error('uso: node e2e/stack/native-stack.mjs up|down');
  process.exit(2);
}
