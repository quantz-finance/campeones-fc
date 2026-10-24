self.addEventListener('install', function (event) {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', function (event) {
  event.waitUntil(
    self.clients.claim().then(function () {
      return self.clients.matchAll({ type: 'window' });
    }),
  );
});

self.addEventListener('fetch', function () {
  // Sin caché y sin respondWith: el navegador sigue cada petición.
});
