import { createContext, useContext } from 'react';

/** Salida global: la pantalla enfocada está barriendo sus piezas. */
export const GlobalExitContext = createContext(false);

/** Salida visible para los elementos de esta escena (ya filtrada por foco). */
export const ExitScopeContext = createContext(false);

/** `enter` al llegar, `exit` al irse. Se queda en `exit` hasta que la escena vuelve a enfocarse. */
export const MotionModeContext = createContext<'enter' | 'exit'>('enter');

export function useGlobalExit(): boolean {
  return useContext(GlobalExitContext);
}

export function useExitScope(): boolean {
  return useContext(ExitScopeContext);
}

export function useMotionMode(): 'enter' | 'exit' {
  return useContext(MotionModeContext);
}
