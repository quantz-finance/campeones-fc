// Intro de arranque (iOS/Android): el toro del splash nativo cobra vida y da paso a la primera pantalla.
// Arranca idéntico al splash (mismo toro recortado de assets/splash-icon.png, 200 pt, centrado, fondo #37003C): sin salto.
// Sobria, estilo transmisión: halo lila, dos anillos que se abren, una línea verde y el nombre. ~2 s.
// Con «Reducir movimiento» solo hace un fundido corto.
import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Platform, StyleSheet, View } from 'react-native';
import { branding } from '../../config/branding';
import { useAppMaybe } from '../state/app-provider';
import { useReducedMotion } from './motion';
import { font } from './theme';

const BG = '#37003C';
const SIZE = 200; // igual que imageWidth de expo-splash-screen (app.json)
const ease = Easing.bezier(0.22, 1, 0.36, 1);
const easeIn = Easing.bezier(0.55, 0, 0.75, 0.06);

export function LaunchIntro() {
  if (Platform.OS === 'web') return null; // la web tiene su propio splash inline (public/index.html)
  return <Intro />;
}

function Intro() {
  const app = useAppMaybe();
  const ready = app ? app.ready : true;
  const reduced = useReducedMotion();
  const [done, setDone] = useState(false);
  const started = useRef(false);

  const bull = useRef(new Animated.Value(1)).current;
  const halo = useRef(new Animated.Value(0)).current;
  const ringA = useRef(new Animated.Value(0)).current;
  const ringB = useRef(new Animated.Value(0)).current;
  const line = useRef(new Animated.Value(0)).current;
  const name = useRef(new Animated.Value(0)).current;
  const out = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!ready || started.current) return;
    started.current = true;
    const t = (v: Animated.Value, toValue: number, duration: number, easing = ease) =>
      Animated.timing(v, { toValue, duration, easing, useNativeDriver: true });

    const sequence = reduced
      ? Animated.sequence([Animated.delay(250), t(out, 1, 260, Easing.out(Easing.quad))])
      : Animated.sequence([
          Animated.parallel([
            // El toro respira: un leve retroceso y vuelve con peso.
            Animated.sequence([t(bull, 0.94, 260, Easing.out(Easing.quad)), Animated.spring(bull, { toValue: 1.03, friction: 6, tension: 70, useNativeDriver: true }), t(bull, 1, 260)]),
            Animated.sequence([Animated.delay(120), t(halo, 1, 700)]),
            Animated.sequence([Animated.delay(180), t(ringA, 1, 900)]),
            Animated.sequence([Animated.delay(380), t(ringB, 1, 900)]),
            Animated.sequence([Animated.delay(520), t(line, 1, 520)]),
            Animated.sequence([Animated.delay(700), t(name, 1, 560)]),
          ]),
          Animated.delay(260),
          t(out, 1, 460, easeIn),
        ]);
    sequence.start(() => setDone(true));
  }, [ready, reduced, bull, halo, ringA, ringB, line, name, out]);

  if (done) return null;

  const ring = (v: Animated.Value, color: string, from: number, to: number) => ({
    borderColor: color,
    opacity: v.interpolate({ inputRange: [0, 0.15, 1], outputRange: [0, 0.9, 0] }),
    transform: [{ scale: v.interpolate({ inputRange: [0, 1], outputRange: [from, to] }) }],
  });

  return (
    <Animated.View
      pointerEvents={ready ? 'none' : 'auto'}
      style={[StyleSheet.absoluteFill, styles.root, { opacity: out.interpolate({ inputRange: [0, 1], outputRange: [1, 0] }) }]}
      testID="launch-intro"
    >
      <Animated.View style={[styles.center, { transform: [{ scale: out.interpolate({ inputRange: [0, 1], outputRange: [1, 1.12] }) }] }]}>
        <Animated.View
          style={[
            styles.halo,
            {
              opacity: halo.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0, 0.32, 0.18] }),
              transform: [{ scale: halo.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1.15] }) }],
            },
          ]}
        />
        <Animated.View style={[styles.ring, ring(ringA, '#00FF87', 0.78, 1.35)]} />
        <Animated.View style={[styles.ring, ring(ringB, 'rgba(255,255,255,0.55)', 0.85, 1.55)]} />
        <Animated.Image source={require('../../assets/splash-bull.png')} style={[styles.bull, { transform: [{ scale: bull }] }]} />
        <View style={styles.below}>
          <Animated.View style={[styles.line, { transform: [{ scaleX: line }] }]} />
          <Animated.Text
            style={[
              styles.name,
              { opacity: name, transform: [{ translateY: name.interpolate({ inputRange: [0, 1], outputRange: [10, 0] }) }] },
            ]}
          >
            {branding.name.toUpperCase()}
          </Animated.Text>
        </View>
      </Animated.View>
    </Animated.View>
  );
}


const styles = StyleSheet.create({
  root: { backgroundColor: BG, zIndex: 1000, elevation: 1000 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  halo: { position: 'absolute', width: 340, height: 340, borderRadius: 170, backgroundColor: '#953BFF' },
  ring: { position: 'absolute', width: 230, height: 230, borderRadius: 115, borderWidth: 2 },
  bull: { width: SIZE, height: SIZE },
  below: { position: 'absolute', top: '50%', marginTop: SIZE / 2 + 28, alignItems: 'center', gap: 14 },
  line: { width: 56, height: 3, borderRadius: 2, backgroundColor: '#00FF87' },
  name: { color: '#FFFFFF', fontFamily: font.display, fontSize: 18, letterSpacing: 6 },
});
