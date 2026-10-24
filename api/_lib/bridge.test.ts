import { describe, expect, it } from 'vitest';
import type { CavosUser } from './cavosAuth';
import { resolveUser, syntheticEmail, type BridgeDeps } from './bridge';

function fakeDeps(users: Record<string, string> = {}) {
  const identities = new Map<string, string>();
  const created: { email: string; meta: Record<string, unknown> }[] = [];
  const d: BridgeDeps = {
    async identityUser(iss, sub) {
      return identities.get(`${iss}|${sub}`) ?? null;
    },
    async userByEmail(email) {
      return users[email] ?? null;
    },
    async createAuthUser(email, meta) {
      if (users[email]) throw new Error('duplicate');
      const id = `u-${created.length + 1}`;
      users[email] = id;
      created.push({ email, meta });
      return id;
    },
    async linkIdentity(iss, sub, userId) {
      if (!identities.has(`${iss}|${sub}`)) identities.set(`${iss}|${sub}`, userId);
    },
  };
  return { d, identities, created, users };
}

const u = (p: Partial<CavosUser>): CavosUser => ({ iss: 'https://cavos.app/firebase', sub: 's1', email: null, emailVerified: false, name: null, ...p });

describe('puente Cavos -> usuario de Supabase', () => {
  it('liga a la cuenta existente SOLO con email_verified === true', async () => {
    const f = fakeDeps({ 'ana@gmail.com': 'old-user' });
    const r = await resolveUser(u({ email: 'ana@gmail.com', emailVerified: true }), f.d);
    expect(r).toEqual({ userId: 'old-user', linkedBy: 'verified_email' });
    expect(f.created).toHaveLength(0);
  });

  it('sin email_verified crea una cuenta nueva con correo interno (no toca la existente)', async () => {
    const f = fakeDeps({ 'ana@gmail.com': 'old-user' });
    const r = await resolveUser(u({ email: 'ana@gmail.com', emailVerified: false, name: 'Ana Pérez' }), f.d);
    expect(r.userId).not.toBe('old-user');
    expect(f.created[0].email).toBe(syntheticEmail('https://cavos.app/firebase', 's1'));
    expect(f.created[0].email).toMatch(/\.invalid$/);
    expect(f.created[0].meta).toMatchObject({ display_name: 'Ana Pérez', username: 'anaperez' });
  });

  it('el relay privado de Apple nunca liga ni se usa como identidad', async () => {
    const f = fakeDeps({ 'x@privaterelay.appleid.com': 'old-user' });
    const r = await resolveUser(u({ iss: 'https://appleid.apple.com', email: 'x@privaterelay.appleid.com', emailVerified: true }), f.d);
    expect(r.userId).not.toBe('old-user');
    expect(f.created[0].email).toMatch(/\.invalid$/);
  });

  it('la identidad es (iss, sub): el mismo sub con otro issuer es otra cuenta', async () => {
    const f = fakeDeps();
    const a = await resolveUser(u({ iss: 'https://cavos.app/firebase', sub: 'same' }), f.d);
    const b = await resolveUser(u({ iss: 'https://accounts.google.com', sub: 'same' }), f.d);
    expect(a.userId).not.toBe(b.userId);
    const again = await resolveUser(u({ iss: 'https://cavos.app/firebase', sub: 'same' }), f.d);
    expect(again).toEqual({ userId: a.userId, linkedBy: 'existing' });
  });

  it('correo verificado sin cuenta previa crea la cuenta con ese correo', async () => {
    const f = fakeDeps();
    const r = await resolveUser(u({ email: 'nuevo@gmail.com', emailVerified: true }), f.d);
    expect(r.linkedBy).toBe('new_user');
    expect(f.created[0].email).toBe('nuevo@gmail.com');
  });
});
