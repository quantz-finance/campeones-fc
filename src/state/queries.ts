import type { Repository } from '../data/repository';

/**
 * Consultas de las pestañas con su llave de caché. Las pantallas y la precarga usan las mismas,
 * así lo que se precarga es exactamente lo que la pantalla va a pedir.
 */
export function tabQueries(repo: Repository, userId: string) {
  return {
    home: { key: `home:${userId}`, load: () => repo.homeSnapshot(userId) },
    billboard: { key: `billboard:${userId}`, load: () => repo.billboardSnapshot(userId) },
    groups: { key: `groups:${userId}`, load: () => repo.groupsSnapshot(userId) },
    friends: { key: `friends:${userId}`, load: () => repo.friendsSnapshot(userId) },
    personal: { key: `personal:${userId}`, load: () => repo.personalSnapshot(userId) },
    trophies: { key: `trophies:${userId}`, load: () => repo.trophies(userId) },
    myCard: { key: `player:${userId}:${userId}`, load: () => repo.publicPlayer(userId, userId) },
    groupsTab: {
      key: `groups-tab:${userId}`,
      load: async () => {
        const [mine, pub, sponsor] = await Promise.all([
          repo.groupsSnapshot(userId),
          repo.searchPublicGroups(userId, ''),
          repo.visibleSponsor(userId, 'groups-list'),
        ]);
        return { mine, pub, sponsor };
      },
    },
    tournamentsTab: {
      key: `tournaments-tab:${userId}`,
      load: async () => {
        const [mine, pub, sponsor] = await Promise.all([
          repo.myTournaments(userId),
          repo.searchPublicTournaments(userId, ''),
          repo.visibleSponsor(userId, 'tournaments-list'),
        ]);
        return { mine, pub, sponsor };
      },
    },
  };
}

/** Lo que se precarga tras abrir la app, en orden: Perfil primero (era la pestaña más lenta). */
export const PREFETCH_ORDER = ['personal', 'trophies', 'myCard', 'groups', 'groupsTab', 'tournamentsTab'] as const;

/**
 * Precarga por ruta: misma llave y mismas dependencias que usa cada pantalla, así al montar ya
 * encuentra el dato listo. Devuelve la lista de (llave, dependencias, carga) para una ruta.
 */
export function routeQueries(
  path: string,
  ctx: { repo: Repository; userId: string; ready: boolean; version: number },
): { key: string; deps: unknown[]; load: () => Promise<unknown> }[] {
  const { repo, userId, ready, version } = ctx;
  const clean = path.split('?')[0].replace(/\/+$/, '');
  const [, first, second] = clean.split('/');
  const base = [repo, userId, version];
  const id = second ? decodeURIComponent(second) : '';
  switch (first) {
    case 'jugador':
      return id && ready ? [{ key: `player:${id}:${userId}`, deps: [repo, userId, ready, version, id], load: () => repo.publicPlayer(id, userId) }] : [];
    case 'grupo':
      return id && id !== 'nuevo' ? [{ key: `group:${userId}:${id}`, deps: [...base, id], load: () => repo.groupSnapshot(id, userId) }] : [];
    case 'torneo':
      return id && id !== 'nuevo' ? [{ key: `tournament:${userId}:${id}`, deps: [...base, id], load: () => repo.tournamentSnapshot(id, userId) }] : [];
    case 'partido':
      return id ? [{ key: `match:${userId}:${id}`, deps: [...base, id], load: () => repo.matchSnapshot(id, userId) }] : [];
    case 'versus':
      return id ? [{ key: `h2h:${userId}:${id}`, deps: [...base, id], load: () => repo.h2hSnapshot(userId, id) }] : [];
    case 'trofeos':
      return [
        { key: `trophies:${userId}`, deps: base, load: () => repo.trophies(userId) },
        { key: `personal:${userId}`, deps: base, load: () => repo.personalSnapshot(userId) },
      ];
    case 'estadisticas':
      return [{ key: `personal:${userId}`, deps: base, load: () => repo.personalSnapshot(userId) }];
    case 'ranking':
      return [{ key: `ranking:${userId}`, deps: base, load: () => repo.rankingSnapshot(userId) }];
    case 'amigos':
      return [{ key: `friends:${userId}`, deps: base, load: () => repo.friendsSnapshot(userId) }];
    case 'avisos':
      return [{ key: `home:${userId}`, deps: base, load: () => repo.homeSnapshot(userId) }];
    default:
      return [];
  }
}
