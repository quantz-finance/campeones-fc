import { router, useLocalSearchParams } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { Match } from '../../../domain/types';
import { useApp } from '../../../state/app-provider';
import { useQuery } from '../../../state/use-query';
import { MatchRow } from '../../../ui/bits';
import { InitialsMark, SectionHead, Shield, SkewBlock } from '../../../ui/broadcast';
import { Button, Gate } from '../../../ui/controls';
import { elo, firstName, monogram, tagOf } from '../../../ui/format';
import { copyText, inviteUrl, openWhatsApp } from '../../../ui/share';
import { Screen, Top } from '../../../ui/screen';
import { colors } from '../../../ui/theme';
import { T } from '../../../ui/text';

export default function GroupDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { repo, userId, version } = useApp();
  const query = useQuery(() => repo.groupSnapshot(String(id), userId!), [repo, userId, version, id]);

  return (
    <Screen dock="grupos">
      <Gate query={query}>
        {(data) => {
          const leaderRow = data.ranking[0];
          const matchesPlayed = Math.round(data.table.reduce((sum, row) => sum + row.played, 0) / 2);
          return (
            <>
              <Top
                title={data.group.name}
                kicker={`${data.members.length} jugadores · ${matchesPlayed} partidos`}
                back
                right={
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => {
                      void repo.createInvite(userId!).then((invite) => {
                        void copyText(inviteUrl(invite.code));
                        openWhatsApp(invite.code);
                      });
                    }}
                  >
                    <SkewBlock color={colors.yellow} shadow={colors.red} padH={10} padV={6} angle="-8deg">
                      <T variant="label" color={colors.ink}>
                        + Invitar
                      </T>
                    </SkewBlock>
                  </Pressable>
                }
              />
              <View style={styles.identity}>
                <Shield letters={monogram(data.group.name)} />
              </View>
              <View style={styles.king}>
                <View style={styles.kingLeft}>
                  <T variant="tiny" color={colors.ink}>
                    Quién manda
                  </T>
                  <T variant="display" style={{ fontSize: 26, color: colors.ink, fontStyle: 'italic' }} numberOfLines={1}>
                    {data.leader ? firstName(data.leader.displayName) : 'Nadie'}
                  </T>
                  <T variant="tiny" color={colors.ink} style={styles.plain}>
                    {data.leader ? 'Lidera el Elo del grupo' : `Hacen falta ${data.minMatches} partidos para entrar`}
                  </T>
                </View>
                <View style={styles.kingRight}>
                  <T variant="display" style={{ fontSize: 28, color: '#fff', fontStyle: 'italic' }}>
                    {leaderRow ? elo(leaderRow.rating) : '—'}
                  </T>
                  <T variant="tiny" color={colors.yellow}>
                    ELO
                  </T>
                </View>
              </View>
              <SectionHead title="Tabla de posiciones" action="T3" />
              <View style={styles.table}>
                <View style={styles.headRow}>
                  {['#', 'Jugador', 'PJ', 'G', 'P', 'ELO', 'Forma'].map((label) => (
                    <T key={label} variant="tiny" color={colors.faint} style={label === 'Jugador' ? styles.name : styles.cell}>
                      {label}
                    </T>
                  ))}
                </View>
                {data.table.map((row, index) => {
                  const form = formOf(row.playerId, data.recent);
                  return (
                    <View key={row.playerId} style={[styles.bodyRow, index === 0 && styles.leaderRow]}>
                      <T variant="strong" style={styles.cell}>
                        {index + 1}
                      </T>
                      <View style={[styles.name, styles.player]}>
                        <InitialsMark name={row.profile.displayName} avatarKey={row.profile.avatarKey} size={26} fontSize={11} />
                        <T numberOfLines={1} variant="strong">
                          {firstName(row.profile.displayName)}
                        </T>
                      </View>
                      <T style={styles.cell}>{row.played}</T>
                      <T style={styles.cell}>{row.wins}</T>
                      <T style={styles.cell}>{row.losses}</T>
                      <T variant="strong" style={styles.cell}>
                        {elo(row.rating)}
                      </T>
                      <View style={[styles.cell, styles.form]}>
                        {form.map((item, i) => (
                          <View
                            key={`${row.playerId}-${i}`}
                            style={{
                              width: 7,
                              height: 14,
                              backgroundColor: item === 'w' ? colors.up : item === 'd' ? colors.yellow : colors.red,
                            }}
                          />
                        ))}
                      </View>
                    </View>
                  );
                })}
              </View>
              <SectionHead title="Matriz de cruces" action="Fila vs col." />
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={styles.matrix}>
                  <View style={styles.matrixRow}>
                    <View style={styles.matrixName} />
                    {data.members.map((member) => (
                      <T key={member.id} variant="tiny" style={styles.matrixCell}>
                        {tagOf(member.displayName)}
                      </T>
                    ))}
                  </View>
                  {data.members.map((row) => (
                    <View key={row.id} style={styles.matrixRow}>
                      <T variant="tiny" style={styles.matrixName}>
                        {tagOf(row.displayName)}
                      </T>
                      {data.members.map((col) => {
                        if (row.id === col.id) return <View key={col.id} style={[styles.matrixCell, styles.hatch]} />;
                        const cell = data.matrix[row.id]?.[col.id];
                        const wins = cell?.wins ?? 0;
                        const losses = cell?.losses ?? 0;
                        const tone = wins > losses ? colors.red : losses > wins ? colors.blue : 'rgba(255,255,255,0.08)';
                        return (
                          <View key={col.id} style={[styles.matrixCell, { backgroundColor: tone }]}>
                            <T variant="tiny" color="#fff">
                              {wins}-{losses}
                            </T>
                          </View>
                        );
                      })}
                    </View>
                  ))}
                </View>
              </ScrollView>
              <SectionHead title="Últimos partidos" />
              {data.recent.length === 0 ? (
                <T color={colors.muted}>Esta junta todavía no cierra partidos.</T>
              ) : (
                data.recent.map((match) => <MatchRow key={match.id} match={match} me={userId!} people={data.people} />)
              )}
              <SectionHead title="Torneos" action="Crear" onAction={() => router.push(`/torneo/nuevo?grupo=${data.group.id}`)} />
              {data.tournaments.length === 0 ? (
                <T color={colors.muted}>Puedes armar una eliminación de 4, 8 o 16, o una liga de todos contra todos.</T>
              ) : (
                data.tournaments.map((tournament) => (
                  <Pressable key={tournament.id} style={styles.tour} onPress={() => router.push(`/torneo/${tournament.id}`)}>
                    <Ionicons name="trophy" size={18} color={colors.yellow} />
                    <View style={styles.flex}>
                      <T variant="strong">{tournament.name}</T>
                      <T variant="tiny" color={colors.muted}>
                        {tournament.status === 'completed' ? 'Finalizado' : 'En juego'}
                      </T>
                    </View>
                    <Ionicons name="chevron-forward" size={16} color={colors.faint} />
                  </Pressable>
                ))
              )}
              <Button label="Registrar un partido del grupo" onPress={() => router.push('/jugar')} />
            </>
          );
        }}
      </Gate>
    </Screen>
  );
}

function formOf(playerId: string, recent: Match[]): ('w' | 'd' | 'l')[] {
  return recent
    .filter((match) => match.playerAId === playerId || match.playerBId === playerId)
    .slice(0, 5)
    .map((match) => (match.isDraw || !match.winnerId ? 'd' : match.winnerId === playerId ? 'w' : 'l'));
}

const styles = StyleSheet.create({
  identity: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: -8 },
  king: { flexDirection: 'row', minHeight: 84, overflow: 'hidden' },
  kingLeft: { flex: 1, backgroundColor: colors.yellow, padding: 12, justifyContent: 'center', transform: [{ skewX: '-6deg' }], marginRight: -12 },
  kingRight: { width: 110, backgroundColor: colors.navy, alignItems: 'flex-end', justifyContent: 'center', paddingRight: 12, borderLeftWidth: 4, borderLeftColor: colors.red },
  plain: { textTransform: 'none', letterSpacing: 0 },
  table: { gap: 2 },
  headRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 4 },
  bodyRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(8,12,36,0.72)', paddingVertical: 6 },
  leaderRow: { borderLeftWidth: 3, borderLeftColor: colors.yellow },
  name: { flex: 1.4 },
  cell: { width: 32, textAlign: 'center' },
  player: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  form: { width: 48, flexDirection: 'row', gap: 2, justifyContent: 'flex-end' },
  matrix: { backgroundColor: 'rgba(8,12,36,0.72)', padding: 8, gap: 4 },
  matrixRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  matrixName: { width: 36 },
  matrixCell: { width: 46, height: 32, alignItems: 'center', justifyContent: 'center' },
  hatch: { backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
  tour: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 10,
    backgroundColor: 'rgba(8,12,36,0.72)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  flex: { flex: 1 },
});
