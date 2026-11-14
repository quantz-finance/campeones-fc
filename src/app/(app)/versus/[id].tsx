// Cara a cara 1 vs 1 · «Retrato a sangre» (propuesta 2 de Stan, elegida por Rolando).
// Las dos fotos a sangre partidas por una diagonal dorada y el marcador de victorias gigante; abajo la
// barra de la serie, 4 duelos, últimos 5 (con «Historial ›») y la curva del Elo en la serie.
// Tú en verde, el rival en oro, empates en lila. Solo Animated de React Native (transform/opacity).
import { useLocalSearchParams, type Href } from 'expo-router';
import { Image } from 'expo-image';
import { useEffect, useRef } from 'react';
import { Animated, Easing, Platform, ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Defs, Line, LinearGradient, Polygon, Polyline, Rect, Stop, Text as SvgText } from 'react-native-svg';
import { useApp } from '../../../state/app-provider';
import { useQuery } from '../../../state/use-query';
import { Backdrop } from '../../../ui/broadcast';
import { Gate } from '../../../ui/controls';
import { elo, firstName, formatDay, goalsPerMatch, monogram, signed } from '../../../ui/format';
import { Icon } from '../../../ui/icon';
import { Rise, useReducedMotion } from '../../../ui/motion';
import { back, push } from '../../../ui/nav';
import { SportPress } from '../../../ui/press';
import { Scene } from '../../../ui/scene';
import { shareChallenge } from '../../../ui/share';
import { DetailSkeleton } from '../../../ui/skeleton';
import { T } from '../../../ui/text';
import { font } from '../../../ui/theme';
import type { H2HSnapshot } from '../../../data/snapshots';
import { VERSUS, challengeMessage, registerHref, resultView, seriesParts, type ResultView } from '../../../ui/versus-data';

const C = VERSUS;
/** Medidas del mockup (390 pt de ancho, barra de estado de 47 pt). */
const HERO = 372;
const PHOTO = 300;

export default function Versus() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { repo, userId, version } = useApp();
  const query = useQuery(() => repo.h2hSnapshot(userId!, String(id)), [repo, userId, version, id], `h2h:${userId}:${id}`);
  const insets = useSafeAreaInsets();
  return (
    <View style={styles.root}>
      <Backdrop />
      <Gate query={query} skeleton={<View style={{ paddingTop: insets.top + 60, paddingHorizontal: 16 }}><DetailSkeleton /></View>}>
        {(data) => <Retrato data={data} me={userId!} rivalId={String(id)} />}
      </Gate>
    </View>
  );
}

function Retrato({ data, me, rivalId }: { data: H2HSnapshot; me: string; rivalId: string }) {
  const insets = useSafeAreaInsets();
  const { width, height: windowH } = useWindowDimensions();
  const W = Math.min(width, 560);
  const k = W / 390;
  const extra = Math.max(0, insets.top - 47);
  const heroH = HERO + extra;
  const played = data.youRecord.played;
  const empty = played === 0;
  const youName = firstName(data.you.displayName);
  const themName = firstName(data.opponent.displayName);
  const lastYou = data.evolution.at(-1)?.ratingYou ?? 1200;
  const lastThem = data.evolution.at(-1)?.ratingThem ?? 1200;
  const challenge = () => void shareChallenge(challengeMessage(themName, data.youRecord.wins, data.opponentRecord.wins, played));
  const register = () => push(registerHref(rivalId) as Href);

  return (
    // Alto de la ventana: el Gate no da alto flexible a sus hijos.
    <View style={{ width, height: windowH, backgroundColor: C.plate }}>
      <ScrollView contentContainerStyle={{ paddingBottom: Math.max(insets.bottom, 16) + 24 }} showsVerticalScrollIndicator={false}>
        <Scene>
          <View style={{ width: W, height: heroH, alignSelf: 'center' }}>
            <SplitPortraits data={data} W={W} k={k} heroH={heroH} extra={extra} dim={empty} />
            <View style={[styles.name, { top: 196 + extra, left: 20 }]}>
              <T variant="display" style={styles.nameText} numberOfLines={1}>
                {youName}
              </T>
              <T variant="label" color={C.you} style={styles.eloSerie} numberOfLines={1}>
                {`Elo en la serie ${elo(lastYou)}`}
              </T>
            </View>
            <View style={[styles.name, { top: 196 + extra, right: 20, alignItems: 'flex-end' }]}>
              <T variant="display" style={[styles.nameText, { textAlign: 'right' }]} numberOfLines={1}>
                {themName}
              </T>
              <T variant="label" color={C.them} style={styles.eloSerie} numberOfLines={1}>
                {`Elo en la serie ${elo(lastThem)}`}
              </T>
            </View>
            <Score top={254 + extra} you={data.youRecord.wins} them={data.opponentRecord.wins} caption={empty ? 'Todavía no juegan entre ustedes' : `Victorias · ${played === 1 ? '1 partido' : `${played} partidos`} · ${data.youRecord.draws === 1 ? '1 empate' : `${data.youRecord.draws} empates`}`} />
          </View>
          <View style={styles.body}>
            {empty ? (
              <EmptySeries themName={themName} onRegister={register} onChallenge={challenge} />
            ) : (
              <Series data={data} me={me} youName={youName} themName={themName} rivalId={rivalId} onRegister={register} onChallenge={challenge} />
            )}
          </View>
        </Scene>
      </ScrollView>
      <Header top={insets.top} onShare={challenge} themName={themName} />
    </View>
  );
}

/** Título sobre una banda oscura que se funde: se lee encima de las caras. */
function Header({ top, onShare, themName }: { top: number; onShare: () => void; themName: string }) {
  const band = top + 92;
  return (
    <View style={[styles.header, { height: band }]} pointerEvents="box-none">
      <Svg style={StyleSheet.absoluteFill} width="100%" height={band} pointerEvents="none">
        <Defs>
          <LinearGradient id="cacBand" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor="#1A001F" stopOpacity={0.88} />
            <Stop offset="0.62" stopColor="#1A001F" stopOpacity={0.62} />
            <Stop offset="1" stopColor="#1A001F" stopOpacity={0} />
          </LinearGradient>
        </Defs>
        <Rect x="0" y="0" width="100%" height={band} fill="url(#cacBand)" />
      </Svg>
      <View style={[styles.headerRow, { marginTop: top + 25 }]}>
        <SportPress onPress={() => back()} style={styles.round} accessibilityRole="button" accessibilityLabel="Volver" hitSlop={8}>
          <Icon name="atras" size={18} color="#FFFFFF" />
        </SportPress>
        <View style={styles.headerText}>
          <T variant="label" color={C.you} style={styles.kicker} numberOfLines={1}>
            Historial completo · 1 vs 1
          </T>
          <T variant="display" style={styles.title} numberOfLines={1}>
            Cara a cara
          </T>
        </View>
        <SportPress onPress={onShare} style={[styles.round, styles.square]} accessibilityRole="button" accessibilityLabel={`Retar a ${themName}`} hitSlop={8}>
          <Icon name="compartir" size={18} color="#FFFFFF" />
        </SportPress>
      </View>
    </View>
  );
}

/**
 * Las dos fotos cuadradas a sangre, partidas por una diagonal dorada (58 % arriba → 42 % abajo).
 * La del rival va en un panel inclinado (skewX) con la foto contra-inclinada: se ve recta y el borde
 * del panel hace la diagonal. Sin foto: iniciales grandes sobre el degradado de su lado.
 */
function SplitPortraits({ data, W, k, heroH, extra, dim }: { data: H2HSnapshot; W: number; k: number; heroH: number; extra: number; dim: boolean }) {
  const mid = W / 2;
  const topX = W * 0.58;
  const bottomX = W * 0.42;
  const skew = (Math.atan((topX - bottomX) / heroH) * 180) / Math.PI;
  const size = PHOTO * k;
  const panelW = W - mid + 120;
  const youLeft = mid - 243 * k;
  const themLeft = mid - 57 * k;
  return (
    <View style={[StyleSheet.absoluteFill, { overflow: 'hidden', backgroundColor: C.plate }]}>
      <Portrait side="you" profile={data.you} left={youLeft} top={6 + extra} size={size} />
      <View style={{ position: 'absolute', top: 0, left: mid, width: panelW, height: heroH, overflow: 'hidden', transform: [{ skewX: `-${skew}deg` }] }}>
        <View style={{ position: 'absolute', top: 0, left: 0, width: panelW, height: heroH, backgroundColor: C.plate, transform: [{ skewX: `${skew}deg` }] }}>
          <Portrait side="them" profile={data.opponent} left={themLeft - mid} top={10 + extra} size={size} />
        </View>
      </View>
      <Svg style={StyleSheet.absoluteFill} width={W} height={heroH} pointerEvents="none">
        <Defs>
          <LinearGradient id="cacFade" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor="#24002A" stopOpacity={0.6} />
            <Stop offset="0.26" stopColor="#37003C" stopOpacity={0} />
            <Stop offset="0.55" stopColor="#37003C" stopOpacity={0.15} />
            <Stop offset="0.97" stopColor={C.plate} stopOpacity={1} />
            <Stop offset="1" stopColor={C.plate} stopOpacity={1} />
          </LinearGradient>
        </Defs>
        <Line x1={topX} y1={0} x2={bottomX} y2={heroH} stroke={C.them} strokeWidth={3} />
        <Rect x={0} y={0} width={W} height={heroH} fill="url(#cacFade)" />
        {dim ? <Rect x={0} y={0} width={W} height={heroH} fill="#2A0030" opacity={0.35} /> : null}
      </Svg>
    </View>
  );
}

function Portrait({ side, profile, left, top, size }: { side: 'you' | 'them'; profile: H2HSnapshot['you']; left: number; top: number; size: number }) {
  const color = side === 'you' ? C.you : C.them;
  const box = { position: 'absolute' as const, left, top, width: size, height: size };
  if (profile.photoUrl) {
    return (
      <Image
        source={{ uri: profile.photoUrl }}
        recyclingKey={profile.photoUrl}
        style={box}
        contentFit="cover"
        cachePolicy="memory-disk"
        transition={0}
        accessibilityLabel={profile.displayName}
      />
    );
  }
  return (
    <View style={[box, styles.initialsBox]} accessibilityRole="image" accessibilityLabel={profile.displayName}>
      <Svg style={StyleSheet.absoluteFill} width={size} height={size} pointerEvents="none">
        <Defs>
          <LinearGradient id={`cacI${side}`} x1={side === 'you' ? '0' : '1'} y1="0" x2={side === 'you' ? '1' : '0'} y2="1">
            <Stop offset="0" stopColor={color} stopOpacity={0.2} />
            <Stop offset="0.7" stopColor={color} stopOpacity={0.06} />
            <Stop offset="1" stopColor={color} stopOpacity={0} />
          </LinearGradient>
        </Defs>
        <Rect x={0} y={0} width={size} height={size} fill={`url(#cacI${side})`} />
      </Svg>
      <T variant="display" style={[styles.initials, { color, fontSize: size * 0.3, lineHeight: size * 0.36 }]} numberOfLines={1}>
        {monogram(profile.displayName)}
      </T>
    </View>
  );
}

/** «6 · 4» gigante en oro: entra con scale 0.9 → 1 y opacidad. */
function Score({ top, you, them, caption }: { top: number; you: number; them: number; caption: string }) {
  const reduced = useReducedMotion();
  const v = useRef(new Animated.Value(reduced ? 1 : 0)).current;
  useEffect(() => {
    if (reduced) return;
    const anim = Animated.timing(v, { toValue: 1, duration: 420, delay: 120, easing: Easing.out(Easing.cubic), useNativeDriver: Platform.OS !== 'web' });
    anim.start();
    return () => anim.stop();
  }, [v, reduced]);
  return (
    <Animated.View
      style={[styles.score, { top, opacity: v, transform: [{ scale: v.interpolate({ inputRange: [0, 1], outputRange: [0.9, 1] }) }] }]}
      accessible
      accessibilityLabel={`${you} a ${them}. ${caption}`}
    >
      <T variant="display" style={styles.scoreText} numberOfLines={1}>
        {`${you} · ${them}`}
      </T>
      <T variant="label" color="#FFFFFF" style={styles.caption} numberOfLines={1}>
        {caption}
      </T>
    </Animated.View>
  );
}

function Series({
  data,
  me,
  youName,
  themName,
  rivalId,
  onRegister,
  onChallenge,
}: {
  data: H2HSnapshot;
  me: string;
  youName: string;
  themName: string;
  rivalId: string;
  onRegister: () => void;
  onChallenge: () => void;
}) {
  const y = data.youRecord;
  const t = data.opponentRecord;
  const streak = (s: typeof y.currentStreak) => (s.type === 'win' && s.count > 0 ? `${s.count}V` : '–');
  const big = (b: typeof y.biggestWin) => (b ? `${b.goalsFor}-${b.goalsAgainst}` : '–');
  const last = data.recent.slice(0, 5).map((match) => resultView(match, me, data.you.displayName, data.opponent.displayName));
  return (
    <>
      <Rise index={1}>
        <View style={styles.bar}>
          {seriesParts(y.wins, y.draws, t.wins).map((part) => (
            <View key={part.key} style={{ flex: part.flex, backgroundColor: part.key === 'you' ? C.you : part.key === 'them' ? C.them : C.draw }} />
          ))}
        </View>
        <View style={styles.legend}>
          <T variant="strong" style={[styles.legendText, { color: C.you }]}>{`${y.wins} ${youName}`}</T>
          <T variant="strong" style={[styles.legendText, { color: C.muted }]}>{y.draws === 1 ? '1 empate' : `${y.draws} empates`}</T>
          <T variant="strong" style={[styles.legendText, { color: C.them }]}>{`${themName} ${t.wins}`}</T>
        </View>
      </Rise>
      <Rise index={2} style={styles.grid}>
        <Duel label="Goles" you={String(y.goalsFor)} them={String(t.goalsFor)} />
        <Duel label="Goles por partido" you={goalsPerMatch(y.goalsFor, y.played)} them={goalsPerMatch(t.goalsFor, t.played)} />
        <Duel label="Mayor goleada" you={big(y.biggestWin)} them={big(t.biggestWin)} />
        <Duel label="Racha actual" you={streak(y.currentStreak)} them={streak(t.currentStreak)} />
      </Rise>
      <Rise index={3}>
        <View style={styles.sec}>
          <T variant="strong" style={styles.secTitle}>Últimos 5</T>
          <SportPress onPress={() => push(`/historial/${rivalId}` as Href)} hitSlop={10} accessibilityRole="link" accessibilityLabel={`Historial completo, ${data.history.length} partidos`}>
            <T variant="strong" style={styles.secLink}>Historial ›</T>
          </SportPress>
        </View>
        <View style={styles.chips}>
          {last.map((r) => (
            <ResultChip key={r.id} r={r} onPress={() => push(`/partido/${r.id}` as Href)} />
          ))}
          {Array.from({ length: Math.max(0, 5 - last.length) }, (_, i) => (
            <View key={`gap${i}`} style={[styles.chip, styles.chipGhost]} />
          ))}
        </View>
      </Rise>
      <Rise index={4}>
        <SeriesChart data={data} youName={youName} themName={themName} />
      </Rise>
      <Rise index={5} style={styles.ctaRow}>
        <SportPress onPress={onRegister} style={[styles.cta, styles.flex]} accessibilityRole="button" accessibilityLabel={`Registrar partido contra ${themName}`}>
          <Icon name="agregar" size={18} color={C.youInk} />
          <T variant="display" style={styles.ctaText} numberOfLines={1}>
            Registrar
          </T>
        </SportPress>
        <SportPress onPress={onChallenge} style={[styles.cta2, styles.flex]} accessibilityRole="button" accessibilityLabel={`Retar a ${themName}`}>
          <Icon name="compartir" size={16} color="#FFFFFF" />
          <T variant="strong" style={styles.cta2Text} numberOfLines={1}>
            {`Retar a ${themName}`}
          </T>
        </SportPress>
      </Rise>
    </>
  );
}

function Duel({ label, you, them }: { label: string; you: string; them: string }) {
  return (
    <View style={styles.duel} accessible accessibilityLabel={`${label}: ${you} a ${them}`}>
      <T variant="label" style={styles.duelLabel} numberOfLines={1}>
        {label}
      </T>
      <View style={styles.duelRow}>
        <T variant="display" style={[styles.duelNum, { color: C.you }]} numberOfLines={1}>
          {you}
        </T>
        <T variant="strong" style={styles.dot}>·</T>
        <T variant="display" style={[styles.duelNum, { color: C.them }]} numberOfLines={1}>
          {them}
        </T>
      </View>
    </View>
  );
}

function ResultChip({ r, onPress }: { r: ResultView; onPress?: () => void }) {
  const bg = r.outcome === 'you' ? C.you : r.outcome === 'them' ? C.them : C.draw;
  const ink = r.outcome === 'you' ? C.youInk : r.outcome === 'them' ? C.themInk : '#FFFFFF';
  const meta = [r.at ? formatDay(r.at) : '', r.delta != null ? signed(r.delta) : ''].filter(Boolean).join(' · ');
  return (
    <SportPress onPress={onPress} style={[styles.chip, { backgroundColor: bg }]} accessibilityRole="button" accessibilityLabel={`${r.score}, ${r.label}${meta ? `, ${meta}` : ''}`}>
      <T variant="display" style={[styles.chipScore, { color: ink }]} numberOfLines={1}>
        {r.score}
      </T>
      <T variant="display" style={[styles.chipLabel, { color: ink }]} numberOfLines={1}>
        {r.label}
      </T>
      <T variant="medium" style={[styles.chipMeta, { color: ink }]} numberOfLines={1}>
        {meta}
      </T>
    </SportPress>
  );
}

/** Curva doble del Elo en la serie (los dos arrancan en 1.200 y solo cuentan sus partidos entre ellos). */
function SeriesChart({ data, youName, themName }: { data: H2HSnapshot; youName: string; themName: string }) {
  const { width } = useWindowDimensions();
  const cardW = Math.min(width, 560) - 32;
  const w = cardW - 12;
  const h = 84;
  const left = 8;
  const right = w - 34;
  const ys = [1200, ...data.evolution.map((p) => p.ratingYou), ...data.evolution.map((p) => p.ratingThem)];
  const spread = Math.max(12, ...ys.map((v) => Math.abs(v - 1200)));
  const mid = 38;
  const scaleY = (v: number) => mid - ((v - 1200) / spread) * 30;
  const pts = (key: 'ratingYou' | 'ratingThem') => {
    const series = [1200, ...data.evolution.map((p) => p[key])];
    const step = series.length > 1 ? (right - left) / (series.length - 1) : 0;
    return series.map((v, i) => [left + i * step, scaleY(v)] as const);
  };
  const you = pts('ratingYou');
  const them = pts('ratingThem');
  const str = (p: readonly (readonly [number, number])[]) => p.map(([x, yy]) => `${x.toFixed(1)},${yy.toFixed(1)}`).join(' ');
  const endYou = you.at(-1)!;
  const endThem = them.at(-1)!;
  const lastYou = data.evolution.at(-1)?.ratingYou ?? 1200;
  const lastThem = data.evolution.at(-1)?.ratingThem ?? 1200;
  // Si las dos etiquetas finales se pisan, se separan.
  let ly = endYou[1] + 3.5;
  let lt = endThem[1] + 3.5;
  if (Math.abs(ly - lt) < 11) {
    const up = lastYou >= lastThem;
    const c = (ly + lt) / 2;
    ly = up ? c - 6 : c + 6;
    lt = up ? c + 6 : c - 6;
  }
  return (
    <View style={styles.chart} accessible accessibilityLabel={`Elo en la serie: ${youName} ${elo(lastYou)}, ${themName} ${elo(lastThem)}`}>
      <View style={styles.chartHead}>
        <T variant="label" style={styles.duelLabel}>
          Elo en la serie
        </T>
        <View style={styles.chartLegend}>
          <T variant="strong" style={[styles.legendText, { color: C.you }]}>{`● ${youName}`}</T>
          <T variant="strong" style={[styles.legendText, { color: C.them }]}>{`● ${themName}`}</T>
        </View>
      </View>
      <Svg width={w} height={h}>
        <Defs>
          <LinearGradient id="cacArea" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={C.you} stopOpacity={0.28} />
            <Stop offset="1" stopColor={C.you} stopOpacity={0} />
          </LinearGradient>
        </Defs>
        <Line x1={left} x2={right} y1={mid} y2={mid} stroke="rgba(255,255,255,0.14)" strokeDasharray="3 4" />
        <SvgText x={right + 3} y={mid + 3} fontSize={8.5} fill={C.muted} fontFamily={font.labelSoft}>
          1.200
        </SvgText>
        <Polygon points={`${left},${mid} ${str(you)} ${endYou[0].toFixed(1)},${mid}`} fill="url(#cacArea)" />
        <Polyline points={str(them)} fill="none" stroke={C.them} strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" />
        <Polyline points={str(you)} fill="none" stroke={C.you} strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" />
        <Circle cx={endYou[0]} cy={endYou[1]} r={4.5} fill={C.you} stroke="#37003C" strokeWidth={2} />
        <Circle cx={endThem[0]} cy={endThem[1]} r={4.5} fill={C.them} stroke="#37003C" strokeWidth={2} />
        <SvgText x={endYou[0] + 7} y={ly} fontSize={10} fill={C.you} fontFamily={font.display}>
          {elo(lastYou)}
        </SvgText>
        <SvgText x={endThem[0] + 7} y={lt} fontSize={10} fill={C.them} fontFamily={font.display}>
          {elo(lastThem)}
        </SvgText>
      </Svg>
      <View style={styles.axis}>
        <T variant="medium" style={styles.axisText}>{formatDay(data.evolution[0]?.at)}</T>
        <T variant="medium" style={styles.axisText}>{formatDay(data.evolution.at(-1)?.at)}</T>
      </View>
    </View>
  );
}

function EmptySeries({ themName, onRegister, onChallenge }: { themName: string; onRegister: () => void; onChallenge: () => void }) {
  const steps = [
    { title: 'Jueguen un partido', body: 'Donde y cuando quieran.' },
    { title: 'Registren el marcador', body: 'Los dos lo confirman.' },
    { title: 'Empieza la serie', body: 'Victorias, goles, racha y curva.' },
  ];
  return (
    <>
      <Rise index={1}>
        <View style={styles.dashBar}>
          {Array.from({ length: 36 }, (_, i) => (
            <View key={i} style={styles.dash} />
          ))}
        </View>
      </Rise>
      <Rise index={2}>
        <View style={styles.steps}>
          {steps.map((step, i) => (
            <View key={step.title} style={[styles.step, i < steps.length - 1 && styles.stepLine]}>
              <View style={[styles.stepNum, i === 0 ? styles.stepNumOn : null]}>
                <T variant="display" style={[styles.stepNumText, { color: i === 0 ? '#37003C' : C.them }]}>{String(i + 1)}</T>
              </View>
              <View style={styles.flex}>
                <T variant="strong" style={styles.stepTitle}>{step.title}</T>
                <T variant="medium" style={styles.stepBody}>{step.body}</T>
              </View>
            </View>
          ))}
        </View>
      </Rise>
      <Rise index={3}>
        <SportPress onPress={onRegister} style={styles.cta} accessibilityRole="button" accessibilityLabel={`Registrar partido contra ${themName}`}>
          <Icon name="agregar" size={19} color={C.youInk} />
          <T variant="display" style={styles.ctaText} numberOfLines={1}>
            {`Registrar partido contra ${themName}`}
          </T>
        </SportPress>
      </Rise>
      <Rise index={4}>
        <SportPress onPress={onChallenge} style={styles.cta2} accessibilityRole="button" accessibilityLabel={`Retar a ${themName}`}>
          <Icon name="compartir" size={17} color="#FFFFFF" />
          <T variant="strong" style={styles.cta2Text} numberOfLines={1}>
            {`Retar a ${themName}`}
          </T>
        </SportPress>
      </Rise>
    </>
  );
}

const plain = { textTransform: 'none' as const, fontStyle: 'normal' as const };

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.plate },
  flex: { flex: 1 },
  header: { position: 'absolute', top: 0, left: 0, right: 0, zIndex: 20 },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16 },
  headerText: { flex: 1, minWidth: 0 },
  kicker: { fontSize: 11, lineHeight: 14, letterSpacing: 1.4 },
  title: { ...plain, fontSize: 28, lineHeight: 30, letterSpacing: -0.5, color: '#FFFFFF' },
  round: { width: 38, height: 38, borderRadius: 19, borderWidth: 1, borderColor: 'rgba(201,162,255,0.3)', backgroundColor: 'rgba(36,0,42,0.5)', alignItems: 'center', justifyContent: 'center' },
  square: { borderRadius: 12 },
  initialsBox: { alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  initials: { ...plain, letterSpacing: -2, opacity: 0.6, marginTop: 24 },
  name: { position: 'absolute', zIndex: 5, maxWidth: '46%' },
  nameText: { ...plain, fontSize: 17, lineHeight: 21, color: '#FFFFFF' },
  eloSerie: { fontSize: 9, lineHeight: 12, letterSpacing: 1.3 },
  score: { position: 'absolute', left: 0, right: 0, alignItems: 'center', zIndex: 5 },
  scoreText: {
    ...plain,
    fontSize: 88,
    lineHeight: 92,
    
    letterSpacing: -3,
    color: C.them,
    textShadowColor: 'rgba(0,0,0,0.7)',
    textShadowOffset: { width: 0, height: 6 },
    textShadowRadius: 28,
  },
  caption: { fontSize: 10, lineHeight: 13, letterSpacing: 1.3, marginTop: 2 },
  body: { paddingHorizontal: 16, marginTop: 14, gap: 11, width: '100%', maxWidth: 560, alignSelf: 'center' },
  bar: { flexDirection: 'row', height: 8, borderRadius: 4, overflow: 'hidden', gap: 2 },
  legend: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 5 },
  legendText: { ...plain, fontFamily: font.bold, fontSize: 10.5, lineHeight: 13, fontWeight: '700' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  duel: { width: '48.8%', flexGrow: 1, flexBasis: '45%', backgroundColor: 'rgba(255,255,255,0.045)', borderWidth: 1, borderColor: 'rgba(201,162,255,0.2)', borderRadius: 16, paddingVertical: 9, paddingHorizontal: 11 },
  duelLabel: { fontSize: 9, lineHeight: 12, letterSpacing: 1.3, color: C.muted },
  duelRow: { flexDirection: 'row', alignItems: 'baseline', gap: 6, marginTop: 5 },
  duelNum: { ...plain, fontSize: 20, lineHeight: 22, letterSpacing: -0.5, flexShrink: 1 },
  dot: { ...plain, fontFamily: font.bold, color: C.muted, fontWeight: '700' },
  sec: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginTop: 2, marginBottom: 8 },
  secTitle: { ...plain, fontFamily: font.bold, fontSize: 11, letterSpacing: 1.4, color: C.muted, textTransform: 'uppercase' },
  secLink: { ...plain, fontFamily: font.bold, fontSize: 11, letterSpacing: 1, color: C.you, textTransform: 'uppercase' },
  chips: { flexDirection: 'row', gap: 6 },
  chip: { flex: 1, height: 56, borderRadius: 10, alignItems: 'center', justifyContent: 'center', gap: 1, paddingHorizontal: 2 },
  chipGhost: { borderWidth: 1, borderColor: 'rgba(201,162,255,0.15)', borderStyle: 'dashed' },
  chipScore: { ...plain, fontSize: 18, lineHeight: 20, fontWeight: '800' },
  chipLabel: { ...plain, fontSize: 8.5, lineHeight: 11, letterSpacing: 0.6, textTransform: 'uppercase' },
  chipMeta: { ...plain, fontFamily: font.labelSoft, fontSize: 9, lineHeight: 11, opacity: 0.85 },
  chart: { backgroundColor: 'rgba(255,255,255,0.045)', borderWidth: 1, borderColor: 'rgba(201,162,255,0.2)', borderRadius: 16, paddingTop: 8, paddingHorizontal: 6, paddingBottom: 6 },
  chartHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 8, paddingBottom: 2 },
  chartLegend: { flexDirection: 'row', gap: 12 },
  axis: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 8, marginTop: -10 },
  axisText: { ...plain, fontFamily: font.labelSoft, fontSize: 9.5, lineHeight: 12, color: C.muted, fontWeight: '600' },
  ctaRow: { flexDirection: 'row', gap: 8, marginTop: 2 },
  cta: { height: 48, borderRadius: 13, backgroundColor: C.you, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingHorizontal: 12 },
  ctaText: { ...plain, fontSize: 15.5, lineHeight: 19, color: C.youInk, flexShrink: 1 },
  cta2: { height: 48, borderRadius: 13, borderWidth: 1, borderColor: 'rgba(201,162,255,0.4)', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingHorizontal: 12 },
  cta2Text: { ...plain, fontFamily: font.bold, fontSize: 14, lineHeight: 18, color: '#FFFFFF', flexShrink: 1 },
  dashBar: { flexDirection: 'row', height: 8, gap: 4, overflow: 'hidden' },
  dash: { width: 6, height: 8, borderRadius: 1.5, backgroundColor: 'rgba(201,162,255,0.25)' },
  steps: { backgroundColor: 'rgba(255,255,255,0.045)', borderWidth: 1, borderColor: 'rgba(201,162,255,0.2)', borderRadius: 16, paddingVertical: 6, paddingHorizontal: 14 },
  step: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 50, paddingVertical: 4 },
  stepLine: { borderBottomWidth: 1, borderBottomColor: 'rgba(201,162,255,0.12)' },
  stepNum: { width: 28, height: 28, borderRadius: 7, backgroundColor: 'rgba(212,175,55,0.15)', alignItems: 'center', justifyContent: 'center' },
  stepNumOn: { backgroundColor: C.them },
  stepNumText: { ...plain, fontSize: 15 },
  stepTitle: { ...plain, fontFamily: font.bold, fontSize: 14, lineHeight: 18, color: '#FFFFFF' },
  stepBody: { ...plain, fontSize: 11.5, lineHeight: 15, color: C.muted },
});
