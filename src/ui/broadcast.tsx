import { Ionicons } from '@expo/vector-icons';
import type { ReactNode } from 'react';
import { Platform, Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Svg, { Circle, Defs, LinearGradient, Path, Polygon, Stop } from 'react-native-svg';
import { avatarByKey, branding } from '../../config/branding';
import { colors, font } from './theme';
import { T } from './text';

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

export function SkewBlock({
  children,
  color,
  shadow,
  border,
  padH = 12,
  padV = 6,
  angle = '-10deg',
  fill = false,
  style,
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
}) {
  const face = [
    styles.skewFace,
    {
      backgroundColor: color,
      paddingHorizontal: padH,
      paddingVertical: padV,
      borderWidth: border ? 1.5 : 0,
      borderColor: border,
      transform: [{ skewX: angle }],
    },
    style,
  ];
  return (
    <View style={[styles.skewWrap, fill && styles.skewFill]}>
      {shadow ? (
        <View
          pointerEvents="none"
          style={[
            styles.skewShadow,
            {
              backgroundColor: shadow,
              transform: [{ skewX: angle }, { translateX: 4 }, { translateY: 4 }],
            },
          ]}
        />
      ) : null}
      <View style={face as StyleProp<ViewStyle>}>
        <View style={{ transform: [{ skewX: angle.startsWith('-') ? angle.slice(1) : `-${angle}` }] }}>{children}</View>
      </View>
    </View>
  );
}

export function Wordmark({ size = 26 }: { size?: number }) {
  return (
    <SkewBlock color={colors.red} shadow={colors.yellow} padH={10} padV={3} angle="-12deg">
      <T variant="display" style={{ fontSize: size, color: '#fff', fontStyle: 'italic' }}>
        {branding.name}
      </T>
    </SkewBlock>
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
      <SkewBlock color="#fff" padH={10} padV={4} angle="-10deg">
        <T variant="title" style={{ fontSize: 16, color: colors.ink, fontStyle: 'normal' }}>
          {title}
        </T>
      </SkewBlock>
      <View style={styles.headLine} />
      {action ? (
        <Pressable onPress={onAction} hitSlop={8}>
          <T variant="label" color={colors.yellow} style={{ fontSize: 12 }}>
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
}: {
  name: string;
  avatarKey: string;
  size?: number;
  fontSize?: number;
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
        Platform.OS === 'web' ? styles.markClip : { transform: [{ skewX: '-10deg' }] },
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
          color: '#fff',
          transform: Platform.OS === 'web' ? undefined : [{ skewX: '10deg' }],
        }}
      >
        {letters || '·'}
      </T>
    </View>
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
}: {
  leftTag: string;
  rightTag: string;
  score: string;
  action?: string;
  actionTone?: 'yellow' | 'ghost';
  onAction?: () => void;
  onPress?: () => void;
  note?: string;
}) {
  return (
    <View style={styles.scoreWrap}>
      <Pressable onPress={onPress} disabled={!onPress} style={styles.scoreRow}>
        <View style={[styles.scoreSide, { backgroundColor: colors.red }]}>
          <T variant="display" style={styles.scoreTag}>
            {leftTag}
          </T>
        </View>
        <View style={styles.scoreMid}>
          <T variant="display" style={{ fontSize: 26, color: colors.ink, fontStyle: 'italic' }}>
            {score}
          </T>
        </View>
        <View style={[styles.scoreSide, { backgroundColor: colors.blue }]}>
          <T variant="display" style={styles.scoreTag}>
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
      </Pressable>
      {note ? (
        <View style={styles.note}>
          <T variant="tiny" color="#fff" style={{ letterSpacing: 0.4 }}>
            {note}
          </T>
        </View>
      ) : null}
    </View>
  );
}

export function Ticker({ text }: { text: string }) {
  return (
    <View style={styles.ticker}>
      <SkewBlock color={colors.yellow} padH={8} padV={3} angle="-10deg">
        <T variant="label" color={colors.ink} style={{ fontSize: 11 }}>
          Última hora
        </T>
      </SkewBlock>
      <View style={styles.tickerTrack}>
        <T variant="label" numberOfLines={1} style={styles.tickerText}>
          {text}
        </T>
      </View>
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
  icon: keyof typeof Ionicons.glyphMap;
  ink?: string;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={[styles.tile, { backgroundColor: color }]}>
      <View style={styles.tileTop}>
        <T variant="label" color={ink} style={{ fontSize: 12, opacity: 0.85 }}>
          {kicker}
        </T>
        <Ionicons name={icon} size={22} color={ink} />
      </View>
      <T variant="display" style={{ fontSize: 26, color: ink, fontStyle: 'italic' }}>
        {title}
      </T>
    </Pressable>
  );
}

export function StatCell({ value, label, accent = false }: { value: string; label: string; accent?: boolean }) {
  return (
    <View style={styles.stat}>
      <T variant="display" style={{ fontSize: 28, color: accent ? colors.yellow : '#fff', fontStyle: 'italic' }}>
        {value}
      </T>
      <T variant="tiny" color={colors.yellow} style={{ fontSize: 10 }}>
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
          <View style={[styles.compareLeft, { flex: leftW }]} />
          <View style={{ width: 6 }} />
          <View style={[styles.compareRight, { flex: rightW }]} />
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
            <Stop offset="0" stopColor={colors.red} stopOpacity="0.45" />
            <Stop offset="1" stopColor={colors.red} stopOpacity="0" />
          </LinearGradient>
        </Defs>
        <Path d={area(you)} fill="url(#youFill)" />
        <Path d={line(them)} stroke={colors.blue} strokeWidth={3} fill="none" />
        <Path d={line(you)} stroke={colors.red} strokeWidth={3} fill="none" />
        {lastYou != null ? <Circle cx={xOf(you.length - 1, you.length)} cy={yOf(lastYou)} r={5} fill={colors.red} /> : null}
        {lastThem != null ? (
          <Circle cx={xOf(them.length - 1, them.length)} cy={yOf(lastThem)} r={5} fill={colors.blue} />
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
  return (
    <View style={[styles.sticker, { backgroundColor: earned ? color : 'transparent', transform: [{ rotate: tilt }] }, !earned && styles.stickerLocked]}>
      <Ionicons name={earned ? icon : 'lock-closed'} size={22} color={earned ? colors.ink : colors.faint} />
      <T variant="title" style={{ fontSize: 13, color: earned ? colors.ink : colors.muted, textAlign: 'center' }}>
        {title}
      </T>
      <T variant="tiny" color={earned ? colors.ink : colors.faint} style={{ textAlign: 'center', fontSize: 10 }}>
        {detail}
      </T>
    </View>
  );
}

export function Cup({ size = 86 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 86 86">
      <Polygon points="8,70 78,70 70,82 16,82" fill={colors.yellow} />
      <Path
        d="M22 16 h42 v22 c0 16 -8 26 -21 28 c-13 -2 -21 -12 -21 -28 z"
        fill={colors.yellow}
      />
      <Path d="M22 22 h-10 c0 14 6 20 12 22" stroke={colors.yellow} strokeWidth="4" fill="none" />
      <Path d="M64 22 h10 c0 14 -6 20 -12 22" stroke={colors.yellow} strokeWidth="4" fill="none" />
      <Polygon points="43,28 46,36 54,36 48,41 50,49 43,44 36,49 38,41 32,36 40,36" fill={colors.red} />
    </Svg>
  );
}

export function Shield({ letters }: { letters: string }) {
  return (
    <View style={styles.shield}>
      <T variant="display" style={{ fontSize: 16, color: '#fff' }}>
        {letters}
      </T>
    </View>
  );
}

const stripe =
  'repeating-linear-gradient(-62deg, transparent 0 46px, rgba(255,255,255,0.025) 46px 48px, transparent 48px 90px, rgba(255,255,255,0.04) 90px 130px)';

const styles = StyleSheet.create({
  wash: {
    backgroundColor: colors.bg,
    ...(Platform.OS === 'web'
      ? ({
          backgroundImage:
            'radial-gradient(60% 40% at 0% 0%, rgba(255,43,74,.35), transparent 70%), radial-gradient(60% 40% at 100% 20%, rgba(47,107,255,.35), transparent 70%), radial-gradient(80% 50% at 50% 100%, rgba(47,107,255,.18), transparent 70%), linear-gradient(180deg, #0a0e2c, #05071a 60%, #070b26)',
        } as object)
      : null),
  },
  stripes: { backgroundImage: stripe } as object,
  skewWrap: { position: 'relative', alignSelf: 'flex-start' },
  skewFill: { alignSelf: 'stretch' },
  skewFace: { zIndex: 1, position: 'relative' },
  skewShadow: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, zIndex: 0 },
  head: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6 },
  headLine: { flex: 1, height: 2, backgroundColor: 'rgba(255,255,255,0.28)' },
  mark: { alignItems: 'center', justifyContent: 'center' },
  markClip: { clipPath: 'polygon(14% 0, 100% 0, 86% 100%, 0 100%)' } as object,
  scoreWrap: { gap: 0 },
  scoreRow: { flexDirection: 'row', alignItems: 'stretch', minHeight: 58, gap: 0 },
  scoreSide: {
    width: 64,
    alignItems: 'center',
    justifyContent: 'center',
    transform: [{ skewX: '-8deg' }],
  },
  scoreTag: { fontSize: 18, color: '#fff', transform: [{ skewX: '8deg' }] },
  scoreMid: { flex: 1, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  scoreActionHit: { justifyContent: 'center', marginLeft: 6 },
  ghostAction: {
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.35)',
    paddingHorizontal: 10,
    paddingVertical: 10,
    transform: [{ skewX: '-8deg' }],
  },
  note: { backgroundColor: '#07080f', paddingHorizontal: 10, paddingVertical: 6, marginTop: 0 },
  ticker: {
    height: 40,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#05060f',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.08)',
    overflow: 'hidden',
    paddingRight: 8,
  },
  tickerTrack: { flex: 1, overflow: 'hidden' },
  tickerText: { color: colors.yellow, fontSize: 13, fontFamily: font.label },
  tile: { width: '48%', flexGrow: 1, minHeight: 92, padding: 12, justifyContent: 'space-between' },
  tileTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  stat: {
    width: '31%',
    flexGrow: 1,
    backgroundColor: 'rgba(8,12,36,0.72)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    paddingVertical: 10,
    paddingHorizontal: 8,
    gap: 2,
  },
  compare: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  compareNum: { width: 54, fontSize: 22, color: '#fff', fontStyle: 'italic' },
  compareTrack: { flex: 1, gap: 4 },
  compareBars: { flexDirection: 'row', height: 10, alignItems: 'center' },
  compareLeft: { height: 10, backgroundColor: colors.red, transform: [{ skewX: '-18deg' }] },
  compareRight: { height: 10, backgroundColor: colors.blue, transform: [{ skewX: '-18deg' }] },
  compareLabel: { textAlign: 'center' },
  legend: { flexDirection: 'row', justifyContent: 'flex-end', gap: 12, marginBottom: 4 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dot: { width: 8, height: 8 },
  sticker: {
    width: '47%',
    minHeight: 118,
    padding: 10,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  stickerLocked: { borderWidth: 1.5, borderStyle: 'dashed', borderColor: 'rgba(255,255,255,0.28)' },
  shield: {
    width: 52,
    height: 58,
    backgroundColor: colors.blue,
    borderWidth: 2,
    borderColor: colors.yellow,
    alignItems: 'center',
    justifyContent: 'center',
    transform: [{ skewX: '-8deg' }],
  },
});
