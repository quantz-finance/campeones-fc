import { useLocalSearchParams } from 'expo-router';
import { Pressable, Share, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '../../../state/app-provider';
import { useQuery } from '../../../state/use-query';
import { CompareRow, EloChart, SectionHead } from '../../../ui/broadcast';
import { Gate } from '../../../ui/controls';
import { elo, firstName, formatDay, goalsPerMatch, signed, tagOf } from '../../../ui/format';
import { matchDelta } from '../../../domain/elo';
import { Screen, Top } from '../../../ui/screen';
import { colors } from '../../../ui/theme';
import { T } from '../../../ui/text';
import type { Match } from '../../../domain/types';
import { DetailSkeleton } from '../../../ui/skeleton';
import { Avatar } from '../../../ui/avatar';

export default function Versus() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { repo, userId, version } = useApp();
  const query = useQuery(() => repo.h2hSnapshot(userId!, String(id)), [repo, userId, version, id]);

  return (
    <Screen>
      <Gate query={query} skeleton={<DetailSkeleton />}>
        {(data) => {
          const played = data.youRecord.played;
          const youGpm = goalsPerMatch(data.youRecord.goalsFor, played);
          const themGpm = goalsPerMatch(data.opponentRecord.goalsFor, played);
          const youWin = data.youRecord.biggestWin;
          const themWin = data.opponentRecord.biggestWin;
          const streakYou = data.youRecord.currentStreak.type === 'win' ? `${data.youRecord.currentStreak.count}V` : '–';
          const streakThem = data.opponentRecord.currentStreak.type === 'win' ? `${data.opponentRecord.currentStreak.count}V` : '–';
          const last = data.recent.slice(0, 5);
          return (
            <>
              <Top
                title="Cara a cara"
                kicker={`Historial completo · 1 vs 1`}
                back
                right={
                  <Pressable
                   
                    accessibilityLabel="Compartir"
                    style={styles.share}
                    onPress={() => {
                      const text = `${data.you.displayName} ${data.youRecord.wins} – ${data.opponentRecord.wins} ${data.opponent.displayName}`;
                      void Share.share({ message: text });
                    }}
                  >
                    <Ionicons name="share-outline" size={18} color="#fff" />
                  </Pressable>
                }
              />
              <View style={styles.banner}>
                <View style={[styles.half, { backgroundColor: colors.red, paddingLeft: 12 }]}>
                  <Avatar avatarKey={data.you.avatarKey} name={data.you.displayName} photoUrl={data.you.photoUrl} size={48} />
                  <T variant="display" style={[styles.tag, { color: colors.redInk }]}>
                    {tagOf(data.you.displayName)}
                  </T>
                  <T variant="title" style={[styles.bannerName, { color: colors.redInk }]} numberOfLines={1}>
                    {firstName(data.you.displayName)}
                  </T>
                  <T variant="tiny" color={colors.redInk}>
                    ELO {elo(data.evolution.at(-1)?.ratingYou ?? 1200)}
                  </T>
                  <T variant="display" style={[styles.wins, { color: colors.redInk }]}>
                    {data.youRecord.wins}
                  </T>
                  <T variant="label" color={colors.redInk}>
                    Victorias
                  </T>
                </View>
                <View style={styles.center}>
                  <T variant="display" style={styles.played}>
                    {played}
                  </T>
                  <T variant="tiny" color={colors.ink}>
                    Partidos
                  </T>
                  <T variant="tiny" color={colors.ink}>
                    {data.youRecord.draws} emp.
                  </T>
                </View>
                <View style={[styles.half, { backgroundColor: colors.blue, alignItems: 'flex-end', paddingRight: 12 }]}>
                  <Avatar avatarKey={data.opponent.avatarKey} name={data.opponent.displayName} photoUrl={data.opponent.photoUrl} size={48} />
                  <T variant="display" style={styles.tag}>
                    {tagOf(data.opponent.displayName)}
                  </T>
                  <T variant="title" style={[styles.bannerName, { textAlign: 'right' }]} numberOfLines={1}>
                    {firstName(data.opponent.displayName)}
                  </T>
                  <T variant="tiny" color="#fff">
                    ELO {elo(data.evolution.at(-1)?.ratingThem ?? 1200)}
                  </T>
                  <T variant="display" style={styles.wins}>
                    {data.opponentRecord.wins}
                  </T>
                  <T variant="label" color="#fff">
                    Victorias
                  </T>
                </View>
              </View>
              <View style={styles.legendBar}>
                <T variant="tiny" color={colors.muted}>
                  Gana {firstName(data.you.displayName)}
                </T>
                <T variant="tiny" color={colors.muted}>
                  Gana {firstName(data.opponent.displayName)}
                </T>
              </View>
              {played === 0 ? (
                <T color={colors.muted}>Cuando confirmen un partido entre ustedes, la serie aparece aquí.</T>
              ) : (
                <View>
                  <CompareRow
                    left={String(data.youRecord.goalsFor)}
                    right={String(data.opponentRecord.goalsFor)}
                    label="Goles"
                    leftFlex={data.youRecord.goalsFor}
                    rightFlex={data.opponentRecord.goalsFor}
                  />
                  <CompareRow left={youGpm} right={themGpm} label="Goles x partido" leftFlex={data.youRecord.goalsFor} rightFlex={data.opponentRecord.goalsFor} />
                  <CompareRow
                    left={youWin ? `${youWin.goalsFor}-${youWin.goalsAgainst}` : '–'}
                    right={themWin ? `${themWin.goalsFor}-${themWin.goalsAgainst}` : '–'}
                    label="Mayor goleada"
                    leftFlex={youWin ? youWin.goalsFor - youWin.goalsAgainst : 0}
                    rightFlex={themWin ? themWin.goalsFor - themWin.goalsAgainst : 0}
                  />
                  <CompareRow
                    left={streakYou}
                    right={streakThem}
                    label="Racha actual"
                    leftFlex={data.youRecord.currentStreak.type === 'win' ? data.youRecord.currentStreak.count : 0}
                    rightFlex={data.opponentRecord.currentStreak.type === 'win' ? data.opponentRecord.currentStreak.count : 0}
                  />
                </View>
              )}
              <SectionHead title="Últimos 5" action="Historial" />
              {last.length === 0 ? (
                <T color={colors.muted}>Todavía no hay resultados entre ustedes.</T>
              ) : (
                <View style={styles.chips}>
                  {last.map((match) => (
                    <ResultChip key={match.id} match={match} me={userId!} you={data.you.displayName} them={data.opponent.displayName} />
                  ))}
                </View>
              )}
              <SectionHead title="Evolución de Elo" />
              {data.evolution.length === 0 ? (
                <T color={colors.muted}>La curva sale cuando cierran un partido.</T>
              ) : (
                <>
                  <EloChart
                    you={data.evolution.map((point) => point.ratingYou)}
                    them={data.evolution.map((point) => point.ratingThem)}
                    youName={firstName(data.you.displayName)}
                    themName={firstName(data.opponent.displayName)}
                  />
                  <View style={styles.months}>
                    <T variant="tiny" color={colors.faint}>
                      {formatDay(data.evolution[0].at)}
                    </T>
                    <T variant="tiny" color={colors.faint}>
                      {formatDay(data.evolution.at(-1)!.at)}
                    </T>
                  </View>
                </>
              )}
            </>
          );
        }}
      </Gate>
    </Screen>
  );
}

function ResultChip({
  match,
  me,
  you,
  them,
}: {
  match: Match;
  me: string;
  you: string;
  them: string;
}) {
  const mine = match.playerAId === me ? match.goalsA : match.goalsB;
  const theirs = match.playerAId === me ? match.goalsB : match.goalsA;
  const score = mine != null && theirs != null ? `${mine}-${theirs}` : '–';
  const draw = match.isDraw;
  const win = !draw && match.winnerId === me;
  const bg = draw ? colors.draw : win ? colors.red : colors.blue;
  const ink = draw ? colors.ink : win ? colors.redInk : colors.blueInk;
  const delta = matchDelta(match, me);
  const label = draw ? 'Empate' : win ? `Gana ${tagOf(you)}` : `Gana ${tagOf(them)}`;
  return (
    <View style={[styles.chip, { backgroundColor: bg }]}>
      <T variant="display" style={{ fontSize: 18, color: ink, fontStyle: 'italic' }}>
        {score}
      </T>
      <T variant="tiny" color={ink} style={{ fontSize: 9 }}>
        {label}
      </T>
      <T variant="tiny" color={ink} style={{ fontSize: 9, textTransform: 'none' }}>
        {match.confirmedAt ? formatDay(match.confirmedAt) : ''}
        {delta != null ? ` · ${signed(delta)}` : ''}
      </T>
    </View>
  );
}

const styles = StyleSheet.create({
  share: {
    width: 40,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.16)',
    transform: [{ skewX: '-12deg' }],
  },
  banner: { flexDirection: 'row', minHeight: 168, overflow: 'hidden' },
  half: { flex: 1, padding: 10, gap: 2, overflow: 'hidden' },
  tag: { fontSize: 13, color: 'rgba(255,255,255,0.8)' },
  bannerName: { fontSize: 18, fontStyle: 'italic', maxWidth: 120 },
  wins: { fontSize: 52, fontStyle: 'italic', lineHeight: 52, marginTop: 6 },
  mark: { position: 'absolute', top: 36, left: 8, opacity: 0.9 },
  center: {
    width: 78,
    backgroundColor: colors.yellow,
    alignItems: 'center',
    justifyContent: 'center',
    transform: [{ skewX: '-10deg' }],
    marginHorizontal: -10,
    zIndex: 2,
  },
  played: { fontSize: 32, color: colors.ink, fontStyle: 'italic' },
  legendBar: { flexDirection: 'row', justifyContent: 'space-between' },
  chips: { flexDirection: 'row', gap: 6 },
  chip: { flex: 1, minHeight: 72, padding: 6, alignItems: 'center', justifyContent: 'center', gap: 2 },
  months: { flexDirection: 'row', justifyContent: 'space-between' },
});
