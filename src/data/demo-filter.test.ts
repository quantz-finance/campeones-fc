import { describe, expect, it } from 'vitest';
import { hideDemo } from './demo-filter';
import { emptyWorld, type World } from './types';

const user = (id: string) => ({ id, username: id, displayName: id, avatarKey: 'rayo', email: '' });
const match = (id: string, a: string, b: string) => ({ id, playerAId: a, playerBId: b }) as World['matches'][number];

describe('hideDemo', () => {
  it('drops demo players, their matches, groups and dependents; keeps real data', () => {
    const w: World = {
      ...emptyWorld(),
      users: [user('me'), user('real'), user('bot')],
      matches: [match('m1', 'me', 'real'), match('m2', 'me', 'bot'), match('m3', 'me', 'real')],
      reports: [{ matchId: 'm1' }, { matchId: 'm2' }] as World['reports'],
      friendships: [{ id: 'f1', requesterId: 'me', addresseeId: 'bot' }] as World['friendships'],
      groups: [{ id: 'g1' }, { id: 'g2' }] as World['groups'],
      groupMembers: [{ groupId: 'g1', userId: 'me' }, { groupId: 'g2', userId: 'me' }] as World['groupMembers'],
    };
    const out = hideDemo(w, { users: new Set(['bot']), matches: new Set(['m3']), groups: new Set(['g2']), tournaments: new Set() });
    expect(out.users.map((x) => x.id)).toEqual(['me', 'real']);
    expect(out.matches.map((m) => m.id)).toEqual(['m1']);
    expect(out.reports.map((r) => r.matchId)).toEqual(['m1']);
    expect(out.friendships).toEqual([]);
    expect(out.groups.map((g) => g.id)).toEqual(['g1']);
    expect(out.groupMembers.map((m) => m.groupId)).toEqual(['g1']);
  });
  it('is a no-op without demo data', () => {
    const w = { ...emptyWorld(), users: [user('me')] };
    expect(hideDemo(w, { users: new Set(), matches: new Set(), groups: new Set(), tournaments: new Set() })).toBe(w);
  });
});
