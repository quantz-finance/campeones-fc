import { describe, expect, test } from 'vitest';
import { createTransitController } from './transit';

describe('transición entre pantallas', () => {
  test('sin oyentes navega al instante', () => {
    const controller = createTransitController(200);
    const calls: string[] = [];
    const result = controller.request(() => calls.push('go'), () => {});
    expect(result).toBe('immediate');
    expect(calls).toEqual(['go']);
  });

  test('con movimiento reducido no espera', () => {
    const controller = createTransitController(200);
    let exiting = false;
    controller.subscribe((value) => {
      exiting = value;
    });
    controller.bindReduced(true);
    const calls: string[] = [];
    expect(controller.request(() => calls.push('go'), () => {})).toBe('immediate');
    expect(calls).toEqual(['go']);
    expect(exiting).toBe(false);
  });

  test('espera la salida y se queda con el último destino', () => {
    const controller = createTransitController(200);
    const seen: boolean[] = [];
    controller.subscribe((value) => seen.push(value));
    const calls: string[] = [];
    let pending: (() => void) | null = null;
    expect(
      controller.request(
        () => calls.push('a'),
        (run) => {
          pending = run;
        },
      ),
    ).toBe('started');
    expect(controller.request(() => calls.push('b'), () => {})).toBe('queued');
    expect(calls).toEqual([]);
    expect(seen).toEqual([true]);
    pending!();
    expect(calls).toEqual(['b']);
    expect(seen).toEqual([true, false]);
  });
});
