import { describe, expect, it } from 'vitest';
import { byName, filterPeople, matchesPerson, matchesText, mostFrequent, normalizeSearch } from './search';

const people = [
  { displayName: 'Andrés Pérez', username: 'andre' },
  { displayName: 'Valentina Ríos', username: 'vale_fc' },
  { displayName: 'Mateo Núñez', username: 'mateo9' },
  { displayName: 'Sofía Álvarez', username: 'sofi' },
];

describe('buscador de personas', () => {
  it('normaliza acentos, mayúsculas y espacios', () => {
    expect(normalizeSearch('  ÁNDRÉS   Pérez ')).toBe('andres perez');
    expect(normalizeSearch('Núñez')).toBe('nunez');
  });

  it('busca por nombre sin acentos ni mayúsculas', () => {
    expect(filterPeople(people, 'andres', (p) => p).map((p) => p.username)).toEqual(['andre']);
    expect(filterPeople(people, 'SOFIA', (p) => p).map((p) => p.username)).toEqual(['sofi']);
  });

  it('busca por apellido y por inicio de nombre + apellido', () => {
    expect(filterPeople(people, 'nunez', (p) => p).map((p) => p.username)).toEqual(['mateo9']);
    expect(filterPeople(people, 'and pe', (p) => p).map((p) => p.username)).toEqual(['andre']);
    expect(filterPeople(people, 'alv', (p) => p).map((p) => p.username)).toEqual(['sofi']);
  });

  it('busca por @usuario, con o sin arroba', () => {
    expect(filterPeople(people, '@vale', (p) => p).map((p) => p.username)).toEqual(['vale_fc']);
    expect(filterPeople(people, 'fc', (p) => p).map((p) => p.username)).toEqual(['vale_fc']);
    expect(filterPeople(people, 'mateo9', (p) => p).map((p) => p.username)).toEqual(['mateo9']);
  });

  it('sin texto (o solo @) devuelve todo, y sin coincidencias devuelve vacío', () => {
    expect(filterPeople(people, '', (p) => p)).toHaveLength(4);
    expect(filterPeople(people, '  @ ', (p) => p)).toHaveLength(4);
    expect(filterPeople(people, 'zzz', (p) => p)).toEqual([]);
  });

  it('no confunde palabras que solo aparecen a mitad de otra', () => {
    expect(matchesPerson({ displayName: 'Diego Torres', username: 'dt' }, 'iego x')).toBe(false);
    expect(matchesPerson({ displayName: 'Diego Torres', username: null }, 'tor')).toBe(true);
  });

  it('filtra grupos y torneos por nombre y texto extra', () => {
    expect(matchesText('junta', 'La junta del viernes')).toBe(true);
    expect(matchesText('copa junta', 'Copa relámpago', 'La junta del viernes')).toBe(true);
    expect(matchesText('relampago', 'Copa relámpago')).toBe(true);
    expect(matchesText('liga', 'Copa relámpago')).toBe(false);
  });

  it('frecuentes: los de más partidos primero, sin los que no jugaron', () => {
    const list = [
      { n: 'a', played: 0 },
      { n: 'b', played: 5 },
      { n: 'c', played: 2 },
      { n: 'd', played: 5 },
      { n: 'e', played: 1 },
    ];
    expect(mostFrequent(list, (x) => x.played).map((x) => x.n)).toEqual(['b', 'd', 'c']);
    expect(mostFrequent(list.slice(0, 1), (x) => x.played)).toEqual([]);
  });

  it('ordena por nombre ignorando acentos', () => {
    expect(byName(['Óscar', 'Ana', 'Nico'], (x) => x)).toEqual(['Ana', 'Nico', 'Óscar']);
  });
});
