import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Icon } from '../../../ui/icon';
import { roundLabel } from '../../../domain/bracket';
import { standings } from '../../../domain/stats';
import type { Match } from '../../../domain/types';
import { useApp } from '../../../state/app-provider';
import { useQuery } from '../../../state/use-query';
import { SectionHead, Toro } from '../../../ui/broadcast';
import { Button, Chip, Gate } from '../../../ui/controls';
import { firstName, scoreText, slotsLine, tournamentStatusLabel } from '../../../ui/format';
import { Screen, Top } from '../../../ui/screen';
import { colors, layout, space } from '../../../ui/theme';
import { T } from '../../../ui/text';
import { LogoEditor } from '../../../ui/logo-picker';
import { AccessFields } from '../../../ui/access-fields';
import { DateTimePicker } from '../../../ui/datetime-picker';
import { humanError } from '../../../ui/errors';
import { joinPolicyOf, visibilityOf, type JoinPolicy, type Visibility } from '../../../data/types';
import { Avatar } from '../../../ui/avatar';
import { push } from '../../../ui/nav';

export default function TournamentScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { repo, userId, version, showFlash } = useApp();
  const query = useQuery(() => repo.tournamentSnapshot(String(id), userId!), [repo, userId, version, id]);
  const [visibility, setVisibility] = useState<Visibility | null>(null);
  const [joinPolicy, setJoinPolicy] = useState<JoinPolicy | null>(null);
  const [maxPlayers, setMaxPlayers] = useState<number | null>(null);
  const [startsAt, setStartsAt] = useState<string | null | undefined>(undefined);
  const [busy, setBusy] = useState(false);


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
                  <View style={[styles.badge, { backgroundColor: data.tournament.status === 'completed' ? colors.up : data.tournament.status === 'registration' ? colors.violet : colors.yellow }]}>
                    <T variant="tiny" color={colors.ink}>
                      {tournamentStatusLabel(data.tournament.status)}
                    </T>
                  </View>
                  </View>
                }
              />

              <LogoEditor kind="tournaments" entity={data.tournament} canEdit={data.tournament.createdBy === userId} />
              {data.tournament.status === 'registration' || data.isOrganizer ? (
                <View style={styles.manage}>
                  <T variant="tiny" color={colors.muted}>
                    {slotsLine(data.registrations.length, data.tournament.maxPlayers)}
                    {data.group?.name ? ` · ${data.group.name}` : ''}
                  </T>
                  {data.isOrganizer ? (
                    <>
                      {data.joinRequests.length ? (
                        <View style={styles.requests}>
                          <T variant="strong">Solicitudes</T>
                          {data.joinRequests.map((item) => (
                            <View key={item.id} style={styles.requestRow}>
                              <T variant="medium" style={{ flex: 1 }} numberOfLines={1}>
                                {item.profile.displayName}
                              </T>
                              <Button label="Aprobar" onPress={() => void repo.decideTournamentJoin(userId!, item.id, true).catch((cause: unknown) => showFlash({ id: `tdec-${item.id}`, title: 'No se pudo decidir', body: humanError(cause), tone: 'danger' }))} />
                              <Button label="Rechazar" tone="ghost" onPress={() => void repo.decideTournamentJoin(userId!, item.id, false).catch((cause: unknown) => showFlash({ id: `tdec-${item.id}`, title: 'No se pudo decidir', body: humanError(cause), tone: 'danger' }))} />
                            </View>
                          ))}
                        </View>
                      ) : null}
                      <AccessFields
                        visibility={visibility ?? visibilityOf(data.tournament)}
                        joinPolicy={joinPolicy ?? joinPolicyOf(data.tournament)}
                        onVisibility={setVisibility}
                        onPolicy={setJoinPolicy}
                        kind="tournament"
                      />
                      {data.tournament.status === 'registration' ? (
                        <>
                          <T variant="tiny">Cupos</T>
                          <View style={styles.chips}>
                            {(data.tournament.format === 'single_elim' ? [4, 8, 16] : [4, 8, 12, 16]).map((n) => (
                              <Chip key={n} label={String(n)} active={(maxPlayers ?? data.tournament.maxPlayers) === n} onPress={() => setMaxPlayers(n)} />
                            ))}
                          </View>
                          <DateTimePicker value={startsAt === undefined ? data.tournament.startsAt ?? null : startsAt} onChange={setStartsAt} />
                        </>
                      ) : null}
                      <Button
                        label={busy ? 'Guardando…' : 'Guardar acceso'}
                        pending={busy}
                        onPress={() => {
                          setBusy(true);
                          const starts = startsAt === undefined ? data.tournament.startsAt ?? null : startsAt;
                          void repo
                            .setTournamentAccess(userId!, data.tournament.id, {
                              visibility: visibility ?? visibilityOf(data.tournament),
                              joinPolicy: joinPolicy ?? joinPolicyOf(data.tournament),
                              maxPlayers: maxPlayers ?? data.tournament.maxPlayers,
                              startsAt: starts,
                              clearStarts: starts == null,
                            })
                            .then(() => showFlash({ id: `t-access-${data.tournament.id}`, title: 'Acceso actualizado', tone: 'accent' }))
                            .catch((cause: unknown) => showFlash({ id: `t-access-error-${data.tournament.id}`, title: 'No se pudo guardar', body: humanError(cause), tone: 'danger' }))
                            .finally(() => setBusy(false));
                        }}
                      />
                      {data.tournament.status === 'registration' ? (
                        <Button
                          label="Empezar torneo"
                          onPress={() => {
                            setBusy(true);
                            void repo
                              .startTournament(userId!, data.tournament.id)
                              .then(() => showFlash({ id: `start-${data.tournament.id}`, title: 'El torneo ya arrancó', tone: 'accent' }))
                              .catch((cause: unknown) => showFlash({ id: `start-error-${data.tournament.id}`, title: 'No se pudo empezar', body: humanError(cause), tone: 'danger' }))
                              .finally(() => setBusy(false));
                          }}
                        />
                      ) : null}
                    </>
                  ) : data.tournament.status === 'registration' && !data.registrations.some((row) => row.userId === userId) ? (
                    <Button
                      label={joinPolicyOf(data.tournament) === 'open' ? 'Inscribirme' : 'Pedir invitación'}
                      onPress={() => {
                        const policy = joinPolicyOf(data.tournament);
                        const run = policy === 'open' ? repo.registerForTournament(userId!, data.tournament.id) : repo.requestTournamentJoin(userId!, data.tournament.id);
                        void run
                          .then(() => showFlash({ id: `join-t-${data.tournament.id}`, title: policy === 'open' ? 'Quedaste inscrito' : 'Solicitud enviada', tone: 'accent' }))
                          .catch((cause: unknown) => showFlash({ id: `join-t-error-${data.tournament.id}`, title: 'No se pudo inscribir', body: humanError(cause), tone: 'danger' }));
                      }}
                    />
                  ) : data.registrations.some((row) => row.userId === userId) ? (
                    <T variant="strong" color={colors.accentText}>
                      Ya estás inscrito
                    </T>
                  ) : null}
                </View>
              ) : null}
              {data.tournament.status === 'completed' ? (
                <View style={styles.champ}>
                  <View style={styles.cupBox}>
                    <Toro size={84} />
                    <T variant="tiny" color={colors.ink}>
                      {data.group?.name ?? 'Público'}
                    </T>
                  </View>
                  <View style={styles.champBody}>
                    <T variant="tiny" color={colors.ink}>
                      {champion ? 'Campeón' : 'Sin campeón único'}
                    </T>
                    <T variant="display" style={{ fontSize: 32, color: colors.ink, fontStyle: 'normal' }} numberOfLines={2}>
                      {champion ? firstName(champion.displayName) : 'Empatados arriba'}
                    </T>
                    {champion && finalMatch ? (
                      <T variant="tiny" color={colors.ink} style={styles.plain}>
                        Final {finalScore ?? 'sin goles'} vs {firstName(data.people[finalMatch.playerAId === champion.id ? finalMatch.playerBId : finalMatch.playerAId]?.displayName ?? 'el rival')}
                      </T>
                    ) : (
                      <T variant="tiny" color={colors.ink} style={styles.plain}>
                        {data.group?.name ?? 'Público'}
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
                          <T variant="tiny" color={colors.accentText}>
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
                        <T variant="tiny" color={round === data.totalRounds ? colors.ink : colors.text}>
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
                              onPress={match ? () => push(`/partido/${match.id}`) : undefined}
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
                            onPress={match ? () => push(`/partido/${match.id}`) : undefined}
                          />
                        );
                      })}
                  </View>
                ))
              )}
              {scorer ? (
                <View style={styles.scorer}>
                  <Icon name="balon" size={16} color={colors.text} />
                  <View>
                    <T variant="tiny" color={colors.accentText}>
                      Goleador
                    </T>
                    <T variant="strong">
                      {firstName(scorer.name)} · {scorer.goals} goles
                    </T>
                  </View>
                </View>
              ) : null}
              <Button label="Crear nuevo torneo" tone="ghost" onPress={() => data.group && push(`/torneo/nuevo?grupo=${data.group.id}`)} />
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
      <T numberOfLines={1} variant="strong" color={winner ? colors.ink : name ? colors.text : colors.faint} style={styles.flex}>
        {name ? firstName(name) : 'Por definir'}
      </T>
      <T variant="strong" color={winner ? colors.ink : colors.text}>
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
  manage: { gap: space.md },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  requests: { gap: space.sm },
  requestRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  topRight: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  badge: { paddingHorizontal: 8, paddingVertical: 5 },
  champ: { flexDirection: 'row', minHeight: 150, overflow: 'hidden' },
  cupBox: { width: '36%', backgroundColor: colors.red, alignItems: 'center', justifyContent: 'center', gap: space.sm, padding: 8, borderRadius: 14 },
  champBody: { flex: 1, backgroundColor: colors.yellow, padding: 12, justifyContent: 'center', gap: space.sm, borderRadius: 14 },
  plain: { textTransform: 'none', letterSpacing: 0 },
  pills: { flexDirection: 'row', gap: space.sm, marginTop: space.xs },
  pill: { backgroundColor: '#1A0A1C', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999 },
  table: { gap: layout.card },
  line: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  place: { width: 24, color: colors.muted },
  flex: { flex: 1 },
  bracket: { gap: space.lg, paddingVertical: 8, alignItems: 'stretch' },
  column: { width: 168, gap: 10, justifyContent: 'space-around' },
  roundTag: { alignSelf: 'flex-start', backgroundColor: colors.navy, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999 },
  block: { gap: layout.card },
  fixture: { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, borderRadius: 14 },
  finalFix: { borderColor: colors.yellow, borderWidth: 2 },
  slot: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 7, gap: space.sm },
  slotWin: { backgroundColor: '#fff', borderRadius: 14 },
  scorer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    padding: 12,
    backgroundColor: colors.blue,
    borderRadius: 14,
  },
});
