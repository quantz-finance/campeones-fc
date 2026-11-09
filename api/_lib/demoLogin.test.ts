import { describe, expect, it } from 'vitest';
import { DEMO_LOGIN_EMAIL, demoLogin, demoLoginEnabled, type DemoLoginStore } from './demoLogin';

function store(existing: string | null) {
  const calls: string[] = [];
  let id = existing;
  const s: DemoLoginStore = {
    async findUser(email) {
      calls.push(`find:${email}`);
      return id;
    },
    async createUser(email, meta) {
      calls.push(`create:${email}:${meta.display_name}`);
      id = 'u-demo';
      return id;
    },
    async prepare(userId) {
      calls.push(`prepare:${userId}`);
    },
    async mint(email) {
      calls.push(`mint:${email}`);
      return { access_token: 'a', refresh_token: 'r', expires_at: null, user_id: id! };
    },
  };
  return { s, calls };
}

describe('entrada con usuario de prueba', () => {
  it('crea la cuenta la primera vez y acuña la sesión', async () => {
    const { s, calls } = store(null);
    const session = await demoLogin(s);
    expect(session.user_id).toBe('u-demo');
    expect(calls).toEqual([`find:${DEMO_LOGIN_EMAIL}`, `create:${DEMO_LOGIN_EMAIL}:Usuario de prueba`, 'prepare:u-demo', `mint:${DEMO_LOGIN_EMAIL}`]);
  });

  it('reusa la cuenta existente', async () => {
    const { s, calls } = store('u-1');
    await demoLogin(s);
    expect(calls.some((c) => c.startsWith('create'))).toBe(false);
  });

  it('solo acepta un correo .invalid (nunca una cuenta real)', async () => {
    const { s } = store('u-1');
    await expect(demoLogin(s, 'alguien@gmail.com')).rejects.toThrow();
  });

  it('se apaga con DEMO_LOGIN=off', () => {
    expect(demoLoginEnabled(undefined)).toBe(true);
    expect(demoLoginEnabled('off')).toBe(false);
    expect(demoLoginEnabled('0')).toBe(false);
  });
});
