import { router, useLocalSearchParams } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';
import { roundLabel } from '../../../domain/bracket';
import { standings } from '../../../domain/stats';
import type { Match } from '../../../domain/types';
import { useApp } from '../../../state/app-provider';
import { useQuery } from '../../../state/use-query';
import { Pill } from '../../../ui/bits';
import { Gate } from '../../../ui/controls';
import { firstName, scoreText, statusLabel, statusTone } from '../../../ui/format';
import { Panel, Screen, Top } from '../../../ui/screen';
import { colors, radius, space } from '../../../ui/theme';
import { T } from '../../../ui/text';

export default function TournamentScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { repo, userId, version } = useApp();
  const query = useQuery(() => repo.tournamentSnapshot(String(id), userId!), [repo, userId, version, id]);

  return (
    <Screen>
      <Gate query={query}>
        {(data) => {
          const rounds = [...new Set(data.slots.map((slot) => slot.round))];
          const table =
            data.tournament.format === 'round_robin' ? standings(data.tournament.playerIds, data.matches) : [];
          const champion = data.tournament.winnerId ? data.people[data.tournament.winnerId] : null;
          return (
            <>
              <Top title={data.tournament.name} kicker={data.group.name} back />
              <Panel>
                <Pill
                  label={data.tournament.status === 'completed' ? 'Terminado' : 'En juego'}
                  tone={data.tournament.status === 'completed' ? 'gold' : 'accent'}
                />
                <T color={colors.muted}>
                  {data.tournament.format === 'single_elim'
                    ? 'Eliminación directa. Cada cruce usa la misma confirmación de los dos.'
                    : 'Liga de todos contra todos. 3 puntos por victoria y 1 por empate.'}
                </T>
                {data.tournament.status === 'completed' ? (
                  <T variant="title" color={colors.gold}>
                    {champion ? `Campeón: ${champion.displayName}` : 'Terminó sin un campeón único.'}
                  </T>
                ) : null}
              </Panel>
              {table.length > 0 ? (
                <Panel>
                  <T variant="title">Tabla</T>
                  {table.map((row, index) => (
                    <View key={row.playerId} style={styles.line}>
                      <T style={styles.place}>{index + 1}</T>
                      <T style={styles.flex}>{data.people[row.playerId]?.displayName ?? 'Jugador'}</T>
                      <T>{row.points} pts</T>
                    </View>
                  ))}
                </Panel>
              ) : null}
              {rounds.map((round) => (
                <Panel key={round}>
                  <T variant="title">
                    {roundLabel(round, data.totalRounds, data.tournament.format)}
                  </T>
                  {data.slots
                    .filter((slot) => slot.round === round)
                    .map((slot) => {
                      const match = data.matches.find((item) => item.id === slot.matchId) ?? null;
                      return (
                        <Fixture
                          key={slot.id}
                          round={round}
                          left={slot.playerAId ? data.people[slot.playerAId]?.displayName : null}
                          right={slot.playerBId ? data.people[slot.playerBId]?.displayName : null}
                          match={match}
                          winner={slot.winnerId ? data.people[slot.winnerId]?.displayName : null}
                          onPress={match ? () => router.push(`/partido/${match.id}`) : undefined}
                        />
                      );
                    })}
                </Panel>
              ))}
            </>
          );
        }}
      </Gate>
    </Screen>
  );
}

function Fixture({
  round,
  left,
  right,
  match,
  winner,
  onPress,
}: {
  round: number;
  left: string | null;
  right: string | null;
  match: Match | null;
  winner: string | null;
  onPress?: () => void;
}) {
  const score = match ? scoreText(match.goalsA, match.goalsB) : null;
  return (
    <Pressable disabled={!onPress} onPress={onPress} style={[styles.fixture, { marginLeft: (round - 1) * 12 }]}>
      <View style={styles.flex}>
        <T variant="strong">{left ? firstName(left) : 'Por definir'}</T>
        <T variant="strong">{right ? firstName(right) : 'Por definir'}</T>
        {winner ? (
          <T variant="tiny" color={colors.gold}>
            Avanza {firstName(winner)}
          </T>
        ) : null}
      </View>
      {match ? (
        <View style={styles.end}>
          {score && match.status === 'confirmed' ? <T variant="title">{score}</T> : null}
          <Pill label={statusLabel[match.status]} tone={statusTone(match.status)} />
        </View>
      ) : (
        <T variant="tiny" color={colors.faint}>
          Esperando
        </T>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  line: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  place: { width: 24, color: colors.muted },
  flex: { flex: 1 },
  fixture: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    padding: space.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.bg,
  },
  end: { alignItems: 'flex-end', gap: 4 },
});
