import { Ionicons } from '@expo/vector-icons';
import { Link, type Href } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';
import Svg, { Circle, Path, Rect } from 'react-native-svg';
import { branding } from '../../config/branding';
import { Toro } from './broadcast';
import { matchDelta } from '../domain/elo';
import type { Match } from '../domain/types';
import type { Profile } from '../data/types';
import { colors, font, space } from './theme';
import { elo, firstName, formatWhen, scoreText, signed, statusLabel, statusTone, streakLabel, tagOf } from './format';
import type { SideRecord } from '../domain/stats';
import { Avatar } from './avatar';
import { T } from './text';

const toneColor = {
  accent: colors.yellow,
  warn: colors.yellow,
  danger: colors.danger,
  draw: colors.draw,
  muted: colors.faint,
  gold: colors.yellow,
  up: colors.up,
};

export function Mark({ size = 42 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 64 64">
      <Rect x="2" y="2" width="60" height="60" fill={colors.ink} />
      <Path d="M6 10 H34 L28 54 H0 Z" fill={colors.red} />
      <Path d="M30 16 H58 L52 48 H24 Z" fill={colors.yellow} />
      <Circle cx="46" cy="30" r="5" fill={colors.ink} />
    </Svg>
  );
}

export function Wordmark() {
  return (
    <View style={styles.word}>
      <Toro size={40} />
      <View>
        <View style={styles.lockup}>
          <T variant="title" style={{ fontStyle: 'italic' }}>
            {branding.name.split(' ')[0]}
          </T>
          <T style={{ fontFamily: font.body, fontSize: 11, color: colors.yellow, marginLeft: 4, marginBottom: 3, letterSpacing: 0.4 }}>
            {branding.name.split(' ').slice(1).join(' ')}
          </T>
        </View>
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
    <View style={[styles.pill, { backgroundColor: color }]}>
      <T variant="tiny" color={tone === 'warn' || tone === 'gold' || tone === 'accent' ? colors.ink : '#fff'}>
        {label}
      </T>
    </View>
  );
}

export function Stat({ value, label }: { value: string; label: string }) {
  return (
    <View style={styles.stat}>
      <T variant="title" style={{ fontStyle: 'italic' }}>
        {value}
      </T>
      <T variant="tiny" color={colors.yellow}>
        {label}
      </T>
    </View>
  );
}

export function Spark({ values, color = colors.red }: { values: number[]; color?: string }) {
  const max = Math.max(...values, 1);
  const min = Math.min(...values, 0);
  const span = max - min || 1;
  return (
    <View style={styles.spark}>
      {values.map((value, index) => (
        <View
          key={`${index}-${value}`}
          style={{
            flex: 1,
            height: Math.max(8, ((value - min) / span) * 72 + 8),
            backgroundColor: color,
            opacity: 0.45 + (index / Math.max(values.length - 1, 1)) * 0.55,
            transform: [{ skewX: '-8deg' }],
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
  const meName = people[me]?.displayName ?? 'Tú';
  const mine = match.playerAId === me ? match.goalsA : match.goalsB;
  const theirs = match.playerAId === me ? match.goalsB : match.goalsA;
  const score = match.status === 'confirmed' ? scoreText(mine, theirs) : null;
  let result = statusLabel[match.status];
  if (match.status === 'confirmed') {
    if (match.isDraw) result = 'Empate';
    else result = match.winnerId === me ? 'Ganaste' : 'Perdiste';
  }
  const delta = matchDelta(match, me);
  return (
    <Link href={`/partido/${match.id}` as Href} asChild>
      <Pressable style={styles.match}>
        <View style={[styles.side, { backgroundColor: colors.red }]}>
          <T variant="display" style={styles.sideText}>
            {tagOf(meName)}
          </T>
        </View>
        <View style={styles.mid}>
          <T variant="strong" numberOfLines={1}>
            {firstName(opponent?.displayName ?? 'Rival')}
          </T>
          <T variant="tiny" color={colors.muted}>
            {result}
            {delta != null ? (
              <T variant="tiny" color={delta > 0 ? colors.win : delta < 0 ? colors.loss : colors.draw}>
                {` · ${signed(delta)} Elo`}
              </T>
            ) : null}
            {` · ${formatWhen(match.confirmedAt ?? match.createdAt)}`}
          </T>
        </View>
        <View style={styles.end}>
          {score ? (
            <T variant="title" style={{ fontStyle: 'italic' }}>
              {score}
            </T>
          ) : (
            <Pill label={statusLabel[match.status]} tone={statusTone(match.status)} />
          )}
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
      <Avatar avatarKey={profile.avatarKey} name={profile.displayName} />
      <View style={styles.flex}>
        <T variant="strong">{profile.displayName}</T>
        <T variant="tiny" color={colors.muted} style={{ textTransform: 'none', letterSpacing: 0 }}>
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
      <T variant="tiny" color={colors.ink}>
        ELO
      </T>
      <T variant="title" color={colors.ink} style={{ fontStyle: 'italic' }}>
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
  lockup: { flexDirection: 'row', alignItems: 'flex-end' },
  pill: { paddingHorizontal: 8, paddingVertical: 3, alignSelf: 'flex-start' },
  stat: { flex: 1, gap: 2 },
  spark: { height: 80, flexDirection: 'row', alignItems: 'flex-end', gap: 5 },
  match: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    minHeight: 58,
    backgroundColor: 'rgba(19,26,42,0.55)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  side: { width: 54, alignSelf: 'stretch', alignItems: 'center', justifyContent: 'center' },
  sideText: { fontSize: 14, color: colors.redInk },
  mid: { flex: 1, gap: 2, paddingVertical: 8 },
  flex: { flex: 1 },
  end: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingRight: 8 },
  record: { flexDirection: 'row', gap: space.sm },
  elo: { backgroundColor: colors.yellow, paddingHorizontal: 10, paddingVertical: 6, alignItems: 'flex-end' },
});
