// Puente Cavos -> Supabase: identidad (iss, sub) -> usuario de auth, sin enviar correos.
import { createHash } from 'node:crypto';
import { canLinkByEmail, type CavosUser } from './cavosAuth';

export interface BridgeDeps {
  identityUser(iss: string, sub: string): Promise<string | null>;
  userByEmail(email: string): Promise<string | null>;
  createAuthUser(email: string, meta: Record<string, unknown>): Promise<string>;
  linkIdentity(iss: string, sub: string, userId: string, linkedBy: 'new_user' | 'verified_email'): Promise<void>;
}

/** Correo interno para cuentas sin correo verificado. Dominio .invalid (RFC 2606): nunca recibe nada. */
export function syntheticEmail(iss: string, sub: string): string {
  const h = createHash('sha256').update(`${iss}|${sub}`).digest('hex').slice(0, 24);
  return `cavos-${h}@users.campeones-fc.invalid`;
}

function usernameHint(u: CavosUser): string | undefined {
  const base = (u.name ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9_]/g, '');
  return base.length >= 3 ? base.slice(0, 12) : undefined;
}

/**
 * El trigger handle_new_user elige un usuario libre, pero dos altas simultáneas pueden elegir el mismo
 * y una choca con el índice único ("Database error creating new user"). Reintentar resuelve la carrera.
 */
async function createWithRetry(d: BridgeDeps, email: string, meta: Record<string, unknown>, tries = 3): Promise<string> {
  for (let i = 1; ; i++) {
    try {
      return await d.createAuthUser(email, meta);
    } catch (e: any) {
      const retryable = /database error/i.test(String(e?.message ?? ''));
      if (!retryable || i >= tries) throw e;
      await new Promise((r) => setTimeout(r, 150 * i + Math.floor(Math.random() * 100)));
    }
  }
}

export async function resolveUser(u: CavosUser, d: BridgeDeps): Promise<{ userId: string; linkedBy: 'existing' | 'new_user' | 'verified_email' }> {
  const existing = await d.identityUser(u.iss, u.sub);
  if (existing) return { userId: existing, linkedBy: 'existing' };

  const linkable = canLinkByEmail(u);
  if (linkable) {
    const byEmail = await d.userByEmail(u.email!);
    if (byEmail) {
      await d.linkIdentity(u.iss, u.sub, byEmail, 'verified_email');
      return { userId: (await d.identityUser(u.iss, u.sub)) ?? byEmail, linkedBy: 'verified_email' };
    }
  }
  const email = linkable ? u.email! : syntheticEmail(u.iss, u.sub);
  const meta: Record<string, unknown> = { provider: 'cavos' };
  if (u.name) meta.display_name = u.name.slice(0, 32);
  const hint = usernameHint(u);
  if (hint) meta.username = hint;
  let userId: string;
  try {
    userId = await createWithRetry(d, email, meta);
  } catch (e) {
    // Carrera (dos entradas a la vez) o correo ya registrado: reusar si ya quedó ligado.
    const again = await d.identityUser(u.iss, u.sub);
    if (again) return { userId: again, linkedBy: 'existing' };
    if (!linkable) {
      const byEmail = await d.userByEmail(email);
      if (byEmail) userId = byEmail;
      else throw e;
    } else throw e;
  }
  await d.linkIdentity(u.iss, u.sub, userId, 'new_user');
  return { userId: (await d.identityUser(u.iss, u.sub)) ?? userId, linkedBy: 'new_user' };
}
