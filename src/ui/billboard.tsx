// Portada del inicio en mosaico: los jugadores del círculo como estrellas. Solo datos de partidos confirmados.
import { SocialDots } from './social-icons';
import { useState } from 'react';
import { Linking, Platform, ScrollView, StyleSheet, useWindowDimensions, View, type StyleProp, type ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import type { Href } from 'expo-router';
import type { BillboardPlayer, BillboardRivalry, BillboardSnapshot, BillboardTournament } from '../data/snapshots';
import type { SponsorSlot } from '../content/sponsors';
import { BrandIcon, InitialsMark, Shield, type BrandIconName } from './broadcast';
import { elo, firstName, formatWhen, monogram, pct, signed, tagOf } from './format';
import { CountRoll } from './motion';
import { push } from './nav';
import { SportPress } from './press';
import { colors, layout, space } from './theme';
import { T } from './text';
import { useLang } from '../i18n/lang';

const web = Platform.OS === 'web';
const GAP = layout.card;

/** A dónde lleva tocar a un jugador: su ficha pública (desde ahí, el cara a cara). */
export function playerHref(_me: string, playerId: string): `/jugador/${string}` {
  return `/jugador/${playerId}`;
}

function lastNames(displayName: string): string {
  return displayName.trim().split(/\s+/).slice(1).join(' ');
}

export function starKicker(reason: 'week' | 'month' | 'top'): string {
  if (reason === 'week') return 'Estrella de la semana';
  if (reason === 'month') return 'Estrella del mes';
  return 'Top del ranking';
}

const formColor = { win: colors.yellow, draw: colors.draw, loss: colors.loss } as const;
const formLetter = { win: 'V', draw: 'E', loss: 'D' } as const;

export function FormDots({ form, size = 16 }: { form: BillboardPlayer['form']; size?: number }) {
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

/** Encabezado compacto de bloque del mosaico. */
function TileHead({ title, action, onAction, icon }: { title: string; action?: string; onAction?: () => void; icon?: keyof typeof Ionicons.glyphMap }) {
  return (
    <View style={styles.tileHead}>
      {icon ? <Ionicons name={icon} size={14} color={colors.accentText} /> : null}
      <T variant="label" color={colors.text} style={styles.tileTitle} numberOfLines={1}>
        {title}
      </T>
      {action ? (
        <SportPress onPress={onAction} hitSlop={10}>
          <T variant="tiny" color={colors.accentText}>
            {action}
          </T>
        </SportPress>
      ) : null}
    </View>
  );
}

/** Fila de dos (o más) piezas del mosaico, con el mismo espacio entre ellas. */
export function BentoRow({ children, style }: { children: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[styles.bentoRow, style]}>{children}</View>;
}

function useCardWidth() {
  const { width } = useWindowDimensions();
  return Math.min(Math.max(width, 320), 560) - space.lg * 2;
}

/* ---------- Las estrellas: carrusel del top 5 ---------- */

function StarCard({ star, index, total, me, width }: { star: BillboardSnapshot['stars'][number]; index: number; total: number; me: string; width: number }) {
  const { player, reason } = star;
  const rest = lastNames(player.profile.displayName);
  const hot = player.streak.type === 'win' && player.streak.count >= 2;
  return (
    <SportPress
      style={[styles.star, { width }]}
      onPress={() => push(playerHref(me, player.profile.id))}
      accessibilityLabel={`${starKicker(reason)}: ${player.profile.displayName}`}
    >
      <View style={styles.starGlow} pointerEvents="none" />
      <View style={styles.starPhoto} pointerEvents="none">
        <InitialsMark name={player.profile.displayName} avatarKey={player.profile.avatarKey} photoUrl={player.profile.photoUrl} size={150} fontSize={56} />
      </View>
      <T variant="display" style={styles.starIndex} pointerEvents="none">
        {index + 1}
      </T>
      <View style={styles.starBody}>
        <View style={styles.starTopRow}>
          <View style={styles.kicker}>
            <Ionicons name="star" size={11} color={colors.ink} />
            <T variant="tiny" color={colors.ink} style={{ fontSize: 10 }}>
              {starKicker(reason)}
            </T>
          </View>
          <SocialDots links={player.profile.socialLinks} size={12} />
        </View>
        <View>
          <T variant="display" style={styles.starName} numberOfLines={1} adjustsFontSizeToFit>
            {firstName(player.profile.displayName)}
          </T>
          {rest ? (
            <T variant="strong" color={colors.muted} style={styles.starLast} numberOfLines={1}>
              {rest}
            </T>
          ) : null}
        </View>
        <View style={styles.starStats}>
          <Stat value={player.rating} label="Elo" format={(n) => elo(Math.round(n))} />
          {reason === 'top' ? (
            <View>
              <T variant="display" style={styles.starNum}>
                {pct(player.winRate)}
              </T>
              <T variant="tiny" color={colors.accentText} style={{ fontSize: 10 }}>
                Victorias
              </T>
            </View>
          ) : (
            <Stat value={player.windowWins} label={reason === 'week' ? 'Victorias · semana' : 'Victorias · mes'} />
          )}
          {player.place ? <Stat value={player.place} label="Ranking" format={(n) => `#${Math.round(n)}`} /> : null}
        </View>
        <View style={styles.chips}>
          {hot ? (
            <View style={[styles.chip, { backgroundColor: colors.red }]}>
              <Ionicons name="flame" size={11} color={colors.redInk} />
              <T variant="tiny" color={colors.redInk} style={{ fontSize: 10 }}>
                Racha de {player.streak.count} victorias
              </T>
            </View>
          ) : null}
          {reason !== 'top' && player.windowDelta > 0 ? (
            <View style={[styles.chip, { backgroundColor: colors.yellow }]}>
              <Ionicons name="trending-up" size={11} color={colors.ink} />
              <T variant="tiny" color={colors.ink} style={{ fontSize: 10 }}>
                {signed(Math.round(player.windowDelta))} Elo
              </T>
            </View>
          ) : null}
          <FormDots form={player.form} size={15} />
        </View>
      </View>
      <T variant="tiny" color={colors.faint} style={styles.starCount} pointerEvents="none">
        {index + 1} / {total}
      </T>
    </SportPress>
  );
}

function Stat({ value, label, format = (n) => String(Math.round(n)) }: { value: number; label: string; format?: (n: number) => string }) {
  return (
    <View>
      <CountRoll value={value} format={format}>
        {(shown) => (
          <T variant="display" style={styles.starNum}>
            {shown}
          </T>
        )}
      </CountRoll>
      <T variant="tiny" color={colors.accentText} style={{ fontSize: 10 }}>
        {label}
      </T>
    </View>
  );
}

export function StarsCarousel({ board, me }: { board: BillboardSnapshot; me: string }) {
  const width = useCardWidth();
  const [page, setPage] = useState(0);
  if (!board.stars.length) {
    return (
      <SportPress style={[styles.star, styles.starEmpty]} onPress={() => push('/jugar')} accessibilityLabel="Registrar partido">
        <T variant="label" color={colors.accentText}>
          Las estrellas
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
  const step = width + GAP;
  return (
    <View style={styles.block}>
      <TileHead title="Las estrellas" icon="star" action="Ranking" onAction={() => push('/ranking')} />
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        snapToInterval={step}
        decelerationRate="fast"
        style={styles.bleed}
        contentContainerStyle={styles.bleedContent}
        scrollEventThrottle={32}
        onScroll={(event) => setPage(Math.round(event.nativeEvent.contentOffset.x / step))}
      >
        {board.stars.map((star, index) => (
          <StarCard key={star.player.profile.id} star={star} index={index} total={board.stars.length} me={me} width={width} />
        ))}
      </ScrollView>
      {board.stars.length > 1 ? (
        <View style={styles.dots}>
          {board.stars.map((star, index) => (
            <View key={star.player.profile.id} style={[styles.dot, index === Math.min(page, board.stars.length - 1) && styles.dotOn]} />
          ))}
        </View>
      ) : null}
    </View>
  );
}

/* ---------- Accesos rápidos: cuatro fichas cuadradas ---------- */

export function QuickRow({ items }: { items: { title: string; en?: string; icon: BrandIconName; color: string; ink: string; onPress: () => void }[] }) {
  const lang = useLang();
  return (
    <View style={styles.quickRow}>
      {items.map((item) => (
        <SportPress key={item.title} style={[styles.quick, { backgroundColor: item.color }]} onPress={item.onPress} accessibilityLabel={item.title}>
          <BrandIcon name={item.icon} size={22} color={item.ink} />
          <T variant="title" color={item.ink} style={styles.quickTitle} numberOfLines={1} adjustsFontSizeToFit>
            {lang === 'en' && item.en ? item.en : item.title}
          </T>
        </SportPress>
      ))}
    </View>
  );
}

/* ---------- Patrocinios (anuncios de la casa por ahora) ---------- */

function openSponsor(slot: SponsorSlot) {
  if (!slot.href) return;
  if (/^https?:\/\//.test(slot.href)) void Linking.openURL(slot.href);
  else push(slot.href as Href);
}

function SponsorTag() {
  return (
    <View style={styles.sponsorTag}>
      <T variant="tiny" color={colors.faint} style={{ fontSize: 9 }}>
        Patrocinado
      </T>
    </View>
  );
}

export function SponsorBanner({ slot }: { slot: SponsorSlot }) {
  return (
    <SportPress style={styles.sponsorBanner} onPress={slot.href ? () => openSponsor(slot) : undefined} accessibilityLabel={`Patrocinado: ${slot.title}`}>
      {slot.imageUrl ? <SponsorImage uri={slot.imageUrl} /> : <View style={styles.sponsorStripes} pointerEvents="none" />}
      <SponsorTag />
      <View style={styles.sponsorIcon}>
        <Ionicons name="megaphone" size={22} color={colors.ink} />
      </View>
      <View style={{ flex: 1, gap: space.xs }}>
        <T variant="display" style={styles.sponsorTitle} numberOfLines={1}>
          {slot.title}
        </T>
        {slot.body ? (
          <T variant="body" color={colors.muted} style={[styles.plain, { fontSize: 13 }]} numberOfLines={2}>
            {slot.body}
          </T>
        ) : null}
        {slot.cta ? (
          <View style={styles.sponsorCta}>
            <T variant="tiny" color={colors.text} style={{ fontSize: 10 }}>
              {slot.cta}
            </T>
          </View>
        ) : null}
      </View>
    </SportPress>
  );
}

function SponsorImage({ uri }: { uri: string }) {
  return <Image source={{ uri }} style={StyleSheet.absoluteFill} contentFit="cover" accessible={false} />;
}

export function SponsorTile({ slot, style }: { slot: SponsorSlot; style?: StyleProp<ViewStyle> }) {
  return (
    <SportPress style={[styles.tile, styles.sponsorTile, style]} onPress={slot.href ? () => openSponsor(slot) : undefined} accessibilityLabel={`Patrocinado: ${slot.title}`}>
      {slot.imageUrl ? <SponsorImage uri={slot.imageUrl} /> : null}
      <SponsorTag />
      <Ionicons name={slot.placement === 'tournament' || /torneo/i.test(slot.title) ? 'trophy-outline' : 'megaphone-outline'} size={24} color={colors.accentText} />
      <T variant="title" style={{ fontSize: 16, lineHeight: 18 }} numberOfLines={2}>
        {slot.title}
      </T>
      {slot.body ? (
        <T variant="tiny" color={colors.muted}>
          {slot.body}
        </T>
      ) : null}
    </SportPress>
  );
}

/* ---------- Torneos más calientes (con un torneo patrocinado al final) ---------- */

export function HotCups({ items, sponsored }: { items: BillboardTournament[]; sponsored: SponsorSlot[] }) {
  if (!items.length && !sponsored.length) return null;
  return (
    <View style={styles.block}>
      <TileHead title="Torneos más calientes" icon="flame" action="Ver todos" onAction={() => push('/torneos')} />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.bleed} contentContainerStyle={styles.bleedContent}>
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
                <Shield letters={monogram(item.tournament.name)} photoUrl={item.tournament.photoUrl} size={36} />
                <View style={[styles.status, { backgroundColor: live ? colors.yellow : colors.gold }]}>
                  {live ? <View style={styles.liveDot} /> : <Ionicons name="trophy" size={9} color={colors.ink} />}
                  <T variant="tiny" color={colors.ink} style={{ fontSize: 9 }}>
                    {live ? 'En juego' : 'Finalizado'}
                  </T>
                </View>
              </View>
              <T variant="title" numberOfLines={2} style={styles.cupName}>
                {item.tournament.name}
              </T>
              <T variant="tiny" color={colors.muted} numberOfLines={1} style={{ fontSize: 10 }}>
                {item.groupName}
              </T>
              <T variant="tiny" color={colors.accentText} style={{ fontSize: 10 }}>
                {item.tournament.playerIds.length} jugadores · {item.played} partidos
              </T>
              {who ? (
                <View style={styles.cupWho}>
                  <InitialsMark name={who.displayName} avatarKey={who.avatarKey} photoUrl={who.photoUrl} size={22} fontSize={10} />
                  <T variant="tiny" color={colors.faint} style={{ fontSize: 9 }}>
                    {item.champion ? 'Campeón' : 'Va primero'}
                  </T>
                  <T variant="strong" numberOfLines={1} style={{ fontSize: 13, flex: 1 }}>
                    {firstName(who.displayName)}
                  </T>
                </View>
              ) : (
                <T variant="tiny" color={colors.faint} style={[styles.plain, styles.cupWho]}>
                  Todavía sin partidos confirmados
                </T>
              )}
            </SportPress>
          );
        })}
        {sponsored.map((slot) => (
          <SponsorTile key={slot.id} slot={slot} style={styles.cup} />
        ))}
      </ScrollView>
    </View>
  );
}

/* ---------- Bento: top 5, los que más suben, rachas ---------- */

function MiniRow({ player, me, left, right, accent }: { player: BillboardPlayer; me: string; left?: string; right: string; accent?: boolean }) {
  return (
    <SportPress style={styles.mini} onPress={() => push(playerHref(me, player.profile.id))} accessibilityLabel={player.profile.displayName}>
      {left ? (
        <T variant="display" style={[styles.miniPlace, accent && { color: colors.accentText }]}>
          {left}
        </T>
      ) : null}
      <InitialsMark name={player.profile.displayName} avatarKey={player.profile.avatarKey} photoUrl={player.profile.photoUrl} size={26} fontSize={10} />
      <T variant="strong" numberOfLines={1} style={styles.miniName}>
        {player.profile.id === me ? 'Tú' : firstName(player.profile.displayName)}
      </T>
      <T variant="title" style={[styles.miniValue, accent && { color: colors.accentText }]}>
        {right}
      </T>
    </SportPress>
  );
}

export function TopTile({ board, me, style }: { board: BillboardSnapshot; me: string; style?: StyleProp<ViewStyle> }) {
  return (
    <View style={[styles.tile, style]}>
      <TileHead title="Top ranking" icon="podium" action="Ver" onAction={() => push('/ranking')} />
      <View style={styles.miniList}>
        {board.top.map((player, index) => (
          <MiniRow key={player.profile.id} player={player} me={me} left={String(index + 1)} right={elo(player.rating)} accent={index === 0} />
        ))}
      </View>
    </View>
  );
}

export function MoversTile({ board, me, style }: { board: BillboardSnapshot; me: string; style?: StyleProp<ViewStyle> }) {
  return (
    <View style={[styles.tile, style]}>
      <TileHead title="En alza" icon="trending-up" />
      <View style={styles.miniList}>
        {board.movers.map((player) => (
          <MiniRow key={player.profile.id} player={player} me={me} right={signed(Math.round(player.windowDelta))} accent />
        ))}
      </View>
      <T variant="tiny" color={colors.faint} style={{ fontSize: 9 }}>
        {board.windowDays <= 7 ? 'Elo · últimos 7 días' : 'Elo · últimos 30 días'}
      </T>
    </View>
  );
}

export function StreaksTile({ board, me, style }: { board: BillboardSnapshot; me: string; style?: StyleProp<ViewStyle> }) {
  return (
    <View style={[styles.tile, style]}>
      <TileHead title="Rachas" icon="flame" />
      <View style={styles.miniList}>
        {board.streaks.slice(0, 3).map((player) => (
          <MiniRow key={player.profile.id} player={player} me={me} right={String(player.streak.count)} accent />
        ))}
      </View>
      <T variant="tiny" color={colors.faint} style={{ fontSize: 9 }}>
        Victorias seguidas
      </T>
    </View>
  );
}

/* ---------- Resultados recientes: cuadrícula de 2 ---------- */

export function ResultsGrid({ board }: { board: BillboardSnapshot }) {
  if (!board.results.length) return null;
  return (
    <View style={styles.block}>
      <TileHead title="Resultados recientes" icon="football" />
      <View style={styles.grid2}>
        {board.results.map(({ match, label }) => {
          const a = board.people[match.playerAId];
          const b = board.people[match.playerBId];
          const aWon = !match.isDraw && match.winnerId === match.playerAId;
          const bWon = !match.isDraw && match.winnerId === match.playerBId;
          return (
            <SportPress key={match.id} style={[styles.tile, styles.result]} onPress={() => push(`/partido/${match.id}`)} accessibilityLabel={`${a?.displayName ?? ''} ${b?.displayName ?? ''}`}>
              <View style={styles.resultFace}>
                <Side id={match.playerAId} name={a?.displayName ?? '—'} avatarKey={a?.avatarKey ?? 'rayo'} photoUrl={a?.photoUrl} won={aWon} />
                <View style={styles.resultScore}>
                  <T variant="display" style={styles.resultNum}>
                    {match.goalsA != null && match.goalsB != null ? `${match.goalsA}–${match.goalsB}` : match.isDraw ? '=' : 'FT'}
                  </T>
                </View>
                <Side id={match.playerBId} name={b?.displayName ?? '—'} avatarKey={b?.avatarKey ?? 'rayo'} photoUrl={b?.photoUrl} won={bWon} />
              </View>
              <T variant="tiny" color={colors.muted} numberOfLines={1} style={{ fontSize: 9, textAlign: 'center' }}>
                {[label, match.confirmedAt ? formatWhen(match.confirmedAt) : null].filter(Boolean).join(' · ')}
              </T>
            </SportPress>
          );
        })}
      </View>
    </View>
  );
}

function Side({ id, name, avatarKey, photoUrl, won }: { id: string; name: string; avatarKey: string; photoUrl?: string | null; won: boolean }) {
  return (
    <SportPress style={styles.side} onPress={() => push(`/jugador/${id}`)} hitSlop={4} accessibilityRole="link" accessibilityLabel={name}>
      <View style={[styles.sideRing, won && { borderColor: colors.yellow }]}>
        <InitialsMark name={name} avatarKey={avatarKey} photoUrl={photoUrl} size={34} fontSize={12} />
      </View>
      <T variant="tiny" color={won ? colors.accentText : colors.text} style={{ fontSize: 10 }}>
        {tagOf(name)}
      </T>
    </SportPress>
  );
}

/* ---------- Grupos más reñidos ---------- */

export function RivalryTile({ items, me, style }: { items: BillboardRivalry[]; me: string; style?: StyleProp<ViewStyle> }) {
  const item = items[0];
  if (!item) return null;
  return (
    <SportPress style={[styles.tile, style]} onPress={() => push(`/grupo/${item.group.id}`)} accessibilityLabel={item.group.name}>
      <TileHead title="Grupo más reñido" icon="flash" />
      <View style={styles.rivalryHead}>
        <Shield letters={monogram(item.group.name)} photoUrl={item.group.photoUrl} size={22} />
        <T variant="strong" numberOfLines={1} style={{ flex: 1, fontSize: 13 }}>
          {item.group.name}
        </T>
      </View>
      {[item.first, item.second].map((player, index) => (
        <SportPress key={player.profile.id} style={styles.mini} onPress={() => push(playerHref(me, player.profile.id))} accessibilityLabel={player.profile.displayName}>
          <T variant="display" style={[styles.miniPlace, index === 0 && { color: colors.accentText }]}>
            {index + 1}
          </T>
          <InitialsMark name={player.profile.displayName} avatarKey={player.profile.avatarKey} photoUrl={player.profile.photoUrl} size={26} fontSize={10} />
          <T variant="strong" numberOfLines={1} style={styles.miniName}>
            {player.profile.id === me ? 'Tú' : firstName(player.profile.displayName)}
          </T>
          <T variant="title" style={styles.miniValue}>
            {elo(player.rating)}
          </T>
        </SportPress>
      ))}
      <View style={[styles.chip, { backgroundColor: colors.yellow, alignSelf: 'flex-start' }]}>
        <T variant="tiny" color={colors.ink} style={{ fontSize: 10 }}>
          {Math.round(item.gap)} Elo de diferencia
        </T>
      </View>
    </SportPress>
  );
}

const cardBase = { borderRadius: 18, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line } as const;

const styles = StyleSheet.create({
  starTopRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm, flexWrap: 'wrap' },
  plain: { textTransform: 'none', letterSpacing: 0 },
  block: { gap: GAP },
  bentoRow: { flexDirection: 'row', gap: GAP, alignItems: 'stretch' },
  bleed: { marginHorizontal: -space.lg },
  bleedContent: { paddingHorizontal: space.lg, gap: GAP },
  tileHead: { flexDirection: 'row', alignItems: 'center', gap: space.sm, minHeight: 20 },
  tileTitle: { flex: 1, fontSize: 12 },
  tile: { ...cardBase, flex: 1, padding: space.md, gap: GAP },
  /* estrellas */
  star: { ...cardBase, minHeight: 232, overflow: 'hidden', backgroundColor: colors.navy, padding: space.lg, justifyContent: 'flex-end', borderRadius: 22 },
  starEmpty: { gap: space.sm, justifyContent: 'center', minHeight: 200 },
  emptyTitle: { fontSize: 30, lineHeight: 32, fontStyle: 'normal' },
  cta: { alignSelf: 'flex-start', backgroundColor: colors.yellow, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 999 },
  starGlow: {
    position: 'absolute',
    right: -50,
    top: -50,
    width: 230,
    height: 230,
    borderRadius: 999,
    backgroundColor: colors.blue,
    opacity: web ? 0.35 : 0.16,
    ...(web ? ({ filter: 'blur(30px)' } as object) : null),
  },
  starPhoto: { position: 'absolute', right: -10, top: 12, width: 150, height: 150, borderRadius: 75, overflow: 'hidden' },
  starIndex: { position: 'absolute', right: 132, top: 4, fontSize: 64, lineHeight: 70, fontStyle: 'normal', color: colors.accentText, opacity: 0.22 },
  starCount: { position: 'absolute', right: space.lg, bottom: space.md, fontSize: 10 },
  starBody: { gap: space.sm, maxWidth: '78%' },
  kicker: { flexDirection: 'row', alignItems: 'center', gap: space.xs, alignSelf: 'flex-start', backgroundColor: colors.yellow, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999 },
  starName: { fontSize: 46, lineHeight: 48, fontStyle: 'normal' },
  starLast: { fontSize: 16, lineHeight: 18 },
  starStats: { flexDirection: 'row', gap: space.lg },
  starNum: { fontSize: 26, lineHeight: 28, fontStyle: 'normal' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: space.sm },
  chip: { flexDirection: 'row', alignItems: 'center', gap: space.xs, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999 },
  form: { flexDirection: 'row', gap: space.xs },
  formDot: { borderRadius: 5, alignItems: 'center', justifyContent: 'center' },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: space.sm },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.lineStrong },
  dotOn: { width: 18, backgroundColor: colors.accentText },
  /* accesos */
  quickRow: { flexDirection: 'row', gap: GAP },
  quick: { flex: 1, aspectRatio: 1, maxHeight: 96, borderRadius: 18, padding: space.sm + 2, justifyContent: 'space-between', borderWidth: 1, borderColor: colors.line },
  quickTitle: { fontSize: 14, lineHeight: 16 },
  /* patrocinios */
  sponsorBanner: { ...cardBase, minHeight: 96, flexDirection: 'row', alignItems: 'center', gap: space.md, padding: space.lg, overflow: 'hidden', borderStyle: 'dashed', borderColor: colors.lineStrong, backgroundColor: colors.surface },
  sponsorStripes: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    opacity: 0.5,
    ...(web ? ({ backgroundImage: 'repeating-linear-gradient(-45deg, transparent 0 14px, rgba(255,255,255,0.04) 14px 28px)' } as object) : null),
  },
  sponsorTag: { position: 'absolute', top: space.sm, right: space.sm, borderWidth: 1, borderColor: colors.line, borderRadius: 999, paddingHorizontal: 6, paddingVertical: 1 },
  sponsorIcon: { width: 46, height: 46, borderRadius: 14, backgroundColor: colors.yellow, alignItems: 'center', justifyContent: 'center' },
  sponsorTitle: { fontSize: 24, lineHeight: 26, fontStyle: 'normal' },
  sponsorCta: { borderWidth: 1, borderColor: colors.lineStrong, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4, alignSelf: 'flex-start', marginTop: space.xs },
  sponsorTile: { borderStyle: 'dashed', borderColor: colors.lineStrong, justifyContent: 'flex-end', minHeight: 120 },
  /* torneos */
  cup: { ...cardBase, width: 168, minHeight: 168, flexGrow: 0, flexShrink: 0, flexBasis: 'auto', padding: space.md, gap: space.xs },
  cupLive: { borderColor: colors.yellow },
  cupTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: space.xs },
  status: { flexDirection: 'row', alignItems: 'center', gap: space.xs, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 999 },
  liveDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: colors.ink },
  cupName: { fontSize: 16, lineHeight: 18 },
  cupWho: { flexDirection: 'row', alignItems: 'center', gap: space.sm, marginTop: 'auto' },
  /* mini filas */
  miniList: { gap: space.sm },
  mini: { flexDirection: 'row', alignItems: 'center', gap: space.sm, minHeight: 28 },
  miniPlace: { width: 14, fontSize: 15, fontStyle: 'normal', textAlign: 'center' },
  miniName: { flex: 1, fontSize: 13 },
  miniValue: { fontSize: 14 },
  /* resultados */
  grid2: { flexDirection: 'row', flexWrap: 'wrap', gap: GAP },
  result: { flexBasis: '48%', flexGrow: 1, padding: space.sm + 2, gap: space.sm },
  resultFace: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  resultScore: { flex: 1, alignItems: 'center' },
  resultNum: { fontSize: 24, lineHeight: 26, fontStyle: 'normal' },
  side: { alignItems: 'center', gap: space.xxs },
  sideRing: { borderWidth: 2, borderColor: 'transparent', borderRadius: 999, padding: 1, overflow: 'hidden' },
  /* reñidos */
  rivalryHead: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
});
