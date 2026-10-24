import { Ionicons } from '@expo/vector-icons';
import { Link, type Href } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';
import Svg, { Circle, Path, Rect } from 'react-native-svg';
import { branding } from '../../config/branding';
import type { Match } from '../domain/types';
import type { Profile } from '../data/types';
import { colors, radius, space } from './theme';
import { elo, firstName, formatWhen, scoreText, statusLabel, statusTone, streakLabel } from './format';
import type { SideRecord } from '../domain/stats';
import { Avatar } from './avatar';
import { T } from './text';

const toneColor = {
  accent: colors.accent,
  warn: colors.warn,
  danger: colors.danger,
  draw: colors.draw,
  muted: colors.faint,
  gold: colors.gold,
};

export function Mark({ size = 42 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 64 64">
      <Rect x="2" y="2" width="60" height="60" rx="16" fill={colors.bgElevated} stroke={colors.accent} strokeWidth="2.5" />
      <Path
        d="M18 46 V18 H33.5 C42 18 47 22.5 47 29.2 C47 35.8 42 40.2 33.5 40.2 H26"
        stroke={colors.accent}
        strokeWidth="5"
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Circle cx="46" cy="47" r="4" fill={colors.gold} />
    </Svg>
  );
}

export function Wordmark() {
  return (
    <View style={styles.word}>
      <Mark size={36} />
      <View>
        <T variant="title">{branding.name}</T>
        <T variant="tiny" color={colors.faint}>
          {branding.company} · {branding.country}
        </T>
      </View>
    </View>
  );
}

export function Pill({ label, tone = 'muted' }: { label: string; tone?: keyof typeof toneColor }) {
  const color = toneColor[tone];
  return (
    <View style={[styles.pill, { borderColor: color }]}>
      <T variant="tiny" color={color}>
        {label}
      </T>
    </View>
  );
}

export function Stat({ value, label }: { value: string; label: string }) {
  return (
    <View style={styles.stat}>
      <T variant="title">{value}</T>
      <T variant="tiny" color={colors.muted}>
        {label}
      </T>
    </View>
  );
}

export function Spark({ values, color = colors.accent }: { values: number[]; color?: string }) {
  const max = Math.max(...values, 1);
  return (
    <View style={styles.spark}>
      {values.map((value, index) => (
        <View
          key={`${index}-${value}`}
          style={{
            flex: 1,
            height: Math.max(6, (value / max) * 72),
            backgroundColor: color,
            borderRadius: 4,
            opacity: 0.35 + (index / Math.max(values.length - 1, 1)) * 0.65,
          }}
        />
      ))}
    </View>
  );
}

export function MatchRow({
  match,
  me,
  people,
}: {
  match: Match;
  me: string;
  people: Record<string, Profile>;
}) {
  const opponentId = match.playerAId === me ? match.playerBId : match.playerAId;
  const opponent = people[opponentId];
  const mine = match.playerAId === me ? match.goalsA : match.goalsB;
  const theirs = match.playerAId === me ? match.goalsB : match.goalsA;
  const score = match.status === 'confirmed' ? scoreText(mine, theirs) : null;
  let result = statusLabel[match.status];
  if (match.status === 'confirmed') {
    if (match.isDraw) result = 'Empate';
    else result = match.winnerId === me ? 'Ganaste' : 'Perdiste';
  }
  return (
    <Link href={`/partido/${match.id}` as Href} asChild>
    <Pressable style={styles.match}>
      <Avatar avatarKey={opponent?.avatarKey ?? 'rayo'} size={42} />
      <View style={styles.flex}>
        <T variant="strong">{opponent?.displayName ?? 'Rival'}</T>
        <T variant="tiny" color={colors.muted}>
          {result} · {formatWhen(match.confirmedAt ?? match.createdAt)}
        </T>
      </View>
      <View style={styles.end}>
        {score ? <T variant="title">{score}</T> : <Pill label={statusLabel[match.status]} tone={statusTone(match.status)} />}
        <Ionicons name="chevron-forward" size={16} color={colors.faint} />
      </View>
    </Pressable>
    </Link>
  );
}

export function RecordStrip({ record }: { record: SideRecord }) {
  return (
    <View style={styles.record}>
      <Stat value={String(record.played)} label="Partidos" />
      <Stat value={`${Math.round(record.winRate * 100)}%`} label="Victorias" />
      <Stat value={`${record.goalsFor}-${record.goalsAgainst}`} label="Goles" />
      <Stat value={record.goalDiff > 0 ? `+${record.goalDiff}` : String(record.goalDiff)} label="Diferencia" />
    </View>
  );
}

export function StreakLine({ record }: { record: SideRecord }) {
  return (
    <T color={colors.muted}>
      Racha actual: {streakLabel(record.currentStreak)}. Mejor racha: {record.bestWinStreak}{' '}
      {record.bestWinStreak === 1 ? 'victoria' : 'victorias'}.
    </T>
  );
}

export function PlayerLine({ profile, detail, onPress }: { profile: Profile; detail: string; onPress?: () => void }) {
  return (
    <Pressable style={styles.match} onPress={onPress} disabled={!onPress}>
      <Avatar avatarKey={profile.avatarKey} />
      <View style={styles.flex}>
        <T variant="strong">{profile.displayName}</T>
        <T variant="tiny" color={colors.muted}>
          @{profile.username} · {detail}
        </T>
      </View>
      {onPress ? <Ionicons name="chevron-forward" size={16} color={colors.faint} /> : null}
    </Pressable>
  );
}

export function EloBadge({ value }: { value: number }) {
  return (
    <View style={styles.elo}>
      <T variant="tiny" color={colors.accentInk}>
        ELO
      </T>
      <T variant="strong" color={colors.accentInk}>
        {elo(value)}
      </T>
    </View>
  );
}

export function names(people: Record<string, Profile>, id: string) {
  return firstName(people[id]?.displayName ?? 'Jugador');
}

const styles = StyleSheet.create({
  word: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  pill: {
    borderWidth: 1,
    borderRadius: radius.pill,
    paddingHorizontal: 8,
    paddingVertical: 3,
    alignSelf: 'flex-start',
  },
  stat: { flex: 1, gap: 2 },
  spark: { height: 72, flexDirection: 'row', alignItems: 'flex-end', gap: 4 },
  match: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    paddingVertical: space.sm,
  },
  flex: { flex: 1, gap: 2 },
  end: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  record: { flexDirection: 'row', gap: space.sm },
  elo: {
    backgroundColor: colors.accent,
    borderRadius: radius.md,
    paddingHorizontal: 12,
    paddingVertical: 8,
    alignItems: 'flex-end',
  },
});
