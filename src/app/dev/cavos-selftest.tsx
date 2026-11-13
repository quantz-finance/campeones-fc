// Solo desarrollo: campeones-fc://dev/cavos-selftest corre la autoprueba de la llave de control nativa de Cavos.
// En producción __DEV__ es false: Metro elimina la rama (constant folding) y el require de la autoprueba no entra al bundle.
import type { ComponentType } from 'react';
import { Redirect } from 'expo-router';

export default function CavosSelfTestRoute() {
  if (__DEV__) {
    const Screen = require('../../lib/cavos/dev-selftest-screen').default as ComponentType;
    return <Screen />;
  }
  return <Redirect href="/" />;
}
