import { deflateSync } from 'node:zlib';
import { writeFileSync } from 'node:fs';

function crc32(buf) {
  let c = ~0;
  for (const b of buf) {
    c ^= b;
    for (let i = 0; i < 8; i += 1) c = (c >>> 1) ^ (0xedb88320 & -(c & 1));
  }
  return ~c >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}

function png(size, pixel) {
  const raw = Buffer.alloc((size * 4 + 1) * size);
  for (let y = 0; y < size; y += 1) {
    const row = y * (size * 4 + 1);
    raw[row] = 0;
    for (let x = 0; x < size; x += 1) {
      const [r, g, b, a] = pixel(x, y, size);
      const i = row + 1 + x * 4;
      raw[i] = r;
      raw[i + 1] = g;
      raw[i + 2] = b;
      raw[i + 3] = a;
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

function insideRound(nx, ny, radius) {
  const dx = nx < radius ? radius - nx : nx > 1 - radius ? nx - (1 - radius) : 0;
  const dy = ny < radius ? radius - ny : ny > 1 - radius ? ny - (1 - radius) : 0;
  if (dx === 0 && dy === 0) return true;
  return dx * dx + dy * dy <= radius * radius;
}

function edge(ny, top, bottom) {
  const t = (ny - 0.18) / 0.66;
  return top + (bottom - top) * t;
}

function inShield(nx, ny, pad = 0) {
  if (ny < 0.18 - pad || ny > 0.84 + pad) return false;
  const y = Math.min(0.84, Math.max(0.18, ny));
  return nx >= edge(y, 0.24, 0.16) - pad && nx <= edge(y, 0.84, 0.72) + pad;
}

function paint(x, y, size, transparent) {
  const nx = (x + 0.5) / size;
  const ny = (y + 0.5) / size;
  const outside = !insideRound(nx, ny, 0.18);
  if (outside && !transparent) return [5, 7, 26, 255];
  const body = inShield(nx, ny);
  const rim = inShield(nx, ny, 0.025) && !body;
  if (rim) return [255, 212, 0, 255];
  if (body && ny > 0.44 && ny < 0.56) return [255, 43, 74, 255];
  if (body) return [47, 107, 255, 255];
  if (transparent || outside) return [0, 0, 0, 0];
  return [5, 7, 26, 255];
}

const full = (x, y, size) => paint(x, y, size, false);
const mark = (x, y, size) => paint(x, y, size, true);

writeFileSync('assets/icon.png', png(512, full));
writeFileSync('assets/favicon.png', png(64, full));
writeFileSync('assets/splash-icon.png', png(512, full));
writeFileSync('assets/android-icon-background.png', png(512, () => [5, 7, 26, 255]));
writeFileSync('assets/android-icon-foreground.png', png(512, mark));
writeFileSync('assets/android-icon-monochrome.png', png(512, mark));
writeFileSync('public/icon-192.png', png(192, full));
writeFileSync('public/icon-512.png', png(512, full));
writeFileSync('public/favicon.png', png(64, full));
console.log('iconos broadcast listos');
