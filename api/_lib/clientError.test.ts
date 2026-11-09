import { describe, expect, it } from 'vitest';
import { clientErrorLine } from '../auth';

describe('/api/auth client_error', () => {
  it('deja el error crudo sin correo, tokens ni saltos de línea', () => {
    const line = clientErrorLine({ message: 'kit/nitro: fallo de ana@x.com\nAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA', path: '/entrar' })!;
    expect(line).not.toMatch(/ana@x\.com|AAAA|\n/);
    expect(JSON.parse(line)).toEqual({ message: 'kit/nitro: fallo de <correo> <largo>', path: '/entrar' });
  });
  it('sin mensaje no hay línea', () => {
    expect(clientErrorLine({})).toBeNull();
  });
});
