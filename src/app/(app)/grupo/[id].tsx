import { useState } from 'react';
import { useLocalSearchParams } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Icon } from '../../../ui/icon';
import type { Match } from '../../../domain/types';
import { useApp } from '../../../state/app-provider';
import { useQuery } from '../../../state/use-query';
import { MatchRow } from '../../../ui/bits';
import { InitialsMark, SectionHead, Shield, SkewBlock } from '../../../ui/broadcast';
import { Button, Gate } from '../../../ui/controls';
import { elo, firstName, tagOf } from '../../../ui/format';
import { copyText, inviteUrl, openWhatsApp } from '../../../ui/share';
import { Screen, Top } from '../../../ui/screen';
import { colors, layout, space } from '../../../ui/theme';
import { T } from '../../../ui/text';
import { LogoEditor } from '../../../ui/logo-picker';
import { AccessFields } from '../../../ui/access-fields';
import { joinPolicyOf, visibilityOf, type JoinPolicy, type Visibility } from '../../../data/types';
import { push } from '../../../ui/nav';
import { SearchEmpty, SearchField } from '../../../ui/search-field';
import { matchesPerson } from '../../../domain/search';
import { humanError } from '../../../ui/errors';

export default function GroupDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { repo, userId, version, showFlash } = useApp();
  const query = useQuery(() => repo.groupSnapshot(String(id), userId!), [repo, userId, version, id], `group:${userId}:${id}`);
  const [search, setSearch] = useState('');
  const [visibility, setVisibility] = useState<Visibility | null>(null);
  const [joinPolicy, setJoinPolicy] = useState<JoinPolicy | null>(null);
  const [accessBusy, setAccessBusy] = useState(false);

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
                kicker={`${data.members.length === 1 ? '1 jugador' : `${data.members.length} jugadores`} · ${matchesPlayed === 1 ? '1 partido' : `${matchesPlayed} partidos`}`}
                back
                right={
                  <Pressable
                    hitSlop={10}
                    accessibilityRole="button"
                    accessibilityLabel="Invitar al grupo"
                    onPress={() => {
                      repo
                        .createInvite(userId!)
                        .then((invite) => {
                          void copyText(inviteUrl(invite.code));
                          openWhatsApp(invite.code);
                        })
                        .catch((cause: unknown) => {
                          showFlash({ id: `invite-error-${Date.now()}`, title: 'No se pudo crear la invitación', body: humanError(cause), tone: 'danger' });
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

              <LogoEditor kind="groups" entity={data.group} canEdit={data.yourRole === 'owner' || data.group.createdBy === userId} />
              {data.yourRole === 'owner' ? (
                <View style={styles.access}>
                  <AccessFields
                    visibility={visibility ?? visibilityOf(data.group)}
                    joinPolicy={joinPolicy ?? joinPolicyOf(data.group)}
                    onVisibility={setVisibility}
                    onPolicy={setJoinPolicy}
                    kind="group"
                  />
                  <Button
                      label={accessBusy ? 'Guardando…' : 'Guardar acceso'}
                      pending={accessBusy}
                      onPress={() => {
                        setAccessBusy(true);
                        void repo
                          .setGroupAccess(userId!, data.group.id, visibility ?? visibilityOf(data.group), joinPolicy ?? joinPolicyOf(data.group))
                          .then(() => showFlash({ id: `access-${data.group.id}`, title: 'Acceso actualizado', tone: 'accent' }))
                          .catch((cause: unknown) => showFlash({ id: `access-error-${data.group.id}`, title: 'No se pudo guardar', body: humanError(cause), tone: 'danger' }))
                          .finally(() => setAccessBusy(false));
                      }}
                    />
                  {data.joinRequests.length ? (
                    <View style={styles.requests}>
                      <T variant="strong">Solicitudes</T>
                      {data.joinRequests.map((item) => (
                        <View key={item.id} style={styles.requestRow}>
                          <T variant="medium" style={{ flex: 1 }} numberOfLines={1}>
                            {item.profile.displayName}
                          </T>
                          <Button label="Aprobar" onPress={() => void repo.decideGroupJoin(userId!, item.id, true).catch((cause: unknown) => showFlash({ id: `dec-${item.id}`, title: 'No se pudo decidir', body: humanError(cause), tone: 'danger' }))} />
                          <Button label="Rechazar" tone="ghost" onPress={() => void repo.decideGroupJoin(userId!, item.id, false).catch((cause: unknown) => showFlash({ id: `dec-${item.id}`, title: 'No se pudo decidir', body: humanError(cause), tone: 'danger' }))} />
                        </View>
                      ))}
                    </View>
                  ) : null}
                </View>
              ) : null}
              <View style={styles.king}>
                <View style={styles.kingLeft}>
                  <T variant="tiny" color={colors.ink}>
                    Quién manda
                  </T>
                  <T variant="display" style={{ fontSize: 26, color: colors.ink, fontStyle: 'normal' }} numberOfLines={1}>
                    {data.leader ? firstName(data.leader.displayName) : 'Nadie'}
                  </T>
                  <T variant="tiny" color={colors.ink} style={styles.plain}>
                    {data.leader ? 'Lidera el Elo del grupo' : `Hacen falta ${data.minMatches} partidos para entrar`}
                  </T>
                </View>
                <View style={styles.kingRight}>
                  <T variant="display" style={{ fontSize: 28, color: colors.text, fontStyle: 'normal' }}>
                    {leaderRow ? elo(leaderRow.rating) : '—'}
                  </T>
                  <T variant="tiny" color={colors.accentText}>
                    ELO
                  </T>
                </View>
              </View>
              <SectionHead title="Tabla de posiciones" action="T3" />
              {data.members.length >= 8 ? <SearchField value={search} onChange={setSearch} placeholder="Busca un jugador del grupo" /> : null}
              {search && !data.table.some((row) => matchesPerson(row.profile, search)) ? <SearchEmpty query={search} hint="No está en este grupo." /> : null}
              <View style={styles.table}>
                <View style={styles.headRow}>
                  {['#', 'Jugador', 'PJ', 'G', 'P', 'ELO', 'Forma'].map((label) => (
                    <T
                      key={label}
                      variant="tiny"
                      color={colors.faint}
                      style={label === 'Jugador' ? styles.name : label === 'ELO' ? styles.elo : label === 'Forma' ? styles.formHead : styles.cell}
                    >
                      {label}
                    </T>
                  ))}
                </View>
                {data.table.map((row, index) => {
                  if (!matchesPerson(row.profile, search)) return null;
                  const form = formOf(row.playerId, data.recent);
                  return (
                    <Pressable
                      key={row.playerId}
                      style={[styles.bodyRow, index === 0 && styles.leaderRow]}
                      onPress={() => push(`/jugador/${row.playerId}`)}
                      accessibilityRole="link"
                      accessibilityLabel={row.profile.displayName}
                    >
                      <T variant="strong" style={styles.cell}>
                        {index + 1}
                      </T>
                      <View style={[styles.name, styles.player]}>
                        <InitialsMark name={row.profile.displayName} avatarKey={row.profile.avatarKey} photoUrl={row.profile.photoUrl} size={26} fontSize={11} />
                        <T numberOfLines={1} variant="strong">
                          {firstName(row.profile.displayName)}
                        </T>
                      </View>
                      <T style={styles.cell}>{row.played}</T>
                      <T style={styles.cell}>{row.wins}</T>
                      <T style={styles.cell}>{row.losses}</T>
                      <T variant="strong" numberOfLines={1} style={styles.elo}>
                        {elo(row.rating)}
                      </T>
                      <View style={[styles.cell, styles.form]}>
                        {form.map((item, i) => (
                          <View
                            key={`${row.playerId}-${i}`}
                            style={{
                              width: 7,
                              height: 14,
                              backgroundColor: item === 'w' ? colors.win : item === 'd' ? colors.draw : colors.loss,
                            }}
                          />
                        ))}
                      </View>
                    </Pressable>
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
                        const tone = wins > losses ? colors.red : losses > wins ? colors.blue : colors.line;
                        return (
                          <View key={col.id} style={[styles.matrixCell, { backgroundColor: tone }]}>
                            <T variant="tiny" color={wins > losses ? colors.redInk : colors.text}>
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
              <SectionHead title="Torneos" action="Crear" onAction={() => push(`/torneo/nuevo?grupo=${data.group.id}`)} />
              {data.tournaments.length === 0 ? (
                <T color={colors.muted}>Puedes armar una eliminación de 4, 8 o 16, o una liga de todos contra todos.</T>
              ) : (
                data.tournaments.map((tournament) => (
                  <Pressable key={tournament.id} style={styles.tour} onPress={() => push(`/torneo/${tournament.id}`)}>
                    <Shield letters="" photoUrl={tournament.photoUrl} kind="tournaments" id={tournament.id} logo={tournament.logo} size={36} />
                    <View style={styles.flex}>
                      <T variant="strong">{tournament.name}</T>
                      <T variant="tiny" color={colors.muted}>
                        {tournament.status === 'completed' ? 'Finalizado' : 'En juego'}
                      </T>
                    </View>
                    <Icon name="adelante" size={16} color={colors.faint} />
                  </Pressable>
                ))
              )}
              <Button label="Registrar un partido del grupo" onPress={() => push('/jugar')} />
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
  access: { gap: space.md },
  requests: { gap: space.sm },
  requestRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  king: { flexDirection: 'row', minHeight: 84, overflow: 'hidden' },
  kingLeft: { flex: 1, backgroundColor: colors.yellow, padding: 12, justifyContent: 'center', transform: [{ skewX: '0deg' }], marginRight: -12, borderRadius: 14 },
  kingRight: { width: 110, backgroundColor: colors.navy, alignItems: 'flex-end', justifyContent: 'center', paddingRight: 12, borderLeftWidth: 4, borderLeftColor: colors.red, borderRadius: 14 },
  plain: { textTransform: 'none', letterSpacing: 0 },
  table: { gap: space.sm },
  headRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 4 },
  bodyRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.card, paddingVertical: 10, paddingHorizontal: space.xs, minHeight: 48, borderRadius: 12 },
  leaderRow: { borderLeftWidth: 3, borderLeftColor: colors.yellow },
  name: { flex: 1.4 },
  cell: { width: 28, textAlign: 'center', fontSize: 13 },
  elo: { width: 48, textAlign: 'right', fontSize: 13, lineHeight: 16 },
  player: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  form: { width: 44, flexDirection: 'row', gap: space.xxs, justifyContent: 'flex-end' },
  formHead: { width: 44, textAlign: 'right' },
  matrix: { backgroundColor: colors.card, padding: 10, gap: 6, borderRadius: 14 },
  matrixRow: { flexDirection: 'row', alignItems: 'center', gap: space.xs },
  matrixName: { width: 36 },
  matrixCell: { width: 46, height: 32, alignItems: 'center', justifyContent: 'center' },
  hatch: { backgroundColor: colors.wash, borderWidth: 1, borderColor: colors.line, borderRadius: 14 },
  tour: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    padding: space.md,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 14,
  },
  flex: { flex: 1 },
});
