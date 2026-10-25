import { router } from 'expo-router';
import { Platform, Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '../../../state/app-provider';
import { useQuery } from '../../../state/use-query';
import { InitialsMark, QuickTile, ScoreBar, SectionHead, Ticker, Wordmark } from '../../../ui/broadcast';
import { HomeBanner } from '../../../ui/banner';
import { Gate } from '../../../ui/controls';
import { elo, firstName, formatWhen, pct, scoreText, streakLabel, tagOf } from '../../../ui/format';
import { Screen } from '../../../ui/screen';
import { colors } from '../../../ui/theme';
import { T } from '../../../ui/text';

export default function Home() {
  const { repo, userId, version, mode } = useApp();
  const query = useQuery(() => repo.homeSnapshot(userId!), [repo, userId, version]);
  const groups = useQuery(() => repo.groupsSnapshot(userId!), [repo, userId, version]);

  return (
    <Screen tab footer={query.data ? <Ticker text={tickerLine(query.data, userId!)} /> : undefined}>
      <Gate query={query}>
        {(home) => {
          const group = groups.data?.[0];
          const pending = [...home.actionMatches, ...home.waitingMatches];
          const played = home.record.played;
          const win = Math.max(home.record.wins, 0);
          const draw = Math.max(home.record.draws, 0);
          const loss = Math.max(home.record.losses, 0);
          const total = Math.max(win + draw + loss, 1);
          const streak = home.record.currentStreak;
          const rivalId = home.recent[0]
            ? home.recent[0].playerAId === userId
              ? home.recent[0].playerBId
              : home.recent[0].playerAId
            : null;
          return (
            <>
              <View style={styles.brandRow}>
                <Wordmark size={20} />
                <Pressable
                 
                  accessibilityLabel="Pendientes"
                  onPress={() => {
                    const next = home.actionMatches[0];
                    if (next) router.push(`/partido/${next.id}`);
                  }}
                  style={styles.bell}
                >
                  <Ionicons name="notifications-outline" size={20} color="#fff" />
                  {home.actionMatches.length > 0 ? (
                    <View style={styles.badge}>
                      <T variant="tiny" color={colors.ink} style={{ fontSize: 10 }}>
                        {home.actionMatches.length}
                      </T>
                    </View>
                  ) : null}
                </Pressable>
              </View>
              <HomeBanner />
              {mode === 'demo' ? (
                <T variant="tiny" color={colors.faint} style={styles.plain}>
                  Modo demostración · los datos viven en este navegador
                </T>
              ) : null}
              <Pressable style={styles.hero} onPress={() => router.push('/perfil')}>
                <View style={styles.heroLeft}>
                  <View
                    style={[
                      styles.stripes,
                      Platform.OS === 'web'
                        ? ({
                            backgroundImage:
                              'repeating-linear-gradient(-58deg, transparent 0 7px, rgba(0,0,0,0.22) 7px 11px)',
                          } as object)
                        : { backgroundColor: 'rgba(0,0,0,0.15)' },
                    ]}
                    pointerEvents="none"
                  />
                  <T variant="display" style={styles.bigNum}>
                    {played}
                  </T>
                  <T variant="label" color={colors.redInk} style={{ fontSize: 12 }}>
                    Partidos
                  </T>
                  <View style={styles.heroMark}>
                    <InitialsMark name={home.profile.displayName} avatarKey={home.profile.avatarKey} size={78} fontSize={28} />
                  </View>
                </View>
                <View style={styles.heroRight}>
                  <T variant="tiny" color={colors.yellow}>
                    Tu ficha
                  </T>
                  <T variant="display" style={styles.heroName} numberOfLines={2}>
                    {firstName(home.profile.displayName)}
                  </T>
                  <View style={styles.eloRow}>
                    <View style={styles.eloTag}>
                      <T variant="tiny" color={colors.ink}>
                        ELO
                      </T>
                    </View>
                    <View style={styles.eloNum}>
                      <T variant="display" style={{ fontSize: 28, color: colors.ink, fontStyle: 'italic' }}>
                        {elo(home.rating)}
                      </T>
                    </View>
                  </View>
                  <View style={styles.tags}>
                    {group?.yourPlace ? (
                      <View style={styles.tagDark}>
                        <T variant="tiny" color={colors.yellow}>
                          #{group.yourPlace} {group.group.name}
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
                    <T variant="tiny" color={colors.yellow}>
                      {pct(home.record.winRate)} victorias
                    </T>
                  </View>
                </View>
              </Pressable>
              <SectionHead title={`Por confirmar · ${pending.length}`} action="Ver todos" onAction={() => {
                const next = pending[0];
                if (next) router.push(`/partido/${next.id}`);
              }} />
              {pending.length === 0 ? (
                <T color={colors.muted}>No tienes nada pendiente. Cuando alguien te rete, aparece aquí.</T>
              ) : (
                pending.slice(0, 3).map((match) => {
                  const otherId = match.playerAId === userId ? match.playerBId : match.playerAId;
                  const other = home.people[otherId];
                  const me = home.people[userId!];
                  const mine = match.playerAId === userId ? match.goalsA : match.goalsB;
                  const theirs = match.playerAId === userId ? match.goalsB : match.goalsA;
                  const shown = scoreText(mine, theirs);
                  const needs = home.actionMatches.some((item) => item.id === match.id);
                  const note =
                    match.status === 'pending_accept'
                      ? needs
                        ? `Te toca aceptar · lo propuso ${firstName(home.people[match.playerAId]?.displayName ?? 'tu rival')} · ${formatWhen(match.createdAt)}`
                        : `Esperando a ${firstName(other?.displayName ?? 'tu rival')} · lo propusiste ${formatWhen(match.createdAt)}`
                      : match.status === 'disputed'
                        ? 'En disputa · nadie suma hasta que coincidan'
                        : needs
                          ? `Te toca votar · ${formatWhen(match.createdAt)}`
                          : `Falta ${firstName(other?.displayName ?? 'tu rival')} · ${formatWhen(match.createdAt)}`;
                  return (
                    <ScoreBar
                      key={match.id}
                      leftTag={tagOf(me?.displayName ?? 'Tú')}
                      rightTag={tagOf(other?.displayName ?? 'Rival')}
                      score={shown ?? 'VS'}
                      action={needs ? 'Confirmar' : 'Esperando'}
                      actionTone={needs ? 'yellow' : 'ghost'}
                      onPress={() => router.push(`/partido/${match.id}`)}
                      note={note}
                    />
                  );
                })
              )}
              <SectionHead title="Accesos rápidos" />
              <View style={styles.grid}>
                <QuickTile kicker="Nuevo partido" title="Registrar" color={colors.yellow} ink={colors.ink} icon="add" onPress={() => router.push('/jugar')} />
                <QuickTile
                  kicker="Cara a cara"
                  title="Versus"
                  color={colors.red}
                  ink={colors.redInk}
                  icon="git-compare"
                  onPress={() => (rivalId ? router.push(`/versus/${rivalId}`) : router.push('/amigos'))}
                />
                <QuickTile
                  kicker={group?.group.name ?? 'Tu grupo'}
                  title="Tabla"
                  color={colors.blue}
                  icon="stats-chart"
                  onPress={() => (group ? router.push(`/grupo/${group.group.id}`) : router.push('/grupos'))}
                />
                <QuickTile kicker="Copa relámpago" title="Torneos" color="#fff" ink={colors.ink} icon="bracket" onPress={() => router.push('/torneos')} />
              </View>
            </>
          );
        }}
      </Gate>
    </Screen>
  );
}

function tickerLine(
  home: {
    recent: { playerAId: string; playerBId: string; goalsA: number | null; goalsB: number | null; isDraw: boolean; winnerId: string | null; confirmedAt: string | null }[];
    people: Record<string, { displayName: string }>;
  },
  _me: string,
): string {
  const match = home.recent[0];
  if (!match) return 'Todavía no hay un resultado confirmado';
  const a = firstName(home.people[match.playerAId]?.displayName ?? 'Alguien');
  const b = firstName(home.people[match.playerBId]?.displayName ?? 'alguien');
  const score = match.goalsA != null && match.goalsB != null ? `${match.goalsA}-${match.goalsB}` : 'sin goles';
  const winner = match.isDraw ? 'Empate' : `${firstName(home.people[match.winnerId ?? '']?.displayName ?? a)} se lo llevó`;
  const when = match.confirmedAt ? formatWhen(match.confirmedAt) : '';
  return `${a} ${score} ${b} · ${winner}${when ? ` · ${when}` : ''}`;
}

const styles = StyleSheet.create({
  brandRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  bell: {
    width: 42,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.16)',
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  badge: {
    position: 'absolute',
    top: -6,
    right: -6,
    minWidth: 18,
    height: 18,
    paddingHorizontal: 4,
    backgroundColor: colors.yellow,
    alignItems: 'center',
    justifyContent: 'center',
  },
  plain: { textTransform: 'none', letterSpacing: 0 },
  hero: { flexDirection: 'row', minHeight: 220, overflow: 'hidden', backgroundColor: colors.navy },
  heroLeft: { width: '38%', backgroundColor: colors.red, paddingTop: 14, paddingLeft: 12, paddingBottom: 12, justifyContent: 'flex-start', overflow: 'hidden' },
  stripes: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    opacity: 0.45,
  },
  bigNum: { fontSize: 68, fontStyle: 'italic', color: colors.redInk, lineHeight: 70 },
  heroMark: { position: 'absolute', right: -16, bottom: 8, opacity: 0.9 },
  heroRight: { flex: 1, padding: 12, gap: 6, justifyContent: 'center' },
  heroName: { fontSize: 36, fontStyle: 'italic', lineHeight: 36 },
  eloRow: { flexDirection: 'row', alignItems: 'stretch' },
  eloTag: { backgroundColor: colors.yellow, paddingHorizontal: 6, justifyContent: 'center' },
  eloNum: { backgroundColor: '#fff', paddingHorizontal: 8, justifyContent: 'center' },
  tags: { gap: 4 },
  tagDark: { alignSelf: 'flex-start', backgroundColor: '#04060a', paddingHorizontal: 6, paddingVertical: 3 },
  tagRed: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: colors.red, paddingHorizontal: 6, paddingVertical: 3 },
  barRow: { gap: 4, marginTop: 4 },
  bar: { flexDirection: 'row', height: 8, backgroundColor: 'rgba(255,255,255,0.08)' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
});
