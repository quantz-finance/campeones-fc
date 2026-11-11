import { describe, expect, it } from 'vitest';
import { humanError } from './errors';

describe('errores en español humano', () => {
  it('traduce fallas técnicas comunes', () => {
    expect(humanError(new Error('Failed to fetch'))).toMatch(/Sin conexión/);
    expect(humanError(new Error('new row violates row-level security policy'))).toBe('No tienes permiso para hacer eso.');
    expect(humanError(new Error('Payload too large'))).toMatch(/foto pesa demasiado/);
    expect(humanError(new Error('Internal Server Error'))).toMatch(/Algo falló/);
    expect(humanError(null)).toBe('No se pudo completar. Vuelve a intentar.');
  });

  it('deja pasar los mensajes que ya están en español', () => {
    expect(humanError(new Error('Ese escudo no existe.'))).toBe('Ese escudo no existe.');
  });
});
