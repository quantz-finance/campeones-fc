import { router, useLocalSearchParams } from 'expo-router';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useApp } from '../../../state/app-provider';
import { useQuery } from '../../../state/use-query';
import { MatchRow, Pill } from '../../../ui/bits';
import { Button, Gate } from '../../../ui/controls';
import { elo, firstName, pct, signed } from '../../../ui/format';
import { Panel, Screen, Top } from '../../../ui/screen';
import { colors, space } from '../../../ui/theme';
import { T } from '../../../ui/text';

export default function GroupDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { repo, userId, version } = useApp();
  const query = useQuery(() => repo.groupSnapshot(String(id), userId!), [repo, userId, version, id]);

  return (
    <Screen>
      <Gate query={query}>
        {(data) => (
          <>
            <Top
              title={data.group.name}
              kicker={data.yourRole === 'owner' ? 'Tú lo creaste' : 'Grupo'}
              back
            />
            <Panel>
              <T variant="label" color={colors.gold}>
                QUIÉN MANDA
              </T>
              <T variant="display" style={styles.tight}>
                {data.leader ? data.leader.displayName : 'Nadie todavía'}
              </T>
              <T color={colors.muted}>
                El ranking del grupo usa Elo solo con los partidos de esta junta. Hacen falta {data.minMatches} para
                entrar.
              </T>
            </Panel>
            <Panel>
              <T variant="title">Ranking</T>
              {data.ranking.length === 0 ? (
                <T color={colors.muted}>Todavía nadie acumula los partidos suficientes.</T>
              ) : (
                data.ranking.map((row, index) => (
                  <View key={row.playerId} style={styles.line}>
                    <T variant="strong" color={index === 0 ? colors.gold : colors.muted} style={styles.place}>
                      {index + 1}
                    </T>
                    <View style={styles.flex}>
                      <T variant="strong">{row.profile.displayName}</T>
                      <T variant="tiny" color={colors.muted}>
                        {pct(row.winRate)} · {row.played} PJ
                      </T>
                    </View>
                    <T variant="strong">{elo(row.rating)}</T>
                  </View>
                ))
              )}
            </Panel>
            <Panel>
              <T variant="title">Tabla</T>
              <View style={styles.head}>
                <T variant="tiny" color={colors.faint} style={styles.name}>
                  Jugador
                </T>
                <T variant="tiny" color={colors.faint} style={styles.num}>
                  PJ
                </T>
                <T variant="tiny" color={colors.faint} style={styles.num}>
                  PTS
                </T>
                <T variant="tiny" color={colors.faint} style={styles.num}>
                  DG
                </T>
                <T variant="tiny" color={colors.faint} style={styles.num}>
                  %
                </T>
              </View>
              {data.table.map((row) => (
                <View key={row.playerId} style={styles.head}>
                  <T style={styles.name} numberOfLines={1}>
                    {row.profile.displayName}
                  </T>
                  <T style={styles.num}>{row.played}</T>
                  <T style={styles.num}>{row.points}</T>
                  <T style={styles.num}>{signed(row.goalDiff)}</T>
                  <T style={styles.num}>{pct(row.winRate)}</T>
                </View>
              ))}
            </Panel>
            <Panel>
              <T variant="title">Enfrentamientos</T>
              <T variant="tiny" color={colors.muted}>
                Cada celda es victorias-empates-derrotas de la fila contra la columna.
              </T>
              <ScrollView horizontal showsHorizontalScrollIndicator>
                <View>
                  <View style={styles.matrixRow}>
                    <T style={styles.matrixName}> </T>
                    {data.members.map((member) => (
                      <T key={member.id} variant="tiny" style={styles.matrixCell}>
                        {firstName(member.displayName)}
                      </T>
                    ))}
                  </View>
                  {data.members.map((row) => (
                    <View key={row.id} style={styles.matrixRow}>
                      <T variant="tiny" style={styles.matrixName} numberOfLines={1}>
                        {firstName(row.displayName)}
                      </T>
                      {data.members.map((col) => {
                        if (row.id === col.id) {
                          return (
                            <T key={col.id} style={styles.matrixCell} color={colors.faint}>
                              ·
                            </T>
                          );
                        }
                        const cell = data.matrix[row.id]?.[col.id];
                        return (
                          <T key={col.id} variant="tiny" style={styles.matrixCell}>
                            {cell ? `${cell.wins}-${cell.draws}-${cell.losses}` : '0-0-0'}
                          </T>
                        );
                      })}
                    </View>
                  ))}
                </View>
              </ScrollView>
            </Panel>
            <Panel>
              <T variant="title">Partidos recientes</T>
              {data.recent.length === 0 ? (
                <T color={colors.muted}>Esta junta todavía no cierra partidos.</T>
              ) : (
                data.recent.map((match) => (
                  <MatchRow key={match.id} match={match} me={userId!} people={data.people} />
                ))
              )}
            </Panel>
            <Panel>
              <View style={styles.line}>
                <T variant="title">Torneos</T>
                <Button label="Crear" onPress={() => router.push(`/torneo/nuevo?grupo=${data.group.id}`)} />
              </View>
              {data.tournaments.length === 0 ? (
                <T color={colors.muted}>Puedes armar una eliminación de 4, 8 o 16, o una liga de todos contra todos.</T>
              ) : (
                data.tournaments.map((tournament) => (
                  <PressableRow
                    key={tournament.id}
                    title={tournament.name}
                    detail={tournament.status === 'completed' ? 'Terminado' : 'En juego'}
                    onPress={() => router.push(`/torneo/${tournament.id}`)}
                  />
                ))
              )}
            </Panel>
          </>
        )}
      </Gate>
    </Screen>
  );
}

function PressableRow({ title, detail, onPress }: { title: string; detail: string; onPress: () => void }) {
  return (
    <View style={styles.line}>
      <View style={styles.flex}>
        <T variant="strong">{title}</T>
        <Pill label={detail} tone={detail === 'Terminado' ? 'gold' : 'draw'} />
      </View>
      <Button label="Abrir" tone="ghost" onPress={onPress} />
    </View>
  );
}

const styles = StyleSheet.create({
  tight: { lineHeight: 40 },
  line: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  flex: { flex: 1, gap: 4 },
  place: { width: 24 },
  head: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  name: { flex: 1 },
  num: { width: 42, textAlign: 'right' },
  matrixRow: { flexDirection: 'row', alignItems: 'center' },
  matrixName: { width: 72 },
  matrixCell: { width: 78, textAlign: 'center' },
});
