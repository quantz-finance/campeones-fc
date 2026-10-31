// Proxy local con las rutas de Supabase: /auth/v1 -> GoTrue, /rest/v1 -> PostgREST. CORS abierto (solo local).
// /storage/v1 responde 501 y /realtime/v1 cierra el socket: la app sigue con su relectura cada 30 s.
import http from 'node:http';

const port = Number(process.env.E2E_PROXY_PORT ?? 54321);
const upstream = { '/auth/v1': Number(process.env.E2E_AUTH_PORT ?? 9999), '/rest/v1': Number(process.env.E2E_REST_PORT ?? 54330) };

function cors(req) {
  return {
    'access-control-allow-origin': req.headers.origin ?? '*',
    'access-control-allow-credentials': 'true',
    'access-control-allow-methods': 'GET,POST,PUT,PATCH,DELETE,OPTIONS,HEAD',
    'access-control-allow-headers': req.headers['access-control-request-headers'] ?? '*',
    'access-control-expose-headers': 'content-range, x-supabase-api-version',
    'access-control-max-age': '600',
  };
}

const server = http.createServer((req, res) => {
  if (req.method === 'OPTIONS') {
    res.writeHead(204, cors(req));
    return res.end();
  }
  const prefix = Object.keys(upstream).find((p) => req.url.startsWith(p));
  if (!prefix) {
    res.writeHead(501, { 'content-type': 'application/json', ...cors(req) });
    return res.end(JSON.stringify({ error: 'no disponible en el stack local de e2e' }));
  }
  const headers = { ...req.headers, host: `127.0.0.1:${upstream[prefix]}` };
  const up = http.request(
    { host: '127.0.0.1', port: upstream[prefix], method: req.method, path: req.url.slice(prefix.length) || '/', headers },
    (r) => {
      const h = { ...r.headers };
      for (const k of Object.keys(h)) if (k.startsWith('access-control-')) delete h[k];
      res.writeHead(r.statusCode ?? 502, { ...h, ...cors(req) });
      r.pipe(res);
    },
  );
  up.on('error', () => {
    res.writeHead(502, cors(req));
    res.end();
  });
  req.pipe(up);
});
server.on('upgrade', (_req, socket) => socket.destroy());
server.listen(port, '127.0.0.1');
