// Acceso a Supabase con service_role (solo servidor). Implementa AnchorStore y lo que necesita el puente de auth.
import { randomBytes } from 'node:crypto';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { AnchorStore, Attestation, MatchRow } from './anchor';
import { env } from './env';
import { HttpError } from './http';

let admin: SupabaseClient | null = null;
export function adminClient(): SupabaseClient {
  if (!env.supabaseUrl() || !env.supabaseServiceKey()) {
    throw new HttpError(503, 'El servidor todavía no tiene acceso a la base de datos.', 'config_missing', { missing: ['SUPABASE_SERVICE_ROLE_KEY'] });
  }
  return (admin ??= createClient(env.supabaseUrl(), env.supabaseServiceKey(), {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  }));
}

/** Cliente con la llave pública: para verifyOtp (acuñar la sesión) y para validar tokens de usuario. */
export function publicClient(): SupabaseClient {
  if (!env.supabaseUrl() || !env.supabaseAnonKey()) throw new HttpError(503, 'Falta configurar Supabase en el servidor.', 'config_missing');
  return createClient(env.supabaseUrl(), env.supabaseAnonKey(), {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}

const check = (error: { message: string } | null, what: string) => {
  if (error) throw new Error(`${what}: ${error.message}`);
};

const MATCH_COLS =
  'id,player_a_id,player_b_id,status,winner_id,is_draw,goals_a,goals_b,confirmed_at,chain_status,chain_hash,chain_tx,chain_max_time,chain_attempts';

export function supabaseAnchorStore(db: SupabaseClient = adminClient()): AnchorStore {
  return {
    async getMatch(id) {
      const { data, error } = await db.from('matches').select(MATCH_COLS).eq('id', id).maybeSingle();
      check(error, 'getMatch');
      return (data as MatchRow | null) ?? null;
    },
    async walletOf(userId) {
      const { data, error } = await db.from('wallets').select('address').eq('user_id', userId).maybeSingle();
      check(error, 'walletOf');
      return (data?.address as string | undefined) ?? null;
    },
    async attestations(matchId) {
      const { data, error } = await db.from('match_attestations').select('*').eq('match_id', matchId);
      check(error, 'attestations');
      return (data ?? []) as Attestation[];
    },
    async saveAttestation(a) {
      const { error } = await db.from('match_attestations').upsert(a, { onConflict: 'match_id,user_id', ignoreDuplicates: true });
      check(error, 'saveAttestation');
    },
    async claim(id, staleBefore) {
      const { data, error } = await db
        .from('matches')
        .update({ chain_status: 'submitting', chain_claimed_at: new Date().toISOString() })
        .eq('id', id)
        .eq('status', 'confirmed')
        .or(`chain_status.eq.pending,and(chain_status.eq.submitting,chain_claimed_at.lt.${staleBefore.toISOString()}),and(chain_status.eq.submitting,chain_claimed_at.is.null)`)
        .select(MATCH_COLS)
        .maybeSingle();
      check(error, 'claim');
      return (data as MatchRow | null) ?? null;
    },
    async savePrepared(id, p) {
      const { error } = await db.from('matches').update({ ...p, chain_error: null }).eq('id', id).eq('chain_status', 'submitting');
      check(error, 'savePrepared');
    },
    async markAnchored(id, tx) {
      const { error } = await db
        .from('matches')
        .update({ chain_status: 'anchored', chain_tx: tx, anchored_at: new Date().toISOString(), chain_error: null, chain_claimed_at: null })
        .eq('id', id);
      check(error, 'markAnchored');
    },
    async release(id, p) {
      const patch: Record<string, unknown> = { chain_status: p.status, chain_error: p.error ? p.error.slice(0, 500) : null };
      if (p.status !== 'submitting') patch.chain_claimed_at = null;
      const { error } = await db.from('matches').update(patch).eq('id', id);
      check(error, 'release');
    },
    async queue(limit, staleBefore) {
      const { data, error } = await db
        .from('matches')
        .select('id')
        .eq('status', 'confirmed')
        .or(`chain_status.eq.pending,and(chain_status.eq.submitting,chain_claimed_at.lt.${staleBefore.toISOString()}),and(chain_status.eq.submitting,chain_claimed_at.is.null)`)
        .order('confirmed_at', { ascending: true })
        .limit(limit);
      check(error, 'queue');
      return (data ?? []).map((r: any) => String(r.id));
    },
  };
}

// --- Puente de auth ---

export async function issueNonce(iss: string, sub: string): Promise<string> {
  const db = adminClient();
  await db.from('session_nonces').delete().lt('expires_at', new Date(Date.now() - 86_400_000).toISOString());
  const nonce = randomBytes(24).toString('hex');
  const { error } = await db.from('session_nonces').insert({ nonce, iss, sub, expires_at: new Date(Date.now() + 5 * 60_000).toISOString() });
  check(error, 'issueNonce');
  return nonce;
}

/** Marca el nonce como usado SOLO si era de esta identidad, no usado y vigente (atómico). */
export async function consumeNonce(iss: string, sub: string, nonce: string): Promise<boolean> {
  const { data, error } = await adminClient()
    .from('session_nonces')
    .update({ used_at: new Date().toISOString() })
    .eq('nonce', nonce)
    .eq('iss', iss)
    .eq('sub', sub)
    .is('used_at', null)
    .gt('expires_at', new Date().toISOString())
    .select('nonce')
    .maybeSingle();
  check(error, 'consumeNonce');
  return !!data;
}

export async function identityUser(iss: string, sub: string): Promise<string | null> {
  const { data, error } = await adminClient().from('cavos_identities').select('user_id').eq('iss', iss).eq('sub', sub).maybeSingle();
  check(error, 'identityUser');
  return (data?.user_id as string | undefined) ?? null;
}

export async function linkIdentity(iss: string, sub: string, userId: string, linkedBy: 'new_user' | 'verified_email') {
  const { error } = await adminClient()
    .from('cavos_identities')
    .upsert({ iss, sub, user_id: userId, linked_by: linkedBy }, { onConflict: 'iss,sub', ignoreDuplicates: true });
  check(error, 'linkIdentity');
}

export async function touchIdentity(iss: string, sub: string) {
  await adminClient().from('cavos_identities').update({ last_seen_at: new Date().toISOString() }).eq('iss', iss).eq('sub', sub);
}

export async function userByEmail(email: string): Promise<string | null> {
  const { data, error } = await adminClient().rpc('cavos_user_by_email', { p_email: email });
  check(error, 'userByEmail');
  return (data as string | null) ?? null;
}

export async function userEmail(userId: string): Promise<string | null> {
  const { data, error } = await adminClient().auth.admin.getUserById(userId);
  check(error, 'getUserById');
  return data.user?.email ?? null;
}

export async function createAuthUser(email: string, meta: Record<string, unknown>): Promise<string> {
  const { data, error } = await adminClient().auth.admin.createUser({ email, email_confirm: true, user_metadata: meta });
  check(error, 'createUser');
  if (!data.user) throw new Error('createUser sin usuario');
  return data.user.id;
}

/** Primera billetera gana. Devuelve 'bound' | 'same' | 'other_wallet' | 'address_taken'. */
export async function bindWallet(userId: string, address: string, network: string) {
  const db = adminClient();
  const { data: mine, error: e1 } = await db.from('wallets').select('address').eq('user_id', userId).maybeSingle();
  check(e1, 'bindWallet.read');
  if (mine?.address) return mine.address === address ? 'same' : 'other_wallet';
  const { error } = await db.from('wallets').insert({ user_id: userId, address, network });
  if (error) {
    if ((error as any).code === '23505') {
      const { data: again } = await db.from('wallets').select('address').eq('user_id', userId).maybeSingle();
      if (again?.address === address) return 'same';
      return again?.address ? 'other_wallet' : 'address_taken';
    }
    check(error, 'bindWallet.insert');
  }
  return 'bound';
}

/**
 * Acuña una sesión de Supabase para el usuario sin enviar correo: generateLink (admin) + verifyOtp.
 * Devuelve access_token y refresh_token; el cliente llama a supabase.auth.setSession().
 */
export async function mintSession(email: string) {
  const { data, error } = await adminClient().auth.admin.generateLink({ type: 'magiclink', email });
  check(error, 'generateLink');
  const tokenHash = data.properties?.hashed_token;
  if (!tokenHash) throw new Error('generateLink sin hashed_token');
  const { data: v, error: e2 } = await publicClient().auth.verifyOtp({ type: 'magiclink', token_hash: tokenHash });
  check(e2, 'verifyOtp');
  if (!v.session) throw new Error('verifyOtp sin sesión');
  return {
    access_token: v.session.access_token,
    refresh_token: v.session.refresh_token,
    expires_at: v.session.expires_at ?? null,
    user_id: v.session.user.id,
  };
}

/** Usuario de Supabase a partir del access_token del cliente (para /api/anchor). */
export async function supabaseUserFromToken(token: string): Promise<string> {
  if (!token) throw new HttpError(401, 'Inicia sesión para continuar.', 'auth_missing');
  const { data, error } = await adminClient().auth.getUser(token);
  if (error || !data.user) throw new HttpError(401, 'Tu sesión venció. Vuelve a entrar.', 'auth_invalid');
  return data.user.id;
}
