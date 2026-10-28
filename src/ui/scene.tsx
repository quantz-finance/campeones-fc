import { useFocusEffect, useIsFocused } from 'expo-router';
import { Children, isValidElement, useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { FlatList, Platform, StyleSheet, View } from 'react-native';
import { ExitScopeContext, MotionModeContext, useGlobalExit } from './motion-context';
import { BroadcastView, cssAnim, useReducedMotion } from './motion';
import { EASE_IN, EXIT_MS } from './motion-tokens';
import { colors } from './theme';

const web = Platform.OS === 'web';

function isPassthrough(child: ReactNode): boolean {
  if (!isValidElement(child)) return false;
  if (child.type === FlatList) return true;
  const type = child.type as { passthrough?: boolean };
  return Boolean(type && typeof type === 'object' && type.passthrough);
}

function variantOf(child: ReactNode): 'item' | 'header' {
  if (!isValidElement(child)) return 'item';
  const type = child.type as { broadcast?: string };
  return type && typeof type === 'object' && type.broadcast === 'header' ? 'header' : 'item';
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

  useEffect(() => {
    if (globalExit && focused) setMode('exit');
    else if (focused && !globalExit) setMode('enter');
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

  const items = Children.toArray(children);
  return (
    <MotionModeContext.Provider value={mode}>
      <ExitScopeContext.Provider value={mode === 'exit'}>
        {items.map((child, index) =>
          isPassthrough(child) ? (
            child
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
  from: { opacity: 0, transform: [{ translateX: -420 }, { skewX: '-22deg' }] },
  to: { opacity: 1, transform: [{ translateX: 520 }, { skewX: '-22deg' }] },
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
            cssAnim(slashFrames, EXIT_MS + 40, index * 28, { animationTimingFunction: EASE_IN }),
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
