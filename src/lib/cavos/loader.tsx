// Monta el chunk de Cavos solo cuando hace falta (pantalla de entrada o al firmar un resultado).
import { lazy, Suspense } from 'react';
import { cavosConfigured } from './config';
import { useCavosWanted } from './store';

const Bridge = lazy(() => import('./bridge'));

export function CavosLoader() {
  const wanted = useCavosWanted();
  if (!wanted || !cavosConfigured()) return null;
  return (
    <Suspense fallback={null}>
      <Bridge />
    </Suspense>
  );
}
