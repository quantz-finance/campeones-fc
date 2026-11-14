#!/usr/bin/env node
// Copia el arte de anuncios de Stan al repo y genera src/content/ads.generated.ts.
//
//   node scripts/sync-ads.mjs [carpeta]   (por defecto /workspace/cfc/assets/anuncios)
//
// Lee <carpeta>/anuncios.json: una lista con { espacio, tipo: 'anuncio' | 'cta', archivo, titular,
// texto_alterno, ancho_px, alto_px, ... }. Cada espacio necesita al menos un anuncio y exactamente una CTA.
// Los anuncios «de la casa» llevan a una pantalla de la app (HOUSE_LINKS).
import { copyFileSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { basename, dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const SPACES = ['inicio-franja', 'inicio-ficha', 'inicio-copas', 'grupos-publicos', 'torneos-lista'];
const HOUSE_LINKS = {
  'inicio-franja-4-registra-partido': '/jugar',
  'inicio-ficha-4-de-la-casa': '/grupo/nuevo',
  'inicio-copas-4-de-la-casa': '/torneo/nuevo',
};
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const src = resolve(process.argv[2] ?? '/workspace/cfc/assets/anuncios');
const outAssets = join(root, 'assets', 'ads');
const outTs = join(root, 'src', 'content', 'ads.generated.ts');

function pngSize(file) {
  const buf = readFileSync(file);
  if (buf.readUInt32BE(0) !== 0x89504e47) throw new Error(`${file} no es PNG`);
  return { w: buf.readUInt32BE(16), h: buf.readUInt32BE(20) };
}

const list = JSON.parse(readFileSync(join(src, 'anuncios.json'), 'utf8'));
const problems = [];
const bySpace = Object.fromEntries(SPACES.map((s) => [s, { ads: [], cta: null, aspect: null }]));
rmSync(outAssets, { recursive: true, force: true });
mkdirSync(outAssets, { recursive: true });

for (const item of list) {
  const space = bySpace[item.espacio];
  if (!space) {
    problems.push(`espacio desconocido «${item.espacio}» (${item.archivo})`);
    continue;
  }
  const from = join(src, item.archivo);
  if (!existsSync(from)) {
    problems.push(`no existe ${from}`);
    continue;
  }
  if (!item.texto_alterno) problems.push(`${item.archivo}: falta texto_alterno (VoiceOver)`);
  const { w, h } = pngSize(from);
  const aspect = Math.round((w / h) * 10000) / 10000;
  if (space.aspect && Math.abs(space.aspect - aspect) > 0.01) problems.push(`${item.archivo}: proporción distinta al resto del espacio`);
  space.aspect ??= aspect;
  const name = basename(item.archivo);
  copyFileSync(from, join(outAssets, name));
  const id = name.replace(/\.png$/i, '');
  const entry = { id, alt: item.texto_alterno ?? '', headline: item.titular ?? '', file: `../../assets/ads/${name}`, href: HOUSE_LINKS[id] ?? null };
  if (item.tipo === 'cta') {
    if (space.cta) problems.push(`${item.espacio}: más de una CTA`);
    space.cta = entry;
  } else space.ads.push(entry);
}
for (const s of SPACES) {
  if (!bySpace[s].ads.length) problems.push(`${s}: sin anuncios`);
  if (!bySpace[s].cta) problems.push(`${s}: sin tarjeta CTA`);
}
if (problems.length) {
  console.error('No se generó el catálogo:\n- ' + problems.join('\n- '));
  process.exit(1);
}

const q = JSON.stringify;
const lines = [
  `// GENERADO por scripts/sync-ads.mjs desde ${src}/anuncios.json (arte de Stan).`,
  '// No editar a mano: vuelve a correr `node scripts/sync-ads.mjs`.',
  "import type { AdCatalog } from './ads';",
  '',
  'export const generatedAds: AdCatalog = {',
];
for (const s of SPACES) {
  const { ads, cta, aspect } = bySpace[s];
  const one = (e) => `{ id: ${q(e.id)}, alt: ${q(e.alt)}, headline: ${q(e.headline)}, href: ${q(e.href)}, image: require(${q(e.file)}) }`;
  lines.push(`  ${q(s)}: {`, `    aspect: ${aspect},`, '    ads: [');
  for (const e of ads) lines.push(`      ${one(e)},`);
  lines.push('    ],', `    cta: ${one(cta)},`, '  },');
}
lines.push('};', '');
writeFileSync(outTs, lines.join('\n'));
console.log(`Listo: ${outTs} (${list.length} piezas)`);
