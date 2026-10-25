// Registro de billeteras de Cavos: (usuario, appId, red) -> dirección.
// El aud de los tokens de Google/Apple es el cliente OAuth compartido de Cavos, así que un token
// válido no prueba que la billetera que firma sea la de ESTA app. El registro sí: preguntamos con el
// mismo token por la dirección de este usuario en nuestro appId y exigimos que sea la que firmó.
import { HttpError } from './http';

export interface RegistryConfig {
  baseUrl: string;
  appId: string;
  network: 'testnet' | 'mainnet';
  environment: 'development' | 'production';
}

export type RegistryFetch = (url: string, init: { headers: Record<string, string>; signal?: AbortSignal }) => Promise<{
  ok: boolean;
  status: number;
  json(): Promise<any>;
  text?(): Promise<string>;
}>;

async function queryOnce(base: string, cfg: RegistryConfig, token: string, userId: string, f: RegistryFetch) {
  const url = new URL('/api/wallets', base);
  url.searchParams.set('app_id', cfg.appId);
  url.searchParams.set('user_social_id', userId);
  url.searchParams.set('network', `stellar-${cfg.network}`);
  url.searchParams.set('environment', cfg.environment);
  const res = await f(url.toString(), { headers: { Authorization: `Bearer ${token}`, 'User-Agent': 'campeones-fc-api' }, signal: AbortSignal.timeout(8000) });
  if (res.ok) {
    const data = await res.json().catch(() => null);
    if (data && typeof data === 'object') return { data };
  }
  const snippet = res.text ? (await res.text().catch(() => '')).slice(0, 160) : '';
  console.warn('[registry] respuesta', JSON.stringify({ host: url.host, status: res.status, body: snippet }));
  return { status: res.status, snippet };
}

export async function registryAddress(cfg: RegistryConfig, token: string, userId: string, f: RegistryFetch = fetch as any): Promise<string | null> {
  const bases = cfg.baseUrl.split(',').map((s) => s.trim()).filter(Boolean);
  let last: { status?: number; snippet?: string } = {};
  for (const base of bases) {
    let r;
    try {
      r = await queryOnce(base, cfg, token, userId, f);
    } catch (e: any) {
      console.warn('[registry] sin respuesta', JSON.stringify({ base, error: String(e?.name ?? e) }));
      last = {};
      continue;
    }
    if ('data' in r) {
      const data = r.data as any;
      return data?.found && typeof data.address === 'string' ? data.address : null;
    }
    // Rechazo explícito del token: no tiene sentido probar otro host.
    if (r.status === 401 && /token/i.test(r.snippet ?? '')) {
      throw new HttpError(401, 'Tu sesión de Cavos venció. Vuelve a entrar.', 'registry_unauthorized');
    }
    last = r;
  }
  if (last.status === undefined) throw new HttpError(503, 'No pudimos consultar Cavos. Inténtalo de nuevo en un momento.', 'registry_unreachable');
  throw new HttpError(503, 'No pudimos consultar Cavos. Inténtalo de nuevo en un momento.', 'registry_error', { status: last.status });
}

/** Falla cerrado: la dirección que firmó debe ser la registrada para este usuario en esta app. */
export async function assertRegisteredWallet(cfg: RegistryConfig, token: string, userId: string, address: string, f?: RegistryFetch): Promise<void> {
  const registered = await registryAddress(cfg, token, userId, f);
  if (!registered) throw new HttpError(409, 'Tu billetera de Cavos todavía no está lista. Vuelve a entrar.', 'wallet_not_registered');
  if (registered !== address) throw new HttpError(401, 'Esa billetera no corresponde a tu cuenta de Cavos.', 'wallet_mismatch');
}
