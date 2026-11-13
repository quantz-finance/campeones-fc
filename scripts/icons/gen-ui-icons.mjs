// Genera src/ui/ui-icons-data.ts desde assets/iconos-ui (paquete de Stan): app/*.svg y nav/*.svg.
// Uso: node scripts/icons/gen-ui-icons.mjs
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const root = new URL('../../', import.meta.url).pathname;
const src = join(root, 'assets/iconos-ui');
const attr = (tag, name) => tag.match(new RegExp(`\\s${name}="([^"]*)"`))?.[1];

function parse(file) {
  const svg = readFileSync(file, 'utf8');
  const rootTag = svg.match(/<svg[^>]*>/)[0];
  const solid = attr(rootTag, 'stroke') !== 'currentColor';
  const els = [];
  for (const m of svg.matchAll(/<(path|circle|rect)\b[^>]*\/>/g)) {
    const t = m[0];
    const filled = solid || attr(t, 'fill') === 'currentColor';
    if (m[1] === 'path') els.push(['p', filled, attr(t, 'd'), attr(t, 'fill-rule') === 'evenodd']);
    else if (m[1] === 'circle') els.push(['c', filled, +attr(t, 'cx'), +attr(t, 'cy'), +attr(t, 'r')]);
    else els.push(['r', filled, +attr(t, 'x'), +attr(t, 'y'), +attr(t, 'width'), +attr(t, 'height'), +(attr(t, 'rx') ?? 0)]);
  }
  return els;
}

const pick = (dir) =>
  Object.fromEntries(
    readdirSync(join(src, dir))
      .filter((f) => f.endsWith('.svg'))
      .sort()
      .map((f) => [f.replace(/\.svg$/, ''), parse(join(src, dir, f))]),
  );

const app = pick('app');
const nav = pick('nav');
const out = `// Generado por scripts/icons/gen-ui-icons.mjs desde assets/iconos-ui (iconos de interfaz de Stan). No editar a mano.
// Elementos: ['p', relleno, d, evenodd] | ['c', relleno, cx, cy, r] | ['r', relleno, x, y, w, h, rx]. Grilla 24, trazo 1.75.
export type UiIconEl = ['p', boolean, string, boolean] | ['c', boolean, number, number, number] | ['r', boolean, number, number, number, number, number];

export const uiIcons = ${JSON.stringify(app)} as const satisfies Record<string, readonly unknown[]>;

export const navIcons = ${JSON.stringify(nav)} as const satisfies Record<string, readonly unknown[]>;

export type UiIconName = keyof typeof uiIcons;
export type NavIconName = keyof typeof navIcons extends \`\${infer T}-\${'activo' | 'inactivo'}\` ? T : never;
`;
writeFileSync(join(root, 'src/ui/ui-icons-data.ts'), out);
console.log(Object.keys(app).length, 'iconos de app,', Object.keys(nav).length, 'de nav');
