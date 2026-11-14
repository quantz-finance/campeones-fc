import { describe, expect, it } from 'vitest';
import { adRequestProblem, adRequestServerMessage, isContact, uuidV4 } from './ad-request';

const ok = { business: 'Cancha La 10', contactName: 'Ana Mora', contact: 'ana@cancha.cr', section: 'inicio-franja' as const, message: 'Alquiler de canchas de fútbol 5 en Heredia' };

describe('solicitud de anuncio', () => {
  it('acepta una solicitud completa', () => {
    expect(adRequestProblem(ok)).toBeNull();
    expect(adRequestProblem({ ...ok, contact: '+506 8888-1234' })).toBeNull();
  });
  it('pide cada dato con un mensaje claro', () => {
    expect(adRequestProblem({ ...ok, business: ' ' })).toBe('Escribe el nombre de tu negocio.');
    expect(adRequestProblem({ ...ok, contactName: '' })).toBe('Escribe tu nombre.');
    expect(adRequestProblem({ ...ok, contact: '' })).toMatch(/correo o un teléfono/);
    expect(adRequestProblem({ ...ok, contact: 'ana@' })).toBe('Revisa el correo o el teléfono.');
    expect(adRequestProblem({ ...ok, section: 'perfil' as never })).toMatch(/sección/);
    expect(adRequestProblem({ ...ok, message: 'ok' })).toBe('Escribe el texto del anuncio.');
    expect(adRequestProblem({ ...ok, message: 'x'.repeat(61) })).toMatch(/hasta 60/);
  });
  it('reconoce correos y teléfonos', () => {
    expect(isContact('8888 1234')).toBe(true);
    expect(isContact('123')).toBe(false);
    expect(isContact('hola')).toBe(false);
  });
  it('genera UUID v4 válidos (la tabla exige uuid)', () => {
    const id = uuidV4();
    expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
    expect(uuidV4()).not.toBe(id);
  });
  it('deja en español los errores del servidor', () => {
    expect(adRequestServerMessage('Ya nos enviaste varias solicitudes. Espera un rato y vuelve a intentarlo.')).toMatch(/^Ya nos enviaste/);
    expect(adRequestServerMessage('new row violates row-level security policy for table "ad_requests"')).toMatch(/sesión/);
  });
});
