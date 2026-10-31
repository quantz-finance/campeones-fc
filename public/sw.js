// Service worker de Campeones FC (mismo enfoque que Meteorito). scripts/build/postbuild.mjs
// le pone la versión y la lista de precache al exportar.
// - /_expo/static y /assets: nombres con hash de contenido -> cache-first (inmutables).
// - Íconos y manifest: stale-while-revalidate.
// - Páginas (navegación): red primero; sin red, la última copia del shell.
// - /api/*, Supabase y cualquier otro dominio: no se tocan nunca.
const V = '__SW_VERSION__';
const STATIC = 'cfc-static-' + V;
const PAGES = 'cfc-pages-' + V;
const PRECACHE = [/*__PRECACHE__*/];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(STATIC).then((c) => c.addAll(PRECACHE)).catch(() => {}).then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches
      .keys()
      .then((ks) => Promise.all(ks.filter((k) => k.startsWith('cfc-') && k !== STATIC && k !== PAGES).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (e) => {
  const r = e.request;
  if (r.method !== 'GET') return;
  const u = new URL(r.url);
  if (u.origin !== self.location.origin) return; // Supabase y analítica: directo a la red.
  if (u.pathname.startsWith('/api/') || u.pathname === '/sw.js') return;
  if (/^\/(_expo\/static|assets)\//.test(u.pathname)) {
    e.respondWith(
      caches.open(STATIC).then((c) =>
        c.match(r).then((hit) => hit || fetch(r).then((res) => { if (res.ok) c.put(r, res.clone()); return res; })),
      ),
    );
    return;
  }
  if (/^\/(icon-[\w-]+|apple-touch-icon|favicon[\w-]*)\.(png|ico)$|^\/manifest\.json$/.test(u.pathname)) {
    e.respondWith(
      caches.open(STATIC).then((c) =>
        c.match(r).then((hit) => {
          const net = fetch(r).then((res) => { if (res.ok) c.put(r, res.clone()); return res; }).catch(() => hit);
          return hit || net;
        }),
      ),
    );
    return;
  }
  if (r.mode === 'navigate') {
    e.respondWith(
      fetch(r, { cache: 'no-store' })
        .then((res) => {
          if (res.ok) { const cp = res.clone(); caches.open(PAGES).then((c) => c.put('/', cp)); }
          return res;
        })
        .catch(() => caches.open(PAGES).then((c) => c.match('/')).then((hit) => hit || caches.match('/')))
        .then((res) => res || Response.error()),
    );
  }
});
