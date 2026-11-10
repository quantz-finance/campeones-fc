import { afterEach, describe, expect, it } from 'vitest';
import { DEFAULT_NATIVE_API_BASE, apiBaseUrl, apiUrl } from './api';

const ORIGIN = { API: process.env.EXPO_PUBLIC_API_BASE, OS: process.env.EXPO_OS };

afterEach(() => {
  if (ORIGIN.API === undefined) delete process.env.EXPO_PUBLIC_API_BASE;
  else process.env.EXPO_PUBLIC_API_BASE = ORIGIN.API;
  if (ORIGIN.OS === undefined) delete process.env.EXPO_OS;
  else process.env.EXPO_OS = ORIGIN.OS;
});

describe('apiUrl', () => {
  it('en tests y en la web, sin variable, deja el path relativo', () => {
    delete process.env.EXPO_PUBLIC_API_BASE;
    delete process.env.EXPO_OS;
    expect(apiBaseUrl()).toBe('');
    expect(apiUrl('/api/auth')).toBe('/api/auth');
    process.env.EXPO_OS = 'web';
    expect(apiUrl('/api/auth')).toBe('/api/auth');
  });

  it('respeta EXPO_PUBLIC_API_BASE y no duplica la barra', () => {
    process.env.EXPO_PUBLIC_API_BASE = 'https://partido.campeonesfc.app/';
    expect(apiUrl('/api/auth')).toBe('https://partido.campeonesfc.app/api/auth');
    expect(apiUrl('api/demo')).toBe('https://partido.campeonesfc.app/api/demo');
  });

  it('en iOS o Android, sin variable, usa la API de producción', () => {
    delete process.env.EXPO_PUBLIC_API_BASE;
    process.env.EXPO_OS = 'ios';
    expect(apiUrl('/api/auth')).toBe(`${DEFAULT_NATIVE_API_BASE}/api/auth`);
    process.env.EXPO_OS = 'android';
    expect(apiUrl('/api/demo')).toBe(`${DEFAULT_NATIVE_API_BASE}/api/demo`);
  });

  it('no reescribe una URL absoluta', () => {
    process.env.EXPO_PUBLIC_API_BASE = 'https://partido.campeonesfc.app';
    expect(apiUrl('https://example.com/api/x')).toBe('https://example.com/api/x');
  });
});
