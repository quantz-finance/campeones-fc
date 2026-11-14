import { describe, expect, it } from 'vitest';
import { DomainError, isNetworkError, isNetworkMessage, remoteError } from './errors';

describe('fallas de red', () => {
  it('clasifica como network los mensajes típicos sin conexión', () => {
    for (const message of [
      'TypeError: fetch failed',
      'Error: fetch failed: The Internet connection appears to be offline.',
      'Failed to fetch',
      'Network request failed',
      'The request timed out.',
      'Load failed',
      'connect ECONNREFUSED 127.0.0.1:443',
      'getaddrinfo ENOTFOUND ncduberxgrvgbkruhkvr.supabase.co',
    ]) {
      expect(remoteError(message).code, message).toBe('network');
      expect(isNetworkMessage(message), message).toBe(true);
    }
  });

  it('deja como remote los errores del servidor', () => {
    expect(remoteError('new row violates row-level security policy').code).toBe('remote');
    expect(remoteError('duplicate key value violates unique constraint').code).toBe('remote');
    expect(remoteError('JWT expired').code).toBe('remote');
  });

  it('isNetworkError reconoce DomainError, Error, AbortError y texto', () => {
    expect(isNetworkError(new DomainError('network', 'x'))).toBe(true);
    expect(isNetworkError(new TypeError('Network request failed'))).toBe(true);
    expect(isNetworkError(Object.assign(new Error('aborted'), { name: 'AbortError' }))).toBe(true);
    expect(isNetworkError('fetch failed')).toBe(true);
    expect(isNetworkError(new DomainError('remote', 'permission denied'))).toBe(false);
    expect(isNetworkError(null)).toBe(false);
  });
});
