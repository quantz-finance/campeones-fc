import { describe, expect, it } from 'vitest';
import { clientIp, createLimiter } from './rateLimit';

describe('createLimiter', () => {
  it('deja pasar hasta el límite y luego frena con retryAfter', () => {
    const l = createLimiter({ limit: 2, windowMs: 60_000 });
    expect(l.hit('a', 0).ok).toBe(true);
    expect(l.hit('a', 1000).ok).toBe(true);
    const third = l.hit('a', 2000);
    expect(third.ok).toBe(false);
    expect(third.retryAfter).toBe(58);
    expect(l.hit('b', 2000).ok).toBe(true);
  });

  it('libera cuando pasa la ventana', () => {
    const l = createLimiter({ limit: 1, windowMs: 1000 });
    expect(l.hit('a', 0).ok).toBe(true);
    expect(l.hit('a', 500).ok).toBe(false);
    expect(l.hit('a', 1001).ok).toBe(true);
  });
});

describe('clientIp', () => {
  it('toma el primer x-forwarded-for', () => {
    expect(clientIp({ headers: { 'x-forwarded-for': '1.2.3.4, 10.0.0.1' } })).toBe('1.2.3.4');
    expect(clientIp({ headers: {} })).toBe('unknown');
  });
});
