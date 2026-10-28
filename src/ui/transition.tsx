import { useEffect, useLayoutEffect, useState, type ReactNode } from 'react';
import { Platform } from 'react-native';
import { unlockAudio } from './audio';
import { GlobalExitContext } from './motion-context';
import { useReducedMotion } from './motion';
import { transitController } from './transit';

/** Conecta la máquina de transiciones con el árbol y prepara el audio en el primer gesto. */
export function TransitionHost({ children }: { children: ReactNode }) {
  const reduced = useReducedMotion();
  const [exiting, setExiting] = useState(false);
  transitController.bindReduced(reduced);
  useLayoutEffect(() => transitController.subscribe(setExiting), []);
  useEffect(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined') return;
    const onGesture = () => unlockAudio();
    window.addEventListener('pointerdown', onGesture, { passive: true });
    return () => window.removeEventListener('pointerdown', onGesture);
  }, []);
  return <GlobalExitContext.Provider value={exiting}>{children}</GlobalExitContext.Provider>;
}
