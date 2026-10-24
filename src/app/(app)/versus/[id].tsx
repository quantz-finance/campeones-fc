import { useLocalSearchParams } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { useApp } from '../../../state/app-provider';
import { useQuery } from '../../../state/use-query';
import { Avatar } from '../../../ui/avatar';
import { MatchRow, Spark, StreakLine } from '../../../ui/bits';
import { Gate } from '../../../ui/controls';
import { formatDay, pct, recordLine, signed } from '../../../ui/format';
import { Panel, Screen, Top } from '../../../ui/screen';
import { colors, space } from '../../../ui/theme';
import { T } from '../../../ui/text';

export default function Versus() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { repo, userId, version } = useApp();
  const query = useQuery(() => repo.h2hSnapshot(userId!, String(id)), [repo, userId, version, id]);

  return (
    <Screen>
      <Gate query={query}>
        {(data) => (
          <>
            <Top title={data.opponent.displayName} kicker="Versus" back />
            <Panel>
              <View style={styles.duo}>
                <View style={styles.side}>
                  <Avatar avatarKey={data.you.avatarKey} size={64} />
                  <T variant="strong">{data.you.displayName}</T>
                  <T variant="title" color={colors.accent}>
                    {data.youRecord.wins}
                  </T>
                </View>
                <T variant="label" color={colors.faint}>
                  VS
                </T>
                <View style={styles.side}>
                  <Avatar avatarKey={data.opponent.avatarKey} size={64} />
                  <T variant="strong">{data.opponent.displayName}</T>
                  <T variant="title" color={colors.danger}>
                    {data.opponentRecord.wins}
                  </T>
                </View>
              </View>
              <T color={colors.muted}>
                Tú {recordLine(data.youRecord)} · {pct(data.youRecord.winRate)} de victorias
              </T>
              <T color={colors.muted}>
                Goles {data.youRecord.goalsFor} a favor y {data.youRecord.goalsAgainst} en contra · diferencia{' '}
                {signed(data.youRecord.goalDiff)}
              </T>
              <StreakLine record={data.youRecord} />
              {data.youRecord.biggestWin ? (
                <T>
                  Tu mayor goleada: {data.youRecord.biggestWin.goalsFor}–{data.youRecord.biggestWin.goalsAgainst}
                </T>
              ) : null}
              {data.opponentRecord.biggestWin ? (
                <T color={colors.muted}>
                  La suya: {data.opponentRecord.biggestWin.goalsFor}–{data.opponentRecord.biggestWin.goalsAgainst}
                </T>
              ) : null}
            </Panel>
            <Panel>
              <T variant="title">Evolución del pique</T>
              {data.evolution.length === 0 ? (
                <T color={colors.muted}>Cuando confirmen un partido entre ustedes, la serie aparece aquí.</T>
              ) : (
                <>
                  <T variant="tiny" color={colors.muted}>
                    Tus puntos, desde el {formatDay(data.evolution[0].at)}
                  </T>
                  <Spark values={data.evolution.map((point) => point.pointsYou)} />
                  <T variant="tiny" color={colors.muted}>
                    Elo del enfrentamiento
                  </T>
                  <Spark values={data.evolution.map((point) => point.ratingYou)} color={colors.draw} />
                </>
              )}
            </Panel>
            <Panel>
              <T variant="title">Últimos partidos</T>
              {data.recent.length === 0 ? (
                <T color={colors.muted}>Todavía no hay resultados entre ustedes.</T>
              ) : (
                data.recent.map((match) => (
                  <MatchRow key={match.id} match={match} me={userId!} people={{ [data.you.id]: data.you, [data.opponent.id]: data.opponent }} />
                ))
              )}
            </Panel>
          </>
        )}
      </Gate>
    </Screen>
  );
}

const styles = StyleSheet.create({
  duo: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  side: { alignItems: 'center', gap: space.sm, flex: 1 },
});
