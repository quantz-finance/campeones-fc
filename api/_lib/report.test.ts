import { describe, expect, it } from 'vitest';
import { exceptionEvent } from './report';

describe('exceptionEvent', () => {
  it('arma un $exception sin perfil de persona y con el mensaje', () => {
    const ev = exceptionEvent(new TypeError('fetch failed'), { path: '/api/anchor' }, 'phc_x');
    expect(ev.event).toBe('$exception');
    expect(ev.properties.$process_person_profile).toBe(false);
    expect(ev.properties.$exception_list[0]).toMatchObject({ type: 'TypeError', value: 'fetch failed' });
    expect(ev.properties.path).toBe('/api/anchor');
  });
  it('acepta errores que no son Error', () => {
    expect(exceptionEvent('boom', {}, 'k').properties.$exception_list[0].value).toBe('boom');
  });
});
