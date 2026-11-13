// Buscador de personas y listas: ignora acentos, mayúsculas, espacios de más y la @ inicial.

/** "  Ándres  Pérez " → "andres perez". */
export function normalizeSearch(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

type Person = { displayName: string; username?: string | null };

/**
 * ¿La persona coincide con lo escrito? Cada palabra de la búsqueda tiene que empezar una palabra
 * del nombre o del apellido, o aparecer en el @usuario. "and pe" encuentra a "Andrés Pérez";
 * "@vale" o "vale_" encuentran a @vale_fc.
 */
export function matchesPerson(person: Person, query: string): boolean {
  const q = normalizeSearch(query).replace(/^@+/, '');
  if (!q) return true;
  const words = normalizeSearch(person.displayName).split(' ');
  const user = normalizeSearch(person.username ?? '');
  const full = normalizeSearch(person.displayName);
  if (full.includes(q) || (user && user.includes(q))) return true;
  return q
    .split(' ')
    .filter(Boolean)
    .every((part) => {
      const bare = part.replace(/^@+/, '');
      return words.some((word) => word.startsWith(bare)) || (user !== '' && user.includes(bare));
    });
}

/** Filtra una lista con el texto del buscador; sin texto devuelve la lista igual. */
export function filterPeople<T>(items: readonly T[], query: string, person: (item: T) => Person): T[] {
  if (!normalizeSearch(query).replace(/^@+/, '')) return [...items];
  return items.filter((item) => matchesPerson(person(item), query));
}

/** Para grupos y torneos: busca en el nombre (y en un texto extra, p. ej. el grupo del torneo). */
export function matchesText(query: string, ...fields: (string | null | undefined)[]): boolean {
  const q = normalizeSearch(query);
  if (!q) return true;
  const hay = normalizeSearch(fields.filter(Boolean).join(' '));
  return q.split(' ').every((part) => hay.includes(part));
}

/**
 * Los más frecuentes arriba: los `limit` con más partidos jugados (al menos uno), en ese orden.
 * Sirve para mostrar "Frecuentes" antes de la lista completa.
 */
export function mostFrequent<T>(items: readonly T[], played: (item: T) => number, limit = 3): T[] {
  return items
    .map((item, index) => ({ item, index, n: played(item) }))
    .filter((entry) => entry.n > 0)
    .sort((a, b) => b.n - a.n || a.index - b.index)
    .slice(0, limit)
    .map((entry) => entry.item);
}

/** Orden alfabético por nombre, ignorando acentos. */
export function byName<T>(items: readonly T[], name: (item: T) => string): T[] {
  return [...items].sort((a, b) => normalizeSearch(name(a)).localeCompare(normalizeSearch(name(b))));
}

/** A partir de cuántos elementos vale la pena mostrar el buscador. */
export const SEARCH_MIN_ITEMS = 6;

/** Accesos rápidos: primero los recientes, luego los de respaldo (p. ej. los más jugados), sin repetir y solo ids que existen. */
export function quickIds(recent: readonly string[], fallback: readonly string[], exists: (id: string) => boolean, limit = 8): string[] {
  const out: string[] = [];
  for (const id of [...recent, ...fallback]) {
    if (out.length >= limit) break;
    if (!out.includes(id) && exists(id)) out.push(id);
  }
  return out;
}
