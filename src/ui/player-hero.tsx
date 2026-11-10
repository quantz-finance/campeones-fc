// Tu ficha (antes en el inicio, ahora arriba del perfil): partidos, Elo, puesto, racha y barra V/E/D.
import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, View } from 'react-native';
import type { SideRecord } from '../domain/stats';
import type { Profile } from '../data/types';
import { InitialsMark } from './broadcast';
import { elo, firstName, pct, streakLabel } from './format';
import { CountRoll, Pop } from './motion';
import { SportPress } from './press';
import { colors, space } from './theme';
import { T } from './text';

export function PlayerHero({
  profile,
  rating,
  record,
  place,
  onPress,
}: {
  profile: Profile;
  rating: number;
  record: SideRecord;
  place?: { rank: number; groupName: string } | null;
  onPress?: () => void;
}) {
  const win = Math.max(record.wins, 0);
  const draw = Math.max(record.draws, 0);
  const loss = Math.max(record.losses, 0);
  const total = Math.max(win + draw + loss, 1);
  const streak = record.currentStreak;
  return (
    <SportPress style={styles.hero} onPress={onPress} disabled={!onPress} accessibilityLabel={`Tu ficha: ${profile.displayName}`}>
      <View style={styles.heroLeft}>
        <CountRoll value={record.played} format={(n) => String(Math.round(n))}>
          {(shown) => (
            <T variant="display" style={styles.bigNum}>
              {shown}
            </T>
          )}
        </CountRoll>
        <T variant="label" color={colors.redInk} style={{ fontSize: 12 }}>
          Partidos
        </T>
        <View style={styles.heroMark}>
          <InitialsMark name={profile.displayName} avatarKey={profile.avatarKey} photoUrl={profile.photoUrl} size={78} fontSize={28} />
        </View>
      </View>
      <View style={styles.heroRight}>
        <T variant="tiny" color={colors.accentText}>
          Tu ficha
        </T>
        <T variant="display" style={styles.heroName} numberOfLines={2}>
          {firstName(profile.displayName)}
        </T>
        <View style={styles.eloRow}>
          <View style={styles.eloTag}>
            <T variant="tiny" color={colors.ink}>
              ELO
            </T>
          </View>
          <View style={styles.eloNum}>
            <Pop value={rating}>
              <CountRoll value={rating} format={(n) => elo(Math.round(n))}>
                {(shown) => (
                  <T variant="display" style={{ fontSize: 28, color: colors.ink, fontStyle: 'normal' }}>
                    {shown}
                  </T>
                )}
              </CountRoll>
            </Pop>
          </View>
        </View>
        <View style={styles.tags}>
          {place ? (
            <View style={styles.tagDark}>
              <T variant="tiny" color={colors.accentText}>
                #{place.rank} {place.groupName}
              </T>
            </View>
          ) : null}
          {streak.type === 'win' && streak.count > 0 ? (
            <View style={styles.tagRed}>
              <Ionicons name="flame" size={12} color={colors.redInk} />
              <T variant="tiny" color={colors.redInk}>
                Racha de {streakLabel(streak)}
              </T>
            </View>
          ) : null}
        </View>
        <View style={styles.barRow}>
          <View style={styles.bar}>
            <View style={{ flex: win / total, backgroundColor: colors.red }} />
            <View style={{ flex: draw / total, backgroundColor: colors.yellow }} />
            <View style={{ flex: loss / total, backgroundColor: colors.blue }} />
          </View>
          <T variant="tiny" color={colors.accentText}>
            {pct(record.winRate)} victorias
          </T>
        </View>
      </View>
    </SportPress>
  );
}

const styles = StyleSheet.create({
  hero: { flexDirection: 'row', minHeight: 220, overflow: 'hidden', backgroundColor: colors.navy, borderRadius: 20, borderWidth: 1, borderColor: colors.line },
  heroLeft: { width: '38%', backgroundColor: colors.red, paddingTop: 14, paddingLeft: 12, paddingBottom: 12, justifyContent: 'flex-start', overflow: 'hidden' },
  bigNum: { fontSize: 68, fontStyle: 'normal', color: colors.redInk, lineHeight: 70 },
  heroMark: { position: 'absolute', right: -16, bottom: 8, opacity: 0.9 },
  heroRight: { flex: 1, padding: 12, gap: space.sm, justifyContent: 'center' },
  heroName: { fontSize: 36, fontStyle: 'normal', lineHeight: 36 },
  eloRow: { flexDirection: 'row', alignItems: 'stretch' },
  eloTag: { backgroundColor: colors.yellow, paddingHorizontal: 6, justifyContent: 'center', borderRadius: 14 },
  eloNum: { backgroundColor: '#fff', paddingHorizontal: 8, justifyContent: 'center', borderRadius: 14 },
  tags: { gap: space.xs },
  tagDark: { alignSelf: 'flex-start', backgroundColor: colors.bgDeep, paddingHorizontal: 6, paddingVertical: 3, borderRadius: 999 },
  tagRed: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: space.xs, backgroundColor: colors.red, paddingHorizontal: 6, paddingVertical: 3, borderRadius: 999 },
  barRow: { gap: space.xs },
  bar: { flexDirection: 'row', height: 8, backgroundColor: colors.line, borderRadius: 14 },
});
