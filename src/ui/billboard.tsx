// Portada del inicio: los jugadores del círculo como estrellas. Solo datos de partidos confirmados.
import { Platform, ScrollView, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { BillboardPlayer, BillboardRivalry, BillboardSnapshot, BillboardTournament } from '../data/snapshots';
import { InitialsMark, ScoreBar, SectionHead, Shield } from './broadcast';
import { elo, firstName, formatWhen, monogram, pct, scoreText, signed, tagOf } from './format';
import { CountRoll, Rise } from './motion';
import { push } from './nav';
import { SportPress } from './press';
import { colors } from './theme';
import { T } from './text';

const web = Platform.OS === 'web';

/** A dónde lleva tocar a un jugador: tu perfil, o el cara a cara con él. */
export function playerHref(me: string, playerId: string): `/perfil` | `/versus/${string}` {
  return playerId === me ? '/perfil' : `/versus/${playerId}`;
}

function lastNames(displayName: string): string {
  return displayName.trim().split(/\s+/).slice(1).join(' ');
}

export function starKicker(reason: 'week' | 'month' | 'top'): string {
  if (reason === 'week') return 'Estrella de la semana';
  if (reason === 'month') return 'Estrella del mes';
  return 'Número 1 del ranking';
}

function windowLabel(days: number): string {
  return days <= 7 ? 'en la semana' : 'en el mes';
}

const formColor = { win: colors.yellow, draw: colors.draw, loss: colors.loss } as const;
const formLetter = { win: 'V', draw: 'E', loss: 'D' } as const;

export function FormDots({ form, size = 18 }: { form: BillboardPlayer['form']; size?: number }) {
  if (!form.length) return null;
  return (
    <View style={styles.form} accessibilityLabel="Últimos resultados">
      {form.map((outcome, index) => (
        <View key={index} style={[styles.formDot, { width: size, height: size, backgroundColor: formColor[outcome] }]}>
          <T variant="tiny" color={colors.ink} style={{ fontSize: Math.round(size * 0.55), letterSpacing: 0 }}>
            {formLetter[outcome]}
          </T>
        </View>
      ))}
    </View>
  );
}

export function StarHero({ board, me }: { board: BillboardSnapshot; me: string }) {
  if (!board.star) {
    return (
      <SportPress style={[styles.hero, styles.heroEmpty]} onPress={() => push('/jugar')} accessibilityLabel="Registrar partido">
        <T variant="label" color={colors.accentText}>
          Estrella de la semana
        </T>
        <T variant="display" style={styles.emptyTitle}>
          Tu nombre puede estar aquí
        </T>
        <T color={colors.muted} style={styles.plain}>
          Registra tu primer partido con un amigo. Cuando los dos lo confirmen, entras a la portada.
        </T>
        <View style={styles.cta}>
          <T variant="title" color={colors.ink} style={{ fontSize: 15 }}>
            Registrar partido
          </T>
        </View>
      </SportPress>
    );
  }
  const { player, reason } = board.star;
  const rest = lastNames(player.profile.displayName);
  const hot = player.streak.type === 'win' && player.streak.count >= 2;
  return (
    <SportPress
      style={styles.hero}
      onPress={() => push(playerHref(me, player.profile.id))}
      accessibilityLabel={`${starKicker(reason)}: ${player.profile.displayName}`}
    >
      <View style={styles.heroGlow} pointerEvents="none" />
      <View style={styles.heroPhoto} pointerEvents="none">
        <InitialsMark
          name={player.profile.displayName}
          avatarKey={player.profile.avatarKey}
          photoUrl={player.profile.photoUrl}
          size={170}
          fontSize={64}
        />
      </View>
      <View style={styles.heroBody}>
        <View style={styles.kicker}>
          <Ionicons name="star" size={12} color={colors.ink} />
          <T variant="tiny" color={colors.ink}>
            {starKicker(reason)}
          </T>
        </View>
        <T variant="display" style={styles.heroName} numberOfLines={1} adjustsFontSizeToFit>
          {firstName(player.profile.displayName)}
        </T>
        {rest ? (
          <T variant="title" color={colors.muted} style={styles.heroLast} numberOfLines={1}>
            {rest}
          </T>
        ) : null}
        <View style={styles.heroStats}>
          <View>
            <CountRoll value={player.rating} format={(n) => elo(Math.round(n))}>
              {(shown) => (
                <T variant="display" style={styles.heroNum}>
                  {shown}
                </T>
              )}
            </CountRoll>
            <T variant="tiny" color={colors.accentText}>
              Elo
            </T>
          </View>
          {reason !== 'top' ? (
            <View>
              <CountRoll value={player.windowWins} format={(n) => String(Math.round(n))}>
                {(shown) => (
                  <T variant="display" style={styles.heroNum}>
                    {shown}
                  </T>
                )}
              </CountRoll>
              <T variant="tiny" color={colors.accentText}>
                {reason === 'week' ? 'Victorias · semana' : 'Victorias · mes'}
              </T>
            </View>
          ) : (
            <View>
              <T variant="display" style={styles.heroNum}>
                {pct(player.winRate)}
              </T>
              <T variant="tiny" color={colors.accentText}>
                Victorias
              </T>
            </View>
          )}
        </View>
        <View style={styles.chips}>
          {player.place ? (
            <View style={styles.chipLight}>
              <T variant="tiny" color={colors.text}>
                #{player.place} Ranking
              </T>
            </View>
          ) : null}
          {hot ? (
            <View style={styles.chipHot}>
              <Ionicons name="flame" size={12} color={colors.redInk} />
              <T variant="tiny" color={colors.redInk}>
                Racha de {player.streak.count} victorias
              </T>
            </View>
          ) : null}
          {reason !== 'top' && player.windowDelta > 0 ? (
            <View style={styles.chipUp}>
              <Ionicons name="trending-up" size={12} color={colors.ink} />
              <T variant="tiny" color={colors.ink}>
                {signed(Math.round(player.windowDelta))} Elo
              </T>
            </View>
          ) : null}
        </View>
        <FormDots form={player.form} />
      </View>
    </SportPress>
  );
}

function cupStatus(item: BillboardTournament): string {
  return item.tournament.status === 'in_progress' ? 'En juego' : 'Finalizado';
}

export function HotCups({ items }: { items: BillboardTournament[] }) {
  if (!items.length) return null;
  return (
    <>
      <SectionHead title="Torneos más calientes" action="Ver todos" onAction={() => push('/torneos')} />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.carousel} style={styles.carouselWrap}>
        {items.map((item) => {
          const live = item.tournament.status === 'in_progress';
          const who = item.champion ?? item.leader;
          return (
            <SportPress
              key={item.tournament.id}
              style={[styles.cup, live && styles.cupLive]}
              onPress={() => push(`/torneo/${item.tournament.id}`)}
              accessibilityLabel={item.tournament.name}
            >
              <View style={styles.cupTop}>
                <Shield letters={monogram(item.tournament.name)} photoUrl={item.tournament.photoUrl} size={44} />
                <View style={[styles.status, live ? styles.statusLive : styles.statusDone]}>
                  {live ? <View style={styles.liveDot} /> : <Ionicons name="trophy" size={10} color={colors.ink} />}
                  <T variant="tiny" color={colors.ink} style={{ fontSize: 10 }}>
                    {cupStatus(item)}
                  </T>
                </View>
              </View>
              <T variant="title" numberOfLines={2} style={styles.cupName}>
                {item.tournament.name}
              </T>
              <T variant="tiny" color={colors.muted} numberOfLines={1}>
                {item.groupName}
              </T>
              <View style={styles.cupMeta}>
                <T variant="tiny" color={colors.accentText}>
                  {item.tournament.playerIds.length} jugadores
                </T>
                <T variant="tiny" color={colors.accentText}>
                  {item.played} partidos
                </T>
              </View>
              {who ? (
                <View style={styles.cupWho}>
                  <InitialsMark name={who.displayName} avatarKey={who.avatarKey} photoUrl={who.photoUrl} size={26} fontSize={11} />
                  <View style={{ flex: 1 }}>
                    <T variant="tiny" color={colors.faint} style={{ fontSize: 9 }}>
                      {item.champion ? 'Campeón' : 'Va primero'}
                    </T>
                    <T variant="strong" numberOfLines={1} style={{ fontSize: 14 }}>
                      {firstName(who.displayName)}
                    </T>
                  </View>
                </View>
              ) : (
                <T variant="tiny" color={colors.faint} style={styles.plain}>
                  Todavía sin partidos confirmados
                </T>
              )}
            </SportPress>
          );
        })}
      </ScrollView>
    </>
  );
}

export function TopBoard({ board, me }: { board: BillboardSnapshot; me: string }) {
  if (!board.top.length) return null;
  const up = new Map(board.movers.map((item) => [item.profile.id, item.windowDelta]));
  return (
    <>
      <SectionHead title="Top del ranking" action="Ranking" onAction={() => push('/ranking')} />
      <View style={styles.board}>
        {board.top.map((player, index) => {
          const delta = up.get(player.profile.id);
          const mine = player.profile.id === me;
          return (
            <Rise key={player.profile.id} index={Math.min(index + 2, 7)}>
              <SportPress
                style={[styles.row, index === 0 && styles.rowFirst, mine && styles.rowMine]}
                onPress={() => push(playerHref(me, player.profile.id))}
                accessibilityLabel={`${index + 1}. ${player.profile.displayName}`}
              >
                <T variant="display" style={[styles.place, index === 0 && { color: colors.accentText }]}>
                  {index + 1}
                </T>
                <InitialsMark name={player.profile.displayName} avatarKey={player.profile.avatarKey} photoUrl={player.profile.photoUrl} size={index === 0 ? 46 : 38} />
                <View style={styles.rowBody}>
                  <T variant="strong" numberOfLines={1} style={index === 0 ? { fontSize: 18 } : null}>
                    {player.profile.displayName}
                  </T>
                  <T variant="tiny" color={colors.muted}>
                    {player.wins} V · {player.draws} E · {player.losses} D
                  </T>
                </View>
                {delta ? (
                  <View style={styles.delta}>
                    <Ionicons name="caret-up" size={10} color={colors.up} />
                    <T variant="tiny" color={colors.up}>
                      {Math.round(delta)}
                    </T>
                  </View>
                ) : null}
                <T variant="display" style={styles.rowElo}>
                  {elo(player.rating)}
                </T>
              </SportPress>
            </Rise>
          );
        })}
      </View>
      {board.movers.length ? (
        <T variant="tiny" color={colors.faint} style={styles.plain}>
          {board.windowDays <= 7 ? 'La flecha verde es el Elo que sumó en los últimos 7 días.' : 'La flecha verde es el Elo que sumó en los últimos 30 días.'}
        </T>
      ) : null}
    </>
  );
}

export function Movers({ board, me }: { board: BillboardSnapshot; me: string }) {
  if (!board.movers.length) return null;
  return (
    <>
      <SectionHead title="Los que más suben" />
      <View style={styles.movers}>
        {board.movers.map((player) => (
          <SportPress key={player.profile.id} style={styles.mover} onPress={() => push(playerHref(me, player.profile.id))} accessibilityLabel={player.profile.displayName}>
            <InitialsMark name={player.profile.displayName} avatarKey={player.profile.avatarKey} photoUrl={player.profile.photoUrl} size={44} />
            <T variant="strong" numberOfLines={1} style={{ fontSize: 14 }}>
              {firstName(player.profile.displayName)}
            </T>
            <View style={styles.moverUp}>
              <Ionicons name="trending-up" size={14} color={colors.ink} />
              <CountRoll value={Math.round(player.windowDelta)} format={(n) => signed(Math.round(n))}>
                {(shown) => (
                  <T variant="title" color={colors.ink} style={{ fontSize: 16 }}>
                    {shown}
                  </T>
                )}
              </CountRoll>
            </View>
            <T variant="tiny" color={colors.faint} style={{ fontSize: 9 }}>
              {windowLabel(board.windowDays)}
            </T>
          </SportPress>
        ))}
      </View>
    </>
  );
}

export function RecentResults({ board }: { board: BillboardSnapshot }) {
  if (!board.results.length) return null;
  return (
    <>
      <SectionHead title="Resultados recientes" />
      {board.results.map(({ match, label }, index) => {
        const a = board.people[match.playerAId];
        const b = board.people[match.playerBId];
        const winner = match.isDraw || !match.winnerId ? null : board.people[match.winnerId];
        const pieces = [
          label,
          winner ? `Ganó ${firstName(winner.displayName)}` : 'Empate',
          match.confirmedAt ? formatWhen(match.confirmedAt) : null,
        ].filter(Boolean);
        return (
          <Rise key={match.id} index={Math.min(index + 1, 7)}>
            <ScoreBar
              leftTag={tagOf(a?.displayName ?? '—')}
              rightTag={tagOf(b?.displayName ?? '—')}
              leftPhoto={a?.photoUrl}
              rightPhoto={b?.photoUrl}
              score={scoreText(match.goalsA, match.goalsB) ?? (match.isDraw ? '=' : 'FT')}
              onPress={() => push(`/partido/${match.id}`)}
              note={pieces.join(' · ')}
            />
          </Rise>
        );
      })}
    </>
  );
}

export function Streaks({ board, me }: { board: BillboardSnapshot; me: string }) {
  if (!board.streaks.length) return null;
  return (
    <>
      <SectionHead title="Rachas encendidas" />
      <View style={styles.board}>
        {board.streaks.map((player) => (
          <SportPress key={player.profile.id} style={styles.row} onPress={() => push(playerHref(me, player.profile.id))} accessibilityLabel={player.profile.displayName}>
            <View style={styles.flame}>
              <Ionicons name="flame" size={18} color={colors.redInk} />
            </View>
            <InitialsMark name={player.profile.displayName} avatarKey={player.profile.avatarKey} photoUrl={player.profile.photoUrl} size={36} />
            <View style={styles.rowBody}>
              <T variant="strong" numberOfLines={1}>
                {player.profile.displayName}
              </T>
              <T variant="tiny" color={colors.muted}>
                Mejor racha: {player.bestWinStreak}
              </T>
            </View>
            <T variant="display" style={styles.rowElo}>
              {player.streak.count}
            </T>
            <T variant="tiny" color={colors.accentText}>
              Seguidas
            </T>
          </SportPress>
        ))}
      </View>
    </>
  );
}

export function Rivalries({ items, me }: { items: BillboardRivalry[]; me: string }) {
  if (!items.length) return null;
  return (
    <>
      <SectionHead title="Grupos más reñidos" />
      {items.map((item) => (
        <SportPress key={item.group.id} style={styles.rivalry} onPress={() => push(`/grupo/${item.group.id}`)} accessibilityLabel={item.group.name}>
          <View style={styles.rivalryHead}>
            <Shield letters={monogram(item.group.name)} photoUrl={item.group.photoUrl} size={28} />
            <T variant="strong" numberOfLines={1} style={{ flex: 1 }}>
              {item.group.name}
            </T>
            <T variant="tiny" color={colors.accentText}>
              {Math.round(item.gap)} Elo de diferencia
            </T>
          </View>
          <View style={styles.rivalryFace}>
            {[item.first, item.second].map((player, index) => (
              <View key={player.profile.id} style={[styles.rivalrySide, index === 1 && { alignItems: 'flex-end' }]}>
                <T variant="tiny" color={index === 0 ? colors.accentText : colors.faint}>
                  {index === 0 ? '1.º' : '2.º'}
                </T>
                <T variant="title" numberOfLines={1} style={{ fontSize: 18 }}>
                  {player.profile.id === me ? 'Tú' : firstName(player.profile.displayName)}
                </T>
                <T variant="tiny" color={colors.muted}>
                  {elo(player.rating)} Elo
                </T>
              </View>
            ))}
            <T variant="display" style={styles.vs}>
              VS
            </T>
          </View>
        </SportPress>
      ))}
    </>
  );
}

const styles = StyleSheet.create({
  plain: { textTransform: 'none', letterSpacing: 0 },
  hero: {
    minHeight: 260,
    borderRadius: 22,
    overflow: 'hidden',
    backgroundColor: colors.navy,
    borderWidth: 1,
    borderColor: colors.line,
    padding: 16,
    justifyContent: 'flex-end',
  },
  heroEmpty: { gap: 10, justifyContent: 'center', minHeight: 220 },
  emptyTitle: { fontSize: 34, lineHeight: 36, fontStyle: 'normal' },
  cta: { alignSelf: 'flex-start', backgroundColor: colors.yellow, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 999, marginTop: 4 },
  heroGlow: {
    position: 'absolute',
    right: -60,
    top: -60,
    width: 260,
    height: 260,
    borderRadius: 999,
    backgroundColor: colors.blue,
    opacity: 0.35,
    ...(web ? ({ filter: 'blur(30px)' } as object) : null),
  },
  heroPhoto: { position: 'absolute', right: -14, top: 14, opacity: 0.95 },
  heroBody: { gap: 6, maxWidth: '72%' },
  kicker: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    alignSelf: 'flex-start',
    backgroundColor: colors.yellow,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
  },
  heroName: { fontSize: 54, lineHeight: 56, fontStyle: 'normal', marginTop: 4 },
  heroLast: { fontSize: 20, marginTop: -6 },
  heroStats: { flexDirection: 'row', gap: 22, marginTop: 6 },
  heroNum: { fontSize: 34, lineHeight: 36, fontStyle: 'normal' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 2 },
  chipLight: { borderWidth: 1, borderColor: colors.lineStrong, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999 },
  chipHot: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: colors.red, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999 },
  chipUp: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: colors.yellow, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999 },
  form: { flexDirection: 'row', gap: 4, marginTop: 4 },
  formDot: { borderRadius: 6, alignItems: 'center', justifyContent: 'center' },
  carouselWrap: { marginHorizontal: -16 },
  carousel: { paddingHorizontal: 16, gap: 10 },
  cup: { width: 210, minHeight: 200, padding: 14, gap: 6, borderRadius: 18, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line },
  cupLive: { borderColor: colors.yellow },
  cupTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  status: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 7, paddingVertical: 3, borderRadius: 999 },
  statusLive: { backgroundColor: colors.yellow },
  statusDone: { backgroundColor: colors.gold },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.ink },
  cupName: { fontSize: 20, lineHeight: 22 },
  cupMeta: { flexDirection: 'row', gap: 10 },
  cupWho: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 'auto' },
  board: { gap: 6 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 16,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.line,
  },
  rowFirst: { borderColor: colors.yellow, paddingVertical: 14 },
  rowMine: { backgroundColor: colors.surface },
  place: { width: 26, fontSize: 24, fontStyle: 'normal', textAlign: 'center' },
  rowBody: { flex: 1, gap: 2 },
  rowElo: { fontSize: 22, fontStyle: 'normal' },
  delta: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  movers: { flexDirection: 'row', gap: 8 },
  mover: { flex: 1, alignItems: 'center', gap: 6, padding: 12, borderRadius: 16, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line },
  moverUp: { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: colors.yellow, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999 },
  flame: { width: 30, height: 30, borderRadius: 999, backgroundColor: colors.red, alignItems: 'center', justifyContent: 'center' },
  rivalry: { padding: 14, gap: 10, borderRadius: 18, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line },
  rivalryHead: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  rivalryFace: { flexDirection: 'row', alignItems: 'center' },
  rivalrySide: { flex: 1, gap: 2 },
  vs: { position: 'absolute', left: 0, right: 0, textAlign: 'center', fontSize: 22, fontStyle: 'normal', color: colors.faint },
});
