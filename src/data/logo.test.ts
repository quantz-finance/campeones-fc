import { describe, expect, it } from 'vitest';
import { mutateCreateGroup, mutateSetLogo } from './mutate';
import { buildSeed, IDS } from './seed';

describe('logo de grupos y torneos', () => {
  it('el mundo demo trae escudos v5 y ninguna foto-logo v2', () => {
    const db = buildSeed(new Date('2026-11-10T12:00:00Z'));
    expect(db.groups.every((g) => g.logo && !g.photoUrl)).toBe(true);
    expect(db.tournaments.every((t) => t.logo && !t.photoUrl)).toBe(true);
  });

  it('crear con logo lo guarda; un id inválido queda null', () => {
    const db = buildSeed(new Date('2026-11-10T12:00:00Z'));
    const ok = mutateCreateGroup(db, IDS.andre, 'Los del parque', [IDS.vale], new Date(), 'jaguar');
    expect(ok.logo).toBe('jaguar');
    const bad = mutateCreateGroup(db, IDS.andre, 'Otro grupo', [IDS.vale], new Date(), 'copa-asas');
    expect(bad.logo).toBeNull();
  });

  it('solo el dueño cambia el escudo, y elegirlo quita la foto', () => {
    const db = buildSeed(new Date('2026-11-10T12:00:00Z'));
    const group = mutateCreateGroup(db, IDS.andre, 'Los del parque', [IDS.vale], new Date());
    group.photoUrl = 'https://example.com/photos/groups/x/1.webp';
    expect(() => mutateSetLogo(db, 'groups', group.id, 'oso', IDS.vale)).toThrow();
    expect(() => mutateSetLogo(db, 'groups', group.id, 'no-existe', IDS.andre)).toThrow();
    mutateSetLogo(db, 'groups', group.id, 'oso', IDS.andre);
    expect(group.logo).toBe('oso');
    expect(group.photoUrl).toBeNull();
  });

  it('solo quien creó el torneo cambia el trofeo', () => {
    const db = buildSeed(new Date('2026-11-10T12:00:00Z'));
    const cup = db.tournaments[0];
    const other = [IDS.andre, IDS.vale, IDS.mateo].find((id) => id !== cup.createdBy)!;
    expect(() => mutateSetLogo(db, 'tournaments', cup.id, 'laurel', other)).toThrow();
    mutateSetLogo(db, 'tournaments', cup.id, 'laurel', cup.createdBy);
    expect(cup.logo).toBe('laurel');
  });
});
