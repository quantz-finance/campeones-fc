import { describe, expect, it } from 'vitest';
import { HttpError } from './http';
import {
  DELETE_CONFIRM,
  TOMBSTONE_NAME,
  deleteAccount,
  tombstoneEmail,
  tombstoneUsername,
  type DeleteAccountStore,
  type DeleteAccountUser,
} from './deleteAccount';

function store(user: DeleteAccountUser | null, extras?: Partial<DeleteAccountStore>) {
  const calls: string[] = [];
  const s: DeleteAccountStore = {
    async loadUser(userId) {
      calls.push(`load:${userId}`);
      return user && user.id === userId ? user : null;
    },
    async cancelOpenMatches(userId) {
      calls.push(`cancel:${userId}`);
    },
    async deletePhotos(userId) {
      calls.push(`photos:${userId}`);
    },
    async deleteFriendships(userId) {
      calls.push(`friends:${userId}`);
    },
    async deleteInvites(userId) {
      calls.push(`invites:${userId}`);
    },
    async deleteNotifications(userId) {
      calls.push(`notices:${userId}`);
    },
    async deleteAchievements(userId) {
      calls.push(`achievements:${userId}`);
    },
    async deleteGroupMemberships(userId) {
      calls.push(`groups:${userId}`);
    },
    async deleteCavosIdentities(userId) {
      calls.push(`cavos:${userId}`);
    },
    async deleteWallet(userId) {
      calls.push(`wallet:${userId}`);
    },
    async anonymizeProfile(userId, username, displayName) {
      calls.push(`anon:${userId}:${username}:${displayName}`);
    },
    async disableAuth(userId, email) {
      calls.push(`auth:${userId}:${email}`);
    },
    async revokeSessions(userId) {
      calls.push(`sessions:${userId}`);
    },
    ...extras,
  };
  return { s, calls };
}

const me = '9361bf0a-1111-2222-3333-444444444444';
const real: DeleteAccountUser = {
  id: me,
  email: 'ana@example.com',
  demoLogin: false,
  isDemoProfile: false,
  alreadyDeleted: false,
};

describe('eliminar cuenta', () => {
  it('exige la palabra ELIMINAR', async () => {
    const { s, calls } = store(real);
    await expect(deleteAccount(s, me, 'borrar')).rejects.toMatchObject({ status: 400, code: 'confirm_required' });
    await expect(deleteAccount(s, me, 'eliminar')).rejects.toBeInstanceOf(HttpError);
    expect(calls).toEqual([]);
  });

  it('no acepta un userId vacío', async () => {
    const { s } = store(real);
    await expect(deleteAccount(s, '', DELETE_CONFIRM)).rejects.toMatchObject({ status: 401, code: 'auth_missing' });
  });

  it('no borra la cuenta de prueba compartida ni las de ejemplo', async () => {
    const demo = { ...real, demoLogin: true };
    await expect(deleteAccount(store(demo).s, me, DELETE_CONFIRM)).rejects.toMatchObject({
      status: 403,
      code: 'demo_forbidden',
    });
    const seed = { ...real, isDemoProfile: true };
    await expect(deleteAccount(store(seed).s, me, DELETE_CONFIRM)).rejects.toMatchObject({
      status: 403,
      code: 'demo_forbidden',
    });
  });

  it('no vuelve a borrar una cuenta ya eliminada', async () => {
    const { s, calls } = store({ ...real, alreadyDeleted: true });
    await expect(deleteAccount(s, me, DELETE_CONFIRM)).rejects.toMatchObject({ status: 409, code: 'already_deleted' });
    expect(calls).toEqual([`load:${me}`]);
  });

  it('solo actúa sobre el userId recibido (el del token), y deja una tumba sin datos personales', async () => {
    const other = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';
    const { s, calls } = store(real);
    const result = await deleteAccount(s, me, DELETE_CONFIRM);
    expect(result).toEqual({ status: 'anonymized', userId: me });
    expect(calls.some((c) => c.includes(other))).toBe(false);
    expect(calls[0]).toBe(`load:${me}`);
    expect(calls.at(-3)).toBe(`anon:${me}:${tombstoneUsername(me)}:${TOMBSTONE_NAME}`);
    expect(calls.at(-2)).toBe(`auth:${me}:${tombstoneEmail(me)}`);
    expect(calls.at(-1)).toBe(`sessions:${me}`);
    expect(tombstoneUsername(me)).toMatch(/^[a-z0-9_]{3,16}$/);
    expect(tombstoneEmail(me)).toMatch(/@deleted\.campeonesfc\.invalid$/);
  });

  it('libera la billetera para poder volver a registrarse y cierra todas las sesiones al final', async () => {
    const { s, calls } = store(real);
    await deleteAccount(s, me, DELETE_CONFIRM);
    expect(calls).toContain(`wallet:${me}`);
    expect(calls.indexOf(`wallet:${me}`)).toBeGreaterThan(calls.indexOf(`cavos:${me}`));
    expect(calls.indexOf(`sessions:${me}`)).toBeGreaterThan(calls.indexOf(`auth:${me}:${tombstoneEmail(me)}`));
  });

  it('si el usuario no existe, no toca nada', async () => {
    const { s, calls } = store(null);
    await expect(deleteAccount(s, me, DELETE_CONFIRM)).rejects.toMatchObject({ status: 404, code: 'not_found' });
    expect(calls).toEqual([`load:${me}`]);
  });
});
