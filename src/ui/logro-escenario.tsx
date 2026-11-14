import { useEffect, useMemo, useRef } from 'react';
import { Animated, Easing, Modal, PanResponder, ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Defs, Ellipse, LinearGradient, Path, Stop } from 'react-native-svg';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);
import { RARITY_LABEL, siblingsOf, trophyByCode, whyTitle } from '../content/trophies';
import type { AchievementCode } from '../domain/types';
import type { TrophyView } from '../data/snapshots';
import { AchievementBadge } from './achievement-badge';
import { formatDay } from './format';
import { Icon } from './icon';
import { stageStats, type StageStreaks } from './logro-escenario-data';
import { useReducedMotion } from './motion';
import { SportPress } from './press';
import { shareTrophy } from './share';
import { T } from './text';

const MEDAL = 200;
const CLOSE_DY = 120;
const CLOSE_VY = 0.8;

const PLATE_W = 280;
const PLATE_H = 36;
const PLATE_CX = PLATE_W / 2;
const PLATE_CY = 16;
const PLATE_RX = 124;
const PLATE_RY = 13;

function leds() {
  const out: { x: number; y: number; o: number }[] = [];
  const n = 16;
  for (let i = 0; i < n; i++) {
    const a = Math.PI * (i / (n - 1));
    out.push({
      x: PLATE_CX + PLATE_RX * Math.cos(Math.PI - a),
      y: PLATE_CY + PLATE_RY * Math.sin(a),
      o: 0.35 + 0.65 * Math.sin(a),
    });
  }
  return out;
}
const LEDS = leds();

export function LogroEscenario({
  trophy,
  trophies,
  streaks,
  onClose,
  onOpen,
  onRegister,
}: {
  trophy: TrophyView;
  trophies: TrophyView[];
  streaks: StageStreaks;
  onClose: () => void;
  onOpen: (code: AchievementCode) => void;
  onRegister: () => void;
}) {
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const reduced = useReducedMotion();
  const def = trophyByCode[trophy.code];
  const earnedCount = trophies.filter((item) => item.earned).length;
  const stats = stageStats(trophy, { earnedCount, total: 24, ...streaks });
  const siblings = siblingsOf(trophy.code);
  const legendary = trophy.rarity === 'legendaria';
  const spot = trophy.earned ? (legendary ? 0.09 : 0.12) : 0.08;

  const overlay = useRef(new Animated.Value(0)).current;
  const sheet = useRef(new Animated.Value(1)).current; // 0 visible, 1 offscreen; we set and spring to 0
  const medal = useRef(new Animated.Value(0)).current;
  const shine = useRef(new Animated.Value(0)).current;
  const halo = useRef(new Animated.Value(1)).current;
  const sway = useRef(new Animated.Value(0)).current;
  const ledsSpin = useRef(new Animated.Value(0)).current;
  const breathe = useRef(new Animated.Value(0.85)).current;
  const ring = useRef(new Animated.Value(0)).current;
  const lockTick = useRef(new Animated.Value(0)).current;
  const dragY = useRef(new Animated.Value(0)).current;
  const loops = useRef<Animated.CompositeAnimation[]>([]);

  const open = () => {
    overlay.setValue(0);
    sheet.setValue(1);
    medal.setValue(0);
    shine.setValue(0);
    halo.setValue(1);
    dragY.setValue(0);
    const ratio = trophy.progress && trophy.progress.target > 0 ? Math.min(1, trophy.progress.current / trophy.progress.target) : 0;
    ring.setValue(reduced || trophy.earned ? ratio : 0);
    Animated.timing(overlay, { toValue: 1, duration: reduced ? 1 : 200, useNativeDriver: true }).start();
    Animated.spring(sheet, { toValue: 0, damping: 18, stiffness: 180, useNativeDriver: true, overshootClamping: false }).start();
    const enter = Animated.timing(medal, { toValue: 1, duration: reduced ? 1 : 420, delay: reduced ? 0 : 80, easing: Easing.out(Easing.cubic), useNativeDriver: true });
    enter.start(() => {
      if (reduced) return;
      if (trophy.earned) {
        Animated.parallel([
          Animated.timing(shine, { toValue: 1, duration: 700, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
          Animated.sequence([
            Animated.timing(halo, { toValue: 1.08, duration: 280, easing: Easing.out(Easing.quad), useNativeDriver: true }),
            Animated.timing(halo, { toValue: 1, duration: 320, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
          ]),
        ]).start();
      } else {
        Animated.timing(ring, { toValue: ratio, duration: 600, easing: Easing.out(Easing.cubic), useNativeDriver: false }).start();
        Animated.sequence([
          Animated.timing(lockTick, { toValue: 1, duration: 90, useNativeDriver: true }),
          Animated.timing(lockTick, { toValue: -1, duration: 120, useNativeDriver: true }),
          Animated.timing(lockTick, { toValue: 0, duration: 100, useNativeDriver: true }),
        ]).start();
      }
    });
    if (reduced) return;
    const swayLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(sway, { toValue: 1, duration: 1500, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(sway, { toValue: -1, duration: 3000, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(sway, { toValue: 0, duration: 1500, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ]),
    );
    const ledLoop = Animated.loop(Animated.timing(ledsSpin, { toValue: 1, duration: 8000, easing: Easing.linear, useNativeDriver: true }));
    const breathLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(breathe, { toValue: 1, duration: 1600, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(breathe, { toValue: 0.7, duration: 1600, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ]),
    );
    swayLoop.start();
    ledLoop.start();
    breathLoop.start();
    loops.current = [swayLoop, ledLoop, breathLoop];
  };

  const stopLoops = () => {
    loops.current.forEach((item) => item.stop());
    loops.current = [];
  };

  const close = () => {
    stopLoops();
    Animated.parallel([
      Animated.timing(overlay, { toValue: 0, duration: reduced ? 1 : 180, useNativeDriver: true }),
      Animated.timing(sheet, { toValue: 1, duration: reduced ? 1 : 220, easing: Easing.in(Easing.cubic), useNativeDriver: true }),
    ]).start(({ finished }) => {
      if (finished) onClose();
    });
  };

  useEffect(() => {
    open();
    return stopLoops;
    // Re-open animations when the trophy changes (sibling tap).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trophy.code]);

  const pan = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, g) => g.dy > 8 && Math.abs(g.dy) > Math.abs(g.dx),
        onPanResponderMove: (_, g) => {
          if (g.dy > 0) dragY.setValue(g.dy);
        },
        onPanResponderRelease: (_, g) => {
          const fast = g.vy > CLOSE_VY;
          if (g.dy > CLOSE_DY || fast) close();
          else Animated.spring(dragY, { toValue: 0, damping: 18, stiffness: 180, useNativeDriver: true }).start();
        },
      }),
    // close is stable enough for this modal instance
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [reduced],
  );

  const translateY = Animated.add(dragY, sheet.interpolate({ inputRange: [0, 1], outputRange: [0, height] }));
  const rotateY = sway.interpolate({ inputRange: [-1, 1], outputRange: ['-12deg', '12deg'] });
  const invertY = sway.interpolate({ inputRange: [-1, 1], outputRange: ['12deg', '-12deg'] });
  const medalScale = medal.interpolate({ inputRange: [0, 1], outputRange: [0.85, 1] });
  const shineX = shine.interpolate({ inputRange: [0, 1], outputRange: [-180, 180] });
  const lockRotate = lockTick.interpolate({ inputRange: [-1, 0, 1], outputRange: ['-6deg', '0deg', '6deg'] });
  const ratio = trophy.progress && trophy.progress.target > 0 ? Math.min(1, trophy.progress.current / trophy.progress.target) : 0;

  return (
    <Modal visible transparent animationType="none" statusBarTranslucent onRequestClose={close}>
      <View style={styles.root} pointerEvents="box-none">
        <Animated.View style={[styles.dim, { opacity: overlay }]} />
        <Animated.View style={[styles.stage, { transform: [{ translateY }], paddingTop: insets.top + 8, paddingBottom: Math.max(insets.bottom, 16) }]}>
          <View {...pan.panHandlers}>
          <View style={styles.topBar}>
            <SportPress onPress={close} style={styles.close} accessibilityLabel="Cerrar" accessibilityRole="button" hitSlop={8}>
              <Icon name="cerrar" size={18} color="#FFFFFF" />
            </SportPress>
            {trophy.earned ? (
              <View style={styles.inCase}>
                <View style={styles.liveDot} />
                <T style={styles.inCaseText}>EN TU VITRINA</T>
              </View>
            ) : null}
          </View>
          <View style={styles.handleWrap}>
            <View style={styles.handle} />
          </View>
          </View>

          <View style={styles.lights}>
            <Animated.View style={[styles.spotWrap, styles.spotLeft, { opacity: breathe }]}>
              <Spotlight warm={trophy.earned} strength={spot} flip={false} />
            </Animated.View>
            <Animated.View style={[styles.spotWrap, styles.spotRight, { opacity: breathe }]}>
              <Spotlight warm={trophy.earned} strength={spot} flip />
            </Animated.View>
            <Animated.View
              pointerEvents="none"
              style={[
                styles.halo,
                {
                  opacity: trophy.earned ? 0.9 : 0.35,
                  transform: [{ scale: halo }],
                  backgroundColor: trophy.earned ? 'rgba(241,210,122,0.28)' : 'rgba(201,162,255,0.18)',
                },
              ]}
            />
            <Animated.View
              style={{
                opacity: medal,
                transform: [{ perspective: 900 }, { rotateY }, { scale: medalScale }],
              }}
            >
              <View style={styles.medal}>
                <AchievementBadge code={trophy.code} unlocked={trophy.earned} size={MEDAL} progress={null} />
                {!trophy.earned ? <DrawRing size={MEDAL} progress={ring} /> : null}
                {trophy.earned ? (
                  <View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.clipMedal]}>
                    <Animated.View style={[styles.shine, { transform: [{ rotate: '28deg' }, { translateX: shineX }] }]}>
                      <Svg width={48} height={MEDAL * 2}>
                        <Defs>
                          <LinearGradient id="cfcShineSweep" x1="0" y1="0" x2="1" y2="0">
                            <Stop offset="0" stopColor="#FFFFFF" stopOpacity="0" />
                            <Stop offset="0.5" stopColor="#FFFFFF" stopOpacity="0.85" />
                            <Stop offset="1" stopColor="#FFFFFF" stopOpacity="0" />
                          </LinearGradient>
                        </Defs>
                        <Path d={`M0 0 H48 V${MEDAL * 2} H0 Z`} fill="url(#cfcShineSweep)" />
                      </Svg>
                    </Animated.View>
                  </View>
                ) : null}
              </View>
            </Animated.View>

            <View style={styles.turntable} pointerEvents="none">
              <Svg width={PLATE_W} height={PLATE_H + 10} style={styles.plateSvg}>
                <Defs>
                  <LinearGradient id="cfcPlateRim" x1="0" y1="0" x2="0" y2="1">
                    <Stop offset="0" stopColor={trophy.earned ? '#F1D27A' : '#E0C8F5'} />
                    <Stop offset="0.45" stopColor={trophy.earned ? '#D4AF37' : '#8D6AA8'} />
                    <Stop offset="1" stopColor={trophy.earned ? '#8A6A16' : '#4A3358'} />
                  </LinearGradient>
                  <LinearGradient id="cfcPlateFloor" x1="0" y1="0" x2="0" y2="1">
                    <Stop offset="0" stopColor={trophy.earned ? 'rgba(241,210,122,0.35)' : 'rgba(201,162,255,0.2)'} />
                    <Stop offset="0.5" stopColor="#2A0030" />
                    <Stop offset="1" stopColor="#14001A" />
                  </LinearGradient>
                </Defs>
                <Ellipse cx={PLATE_CX} cy={PLATE_CY + 7} rx={PLATE_RX + 4} ry={PLATE_RY + 3} fill="#000000" opacity={0.45} />
                <Ellipse cx={PLATE_CX} cy={PLATE_CY} rx={PLATE_RX} ry={PLATE_RY} fill="url(#cfcPlateFloor)" />
                <Ellipse
                  cx={PLATE_CX}
                  cy={PLATE_CY}
                  rx={PLATE_RX}
                  ry={PLATE_RY}
                  fill="none"
                  stroke="url(#cfcPlateRim)"
                  strokeWidth={3.5}
                />
              </Svg>
              <View style={styles.ledRing}>
                {LEDS.map((led, i) => (
                  <View
                    key={i}
                    style={[
                      styles.led,
                      {
                        left: led.x - 2.5,
                        top: led.y - 2.5,
                        opacity: led.o,
                        backgroundColor: trophy.earned ? '#00FF87' : '#C9A2FF',
                        shadowColor: trophy.earned ? '#00FF87' : '#C9A2FF',
                      },
                    ]}
                  />
                ))}
              </View>
              <Animated.View
                pointerEvents="none"
                style={[
                  styles.reflection,
                  { opacity: medal.interpolate({ inputRange: [0, 1], outputRange: [0, 0.18] }), transform: [{ scaleY: -1 }, { rotateY: invertY }] },
                ]}
              >
                <AchievementBadge code={trophy.code} unlocked={trophy.earned} size={140} progress={null} />
                <View style={styles.reflectionFade} />
              </Animated.View>
            </View>
          </View>

          <ScrollView style={styles.info} contentContainerStyle={styles.infoInner} showsVerticalScrollIndicator={false}>
            <View style={styles.nameRow}>
              <View style={styles.nameGreen}>
                <T style={styles.name} color="#37003C" numberOfLines={1}>
                  {trophy.title}
                </T>
              </View>
              <View style={styles.nameGold}>
                <T style={styles.rarity} color="#2A1800">
                  {RARITY_LABEL[trophy.rarity]}
                </T>
              </View>
            </View>
            <View style={styles.conditionBox}>
              <T style={styles.condition} color="#E4D4EE">
                {trophy.description}
              </T>
            </View>
            {stats.length ? (
              <View style={styles.stats}>
                {stats.map((cell, i) => (
                  <View key={cell.label} style={[styles.stat, i > 0 && styles.statLine]}>
                    <T style={styles.statValue} color={cell.color} numberOfLines={1}>
                      {cell.value}
                    </T>
                    <T style={styles.statLabel}>{cell.label}</T>
                  </View>
                ))}
              </View>
            ) : null}

            <View style={styles.why}>
              <T style={styles.whyTitle} color="#00FF87">
                {whyTitle(def.animal)}
              </T>
              <T style={styles.whyBody} color="#E4D4EE">
                {def.why}
              </T>
            </View>

            {siblings.length ? (
              <View style={styles.siblings}>
                {siblings.map((item) => {
                  const row = trophies.find((t) => t.code === item.code);
                  const got = Boolean(row?.earned);
                  return (
                    <SportPress
                      key={item.code}
                      onPress={() => onOpen(item.code)}
                      style={[styles.sib, got && styles.sibOn, item.code === trophy.code && styles.sibActive]}
                      accessibilityRole="button"
                      accessibilityLabel={item.title}
                    >
                      <AchievementBadge code={item.code} unlocked={got} size={44} progress={got ? null : row?.progress} />
                      <T style={styles.sibTitle} numberOfLines={1}>
                        {item.title}
                      </T>
                      <T style={styles.sibMeta} color={got ? '#00FF87' : '#B99BC6'}>
                        {got ? (formatDay(row?.earnedAt) ? `✓ ${formatDay(row?.earnedAt)}` : '✓ Ganado') : row?.progress ? `${Math.min(row.progress.current, row.progress.target)}/${row.progress.target}` : 'Por ganar'}
                      </T>
                    </SportPress>
                  );
                })}
              </View>
            ) : null}

            {trophy.earned ? (
              <SportPress onPress={() => void shareTrophy(trophy.title)} style={styles.cta} accessibilityRole="button" accessibilityLabel="Compartir">
                <Icon name="compartir" size={18} color="#37003C" />
                <T style={styles.ctaText} color="#37003C">
                  Compartir
                </T>
              </SportPress>
            ) : (
              <SportPress
                onPress={onRegister}
                style={styles.cta}
                accessibilityRole="button"
                accessibilityLabel="Registrar partido"
              >
                <Icon name="agregar" size={18} color="#37003C" />
                <T style={styles.ctaText} color="#37003C">
                  Registrar partido
                </T>
              </SportPress>
            )}
          </ScrollView>
        </Animated.View>
      </View>
    </Modal>
  );
}

function DrawRing({ size, progress }: { size: number; progress: Animated.Value }) {
  const stroke = Math.max(3, size * 0.03);
  const r = size / 2 - stroke;
  const c = 2 * Math.PI * r;
  const offset = progress.interpolate({ inputRange: [0, 1], outputRange: [c, 0] });
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <Svg width={size} height={size} style={{ transform: [{ rotate: '-90deg' }] }}>
        <Circle cx={size / 2} cy={size / 2} r={r} stroke="rgba(241,210,122,0.22)" strokeWidth={stroke} fill="none" />
        <AnimatedCircle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke="#F1D27A"
          strokeWidth={stroke}
          fill="none"
          strokeDasharray={`${c} ${c}`}
          strokeDashoffset={offset}
          strokeLinecap="round"
        />
      </Svg>
    </View>
  );
}

function Spotlight({ warm, strength, flip }: { warm: boolean; strength: number; flip: boolean }) {
  const color = warm ? `rgba(255,236,190,${strength})` : `rgba(201,162,255,${strength})`;
  return (
    <Svg width={260} height={520} viewBox="0 0 260 520" style={{ transform: [{ scaleX: flip ? -1 : 1 }] }}>
      <Defs>
        <LinearGradient id={flip ? 'cfcSpotR' : 'cfcSpotL'} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={color} />
          <Stop offset="0.8" stopColor="rgba(0,0,0,0)" />
        </LinearGradient>
      </Defs>
      <Path d="M117 0 H143 L260 520 H0 Z" fill={`url(#${flip ? 'cfcSpotR' : 'cfcSpotL'})`} />
    </Svg>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  dim: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(20,0,26,0.94)' },
  stage: { flex: 1 },
  topBar: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, zIndex: 8 },
  inCase: { flexDirection: 'row', alignItems: 'center', gap: 6, height: 24, paddingHorizontal: 9, backgroundColor: 'rgba(0,0,0,0.4)', borderWidth: 1, borderColor: 'rgba(0,255,135,0.5)', borderRadius: 4 },
  liveDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#00FF87' },
  inCaseText: { fontSize: 10, fontWeight: '800', letterSpacing: 1.3, color: '#00FF87' },
  close: { width: 38, height: 38, borderRadius: 19, borderWidth: 1, borderColor: 'rgba(201,162,255,0.45)', backgroundColor: 'rgba(20,0,26,0.72)', alignItems: 'center', justifyContent: 'center', zIndex: 8 },
  handleWrap: { alignItems: 'center', marginTop: 6, zIndex: 5 },
  handle: { width: 42, height: 5, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.35)' },
  lights: { height: 328, alignItems: 'center', justifyContent: 'flex-start', marginTop: 4, overflow: 'hidden' },
  spotWrap: { position: 'absolute', top: -50, width: 260, height: 520 },
  spotLeft: { left: -70, transform: [{ rotate: '-24deg' }] },
  spotRight: { right: -70, transform: [{ rotate: '24deg' }] },
  halo: { position: 'absolute', top: 20, width: 260, height: 260, borderRadius: 130 },
  medal: { width: MEDAL, height: MEDAL, marginTop: 8, zIndex: 2 },
  clipMedal: { overflow: 'hidden', borderRadius: MEDAL / 2 },
  shine: { position: 'absolute', width: 48, height: MEDAL * 2, left: MEDAL / 2 - 24, top: -MEDAL / 2 },
  turntable: { position: 'absolute', left: 0, right: 0, top: 216, height: 112, alignItems: 'center', zIndex: 1 },
  plateSvg: { position: 'absolute', top: 0 },
  ledRing: { position: 'absolute', width: PLATE_W, height: PLATE_H + 10, top: 0 },
  led: { position: 'absolute', width: 5, height: 5, borderRadius: 3, shadowOpacity: 0.9, shadowRadius: 4, shadowOffset: { width: 0, height: 0 } },
  reflection: { position: 'absolute', top: 30, width: 140, height: 70, alignItems: 'center', overflow: 'hidden' },
  reflectionFade: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(20,0,26,0.62)' },
  info: { flex: 1, marginTop: 8 },
  infoInner: { paddingHorizontal: 16, gap: 10, paddingBottom: 8 },
  nameRow: { flexDirection: 'row', alignItems: 'stretch', height: 44 },
  nameGreen: { flex: 1, backgroundColor: '#00FF87', justifyContent: 'center', paddingHorizontal: 14 },
  name: { fontSize: 22, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.3 },
  nameGold: { backgroundColor: '#D4AF37', justifyContent: 'center', paddingHorizontal: 12, marginLeft: -4, paddingLeft: 16 },
  rarity: { fontSize: 11, fontWeight: '800', letterSpacing: 1.3, textTransform: 'uppercase' },
  conditionBox: { backgroundColor: 'rgba(20,0,24,0.85)', borderWidth: 1, borderColor: 'rgba(201,162,255,0.18)', borderTopWidth: 0, paddingVertical: 10, paddingHorizontal: 14, marginTop: -10, zIndex: -1 },
  condition: { fontSize: 13, lineHeight: 18, textTransform: 'none', letterSpacing: 0 },
  stats: { flexDirection: 'row', borderWidth: 1, borderColor: 'rgba(201,162,255,0.18)', borderRadius: 6, overflow: 'hidden', backgroundColor: 'rgba(20,0,24,0.7)' },
  stat: { flex: 1, paddingVertical: 9, paddingHorizontal: 6, alignItems: 'center' },
  statLine: { borderLeftWidth: 1, borderLeftColor: 'rgba(201,162,255,0.15)' },
  statValue: { fontSize: 16, fontWeight: '800', letterSpacing: -0.3 },
  statLabel: { fontSize: 8.5, fontWeight: '800', letterSpacing: 1, color: '#B99BC6', marginTop: 5, textTransform: 'uppercase' },
  why: { gap: 5 },
  whyTitle: { fontSize: 10, fontWeight: '700', letterSpacing: 1.3, textTransform: 'uppercase' },
  whyBody: { fontSize: 13, lineHeight: 18, textTransform: 'none', letterSpacing: 0 },
  siblings: { flexDirection: 'row', gap: 8 },
  sib: { flex: 1, backgroundColor: 'rgba(20,0,24,0.7)', borderWidth: 1, borderColor: 'rgba(201,162,255,0.18)', borderRadius: 12, paddingVertical: 8, paddingHorizontal: 4, alignItems: 'center' },
  sibOn: {},
  sibActive: { borderColor: 'rgba(241,210,122,0.7)' },
  sibTitle: { fontSize: 11, fontWeight: '700', marginTop: 4, textAlign: 'center' },
  sibMeta: { fontSize: 10, marginTop: 2 },
  cta: { height: 46, borderRadius: 13, backgroundColor: '#00FF87', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 2 },
  ctaText: { fontSize: 15, fontWeight: '800' },
});
