import { useLayoutEffect, useState, type ReactNode } from 'react';
import { GlobalExitContext } from './motion-context';
import { useReducedMotion } from './motion';
import { transitController } from './transit';

/** Conecta la máquina de transiciones con el árbol. */
export function TransitionHost({ children }: { children: ReactNode }) {
  const reduced = useReducedMotion();
  const [exiting, setExiting] = useState(false);
  transitController.bindReduced(reduced);
  useLayoutEffect(() => transitController.subscribe(setExiting), []);
  return <GlobalExitContext.Provider value={exiting}>{children}</GlobalExitContext.Provider>;
}
