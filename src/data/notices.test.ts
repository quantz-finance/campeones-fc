import { describe, expect, it } from 'vitest';
import { noticeCopy } from './notices';

describe('noticeCopy', () => {
  it('avisa al invitador cuando su amigo entra', () => {
    const copy = noticeCopy({ kind: 'friend_joined', actorName: 'Katherine Moreira', matchId: null });
    expect(copy.title).toBe('Katherine aceptó tu invitación');
    expect(copy.href).toBe('/amigos');
  });
  it('lleva al partido cuando toca confirmar', () => {
    const copy = noticeCopy({ kind: 'match_report', actorName: 'Rolo', matchId: 'm1' });
    expect(copy.body).toBe('Te toca confirmar.');
    expect(copy.href).toBe('/partido/m1');
  });
});
