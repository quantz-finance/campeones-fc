// Sistema de movimiento: entradas de transmisión y salidas tipo menú de juego.
// Solo opacity + transform. Web = CSS (hilo del compositor). Nativo = Animated.
// Respeta prefers-reduced-motion. Sin librerías extra.
import { memo, useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react';
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
      '0%': { opacity: 0, transform: [{ translateY: move.enterY }, { skewX: '0deg' }, { scale: move.enterScale }] },
      '58%': { opacity: 1, transform: [{ translateY: -8 }, { skewX: '0deg' }, { scale: 1.08 }] },
      '100%': { opacity: 1, transform: [{ translateY: 0 }, { skewX: '0deg' }, { scale: 1 }] },
    };
  }
  return {
    '0%': { opacity: 0, transform: [{ translateX: move.enterX }, { translateY: move.enterY }, { skewX: '0deg' }, { scale: 0.96 }] },
    '68%': { opacity: 1, transform: [{ translateX: 8 }, { translateY: 0 }, { skewX: '0deg' }, { scale: 1.015 }] },
    '100%': { opacity: 1, transform: [{ translateX: 0 }, { translateY: 0 }, { skewX: '0deg' }, { scale: 1 }] },
  };
}

function exitFrames(variant: Variant) {
  const move = travel[variant];
  return {
    '0%': { opacity: 1, transform: [{ translateX: 0 }, { skewX: '0deg' }, { scale: 1 }] },
    '100%': { opacity: 0, transform: [{ translateX: move.exitX }, { skewX: '0deg' }, { scale: 0.94 }] },
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
  from: { opacity: 0.35, transform: [{ scaleX: 0.15 }, { skewX: '0deg' }] },
  to: { opacity: 1, transform: [{ scaleX: 1 }, { skewX: '0deg' }] },
};

/*
 * react-native-web descarta `animationKeyframes` en estilos en línea: sin nombre, el CSS nunca corría.
 * Registramos nosotros los @keyframes (una vez por forma) y pasamos solo `animationName`.
 */
const UNITLESS = new Set(['opacity', 'scale', 'scaleX', 'scaleY', 'zIndex', 'flex']);
const kfCache = new Map<string, string>();
let kfSheet: CSSStyleSheet | null = null;

function cssValue(prop: string, value: unknown): string {
  return typeof value === 'number' && !UNITLESS.has(prop) ? `${value}px` : String(value);
}

function cssTransform(list: Record<string, unknown>[]): string {
  return list
    .map((part) => Object.entries(part).map(([fn, value]) => `${fn}(${cssValue(fn, value)})`).join(' '))
    .join(' ');
}

function hash(text: string): string {
  let h = 5381;
  for (let i = 0; i < text.length; i++) h = ((h << 5) + h + text.charCodeAt(i)) | 0;
  return (h >>> 0).toString(36);
}

function keyframesName(keyframes: object, salt: string): string | undefined {
  if (!web || typeof document === 'undefined') return undefined;
  const key = JSON.stringify(keyframes) + salt;
  const known = kfCache.get(key);
  if (known) return known;
  const name = `cfc-${hash(key)}`;
  try {
    if (!kfSheet) {
      const tag = document.createElement('style');
      tag.id = 'cfc-motion';
      document.head.appendChild(tag);
      kfSheet = tag.sheet;
    }
    const steps = Object.entries(keyframes as Record<string, Record<string, unknown>>)
      .map(([at, frame]) => {
        const body = Object.entries(frame)
          .map(([prop, value]) =>
            prop === 'transform'
              ? `transform:${cssTransform(value as Record<string, unknown>[])}`
              : `${prop.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`)}:${cssValue(prop, value)}`,
          )
          .join(';');
        return `${at}{${body}}`;
      })
      .join('');
    kfSheet?.insertRule(`@keyframes ${name}{${steps}}`, kfSheet.cssRules.length);
  } catch {
    return undefined;
  }
  kfCache.set(key, name);
  return name;
}

/**
 * Animación CSS (solo web): transform/opacity en el compositor.
 * `salt` cambia el nombre de la animación para volver a correrla sin remontar.
 */
export function cssAnim(keyframes: object, ms: number, delay = 0, extra: object = {}, salt = '') {
  return {
    animationName: keyframesName(keyframes, salt),
    animationDuration: `${ms}ms`,
    animationDelay: `${delay}ms`,
    animationTimingFunction: EASE_OUT,
    // backwards: oculto durante el retardo y, al terminar, vuelve al estilo normal (identidad).
    // Así el navegador suelta la capa del compositor en vez de dejarla "llenando" para siempre.
    animationFillMode: 'backwards',
    ...extra,
  } as unknown as ViewStyle;
}

/**
 * Pieza de transmisión. Entra sesgada desde la izquierda y, al cambiar de pantalla, sale hacia la derecha.
 * `replay` cambia el nombre de la animación para reiniciar el CSS sin remontar hijos.
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

  // useLayoutEffect: el valor vuelve a 0 antes de pintar el cuadro con el modo nuevo. Con useEffect
  // se alcanzaba a ver un cuadro con el final de la animación anterior (un destello al salir).
  useLayoutEffect(() => {
    if (web || reduced) return;
    const exit = mode === 'exit';
    v.setValue(0);
    const anim = Animated.timing(v, {
      toValue: 1,
      duration: exit ? EXIT_MS : ENTER_MS,
      delay: exit ? staggerDelay(index, EXIT_STAGGER_MS, EXIT_STAGGER_CAP) : staggerDelay(index),
      easing: exit ? Easing.in(Easing.cubic) : Easing.out(Easing.cubic),
      useNativeDriver: true,
    });
    anim.start();
    return () => anim.stop();
  }, [mode, reduced, index, v, replay]);

  const webStyle = useMemo(() => {
    if (!web || reduced) return null;
    const exiting = mode === 'exit';
    const delay = exiting ? staggerDelay(index, EXIT_STAGGER_MS, EXIT_STAGGER_CAP) : staggerDelay(index);
    // El replay cambia el nombre de la animación (salt) para que el CSS vuelva a correr.
    const nudged = delay;
    return cssAnim(exiting ? exitFrames(variant) : enterFrames(variant), exiting ? EXIT_MS : ENTER_MS, nudged, {
      animationTimingFunction: exiting ? EASE_IN : EASE_OUT,
      animationDelay: `${nudged}ms`,
      // La salida sí se queda en su último cuadro (fuera de la vista) hasta desmontar.
      animationFillMode: exiting ? 'both' : 'backwards',
    }, `${mode}${replay % 2}`);
  }, [mode, reduced, index, variant, replay]);

  const animated = useBroadcastStyle(v, mode, variant);
  if (reduced) return <View style={style}>{children}</View>;
  if (web) return <View style={[style, webStyle]}>{children}</View>;

  return <Animated.View style={[style, animated]}>{children}</Animated.View>;
}

/**
 * Las interpolaciones se crean una vez por modo. Crearlas en cada render (al llegar datos, etc.)
 * desconectaba los nodos nativos a mitad de la animación y la entrada quedaba congelada en opacidad 0:
 * la pantalla se veía vacía hasta salir de ella.
 */
function useBroadcastStyle(v: Animated.Value, mode: 'enter' | 'exit', variant: Variant) {
  return useMemo(() => {
    const move = travel[variant];
    const exit = mode === 'exit';
    const range = { inputRange: [0, 1] };
    return {
      opacity: v.interpolate({ ...range, outputRange: exit ? [1, 0] : [0, 1] }),
      transform: [
        { translateX: v.interpolate({ ...range, outputRange: exit ? [0, move.exitX] : [move.enterX, 0] }) },
        { translateY: v.interpolate({ ...range, outputRange: exit ? [0, variant === 'logo' ? -24 : 0] : [move.enterY, 0] }) },
        { scale: v.interpolate({ ...range, outputRange: exit ? [1, 0.92] : [move.enterScale, 1] }) },
      ],
    };
  }, [v, mode, variant]);
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

// ── Conteos ────────────────────────────────────────────────────────────────────
// En web no re-renderizamos React en cada frame: se pinta el valor final y un único
// reloj compartido (un solo requestAnimationFrame para todos los contadores) reescribe
// el nodo de texto. Así 20 filas del ranking contando no generan 20 re-renders × 40 frames.

type RollTask = { start: number; step: (eased: number) => void; done: () => void };
const rollTasks = new Set<RollTask>();
let rollFrame = 0;

function rollLoop(now: number) {
  rollFrame = 0;
  for (const task of rollTasks) {
    const p = Math.min(1, (now - task.start) / COUNT_MS);
    if (p >= 1) {
      rollTasks.delete(task);
      task.done();
    } else task.step(1 - (1 - p) ** 3);
  }
  if (rollTasks.size) rollFrame = requestAnimationFrame(rollLoop);
}

function startRoll(task: RollTask): () => void {
  rollTasks.add(task);
  if (!rollFrame) rollFrame = requestAnimationFrame(rollLoop);
  return () => {
    rollTasks.delete(task);
  };
}

/** Busca el nodo de texto que muestra `text` dentro de `root`. */
function findTextNode(root: unknown, text: string): Text | null {
  if (!root || typeof document === 'undefined' || !(root instanceof Node)) return null;
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  for (let n = walker.nextNode(); n; n = walker.nextNode()) if (n.nodeValue === text) return n as Text;
  return null;
}

const contents = web ? ({ display: 'contents' } as unknown as ViewStyle) : undefined;

/** Contador web: renderiza `final` una vez y anima el texto en el DOM. */
function DomRoll({ final, at, children }: { final: string; at: (eased: number) => string; children: ReactNode }) {
  const ref = useRef<unknown>(null);
  const atRef = useRef(at);
  atRef.current = at;
  useEffect(() => {
    const node = findTextNode(ref.current, final);
    if (!node) return;
    node.nodeValue = atRef.current(0);
    const stop = startRoll({
      start: performance.now(),
      step: (e) => {
        node.nodeValue = atRef.current(e);
      },
      done: () => {
        node.nodeValue = final;
      },
    });
    return () => {
      stop();
      node.nodeValue = final;
    };
  }, [final]);
  return (
    <View ref={ref as never} style={contents}>
      {children}
    </View>
  );
}

/** Cuenta un número de 0 al valor, o deja el texto quieto si no es una cifra simple. */
export function CountUp({ value, children }: { value: string; children: (shown: string) => ReactNode }) {
  const reduced = useReducedMotion();
  const roll = rollTarget(value);
  if (!web || reduced || !roll) return <NativeCountUp value={value} reduced={reduced}>{children}</NativeCountUp>;
  return (
    <DomRoll final={value} at={(e) => `${roll.prefix}${formatRoll(roll.target, e, roll.decimals, roll.decimalComma)}${roll.suffix}`}>
      {children(value)}
    </DomRoll>
  );
}

function NativeCountUp({ value, reduced, children }: { value: string; reduced: boolean; children: (shown: string) => ReactNode }) {
  const roll = rollTarget(value);
  const [progress, setProgress] = useState(reduced || !roll ? 1 : 0);
  useEffect(() => {
    const next = rollTarget(value);
    if (reduced || !next) {
      setProgress(1);
      return;
    }
    setProgress(0);
    return startRoll({ start: performance.now(), step: setProgress, done: () => setProgress(1) });
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
  const ok = Number.isFinite(value);
  if (web && !reduced && ok) {
    return (
      <DomRoll final={format(value)} at={(e) => format(value * e)}>
        {children(format(value))}
      </DomRoll>
    );
  }
  return <NativeCountRoll value={value} format={format} reduced={reduced || !ok}>{children}</NativeCountRoll>;
}

function NativeCountRoll({
  value,
  format,
  reduced,
  children,
}: {
  value: number;
  format: (n: number) => string;
  reduced: boolean;
  children: (shown: string) => ReactNode;
}) {
  const [progress, setProgress] = useState(reduced ? 1 : 0);
  useEffect(() => {
    if (reduced) {
      setProgress(1);
      return;
    }
    setProgress(0);
    return startRoll({ start: performance.now(), step: setProgress, done: () => setProgress(1) });
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
