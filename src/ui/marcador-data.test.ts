import { describe, expect, it } from 'vitest';
import { clampGoals, marcadorState, matchContext, mineFirst, repeatDelay, resultLine, voteText } from './marcador-data';

const base = { id: 'm', playerAId: 'a', playerBId: 'b', groupId: null, tournamentId: null, tournamentSlotId: null, winnerId: null, isDraw: false, goalsA: null, goalsB: null, createdAt: '', expiresAt: '', acceptedAt: null, confirmedAt: null } as const;
const report = { isDraw: false, winnerId: 'a', goalsA: 4, goalsB: 2 } as never;

function snap(status: string, extra: object = {}) {
  return { match: { ...base, status }, youAre: 'a', yourReport: null, opponentReport: null, ...extra } as never;
}

describe('marcadorState', () => {
  it('sigue el flujo de dos pasos sin saltarse la aceptación', () => {
    expect(marcadorState(snap('pending_accept', { youAre: 'b' }), false)).toBe('propuesta');
    expect(marcadorState(snap('pending_accept'), false)).toBe('esperando');
    expect(marcadorState(snap('in_progress'), false)).toBe('registrar');
    expect(marcadorState(snap('in_progress', { yourReport: report }), false)).toBe('enviado');
    expect(marcadorState(snap('in_progress', { opponentReport: report }), false)).toBe('confirmar');
    expect(marcadorState(snap('in_progress', { opponentReport: report }), true)).toBe('registrar');
    expect(marcadorState(snap('disputed'), false)).toBe('disputa');
    expect(marcadorState(snap('disputed'), true)).toBe('registrar');
    expect(marcadorState(snap('confirmed'), true)).toBe('cerrado');
    expect(marcadorState(snap('in_progress', { youAre: 'other' }), false)).toBe('viendo');
    expect(marcadorState(snap('expired'), false)).toBe('expirado');
  });
});

describe('contexto y textos', () => {
  it('el torneo gana sobre el grupo y el amistoso es el resto', () => {
    expect(matchContext({ match: { ...base, tournamentId: 't' }, groupName: 'G', tournamentName: 'Copa', slotId: 's' } as never)).toEqual({ kind: 'torneo', kicker: 'Partido de torneo', name: 'Copa' });
    expect(matchContext({ match: { ...base, groupId: 'g' }, groupName: 'La junta', tournamentName: null, slotId: null } as never).kind).toBe('grupo');
    expect(matchContext({ match: base, groupName: null, tournamentName: null, slotId: null } as never).kind).toBe('amistoso');
  });
  it('los goles van siempre con los míos primero', () => {
    expect(mineFirst({ goalsA: 4, goalsB: 2 }, 'b')).toEqual({ mine: 2, theirs: 4 });
    expect(voteText({ isDraw: false, winnerId: 'a', goalsA: 4, goalsB: 2 }, 'b', 'b', 'Carlos Pérez')).toBe('2 – 4');
    expect(voteText({ isDraw: false, winnerId: 'a', goalsA: null, goalsB: null }, 'b', 'b', 'Carlos Pérez')).toBe('Ganó Carlos');
    expect(voteText({ isDraw: true, winnerId: null, goalsA: null, goalsB: null }, 'a', 'a', 'Carlos')).toBe('Empate');
    expect(resultLine('me', 'Usuario', 'Carlos', { mine: 4, theirs: 2 })).toBe('Gana Usuario · 4 – 2');
    expect(resultLine('draw', 'Usuario', 'Carlos', null)).toBe('Empate');
  });
  it('mantener presionado acelera y los goles quedan entre 0 y 30', () => {
    expect(repeatDelay(0)).toBe(260);
    expect(repeatDelay(3)).toBeLessThan(repeatDelay(1));
    expect(repeatDelay(40)).toBe(60);
    expect(clampGoals(-1)).toBe(0);
    expect(clampGoals(31)).toBe(30);
  });
});
