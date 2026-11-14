import { Platform, StyleSheet, View } from 'react-native';
import { Icon } from '../../../ui/icon';
import { useApp } from '../../../state/app-provider';
import { useQuery } from '../../../state/use-query';
import { tabQueries } from '../../../state/queries';
import { ScoreBar, SectionHead, Wordmark } from '../../../ui/broadcast';
import {
  BentoRow,
  HotCups,
  MoversTile,
  ResultsGrid,
  RivalryTile,
  StarsCarousel,
  StreaksTile,
  TopTile,
} from '../../../ui/billboard';
import { AdCarousel } from '../../../ui/ad-carousel';
import type { BillboardSnapshot } from '../../../data/snapshots';
import { Gate } from '../../../ui/controls';
import { firstName, formatWhen, scoreText, tagOf } from '../../../ui/format';
import { buildNews } from '../../../ui/news';
import { NewsTicker, TICKER_SPACE } from '../../../ui/news-ticker';
import { Screen } from '../../../ui/screen';
import { colors, layout, space } from '../../../ui/theme';
import { T } from '../../../ui/text';
import { Pop, Rise } from '../../../ui/motion';
import { CardsSkeleton, HomeSkeleton } from '../../../ui/skeleton';
import { push } from '../../../ui/nav';
import { SportPress } from '../../../ui/press';

export default function Home() {
  const { repo, userId, version, mode, profile, unread } = useApp();
  const q = tabQueries(repo, userId!);
  const query = useQuery(q.home.load, [repo, userId, version], q.home.key);
  const groups = useQuery(q.groups.load, [repo, userId, version], q.groups.key);
  const board = useQuery(q.billboard.load, [repo, userId, version], q.billboard.key);
  const lead = groups.data?.find((item) => item.leader);
  const news = buildNews({
    me: userId ?? '',
    recent: query.data?.recent ?? [],
    people: query.data?.people ?? {},
    actionCount: query.data?.actionMatches.length ?? 0,
    streak: query.data?.record.currentStreak ?? { type: 'none', count: 0 },
    leader: lead?.leader ? { groupName: lead.group.name, leaderName: firstName(lead.leader.displayName) } : null,
    tournaments: (board.data?.tournaments ?? []).map((item) => ({
      name: item.tournament.name,
      status: item.tournament.status,
      players: item.tournament.playerIds.length,
      winnerName: item.champion?.displayName ?? null,
    })),
  });

  return (
    <Screen tab footer={<NewsTicker items={news} />} footerHeight={TICKER_SPACE}>
      <Gate query={query} skeleton={<HomeSkeleton />}>
        {(home) => {
          const pending = [...home.actionMatches, ...home.waitingMatches];
          const confirmar = (
            <>
              <SectionHead title={`Por confirmar · ${pending.length}`} action="Ver todos" onAction={() => {
                  const next = pending[0];
                  if (next) push(`/partido/${next.id}`);
                }} />
                {pending.length === 0 ? (
                  <T color={colors.muted}>No tienes nada pendiente. Cuando alguien te rete, aparece aquí.</T>
                ) : (
                  pending.slice(0, 2).map((match, index) => {
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
                          : home.toConfirm.includes(match.id)
                            ? `Te toca confirmar · ${firstName(other?.displayName ?? 'tu rival')} ya registró el resultado`
                            : needs
                              ? `En juego · registra el resultado al terminar · ${formatWhen(match.createdAt)}`
                              : `Esperando que ${firstName(other?.displayName ?? 'tu rival')} confirme · ${formatWhen(match.createdAt)}`;
                    return (
                      <Rise key={match.id} index={index + 1}>
                      <ScoreBar
                        leftTag={tagOf(me?.displayName ?? 'Tú')}
                        rightTag={tagOf(other?.displayName ?? 'Rival')}
                        leftPhoto={me?.photoUrl}
                        rightPhoto={other?.photoUrl}
                        score={shown ?? 'VS'}
                        action={match.status === 'pending_accept' ? (needs ? 'Aceptar' : 'Esperando') : home.toConfirm.includes(match.id) ? 'Confirmar' : needs ? 'Registrar' : 'Esperando'}
                        actionTone={needs ? 'yellow' : 'ghost'}
                        onPress={() => push(`/partido/${match.id}`)}
                        note={note}
                      />
                      </Rise>
                    );
                  })
                )}
              </>
          );
          return (
            <>
              <View style={styles.brandRow}>
                <Wordmark size={20} />
                <SportPress
                  accessibilityLabel={`Avisos${unread + home.actionMatches.length ? `, ${unread + home.actionMatches.length} pendientes` : ''}`}
                  onPress={() => push('/avisos')}
                  style={styles.bell}
                >
                  <Icon name={unread ? 'notificaciones-punto' : 'notificaciones'} size={20} color={colors.text} />
                  {unread + home.actionMatches.length > 0 ? (
                    <View style={styles.badge}>
                      <Pop value={unread + home.actionMatches.length}>
                        <T variant="tiny" color={colors.ink} style={{ fontSize: 10 }}>
                          {Math.min(unread + home.actionMatches.length, 99)}
                        </T>
                      </Pop>
                    </View>
                  ) : null}
                </SportPress>
              </View>
              {mode === 'demo' ? (
                <T variant="tiny" color={colors.faint} style={styles.plain}>
                  Modo demostración · los datos viven en este navegador
                </T>
              ) : null}
              {pending.length > 0 ? <View style={styles.block}>{confirmar}</View> : null}
              {board.data ? (
                <Mosaic board={board.data} me={userId!} first={pending.length > 0 ? 2 : 0} />
              ) : board.error ? null : (
                <BillboardSkeleton />
              )}
              {pending.length === 0 ? (
                <SportPress style={styles.allClear} onPress={() => push('/avisos')} accessibilityLabel="Por confirmar · 0">
                  <Icon name="confirmado" size={18} color={colors.accentText} />
                  <T variant="tiny" color={colors.muted} style={[styles.plain, { flex: 1 }]}>
                    No tienes nada pendiente. Cuando alguien te rete, aparece aquí.
                  </T>
                </SportPress>
              ) : null}
            </>
          );
        }}
      </Gate>
    </Screen>
  );
}


const styles = StyleSheet.create({
  adTile: { flex: 1, alignSelf: 'flex-start' },
  brandRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  bell: {
    width: 42,
    height: 42,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.wash,
  },
  badge: {
    position: 'absolute',
    top: -6,
    right: -6,
    minWidth: 18,
    height: 18,
    paddingHorizontal: 4,
    borderRadius: 999,
    backgroundColor: colors.yellow,
    alignItems: 'center',
    justifyContent: 'center',
  },
  plain: { textTransform: 'none', letterSpacing: 0 },
  block: { gap: layout.title },
  mosaic: { gap: layout.stack },
  col: { flex: 1, gap: layout.card },
  allClear: { flexDirection: 'row', alignItems: 'center', gap: space.sm, padding: space.md, borderRadius: 16, borderWidth: 1, borderColor: colors.line },
});

/** Portada en mosaico: piezas de distintos tamaños (ancho completo, medio ancho, fichas cuadradas). */
function Mosaic({ board, me, first }: { board: BillboardSnapshot; me: string; first: number }) {
  const side = board.movers.length > 0 || board.streaks.length > 0;
  return (
    <View style={styles.mosaic}>
      <Rise index={first}>
        <StarsCarousel board={board} me={me} />
      </Rise>
      {board.top.length ? (
        <Rise index={first + 2}>
          <BentoRow>
            <TopTile board={board} me={me} />
            {side ? (
              <View style={styles.col}>
                {board.movers.length ? <MoversTile board={board} me={me} /> : null}
                {board.streaks.length ? <StreaksTile board={board} me={me} /> : null}
              </View>
            ) : (
              <AdCarousel section="inicio-ficha" style={styles.adTile} />
            )}
          </BentoRow>
        </Rise>
      ) : null}
      <Rise index={first + 3}>
        <AdCarousel section="inicio-franja" />
      </Rise>
      <Rise index={first + 4}>
        <HotCups items={board.tournaments} />
      </Rise>
      <Rise index={first + 5}>
        <ResultsGrid board={board} />
      </Rise>
      <Rise index={first + 6}>
        <BentoRow>
          {board.rivalries.length ? <RivalryTile items={board.rivalries} me={me} /> : null}
          {/* Fichas de anuncio: junto a la rivalidad, o dos (desfasadas) si no hay rivalidad. */}
          <AdCarousel section="inicio-ficha" startAt={side ? 0 : 1} style={styles.adTile} />
          {board.rivalries.length ? null : <AdCarousel section="inicio-ficha" startAt={side ? 2 : 3} style={styles.adTile} />}
        </BentoRow>
      </Rise>
    </View>
  );
}

function BillboardSkeleton() {
  return <CardsSkeleton cards={2} />;
}
