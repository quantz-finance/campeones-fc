import { useFocusEffect, useIsFocused } from 'expo-router';
import { Children, Fragment, isValidElement, useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { FlatList, Platform, StyleSheet, View } from 'react-native';
import { ExitScopeContext, MotionModeContext, useGlobalExit } from './motion-context';
import { BroadcastView, cssAnim, useReducedMotion } from './motion';
import { EASE_IN, EXIT_MS } from './motion-tokens';
import { colors } from './theme';

const web = Platform.OS === 'web';
/** Si tras la salida la pantalla sigue enfocada este tiempo, la navegación no ocurrió: vuelve a entrar. */
const STAY_MS = 900;

function isPassthrough(child: ReactNode): boolean {
  if (!isValidElement(child)) return false;
  if (child.type === FlatList) return true;
  const type = child.type as { passthrough?: boolean };
  // Las funciones también cuentan: typeof Component === 'function', no 'object'.
  return Boolean(type && typeof type !== 'string' && type.passthrough);
}

function variantOf(child: ReactNode): 'item' | 'header' {
  if (!isValidElement(child)) return 'item';
  const type = child.type as { broadcast?: string };
  return type && typeof type === 'object' && type.broadcast === 'header' ? 'header' : 'item';
}

/**
 * Abre los fragmentos (<>...</>) que devuelven las compuertas: así cada bloque es hijo directo
 * de la columna de la pantalla y recibe su `gap`. Sin esto, todo lo de un fragmento quedaba pegado.
 */
function flatten(children: ReactNode): ReactNode[] {
  return Children.toArray(children).flatMap((child) =>
    isValidElement(child) && child.type === Fragment ? flatten((child.props as { children?: ReactNode }).children) : [child],
  );
}

/**
 * Reparte la entrada y la salida entre los hijos directos.
 * Listas (`Rise`, `FlatList`) y compuertas (`Gate`) animan por su cuenta.
 */
export function Scene({ children }: { children: ReactNode }) {
  const focused = useIsFocused();
  const globalExit = useGlobalExit();
  const [mode, setMode] = useState<'enter' | 'exit'>('enter');
  const [replay, setReplay] = useState(0);
  const sawFocus = useRef(false);

  // Solo sale la pantalla que estaba enfocada cuando empezó la salida (flanco de subida).
  // Al terminar la salida NO vuelve a entrar de inmediato: si la navegación tarda un poco en
  // aplicarse (p. ej. una ficha en el stack raíz), entrar ahí era el «parpadeo» de la pantalla
  // anterior. Vuelve a entrar cuando la enfocan de nuevo, o si sigue enfocada pasado un rato
  // (la navegación no ocurrió).
  const prevExit = useRef(globalExit);
  const focusedRef = useRef(focused);
  focusedRef.current = focused;
  const wasFocused = useRef(focused);
  useEffect(() => {
    const rising = globalExit && !prevExit.current;
    const falling = !globalExit && prevExit.current;
    prevExit.current = globalExit;
    const regained = focused && !wasFocused.current;
    wasFocused.current = focused;
    if (rising && focused) {
      setMode('exit');
      return;
    }
    if (globalExit || !focused) return;
    if (regained) {
      setMode('enter');
      return;
    }
    if (falling) {
      const timer = setTimeout(() => {
        if (focusedRef.current) setMode('enter');
      }, STAY_MS);
      return () => clearTimeout(timer);
    }
  }, [globalExit, focused]);

  useFocusEffect(
    useCallback(() => {
      // El primer foco ya entra con la animación de montaje. Los siguientes la repiten.
      if (!sawFocus.current) {
        sawFocus.current = true;
        return;
      }
      setReplay((n) => n + 1);
    }, []),
  );

  const items = flatten(children);
  return (
    <MotionModeContext.Provider value={mode}>
      <ExitScopeContext.Provider value={mode === 'exit'}>
        {items.map((child, index) =>
          isPassthrough(child) ? (
            <Fragment key={index}>{child}</Fragment>
          ) : (
            <BroadcastView key={index} index={index} variant={variantOf(child)} replay={replay}>
              {child}
            </BroadcastView>
          ),
        )}
      </ExitScopeContext.Provider>
    </MotionModeContext.Provider>
  );
}
(Scene as { passthrough?: boolean }).passthrough = true;

const slashFrames = {
  from: { opacity: 0, transform: [{ translateX: -420 }, { skewX: '0deg' }] },
  to: { opacity: 1, transform: [{ translateX: 520 }, { skewX: '0deg' }] },
};

/** Tres cortes de color que cruzan la pantalla al salir. No tapan el contenido por completo. */
export function BroadcastSlash() {
  const reduced = useReducedMotion();
  const globalExit = useGlobalExit();
  const focused = useIsFocused();
  if (reduced || !web || !globalExit || !focused) return null;
  return (
    <View pointerEvents="none" style={styles.slashLayer}>
      {[colors.red, colors.yellow, colors.blue].map((color, index) => (
        <View
          key={color}
          style={[
            styles.slash,
            { backgroundColor: color, top: 72 + index * 86 },
            cssAnim(slashFrames, EXIT_MS + 40, index * 28, { animationTimingFunction: EASE_IN, animationFillMode: 'both' }),
          ]}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  slashLayer: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, zIndex: 25, overflow: 'hidden' },
  slash: { position: 'absolute', left: -40, width: 220, height: 14 },
});
