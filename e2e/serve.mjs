// Servidor estático mínimo para el build de e2e (SPA: cualquier ruta sin archivo devuelve index.html).
import { createReadStream, existsSync, statSync } from 'node:fs';
import http from 'node:http';
import { extname, join, normalize, resolve } from 'node:path';

const root = resolve(process.argv[2] ?? 'dist-e2e');
const port = Number(process.env.PORT ?? 8431);
const types = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json',
  '.png': 'image/png', '.webp': 'image/webp', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.ico': 'image/x-icon',
  '.ttf': 'font/ttf', '.woff2': 'font/woff2', '.mp3': 'audio/mpeg',
};

http
  .createServer((req, res) => {
    const path = decodeURIComponent((req.url ?? '/').split('?')[0]);
    let file = normalize(join(root, path));
    if (!file.startsWith(root)) file = join(root, 'index.html');
    if (!existsSync(file) || statSync(file).isDirectory()) file = join(root, 'index.html');
    res.writeHead(200, { 'content-type': types[extname(file)] ?? 'application/octet-stream', 'cache-control': 'no-store' });
    createReadStream(file).pipe(res);
  })
  .listen(port, '127.0.0.1', () => console.log(`e2e: sirviendo ${root} en http://127.0.0.1:${port}`));
