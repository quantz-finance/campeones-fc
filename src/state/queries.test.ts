import { describe, expect, test } from 'vitest';
import { routeQueries } from './queries';
import type { Repository } from '../data/repository';

const repo = {} as Repository;
const ctx = { repo, userId: 'me', ready: true, version: 3 };

describe('precarga por ruta', () => {
  test('usa la misma llave y dependencias que la pantalla', () => {
    const [player] = routeQueries('/jugador/abc', ctx);
    expect(player.key).toBe('player:abc:me');
    expect(player.deps).toEqual([repo, 'me', true, 3, 'abc']);
    expect(routeQueries('/grupo/g1?x=1', ctx)[0].key).toBe('group:me:g1');
    expect(routeQueries('/torneo/t1', ctx)[0].deps).toEqual([repo, 'me', 3, 't1']);
    expect(routeQueries('/trofeos', ctx).map((q) => q.key)).toEqual(['trophies:me', 'personal:me']);
  });

  test('ignora rutas sin datos, formularios nuevos y la ficha antes de tener sesión', () => {
    expect(routeQueries('/grupo/nuevo', ctx)).toEqual([]);
    expect(routeQueries('/torneo/nuevo', ctx)).toEqual([]);
    expect(routeQueries('/configuracion', ctx)).toEqual([]);
    expect(routeQueries('/jugador/abc', { ...ctx, ready: false })).toEqual([]);
  });
});
