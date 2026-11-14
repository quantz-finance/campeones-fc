// Sello de logro con brillo holográfico (tipo carta holo): un barrido iridiscente (verde, cian, lila, oro),
// un reflejo blanco y destellos sutiles. Bloqueado = gris, sin brillo.
// Rendimiento: UN solo reloj compartido (Animated, native driver en el teléfono) para todos los sellos;
// solo corre mientras haya algún sello visible en una pantalla enfocada. Respeta «reducir movimiento».
import { useIsFocused } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Image, Platform, StyleSheet, View } from 'react-native';
import Svg, { Circle, Defs, LinearGradient, Path, Rect, Stop } from 'react-native-svg';
import { logroArt } from '../content/logros-art';
import type { AchievementCode } from '../domain/types';
import { useReducedMotion } from './motion';
import { Icon } from './icon';
import { T } from './text';
import { colors, space } from './theme';

const web = Platform.OS === 'web';
const CYCLE_MS = 4200;

/* ---------- reloj compartido ---------- */
const clock = new Animated.Value(0);
let users = 0;
let loop: Animated.CompositeAnimation | null = null;

function acquire() {
  users += 1;
  if (users === 1) {
    clock.setValue(0);
    loop = Animated.loop(Animated.timing(clock, { toValue: 1, duration: CYCLE_MS, easing: Easing.linear, useNativeDriver: !web }));
    loop.start();
  }
}
function release() {
  users = Math.max(0, users - 1);
  if (users === 0) {
    loop?.stop();
    loop = null;
  }
}
/** Solo para pruebas. */
export function holoClockUsers() {
  return users;
}

/** ¿Este sello está a la vista? En web usa IntersectionObserver; en el teléfono, el foco de la pantalla. */
function useOnScreen(ref: { current: unknown }): boolean {
  const [visible, setVisible] = useState(!web);
  useEffect(() => {
    if (!web) return;
    const node = ref.current as unknown as Element | null;
    if (!node || typeof IntersectionObserver === 'undefined') {
      setVisible(true);
      return;
    }
    const io = new IntersectionObserver((entries) => setVisible(entries.some((e) => e.isIntersecting)), { rootMargin: '40px' });
    io.observe(node);
    return () => io.disconnect();
  }, [ref]);
  return visible;
}

const SPARKS = [
  { x: 0.24, y: 0.22, s: 0.13, at: 0.18 },
  { x: 0.74, y: 0.34, s: 0.1, at: 0.42 },
  { x: 0.4, y: 0.76, s: 0.11, at: 0.7 },
];

function Spark({ size }: { size: number }) {
  // Estrella de cuatro puntas.
  const h = size / 2;
  const d = `M${h} 0 C${h * 1.12} ${h * 0.88} ${h * 1.12} ${h * 0.88} ${size} ${h} C${h * 1.12} ${h * 1.12} ${h * 1.12} ${h * 1.12} ${h} ${size} C${h * 0.88} ${h * 1.12} ${h * 0.88} ${h * 1.12} 0 ${h} C${h * 0.88} ${h * 0.88} ${h * 0.88} ${h * 0.88} ${h} 0Z`;
  return (
    <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <Path d={d} fill="#FFFFFF" />
    </Svg>
  );
}

function Holo({ size, phase, moving }: { size: number; phase: number; moving: boolean }) {
  // Fase propia por sello para que no brillen todos a la vez.
  const t = Animated.modulo(Animated.add(clock, phase), 1);
  const band = size * 2.4;
  const sweep = moving ? t.interpolate({ inputRange: [0, 0.6, 1], outputRange: [-band, size * 0.9, size * 0.9] }) : -size * 0.55;
  const shine = moving ? t.interpolate({ inputRange: [0, 0.6, 1], outputRange: [-size * 1.3, size * 1.3, size * 1.3] }) : -size * 0.2;
  const glow = moving ? t.interpolate({ inputRange: [0, 0.3, 0.6, 1], outputRange: [0.28, 0.5, 0.32, 0.28] }) : 0.34;
  const blend = (mode: string) => ({ mixBlendMode: mode }) as object;
  return (
    <View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.clip, { borderRadius: size / 2 }]}>
      {/* Lámina iridiscente que barre en diagonal. */}
      <Animated.View style={[styles.rot, { width: band, height: band, left: (size - band) / 2, top: (size - band) / 2, opacity: glow, transform: [{ rotate: '28deg' }, { translateX: sweep }] }, blend('color-dodge')]}>
        <Svg width={band} height={band}>
          <Defs>
            <LinearGradient id="cfcHolo" x1="0" y1="0" x2="1" y2="0">
              <Stop offset="0" stopColor="#00FF87" stopOpacity="0" />
              <Stop offset="0.18" stopColor="#00FF87" stopOpacity="0.9" />
              <Stop offset="0.36" stopColor="#05F0FF" stopOpacity="0.9" />
              <Stop offset="0.54" stopColor="#C9A2FF" stopOpacity="0.9" />
              <Stop offset="0.72" stopColor="#EBFF00" stopOpacity="0.85" />
              <Stop offset="0.9" stopColor="#00FF87" stopOpacity="0.6" />
              <Stop offset="1" stopColor="#00FF87" stopOpacity="0" />
            </LinearGradient>
          </Defs>
          <Rect x={0} y={0} width={band} height={band} fill="url(#cfcHolo)" />
        </Svg>
      </Animated.View>
      {/* Reflejo blanco angosto. */}
      <Animated.View style={[styles.rot, { width: size * 0.22, height: size * 2, left: size * 0.39, top: -size * 0.5, transform: [{ rotate: '28deg' }, { translateX: shine }] }, blend('overlay')]}>
        <Svg width={size * 0.22} height={size * 2}>
          <Defs>
            <LinearGradient id="cfcShine" x1="0" y1="0" x2="1" y2="0">
              <Stop offset="0" stopColor="#FFFFFF" stopOpacity="0" />
              <Stop offset="0.5" stopColor="#FFFFFF" stopOpacity="0.95" />
              <Stop offset="1" stopColor="#FFFFFF" stopOpacity="0" />
            </LinearGradient>
          </Defs>
          <Rect x={0} y={0} width={size * 0.22} height={size * 2} fill="url(#cfcShine)" />
        </Svg>
      </Animated.View>
      {moving
        ? SPARKS.map((spark, i) => {
            const k = Animated.modulo(Animated.add(t, 1 - spark.at), 1);
            const opacity = k.interpolate({ inputRange: [0, 0.06, 0.14, 1], outputRange: [0, 1, 0, 0] });
            const scale = k.interpolate({ inputRange: [0, 0.06, 0.14, 1], outputRange: [0.3, 1, 0.3, 0.3] });
            const s = size * spark.s;
            return (
              <Animated.View key={i} style={{ position: 'absolute', left: size * spark.x - s / 2, top: size * spark.y - s / 2, opacity, transform: [{ scale }] }}>
                <Spark size={s} />
              </Animated.View>
            );
          })
        : null}
    </View>
  );
}

function ProgressRing({ size, ratio }: { size: number; ratio: number }) {
  const stroke = Math.max(2, size * 0.055);
  const r = size / 2 - stroke;
  const c = 2 * Math.PI * r;
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <Svg width={size} height={size} style={{ transform: [{ rotate: '-90deg' }] }}>
        <Circle cx={size / 2} cy={size / 2} r={r} stroke="rgba(241,210,122,0.22)" strokeWidth={stroke} fill="none" />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke="#F1D27A"
          strokeWidth={stroke}
          fill="none"
          strokeDasharray={`${c} ${c}`}
          strokeDashoffset={c * (1 - ratio)}
          strokeLinecap="round"
        />
      </Svg>
    </View>
  );
}

export function AchievementBadge({
  code,
  unlocked,
  size = 92,
  index = 0,
  title,
  detail,
  progress,
}: {
  code: AchievementCode;
  unlocked: boolean;
  size?: number;
  /** Desfase del brillo (posición en la lista). */
  index?: number;
  title?: string;
  detail?: string;
  /** Contador 0..target; el anillo solo se pinta si está bloqueado y current > 0. */
  progress?: { current: number; target: number } | null;
}) {
  const ref = useRef<any>(null);
  const reduced = useReducedMotion();
  const focused = useIsFocused();
  const onScreen = useOnScreen(ref);
  const moving = unlocked && !reduced && focused && onScreen;

  useEffect(() => {
    if (!moving) return;
    acquire();
    return release;
  }, [moving]);

  // Menos de 56 px: variante small. Bloqueado = arte grafito lila (no un filtro gris).
  const art = logroArt(code, size, unlocked);
  const ratio = progress && progress.target > 0 ? Math.min(1, Math.max(0, progress.current / progress.target)) : 0;
  const ring = !unlocked && ratio > 0;
  const lockSize = Math.max(14, Math.min(20, Math.round(size * 0.28)));
  return (
    <View style={[styles.wrap, { width: title || detail ? Math.max(size, 96) : size }]} accessibilityLabel={`${title ?? code}${unlocked ? '' : ' (bloqueado)'}`}>
      <View ref={ref} style={[styles.badge, { width: size, height: size }]}>
        {unlocked ? (
          // El brillo dorado sale de un disco con fondo detrás de la medalla: iOS calcula la sombra
          // con la forma del disco y no con el alfa de la imagen (que es lento y llenaba el log de avisos).
          <View
            pointerEvents="none"
            style={[
              styles.glow,
              { width: size * 0.78, height: size * 0.78, borderRadius: size * 0.39, left: size * 0.11, top: size * 0.11 },
            ]}
          />
        ) : null}
        <Image source={art} style={{ width: size, height: size }} resizeMode="contain" />
        {unlocked ? (
          <View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.clip, { borderRadius: size / 2 }]}>
            <Holo size={size} phase={(index * 0.37) % 1} moving={moving} />
          </View>
        ) : null}
        {ring ? <ProgressRing size={size} ratio={ratio} /> : null}
        {!unlocked ? (
          <View
            pointerEvents="none"
            style={[
              styles.lock,
              { width: lockSize, height: lockSize, borderRadius: lockSize / 2, right: -1, bottom: -1 },
            ]}
          >
            <Icon name="candado" size={Math.max(8, Math.round(lockSize * 0.58))} color="#C9A2FF" />
          </View>
        ) : null}
      </View>
      {title ? (
        <T variant="strong" style={styles.title} numberOfLines={2} color={unlocked ? colors.text : colors.faint}>
          {title}
        </T>
      ) : null}
      {detail ? (
        <T variant="tiny" color={colors.muted} style={styles.detail} numberOfLines={2}>
          {detail}
        </T>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', gap: space.xs },
  badge: { alignItems: 'center', justifyContent: 'center' },
  glow: {
    position: 'absolute',
    backgroundColor: '#37003C',
    shadowColor: '#D4AF37',
    shadowOpacity: 0.4,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 0 },
  },
  clip: { overflow: 'hidden' },
  rot: { position: 'absolute' },
  title: { fontSize: 13, textAlign: 'center' },
  detail: { textAlign: 'center', textTransform: 'none', letterSpacing: 0 },
  lock: { position: 'absolute', alignItems: 'center', justifyContent: 'center', backgroundColor: '#24002A', borderWidth: 1, borderColor: 'rgba(201,162,255,0.45)' },
});
