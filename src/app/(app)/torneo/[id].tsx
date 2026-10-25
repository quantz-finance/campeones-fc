import { router, useLocalSearchParams } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { roundLabel } from '../../../domain/bracket';
import { standings } from '../../../domain/stats';
import type { Match } from '../../../domain/types';
import { useApp } from '../../../state/app-provider';
import { useQuery } from '../../../state/use-query';
import { SectionHead, Shield, Toro } from '../../../ui/broadcast';
import { Button, Gate } from '../../../ui/controls';
import { firstName, monogram, scoreText } from '../../../ui/format';
import { Screen, Top } from '../../../ui/screen';
import { colors } from '../../../ui/theme';
import { T } from '../../../ui/text';
import { PhotoButton } from '../../../ui/photo-button';
import { Avatar } from '../../../ui/avatar';

export default function TournamentScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { repo, userId, version } = useApp();
  const query = useQuery(() => repo.tournamentSnapshot(String(id), userId!), [repo, userId, version, id]);

  return (
    <Screen dock="torneos">
      <Gate query={query}>
        {(data) => {
          const rounds = [...new Set(data.slots.map((slot) => slot.round))].sort((a, b) => a - b);
          const table = data.tournament.format === 'round_robin' ? standings(data.tournament.playerIds, data.matches) : [];
          const champion = data.tournament.winnerId ? data.people[data.tournament.winnerId] : null;
          const finalSlot = data.slots.find((slot) => slot.round === data.totalRounds && data.tournament.format === 'single_elim');
          const finalMatch = finalSlot?.matchId ? data.matches.find((match) => match.id === finalSlot.matchId) : null;
          const finalScore = finalMatch && finalMatch.status === 'confirmed' ? scoreText(finalMatch.goalsA, finalMatch.goalsB) : null;
          const scorer = topScorer(data.matches, data.people);
          const played = data.matches.filter((match) => match.status === 'confirmed').length;
          const unbeaten =
            champion != null &&
            data.matches
              .filter((match) => match.status === 'confirmed' && (match.playerAId === champion.id || match.playerBId === champion.id))
              .every((match) => match.isDraw || match.winnerId === champion.id) &&
            played > 0;
          const formatLabel =
            data.tournament.format === 'single_elim'
              ? `Torneo · eliminación directa · ${data.tournament.playerIds.length}`
              : 'Torneo · todos contra todos';
          return (
            <>
              <Top
                title={data.tournament.name}
                kicker={formatLabel}
                back
                right={
                  <View style={styles.topRight}>
                  <Shield letters={monogram(data.tournament.name)} photoUrl={data.tournament.photoUrl} size={40} />
                  <View style={[styles.badge, { backgroundColor: data.tournament.status === 'completed' ? colors.up : colors.yellow }]}>
                    <T variant="tiny" color={data.tournament.status === 'completed' ? '#fff' : colors.ink}>
                      {data.tournament.status === 'completed' ? 'Finalizado' : 'En juego'}
                    </T>
                  </View>
                  </View>
                }
              />
              {data.tournament.createdBy === userId ? (
                <PhotoButton kind="tournaments" targetId={data.tournament.id} label="Foto del torneo" />
              ) : null}
              {data.tournament.status === 'completed' ? (
                <View style={styles.champ}>
                  <View style={styles.cupBox}>
                    <Toro size={84} />
                    <T variant="tiny" color={colors.ink}>
                      {data.group.name}
                    </T>
                  </View>
                  <View style={styles.champBody}>
                    <T variant="tiny" color={colors.ink}>
                      {champion ? 'Campeón' : 'Sin campeón único'}
                    </T>
                    <T variant="display" style={{ fontSize: 32, color: colors.ink, fontStyle: 'italic' }} numberOfLines={2}>
                      {champion ? firstName(champion.displayName) : 'Empatados arriba'}
                    </T>
                    {champion && finalMatch ? (
                      <T variant="tiny" color={colors.ink} style={styles.plain}>
                        Final {finalScore ?? 'sin goles'} vs {firstName(data.people[finalMatch.playerAId === champion.id ? finalMatch.playerBId : finalMatch.playerAId]?.displayName ?? 'el rival')}
                      </T>
                    ) : (
                      <T variant="tiny" color={colors.ink} style={styles.plain}>
                        {data.group.name}
                      </T>
                    )}
                    <View style={styles.pills}>
                      <View style={styles.pill}>
                        <T variant="tiny" color="#fff">
                          {played} partidos
                        </T>
                      </View>
                      {unbeaten ? (
                        <View style={[styles.pill, { backgroundColor: colors.ink }]}>
                          <T variant="tiny" color={colors.yellow}>
                            Invicto
                          </T>
                        </View>
                      ) : null}
                    </View>
                  </View>
                </View>
              ) : (
                <T color={colors.muted}>
                  {data.tournament.format === 'single_elim'
                    ? 'Eliminación directa. Cada cruce usa la misma confirmación de los dos.'
                    : 'Liga de todos contra todos. 3 puntos por victoria y 1 por empate. Si hay empate arriba, no hay campeón único.'}
                </T>
              )}
              {table.length > 0 ? (
                <View style={styles.table}>
                  <SectionHead title="Tabla" />
                  {table.map((row, index) => (
                    <View key={row.playerId} style={styles.line}>
                      <T style={styles.place}>{index + 1}</T>
                      <Avatar
                        avatarKey={data.people[row.playerId]?.avatarKey ?? 'rayo'}
                        name={data.people[row.playerId]?.displayName ?? 'Jugador'}
                        photoUrl={data.people[row.playerId]?.photoUrl}
                        size={26}
                      />
                      <T style={styles.flex}>{firstName(data.people[row.playerId]?.displayName ?? 'Jugador')}</T>
                      <T variant="strong">{row.points} pts</T>
                    </View>
                  ))}
                </View>
              ) : null}
              {data.tournament.format === 'single_elim' ? (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.bracket}>
                  {rounds.map((round) => (
                    <View key={round} style={styles.column}>
                      <View style={[styles.roundTag, round === data.totalRounds && { backgroundColor: colors.yellow }]}>
                        <T variant="tiny" color={round === data.totalRounds ? colors.ink : '#fff'}>
                          {roundLabel(round, data.totalRounds, 'single_elim')}
                        </T>
                      </View>
                      {data.slots
                        .filter((slot) => slot.round === round)
                        .sort((a, b) => a.position - b.position)
                        .map((slot) => {
                          const match = data.matches.find((item) => item.id === slot.matchId) ?? null;
                          return (
                            <Fixture
                              key={slot.id}
                              left={slot.playerAId ? data.people[slot.playerAId]?.displayName ?? null : null}
                              right={slot.playerBId ? data.people[slot.playerBId]?.displayName ?? null : null}
                              match={match}
                              final={round === data.totalRounds}
                              onPress={match ? () => router.push(`/partido/${match.id}`) : undefined}
                            />
                          );
                        })}
                    </View>
                  ))}
                </ScrollView>
              ) : (
                rounds.map((round) => (
                  <View key={round} style={styles.block}>
                    <SectionHead title={roundLabel(round, data.totalRounds, data.tournament.format)} />
                    {data.slots
                      .filter((slot) => slot.round === round)
                      .map((slot) => {
                        const match = data.matches.find((item) => item.id === slot.matchId) ?? null;
                        return (
                          <Fixture
                            key={slot.id}
                            left={slot.playerAId ? data.people[slot.playerAId]?.displayName ?? null : null}
                            right={slot.playerBId ? data.people[slot.playerBId]?.displayName ?? null : null}
                            match={match}
                            onPress={match ? () => router.push(`/partido/${match.id}`) : undefined}
                          />
                        );
                      })}
                  </View>
                ))
              )}
              {scorer ? (
                <View style={styles.scorer}>
                  <Ionicons name="football" size={16} color="#fff" />
                  <View>
                    <T variant="tiny" color={colors.yellow}>
                      Goleador
                    </T>
                    <T variant="strong">
                      {firstName(scorer.name)} · {scorer.goals} goles
                    </T>
                  </View>
                </View>
              ) : null}
              <Button label="Crear nuevo torneo" tone="ghost" onPress={() => router.push(`/torneo/nuevo?grupo=${data.group.id}`)} />
            </>
          );
        }}
      </Gate>
    </Screen>
  );
}

function Fixture({
  left,
  right,
  match,
  final = false,
  onPress,
}: {
  left: string | null;
  right: string | null;
  match: Match | null;
  final?: boolean;
  onPress?: () => void;
}) {
  const confirmed = match?.status === 'confirmed';
  const scoreA = confirmed ? match?.goalsA : null;
  const scoreB = confirmed ? match?.goalsB : null;
  return (
    <Pressable disabled={!onPress} onPress={onPress} style={[styles.fixture, final && styles.finalFix]}>
      <SlotLine name={left} score={scoreA} winner={Boolean(match && confirmed && !match.isDraw && match.winnerId && left && match.winnerId === match.playerAId)} />
      <SlotLine name={right} score={scoreB} winner={Boolean(match && confirmed && !match.isDraw && match.winnerId && right && match.winnerId === match.playerBId)} />
    </Pressable>
  );
}

function SlotLine({ name, score, winner }: { name: string | null; score: number | null; winner: boolean }) {
  return (
    <View style={[styles.slot, winner && styles.slotWin]}>
      <T numberOfLines={1} variant="strong" color={winner ? colors.ink : name ? '#fff' : colors.faint} style={styles.flex}>
        {name ? firstName(name) : 'Por definir'}
      </T>
      <T variant="strong" color={winner ? colors.ink : '#fff'}>
        {score ?? ''}
      </T>
    </View>
  );
}

function topScorer(matches: Match[], people: Record<string, { displayName: string }>) {
  const goals = new Map<string, number>();
  for (const match of matches) {
    if (match.status !== 'confirmed' || match.goalsA == null || match.goalsB == null) continue;
    goals.set(match.playerAId, (goals.get(match.playerAId) ?? 0) + match.goalsA);
    goals.set(match.playerBId, (goals.get(match.playerBId) ?? 0) + match.goalsB);
  }
  let best: { id: string; goals: number } | null = null;
  for (const [id, count] of goals) {
    if (count > 0 && (!best || count > best.goals)) best = { id, goals: count };
  }
  if (!best) return null;
  return { name: people[best.id]?.displayName ?? 'Jugador', goals: best.goals };
}

const styles = StyleSheet.create({
  topRight: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  badge: { paddingHorizontal: 8, paddingVertical: 5 },
  champ: { flexDirection: 'row', minHeight: 150, overflow: 'hidden' },
  cupBox: { width: '36%', backgroundColor: colors.red, alignItems: 'center', justifyContent: 'center', gap: 6, padding: 8 },
  champBody: { flex: 1, backgroundColor: colors.yellow, padding: 12, justifyContent: 'center', gap: 4 },
  plain: { textTransform: 'none', letterSpacing: 0 },
  pills: { flexDirection: 'row', gap: 6, marginTop: 4 },
  pill: { backgroundColor: colors.ink, paddingHorizontal: 8, paddingVertical: 3 },
  table: { gap: 8 },
  line: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  place: { width: 24, color: colors.muted },
  flex: { flex: 1 },
  bracket: { gap: 16, paddingVertical: 8, alignItems: 'stretch' },
  column: { width: 168, gap: 10, justifyContent: 'space-around' },
  roundTag: { alignSelf: 'flex-start', backgroundColor: colors.navy, paddingHorizontal: 8, paddingVertical: 3 },
  block: { gap: 8 },
  fixture: { backgroundColor: 'rgba(19,26,42,0.8)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  finalFix: { borderColor: colors.yellow, borderWidth: 2 },
  slot: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 7, gap: 6 },
  slotWin: { backgroundColor: '#fff' },
  scorer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    backgroundColor: colors.blue,
  },
});
