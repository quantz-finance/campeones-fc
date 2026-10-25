// Post-export (vercel buildCommand), mismo enfoque que Meteorito (scripts/build/preload.mjs).
// Los nombres llevan hash de contenido, por eso se buscan en dist/.
// 1) Fuentes: <link rel=preload> de Anton, Barlow y Archivo Etiqueta + @font-face con font-display: swap
//    (se bajan en paralelo con el JS; expo-font las encuentra ya cargadas).
// 2) __common diferido si el bundle inicial no lo necesita (si lo necesita, el HTML queda igual).
// 3) Preconnect al origen de Supabase si EXPO_PUBLIC_SUPABASE_URL está en el build.
// 4) Service worker: versión + lista de precache del shell.
import { createHash } from 'node:crypto';
import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';

const dist = process.argv[2] ?? 'dist';
const walk = (d) => readdirSync(d).flatMap((f) => { const p = join(d, f); return statSync(p).isDirectory() ? walk(p) : [p]; });
const files = walk(dist);
const url = (f) => '/' + relative(dist, f).split('\\').join('/');
const fail = (m) => { console.error('[postbuild]', m); process.exit(1); };

// 1) Fuentes: [familia que registra useFonts, regex del archivo, precargar]
const FONTS = [
  ['Anton_400Regular', /\/Anton_400Regular\.[0-9a-f]+\.ttf$/, true],
  ['Barlow_400Regular', /\/Barlow-Regular\.[0-9a-f]+\.ttf$/, true],
  ['Barlow_500Medium', /\/Barlow-Medium\.[0-9a-f]+\.ttf$/, false],
  ['Barlow_600SemiBold', /\/Barlow-SemiBold\.[0-9a-f]+\.ttf$/, true],
  ['ArchivoEtiqueta_600SemiBold', /\/ArchivoEtiqueta-SemiBold\.[0-9a-f]+\.ttf$/, false],
  ['ArchivoEtiqueta_700Bold', /\/ArchivoEtiqueta-Bold\.[0-9a-f]+\.ttf$/, false],
  ['ArchivoEtiqueta_800ExtraBold', /\/ArchivoEtiqueta-ExtraBold\.[0-9a-f]+\.ttf$/, true],
];
const fonts = FONTS.map(([family, re, preload]) => {
  const f = files.find((x) => re.test(x.split('\\').join('/')));
  if (!f) fail('no encontré la fuente ' + family);
  return { family, href: url(f), preload };
});
const fontTags =
  fonts.filter((f) => f.preload).map((f) => `<link rel="preload" as="font" type="font/ttf" href="${f.href}" crossorigin>`).join('') +
  `<style id="font-swap">${fonts.map((f) => `@font-face{font-family:"${f.family}";src:url("${f.href}") format("truetype");font-display:swap}`).join('')}</style>`;

// 3) Preconnect
let preconnect = '';
try {
  const origin = new URL(process.env.EXPO_PUBLIC_SUPABASE_URL ?? '').origin;
  if (origin && origin !== 'null') preconnect = `<link rel="preconnect" href="${origin}" crossorigin><link rel="dns-prefetch" href="${origin}">`;
} catch {}

// 2) __common bajo demanda
const jsDir = join(dist, '_expo/static/js/web');
const js = readdirSync(jsDir).filter((f) => f.endsWith('.js'));
const commonFile = js.find((f) => f.startsWith('__common-'));
let deferTag = '';
if (commonFile) {
  const ids = (src) => new Set([...src.matchAll(/\},(\d+),(?:\[|\{)/g)].map((m) => +m[1]));
  const deps = (src) => {
    const out = new Set();
    for (const m of src.matchAll(/\},\d+,(\[[\d,]*\]|\{[^{}]*?(?:"paths":\{[^}]*\})?\})\);/g)) {
      const v = JSON.parse(m[1]);
      for (const [k, x] of Object.entries(Array.isArray(v) ? Object.assign({}, v) : v)) if (k !== 'paths' && typeof x === 'number') out.add(x);
    }
    return out;
  };
  const common = ids(readFileSync(join(jsDir, commonFile), 'utf8'));
  const entrySrc = js.filter((f) => f.startsWith('entry-') || f.startsWith('__expo-metro-runtime-')).map((f) => readFileSync(join(jsDir, f), 'utf8')).join('\n');
  const eager = [...deps(entrySrc)].filter((d) => common.has(d) && !ids(entrySrc).has(d));
  const needs = js
    .filter((f) => !/^(entry|__common|__expo-metro-runtime)-/.test(f))
    .filter((f) => [...deps(readFileSync(join(jsDir, f), 'utf8'))].some((d) => common.has(d)))
    .map((f) => `/_expo/static/js/web/${f}`);
  if (eager.length) console.warn(`[postbuild] __common NO diferido: el bundle inicial usa ${eager.length} módulos de ahí`);
  else {
    const commonUrl = `/_expo/static/js/web/${commonFile}`;
    const loader = `(function(){var C=${JSON.stringify(commonUrl)},N=${JSON.stringify(needs)},p=null,o;function c(){return p||(p=new Promise(function(r,j){var s=document.createElement('script');s.src=C;s.async=true;s.onload=r;s.onerror=function(e){p=null;j(e)};document.head.appendChild(s)}))}Object.defineProperty(globalThis,'__loadBundleAsync',{configurable:true,get:function(){return o&&function(u){return N.indexOf(u)<0?o(u):c().then(function(){return o(u)})}},set:function(f){o=f}})})();`;
    deferTag = `<script>${loader}</script>`;
    console.log(`[postbuild] __common diferido; lo esperan ${needs.length} chunks async`);
  }
}

let n = 0;
for (const f of files.filter((x) => x.endsWith('.html'))) {
  let h = readFileSync(f, 'utf8');
  if (h.includes('data-postbuild')) continue;
  if (deferTag) {
    const re = new RegExp(`<script src="/_expo/static/js/web/${commonFile.replace(/[.]/g, '\\.')}"[^>]*></script>`);
    if (re.test(h)) {
      h = h.replace(re, '');
      h = h.replace('<script src="/_expo/static/js/web/__expo-metro-runtime-', deferTag + '<script src="/_expo/static/js/web/__expo-metro-runtime-');
    }
  }
  // Expo agrega un <link rel=icon> a favicon.ico y un theme-color repetido; dejamos los nuestros.
  h = h.replace(/<meta name="theme-color" content="#080B13">\s*/g, '');
  h = h.replace('</head>', `${preconnect}${fontTags}<meta name="postbuild" data-postbuild="1"></head>`);
  writeFileSync(f, h);
  n++;
}

// 4) Service worker
const swPath = join(dist, 'sw.js');
const shellJs = files.map(url).filter((u) => /^\/_expo\/static\/js\/web\/(entry|__expo-metro-runtime|__common)-/.test(u));
const pre = ['/', '/manifest.json', '/icon-192.png', '/apple-touch-icon.png', ...shellJs, ...fonts.map((f) => f.href)];
const version = createHash('sha1').update(pre.join()).update(readFileSync(join(dist, 'index.html'))).digest('hex').slice(0, 10);
writeFileSync(swPath, readFileSync(swPath, 'utf8').replace('__SW_VERSION__', version).replace('[/*__PRECACHE__*/]', JSON.stringify(pre)));
console.log(`[postbuild] ${fonts.filter((f) => f.preload).length} fuentes precargadas, ${pre.length} archivos en el precache del SW (v${version}) -> ${n} html`);
