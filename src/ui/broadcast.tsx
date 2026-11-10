import { entityPhoto, logoSource, resolveLogo, type LogoKind } from '../content/crests';
import { Ionicons } from '@expo/vector-icons';
import type { ReactNode } from 'react';
import { Platform, Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Svg, { Circle, Defs, G, LinearGradient, Path, Stop } from 'react-native-svg';
import { avatarByKey, branding } from '../../config/branding';
import { CountRoll, CountUp, GrowX } from './motion';
import { SportPress } from './press';
import { colors, font, hex, layout, space } from './theme';
import { T } from './text';
import { toroPaths, toroTransform, toroViewBox } from './toro-data';
import { featureIcons, type FeatureIconName } from './feature-icons-data';
import { useResolvedColor } from './theme-mode';
import { Image } from 'expo-image';
import { PhotoLayer } from './entity-image';

export function tabBarSpace(bottomInset: number): number {
  return 64 + Math.max(bottomInset, 10);
}

export function Backdrop() {
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <View style={[StyleSheet.absoluteFill, styles.wash]} />
      {Platform.OS === 'web' ? <View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.stripes]} /> : null}
    </View>
  );
}

/**
 * Bloque de color (antes inclinado). Estilo liga: píldora redondeada, sin inclinación ni sombra desplazada.
 * Se mantienen las props (shadow, angle) para no tocar a quien lo usa.
 */
export function SkewBlock({
  children,
  color,
  border,
  padH = 12,
  padV = 6,
  fill = false,
  style,
  overlay,
}: {
  children: ReactNode;
  color: string;
  shadow?: string;
  border?: string;
  padH?: number;
  padV?: number;
  angle?: string;
  fill?: boolean;
  style?: StyleProp<ViewStyle>;
  /** Capa encima de la cara (brillo). Recorta la cara para que no se salga. */
  overlay?: ReactNode;
}) {
  const face = [
    styles.skewFace,
    {
      backgroundColor: color,
      paddingHorizontal: padH + 4,
      paddingVertical: padV,
      borderWidth: border ? 1.5 : 0,
      borderColor: border,
      borderRadius: 999,
      overflow: 'hidden' as const,
    },
    style,
  ];
  return (
    <View style={[styles.skewWrap, fill && styles.skewFill]}>
      <View style={face as StyleProp<ViewStyle>}>
        <View>{children}</View>
        {overlay}
      </View>
    </View>
  );
}

/** Mascota: el toro que embiste. Sin copa, sin corona y sin estrellas. */
export function Toro({ size = 36 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox={toroViewBox}>
      <G transform={toroTransform}>
        {toroPaths.map((path, index) => (
          <Path key={index} d={path.d} fill={path.fill} fillOpacity={path.opacity ?? 1} />
        ))}
      </G>
    </Svg>
  );
}

/** Ícono de cuadro de torneo (llaves), en lugar de una copa. */
export function BracketIcon({ size = 22, color = colors.text }: { size?: number; color?: string }) {
  const stroke = useResolvedColor(color);
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M3 4h5v6H3M3 14h5v6H3M8 7h4v10H8M12 12h9" stroke={stroke} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
    </Svg>
  );
}

export type { FeatureIconName } from './feature-icons-data';
export type BrandIconName = keyof typeof Ionicons.glyphMap | 'bracket' | FeatureIconName;

const isFeature = (name: string): name is FeatureIconName => name in featureIcons;

/**
 * Íconos propios de Campeones (siluetas de la landing). `color` en hex: los fills de SVG
 * no leen variables CSS en todos los navegadores. Por defecto blancos, como en la landing.
 */
export function FeatureIcon({ name, size = 24, color = '#FFFFFF' }: { name: FeatureIconName; size?: number; color?: string }) {
  const icon = featureIcons[name];
  const fill = useResolvedColor(color);
  const paths = icon.paths.map((d, i) => <Path key={i} d={d} fill={fill} />);
  return (
    <Svg width={size} height={size} viewBox={icon.viewBox}>
      {icon.transform ? <G transform={icon.transform}>{paths}</G> : paths}
    </Svg>
  );
}

/** Insignia morada con el ícono blanco: igual en modo claro y oscuro (como las tarjetas de la landing). */
export function FeatureBadge({ name, size = 44, tone = 'purple' }: { name: FeatureIconName; size?: number; tone?: 'purple' | 'lilac' }) {
  return (
    <View
      style={[
        styles.badge,
        { width: size, height: size, borderRadius: Math.round(size * 0.3), backgroundColor: tone === 'lilac' ? hex.blue : '#4A0A55' },
        Platform.OS === 'web' ? ({ backgroundImage: tone === 'lilac' ? 'linear-gradient(150deg,#A855FF,#6A1FD0)' : 'linear-gradient(150deg,#5A1A6E,#37003C)' } as object) : null,
      ]}
    >
      <FeatureIcon name={name} size={Math.round(size * 0.72)} />
    </View>
  );
}

export function BrandIcon({ name, size = 22, color = colors.text }: { name: BrandIconName; size?: number; color?: string }) {
  if (name === 'bracket') return <BracketIcon size={size} color={color} />;
  if (isFeature(name)) return <FeatureIcon name={name} size={Math.round(size * 1.2)} color={color} />;
  return <Ionicons name={name as keyof typeof Ionicons.glyphMap} size={size} color={color} />;
}

export function Wordmark({ size = 22 }: { size?: number }) {
  const [lead, ...rest] = branding.name.split(' ');
  const tail = rest.join(' ');
  const fc = Math.max(10, Math.round(size * 0.36));
  return (
    <View style={styles.wordmark}>
      <Toro size={Math.round(size * 2)} />
      <View style={styles.lockup}>
        <T variant="display" numberOfLines={1} style={{ fontSize: size, color: colors.text, fontStyle: 'normal', lineHeight: size * 1.05 }}>
          {lead}
        </T>
        {tail ? (
          <T
            numberOfLines={1}
            style={{
              fontFamily: font.bold,
              fontSize: fc,
              lineHeight: fc + 2,
              color: colors.accentText,
              fontStyle: 'normal',
              letterSpacing: 0.9,
              marginLeft: space.xs,
              marginBottom: space.xxs,
              textTransform: 'uppercase',
            }}
          >
            {tail}
          </T>
        ) : null}
      </View>
    </View>
  );
}

export function Affiliation() {
  return (
    <T variant="tiny" color={colors.faint} style={styles.affiliation}>
      {branding.disclaimer}
    </T>
  );
}

export function SectionHead({
  title,
  action,
  onAction,
}: {
  title: string;
  action?: string;
  onAction?: () => void;
}) {
  return (
    <View style={styles.head}>
      <T variant="title" style={{ fontSize: 20 }}>
        {title}
      </T>
      <View style={styles.headLine} />
      {action ? (
        <Pressable onPress={onAction} hitSlop={8}>
          <T variant="label" color={colors.accentText} style={{ fontSize: 12 }}>
            {action}
          </T>
        </Pressable>
      ) : null}
    </View>
  );
}

export function InitialsMark({
  name,
  avatarKey,
  size = 44,
  fontSize,
  photoUrl,
}: {
  name: string;
  avatarKey: string;
  size?: number;
  fontSize?: number;
  photoUrl?: string | null;
}) {
  const avatar = avatarByKey(avatarKey);
  const letters = name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase();
  return (
    <View
      style={[
        styles.mark,
        {
          width: size,
          height: size,
          backgroundColor: avatar.background,
        },
        Platform.OS === 'web' ? styles.markClip : { transform: [{ skewX: '0deg' }] },
        Platform.OS === 'web'
          ? ({
              backgroundImage: `linear-gradient(160deg, ${avatar.background}, ${avatar.wash})`,
            } as object)
          : null,
      ]}
    >
      <T
        variant="display"
        style={{
          fontSize: fontSize ?? Math.round(size * 0.38),
          color: avatar.foreground,
          transform: Platform.OS === 'web' ? undefined : [{ skewX: '0deg' }],
        }}
      >
        {letters || '·'}
      </T>
      <PhotoLayer uri={photoUrl} counterSkew={Platform.OS === 'web' ? undefined : '10deg'} />
    </View>
  );
}

function ScoreFigure({ score }: { score: string }) {
  const style = { fontSize: 26, color: colors.ink, fontStyle: 'normal' as const };
  const parts = score.split('–');
  if (parts.length === 2 && parts.every((part) => /^\d+$/.test(part.trim()))) {
    return (
      <View style={styles.scoreFigure}>
        <CountRoll value={Number(parts[0])} format={(n) => String(Math.round(n))}>
          {(shown) => (
            <T variant="display" style={style}>
              {shown}
            </T>
          )}
        </CountRoll>
        <T variant="display" style={style}>
          –
        </T>
        <CountRoll value={Number(parts[1])} format={(n) => String(Math.round(n))}>
          {(shown) => (
            <T variant="display" style={style}>
              {shown}
            </T>
          )}
        </CountRoll>
      </View>
    );
  }
  return (
    <T variant="display" style={style}>
      {score}
    </T>
  );
}

export function ScoreBar({
  leftTag,
  rightTag,
  score,
  action,
  actionTone = 'yellow',
  onAction,
  onPress,
  note,
  leftPhoto,
  rightPhoto,
}: {
  leftTag: string;
  rightTag: string;
  leftPhoto?: string | null;
  rightPhoto?: string | null;
  score: string;
  action?: string;
  actionTone?: 'yellow' | 'ghost';
  onAction?: () => void;
  onPress?: () => void;
  note?: string;
}) {
  return (
    <View style={styles.scoreWrap}>
      <SportPress onPress={onPress} disabled={!onPress} style={styles.scoreRow}>
        <View style={[styles.scoreSide, { backgroundColor: colors.red }]}>
          <PhotoLayer uri={leftPhoto} counterSkew="8deg" />
          {leftPhoto ? <View style={styles.scoreShade} /> : null}
          <T variant="display" style={[styles.scoreTag, { color: leftPhoto ? '#fff' : colors.redInk }, leftPhoto ? styles.scoreTagOnPhoto : null]}>
            {leftTag}
          </T>
        </View>
        <View style={styles.scoreMid}>
          <ScoreFigure score={score} />
        </View>
        <View style={[styles.scoreSide, { backgroundColor: colors.blue }]}>
          <PhotoLayer uri={rightPhoto} counterSkew="8deg" />
          {rightPhoto ? <View style={styles.scoreShade} /> : null}
          <T variant="display" style={[styles.scoreTag, rightPhoto ? styles.scoreTagOnPhoto : null]}>
            {rightTag}
          </T>
        </View>
        {action ? (
          <Pressable onPress={onAction ?? onPress} style={styles.scoreActionHit}>
            {actionTone === 'yellow' ? (
              <SkewBlock color={colors.yellow} shadow={colors.red} padH={10} padV={8} angle="-8deg">
                <T variant="title" style={{ fontSize: 14, color: colors.ink }}>
                  {action}
                </T>
              </SkewBlock>
            ) : (
              <View style={styles.ghostAction}>
                <T variant="label" color={colors.muted} style={{ fontSize: 12 }}>
                  {action}
                </T>
              </View>
            )}
          </Pressable>
        ) : null}
      </SportPress>
      {note ? (
        <View style={styles.note}>
          <T variant="tiny" color={colors.text} style={{ letterSpacing: 0.4 }}>
            {note}
          </T>
        </View>
      ) : null}
    </View>
  );
}

export function QuickTile({
  kicker,
  title,
  color,
  icon,
  ink = '#fff',
  onPress,
}: {
  kicker: string;
  title: string;
  color: string;
  icon: BrandIconName;
  ink?: string;
  onPress: () => void;
}) {
  return (
    <SportPress onPress={onPress} style={[styles.tile, { backgroundColor: color }]}>
      <View style={styles.tileTop}>
        <T variant="label" color={ink} style={{ fontSize: 12, opacity: 0.85 }}>
          {kicker}
        </T>
        <BrandIcon name={icon} size={22} color={ink} />
      </View>
      <T variant="display" style={{ fontSize: 26, color: ink, fontStyle: 'normal' }} numberOfLines={1} adjustsFontSizeToFit>
        {title}
      </T>
    </SportPress>
  );
}

export function StatCell({ value, label, accent = false }: { value: string; label: string; accent?: boolean }) {
  return (
    <View style={styles.stat}>
      <CountUp value={value}>
        {(shown) => (
          <T variant="display" style={{ fontSize: 28, color: accent ? colors.accentText : colors.text, fontStyle: 'normal' }}>
            {shown}
          </T>
        )}
      </CountUp>
      <T variant="tiny" color={colors.accentText} style={{ fontSize: 10 }}>
        {label}
      </T>
    </View>
  );
}

export function CompareRow({
  left,
  right,
  label,
  leftFlex,
  rightFlex,
}: {
  left: string;
  right: string;
  label: string;
  leftFlex: number;
  rightFlex: number;
}) {
  const leftW = Math.max(leftFlex, 0.08);
  const rightW = Math.max(rightFlex, 0.08);
  return (
    <View style={styles.compare}>
      <T variant="display" style={styles.compareNum}>
        {left}
      </T>
      <View style={styles.compareTrack}>
        <View style={styles.compareBars}>
          <GrowX style={[styles.compareLeft, { flex: leftW }]} />
          <View style={{ width: 6 }} />
          <GrowX style={[styles.compareRight, { flex: rightW }]} />
        </View>
        <T variant="tiny" color={colors.muted} style={styles.compareLabel}>
          {label}
        </T>
      </View>
      <T variant="display" style={[styles.compareNum, { textAlign: 'right' }]}>
        {right}
      </T>
    </View>
  );
}

export function EloChart({
  you,
  them,
  youName,
  themName,
}: {
  you: number[];
  them: number[];
  youName: string;
  themName: string;
}) {
  const red = useResolvedColor(colors.red);
  const blue = useResolvedColor(colors.blue);
  const width = 340;
  const height = 150;
  const all = [...you, ...them];
  if (all.length === 0) return null;
  const min = Math.min(...all);
  const max = Math.max(...all);
  const span = max - min || 1;
  const xOf = (index: number, count: number) => (count <= 1 ? width / 2 : (index / (count - 1)) * (width - 8) + 4);
  const yOf = (value: number) => height - 18 - ((value - min) / span) * (height - 36);
  const line = (values: number[]) =>
    values.map((value, index) => `${index === 0 ? 'M' : 'L'}${xOf(index, values.length).toFixed(1)} ${yOf(value).toFixed(1)}`).join(' ');
  const area = (values: number[]) => {
    if (values.length === 0) return '';
    const start = `M${xOf(0, values.length).toFixed(1)} ${height}`;
    const body = values
      .map((value, index) => `L${xOf(index, values.length).toFixed(1)} ${yOf(value).toFixed(1)}`)
      .join(' ');
    return `${start} ${body} L${xOf(values.length - 1, values.length).toFixed(1)} ${height} Z`;
  };
  const lastYou = you.at(-1);
  const lastThem = them.at(-1);
  return (
    <View>
      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View style={[styles.dot, { backgroundColor: colors.red }]} />
          <T variant="tiny" color={colors.muted}>
            {youName}
          </T>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.dot, { backgroundColor: colors.blue }]} />
          <T variant="tiny" color={colors.muted}>
            {themName}
          </T>
        </View>
      </View>
      <Svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`}>
        <Defs>
          <LinearGradient id="youFill" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={red} stopOpacity="0.45" />
            <Stop offset="1" stopColor={red} stopOpacity="0" />
          </LinearGradient>
        </Defs>
        <Path d={area(you)} fill="url(#youFill)" />
        <Path d={line(them)} stroke={blue} strokeWidth={3} fill="none" />
        <Path d={line(you)} stroke={red} strokeWidth={3} fill="none" />
        {lastYou != null ? <Circle cx={xOf(you.length - 1, you.length)} cy={yOf(lastYou)} r={5} fill={red} /> : null}
        {lastThem != null ? (
          <Circle cx={xOf(them.length - 1, them.length)} cy={yOf(lastThem)} r={5} fill={blue} />
        ) : null}
      </Svg>
    </View>
  );
}

export function Sticker({
  title,
  detail,
  icon,
  color,
  earned,
  tilt = '-4deg',
}: {
  title: string;
  detail: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  earned: boolean;
  tilt?: string;
}) {
  const ink = color === colors.blue ? colors.blueInk : colors.ink;
  return (
    <View style={[styles.sticker, { backgroundColor: earned ? color : 'transparent', transform: [{ rotate: tilt }] }, !earned && styles.stickerLocked]}>
      <Ionicons name={earned ? icon : 'lock-closed'} size={22} color={earned ? ink : colors.faint} />
      <T variant="title" style={{ fontSize: 13, color: earned ? ink : colors.muted, textAlign: 'center' }}>
        {title}
      </T>
      <T variant="tiny" color={earned ? ink : colors.faint} style={{ textAlign: 'center', fontSize: 10 }}>
        {detail}
      </T>
    </View>
  );
}

// Logo de grupo o torneo: sin caja, borde ni fondo. Orden: foto subida (recortada en el escudo, cover) →
// escudo/trofeo elegido del set v5 → escudo/trofeo por defecto (determinista por id). Sin kind/id: iniciales.
// Bajo 56 px usa la variante small del set (se lee mejor a 32–48 px).
export function Shield({
  letters,
  photoUrl,
  size = 52,
  kind,
  id,
  logo,
}: {
  letters: string;
  photoUrl?: string | null;
  size?: number;
  kind?: LogoKind;
  id?: string;
  logo?: string | null;
}) {
  const photo = kind ? entityPhoto(photoUrl) : photoUrl ?? null;
  const art = kind && id ? resolveLogo(kind, id, logo) : null;
  return (
    <View style={[styles.shield, { width: size, height: size }]}>
      {photo ? (
        <Image
          source={{ uri: photo }}
          recyclingKey={photo}
          style={[StyleSheet.absoluteFill, kind ? { borderRadius: size * 0.22 } : null]}
          contentFit={kind ? 'cover' : 'contain'}
          cachePolicy="memory-disk"
          transition={180}
          accessible={false}
        />
      ) : art ? (
        <Image source={logoSource(art, size)} style={StyleSheet.absoluteFill} contentFit="contain" accessible={false} />
      ) : (
        <T variant="display" style={{ fontSize: Math.round(size * 0.42), color: colors.accentText }}>
          {letters}
        </T>
      )}
    </View>
  );
}

const stripe =
  'repeating-linear-gradient(-62deg, transparent 0 46px, rgba(255,255,255,0.022) 46px 48px, transparent 48px 90px, rgba(255,255,255,0.035) 90px 130px)';

const styles = StyleSheet.create({
  wash: {
    backgroundColor: colors.bg,
    ...(Platform.OS === 'web'
      ? ({
          backgroundImage: 'var(--bg-wash)',
        } as object)
      : null),
  },
  stripes: { backgroundImage: 'none' } as object,
  wordmark: { flexDirection: 'row', alignItems: 'center', gap: space.sm, flexShrink: 1 },
  lockup: { flexDirection: 'row', alignItems: 'flex-end', flexShrink: 1 },
  affiliation: { textTransform: 'none', letterSpacing: 0, textAlign: 'center' },
  skewWrap: { position: 'relative', alignSelf: 'flex-start' },
  skewFill: { alignSelf: 'stretch' },
  skewFace: { zIndex: 1, position: 'relative' },
  skewShadow: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, zIndex: 0 },
  // Aire extra arriba de cada título: sección a sección = layout.section; título a contenido = layout.title.
  head: { flexDirection: 'row', alignItems: 'center', gap: space.sm, marginTop: layout.section - layout.stack },
  headLine: { flex: 1, height: 1, backgroundColor: colors.line },
  mark: { alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  markClip: { borderRadius: 999, overflow: 'hidden' } as object,
  scoreWrap: { gap: 0, borderRadius: 16, overflow: 'hidden' },
  scoreShade: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(8,11,19,0.35)' },
  scoreTagOnPhoto: { textShadowColor: 'rgba(0,0,0,0.85)', textShadowRadius: 6, textShadowOffset: { width: 0, height: 1 } },
  scoreRow: { flexDirection: 'row', alignItems: 'stretch', minHeight: 62, gap: 0, borderRadius: 16, overflow: 'hidden' },
  scoreSide: {
    width: 64,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    transform: [{ skewX: '0deg' }],
  },
  scoreTag: { fontSize: 18, color: '#fff', transform: [{ skewX: '0deg' }] },
  scoreMid: { flex: 1, backgroundColor: colors.paper, alignItems: 'center', justifyContent: 'center' },
  scoreFigure: { flexDirection: 'row', alignItems: 'center', gap: space.xxs },
  scoreActionHit: { justifyContent: 'center', paddingHorizontal: 8, backgroundColor: colors.card },
  ghostAction: {
    borderWidth: 1.5,
    borderColor: colors.lineStrong,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 999,
  },
  note: { backgroundColor: colors.bgDeep, paddingHorizontal: 10, paddingVertical: 6, marginTop: 0 },
  tile: { width: '48%', flexGrow: 1, minHeight: 96, padding: 14, justifyContent: 'space-between', borderRadius: 16, overflow: 'hidden', borderWidth: 1, borderColor: colors.line },
  tileTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  stat: {
    width: '31%',
    flexGrow: 1,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.line,
    paddingVertical: 12,
    paddingHorizontal: 10,
    gap: space.xxs,
    borderRadius: 16,
  },
  compare: { flexDirection: 'row', alignItems: 'center', gap: space.sm, marginBottom: space.sm },
  compareNum: { width: 54, fontSize: 22, color: colors.text, fontStyle: 'normal' },
  compareTrack: { flex: 1, gap: space.xs },
  compareBars: { flexDirection: 'row', height: 10, alignItems: 'center' },
  compareLeft: { height: 10, backgroundColor: colors.red, borderRadius: 999 },
  compareRight: { height: 10, backgroundColor: colors.blue, borderRadius: 999 },
  compareLabel: { textAlign: 'center' },
  legend: { flexDirection: 'row', justifyContent: 'flex-end', gap: space.md, marginBottom: space.xs },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  dot: { width: 8, height: 8, borderRadius: 999 },
  sticker: {
    width: '47%',
    minHeight: 118,
    padding: 10,
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.xs,
    borderRadius: 16,
  },
  stickerLocked: { borderWidth: 1.5, borderStyle: 'dashed', borderColor: colors.lineStrong },
  shield: { alignItems: 'center', justifyContent: 'center' },
  badge: { alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
});
