// Sistema de movimiento: entradas de transmisión y salidas tipo menú de juego.
// Solo opacity + transform. Web = CSS (hilo del compositor). Nativo = Animated.
// Respeta prefers-reduced-motion. Sin librerías extra.
import { memo, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { AccessibilityInfo, Animated, Easing, Platform, View, type StyleProp, type ViewStyle } from 'react-native';
import { useMotionMode } from './motion-context';
import {
  COUNT_MS,
  EASE_IN,
  EASE_OUT,
  ENTER_MS,
  EXIT_MS,
  EXIT_STAGGER_CAP,
  EXIT_STAGGER_MS,
  STAGGER_CAP,
  STAGGER_MS,
  formatRoll,
  rollTarget,
  staggerDelay,
} from './motion-tokens';

const web = Platform.OS === 'web';

export { STAGGER_CAP, STAGGER_MS };

let reducedCache: boolean | null = null;
function readReduced(): boolean {
  if (reducedCache != null) return reducedCache;
  if (web && typeof window !== 'undefined' && window.matchMedia) {
    reducedCache = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }
  return reducedCache ?? false;
}

export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(readReduced);
  useEffect(() => {
    if (web) {
      if (typeof window === 'undefined' || !window.matchMedia) return;
      const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
      const on = () => setReduced((reducedCache = mq.matches));
      mq.addEventListener?.('change', on);
      return () => mq.removeEventListener?.('change', on);
    }
    let alive = true;
    void AccessibilityInfo.isReduceMotionEnabled().then((v) => alive && setReduced((reducedCache = v)));
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', (v) => setReduced((reducedCache = v)));
    return () => {
      alive = false;
      sub.remove();
    };
  }, []);
  return reduced;
}

/** Retrasa `on` (~150 ms) para que las cargas rápidas nunca parpadeen un skeleton. */
export function useDelayed(on: boolean, ms = 150): boolean {
  const [shown, setShown] = useState(false);
  useEffect(() => {
    if (!on) {
      setShown(false);
      return;
    }
    const t = setTimeout(() => setShown(true), ms);
    return () => clearTimeout(t);
  }, [on, ms]);
  return shown;
}

type Variant = 'item' | 'header' | 'logo';

const travel = {
  item: { enterX: -46, enterY: 14, exitX: 128, enterScale: 0.96 },
  header: { enterX: -78, enterY: 0, exitX: 160, enterScale: 0.94 },
  logo: { enterX: 0, enterY: 36, exitX: 150, enterScale: 0.62 },
} as const;

function enterFrames(variant: Variant) {
  const move = travel[variant];
  if (variant === 'logo') {
    return {
      '0%': { opacity: 0, transform: [{ translateY: move.enterY }, { skewX: '-18deg' }, { scale: move.enterScale }] },
      '58%': { opacity: 1, transform: [{ translateY: -8 }, { skewX: '6deg' }, { scale: 1.08 }] },
      '100%': { opacity: 1, transform: [{ translateY: 0 }, { skewX: '0deg' }, { scale: 1 }] },
    };
  }
  return {
    '0%': { opacity: 0, transform: [{ translateX: move.enterX }, { translateY: move.enterY }, { skewX: '-14deg' }, { scale: 0.96 }] },
    '68%': { opacity: 1, transform: [{ translateX: 8 }, { translateY: 0 }, { skewX: '3deg' }, { scale: 1.015 }] },
    '100%': { opacity: 1, transform: [{ translateX: 0 }, { translateY: 0 }, { skewX: '0deg' }, { scale: 1 }] },
  };
}

function exitFrames(variant: Variant) {
  const move = travel[variant];
  return {
    '0%': { opacity: 1, transform: [{ translateX: 0 }, { skewX: '0deg' }, { scale: 1 }] },
    '100%': { opacity: 0, transform: [{ translateX: move.exitX }, { skewX: '-16deg' }, { scale: 0.94 }] },
  };
}

const popKeyframes = {
  '0%': { transform: [{ scale: 0.86 }], opacity: 0.4 },
  '60%': { transform: [{ scale: 1.06 }], opacity: 1 },
  '100%': { transform: [{ scale: 1 }], opacity: 1 },
};
const shimmerKeyframes = { from: { opacity: 0.45 }, to: { opacity: 0.9 } };
const fadeKeyframes = { from: { opacity: 0, transform: [{ translateY: 10 }] }, to: { opacity: 1, transform: [{ translateY: 0 }] } };
const growKeyframes = {
  from: { opacity: 0.35, transform: [{ scaleX: 0.15 }, { skewX: '-18deg' }] },
  to: { opacity: 1, transform: [{ scaleX: 1 }, { skewX: '-18deg' }] },
};

export function cssAnim(keyframes: object, ms: number, delay = 0, extra: object = {}) {
  return {
    animationKeyframes: keyframes,
    animationDuration: `${ms}ms`,
    animationDelay: `${delay}ms`,
    animationTimingFunction: EASE_OUT,
    animationFillMode: 'both',
    ...extra,
  } as unknown as ViewStyle;
}

/**
 * Pieza de transmisión. Entra sesgada desde la izquierda y, al cambiar de pantalla, sale hacia la derecha.
 * `replay` cambia el retardo en una fracción de milisegundo para reiniciar el CSS sin remontar hijos.
 */
export function BroadcastView({
  index = 0,
  variant = 'item',
  replay = 0,
  style,
  children,
}: {
  index?: number;
  variant?: 'item' | 'header' | 'logo';
  replay?: number;
  style?: StyleProp<ViewStyle>;
  children: ReactNode;
}) {
  const reduced = useReducedMotion();
  const mode = useMotionMode();
  const v = useRef(new Animated.Value(reduced || web ? 1 : 0)).current;
  const move = travel[variant];

  useEffect(() => {
    if (web || reduced) return;
    if (mode === 'exit') {
      v.setValue(0);
      Animated.timing(v, {
        toValue: 1,
        duration: EXIT_MS,
        delay: staggerDelay(index, EXIT_STAGGER_MS, EXIT_STAGGER_CAP),
        easing: Easing.in(Easing.cubic),
        useNativeDriver: true,
      }).start();
      return;
    }
    v.setValue(0);
    Animated.timing(v, {
      toValue: 1,
      duration: ENTER_MS,
      delay: staggerDelay(index),
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [mode, reduced, index, v, replay]);

  const webStyle = useMemo(() => {
    if (!web || reduced) return null;
    const exiting = mode === 'exit';
    const delay = exiting ? staggerDelay(index, EXIT_STAGGER_MS, EXIT_STAGGER_CAP) : staggerDelay(index);
    // El replay entra en el retardo para que el nombre de la animación cambie y el CSS vuelva a correr.
    const nudged = delay + replay * 0.01;
    return cssAnim(exiting ? exitFrames(variant) : enterFrames(variant), exiting ? EXIT_MS : ENTER_MS, nudged, {
      animationTimingFunction: exiting ? EASE_IN : EASE_OUT,
      animationDelay: `${nudged}ms`,
    });
  }, [mode, reduced, index, variant, replay]);

  if (reduced) return <View style={style}>{children}</View>;
  if (web) return <View style={[style, webStyle]}>{children}</View>;

  const opacity = v.interpolate({ inputRange: [0, 1], outputRange: mode === 'exit' ? [1, 0] : [0, 1] });
  const translateX = v.interpolate({
    inputRange: [0, 1],
    outputRange: mode === 'exit' ? [0, move.exitX] : [move.enterX, 0],
  });
  const translateY = v.interpolate({
    inputRange: [0, 1],
    outputRange: mode === 'exit' ? [0, variant === 'logo' ? -24 : 0] : [move.enterY, 0],
  });
  const scale = v.interpolate({
    inputRange: [0, 1],
    outputRange: mode === 'exit' ? [1, 0.92] : [move.enterScale, 1],
  });
  return <Animated.View style={[style, { opacity, transform: [{ translateX }, { translateY }, { scale }] }]}>{children}</Animated.View>;
}

/** Entra con golpe de transmisión. `index` escalona hasta el ítem 7. */
export const Rise = memo(function Rise({
  index = 0,
  children,
  style,
}: {
  index?: number;
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <BroadcastView index={index} style={style}>
      {children}
    </BroadcastView>
  );
});
(Rise as { passthrough?: boolean }).passthrough = true;

/** Pop rápido cuando cambia `value` (Elo, marcador). Solo scale + opacity. */
export function Pop({ value, children, style }: { value: string | number; children: ReactNode; style?: StyleProp<ViewStyle> }) {
  const reduced = useReducedMotion();
  const first = useRef(true);
  const v = useRef(new Animated.Value(1)).current;
  const [tick, setTick] = useState(0);
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    if (reduced) return;
    if (web) {
      setTick((n) => n + 1);
      return;
    }
    v.setValue(0.86);
    Animated.spring(v, { toValue: 1, friction: 5, tension: 220, useNativeDriver: true }).start();
  }, [value, reduced, v]);
  if (web) return <View key={tick} style={[tick ? cssAnim(popKeyframes, 260) : null, style]}>{children}</View>;
  return <Animated.View style={[{ transform: [{ scale: v }] }, style]}>{children}</Animated.View>;
}

/** Fundido corto para skeletons y swaps grandes. */
export function FadeIn({ children, style, ms = 180 }: { children: ReactNode; style?: StyleProp<ViewStyle>; ms?: number }) {
  const reduced = useReducedMotion();
  const v = useRef(new Animated.Value(reduced || web ? 1 : 0)).current;
  useEffect(() => {
    if (web || reduced) return;
    Animated.timing(v, { toValue: 1, duration: ms, easing: Easing.out(Easing.quad), useNativeDriver: true }).start();
  }, [v, ms, reduced]);
  if (reduced) return <View style={style}>{children}</View>;
  if (web) return <View style={[cssAnim(fadeKeyframes, ms), style]}>{children}</View>;
  return <Animated.View style={[{ opacity: v }, style]}>{children}</Animated.View>;
}

/** Barra que crece en X (gráficos de versus). En nativo se queda quieta. */
export function GrowX({ style }: { style?: StyleProp<ViewStyle> }) {
  const reduced = useReducedMotion();
  if (reduced || !web) return <View style={style} />;
  return <View style={[style, cssAnim(growKeyframes, 520), web ? ({ transformOrigin: 'left center' } as object) : null]} />;
}

/** Cuenta un número de 0 al valor, o deja el texto quieto si no es una cifra simple. */
export function CountUp({ value, children }: { value: string; children: (shown: string) => ReactNode }) {
  const reduced = useReducedMotion();
  const roll = rollTarget(value);
  const [progress, setProgress] = useState(reduced || !roll ? 1 : 0);
  useEffect(() => {
    const next = rollTarget(value);
    if (reduced || !next) {
      setProgress(1);
      return;
    }
    setProgress(0);
    const start = typeof performance !== 'undefined' ? performance.now() : Date.now();
    let frame = 0;
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / COUNT_MS);
      setProgress(1 - (1 - p) ** 3);
      if (p < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [value, reduced]);
  if (!roll) return <>{children(value)}</>;
  const shown = `${roll.prefix}${formatRoll(roll.target, progress, roll.decimals, roll.decimalComma)}${roll.suffix}`;
  return <>{children(shown)}</>;
}

/** Cuenta desde 0 hasta `value` y lo formatea (Elo, goles). */
export function CountRoll({
  value,
  format,
  children,
}: {
  value: number;
  format: (n: number) => string;
  children: (shown: string) => ReactNode;
}) {
  const reduced = useReducedMotion();
  const [progress, setProgress] = useState(reduced ? 1 : 0);
  useEffect(() => {
    if (reduced || !Number.isFinite(value)) {
      setProgress(1);
      return;
    }
    setProgress(0);
    const start = typeof performance !== 'undefined' ? performance.now() : Date.now();
    let frame = 0;
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / COUNT_MS);
      setProgress(1 - (1 - p) ** 3);
      if (p < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [value, reduced]);
  return <>{children(format(value * progress))}</>;
}

/** Pulso de opacidad para skeletons (sin animar layout). */
export function useShimmerStyle(): StyleProp<ViewStyle> {
  const reduced = useReducedMotion();
  const v = useRef(new Animated.Value(0.45)).current;
  useEffect(() => {
    if (web || reduced) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(v, { toValue: 0.9, duration: 650, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        Animated.timing(v, { toValue: 0.45, duration: 650, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [v, reduced]);
  if (reduced) return { opacity: 0.6 };
  if (web) return cssAnim(shimmerKeyframes, 900, 0, { animationIterationCount: 'infinite', animationDirection: 'alternate', animationTimingFunction: 'ease-in-out' });
  return { opacity: v as unknown as number };
}

export const ShimmerView = Animated.View;
