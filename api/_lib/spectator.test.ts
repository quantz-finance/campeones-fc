import { describe, expect, it } from 'vitest';
import handler from '../espectador';
import { loadSpectatorWorld, SPECTATOR_COLUMNS, spectatorEnabled, type SpectatorSource } from './spectator';

const at = '2026-11-01T12:00:00.000Z';

describe('/api/espectador', () => {
  it('solo pide columnas públicas (sin correo, billetera ni show_demo)', () => {
    const all = Object.values(SPECTATOR_COLUMNS).join(',');
    for (const secret of ['email', 'wallet', 'address', 'show_demo', 'chain_payload', 'chain_tx', 'secret']) {
      expect(all).not.toContain(secret);
    }
  });

  it('las tablas hijas se piden solo con ids de demo y lo real se descarta aunque llegue', async () => {
    const calls: { table: string; column: string; values: string[] }[] = [];
    const source: SpectatorSource = {
      async demoRows(table) {
        if (table === 'profiles')
          return [
            { id: 'd1', username: 'diego', display_name: 'Diego', avatar_key: 'rayo', is_demo: true },
            { id: 'r1', username: 'real', display_name: 'Real', avatar_key: 'rayo', is_demo: false },
          ];
        if (table === 'groups') return [{ id: 'g1', name: 'Junta', created_by: 'd1', created_at: at, is_demo: true }];
        return [];
      },
      async rowsIn(table, _columns, column, values) {
        calls.push({ table, column, values });
        if (table === 'group_members')
          return [
            { group_id: 'g1', user_id: 'd1', role: 'owner', joined_at: at },
            { group_id: 'g1', user_id: 'r1', role: 'member', joined_at: at },
          ];
        return [];
      },
    };
    const world = await loadSpectatorWorld(source);
    expect(calls.find((c) => c.table === 'achievements')?.values).toEqual(['d1']);
    expect(calls.find((c) => c.table === 'group_members')?.values).toEqual(['g1']);
    expect(world.users.map((u) => u.id)).toEqual(['d1']);
    expect(world.groupMembers.map((m) => m.userId)).toEqual(['d1']);
  });

  it('solo acepta GET', async () => {
    for (const method of ['POST', 'PUT', 'PATCH', 'DELETE']) {
      const res = fakeRes();
      await handler({ method, headers: {} }, res);
      expect(res.statusCode).toBe(405);
    }
  });

  it('se puede apagar con SPECTATOR=off', () => {
    expect(spectatorEnabled(undefined)).toBe(true);
    expect(spectatorEnabled('on')).toBe(true);
    expect(spectatorEnabled('off')).toBe(false);
    expect(spectatorEnabled('0')).toBe(false);
  });
});

function fakeRes() {
  const res = {
    statusCode: 0,
    headers: {} as Record<string, string>,
    body: '',
    setHeader(k: string, v: string) {
      res.headers[k] = v;
    },
    end(b: string) {
      res.body = b;
    },
  };
  return res;
}
