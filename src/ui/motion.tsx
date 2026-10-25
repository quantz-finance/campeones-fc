// Movimiento ligero: solo opacity + transform. Web = CSS keyframes (hilo del compositor),
// nativo = Animated con native driver. Respeta prefers-reduced-motion.
import { memo, useEffect, useRef, useState, type ReactNode } from 'react';
import { AccessibilityInfo, Animated, Easing, Platform, View, type StyleProp, type ViewStyle } from 'react-native';

const web = Platform.OS === 'web';
const EASE_OUT = 'cubic-bezier(0.22, 1, 0.36, 1)';
export const STAGGER_MS = 35;
export const STAGGER_CAP = 8;

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

const riseKeyframes = { from: { opacity: 0, transform: [{ translateY: 8 }] }, to: { opacity: 1, transform: [{ translateY: 0 }] } };
const popKeyframes = { '0%': { transform: [{ scale: 0.86 }], opacity: 0.4 }, '60%': { transform: [{ scale: 1.06 }], opacity: 1 }, '100%': { transform: [{ scale: 1 }], opacity: 1 } };
const shimmerKeyframes = { from: { opacity: 0.45 }, to: { opacity: 0.9 } };
const fadeKeyframes = { from: { opacity: 0 }, to: { opacity: 1 } };

function cssAnim(keyframes: object, ms: number, delay = 0, extra: object = {}) {
  return {
    animationKeyframes: keyframes,
    animationDuration: `${ms}ms`,
    animationDelay: `${delay}ms`,
    animationTimingFunction: EASE_OUT,
    animationFillMode: 'both',
    ...extra,
  } as unknown as ViewStyle;
}

/** Entra con fade + 8 px hacia arriba (220 ms, ease-out); `index` escalona 35 ms hasta el ítem 8. */
export const Rise = memo(function Rise({
  index = 0,
  children,
  style,
}: {
  index?: number;
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  const reduced = useReducedMotion();
  const delay = Math.min(index, STAGGER_CAP) * STAGGER_MS;
  const v = useRef(new Animated.Value(reduced || web ? 1 : 0)).current;
  useEffect(() => {
    if (web || reduced) return;
    Animated.timing(v, { toValue: 1, duration: 220, delay, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
  }, [v, delay, reduced]);
  if (reduced) return <View style={style}>{children}</View>;
  if (web) return <View style={[cssAnim(riseKeyframes, 220, delay), style]}>{children}</View>;
  const translateY = v.interpolate({ inputRange: [0, 1], outputRange: [8, 0] });
  return <Animated.View style={[{ opacity: v, transform: [{ translateY }] }, style]}>{children}</Animated.View>;
});

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

/** Fundido corto para pantallas / swaps grandes. */
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
