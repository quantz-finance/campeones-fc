// Portada del inicio en mosaico: los jugadores del círculo como estrellas. Solo datos de partidos confirmados.
import { SocialGlyph, socialEntries } from './social-icons';
import { useId, useState } from 'react';
import Svg, { Defs, LinearGradient, Path, Rect, Stop } from 'react-native-svg';
import { PhotoLayer } from './entity-image';
import { Linking, Platform, ScrollView, StyleSheet, useWindowDimensions, View, type StyleProp, type ViewStyle } from 'react-native';
import { Icon, type UiIconName } from './icon';
import { Image } from 'expo-image';
import type { Href } from 'expo-router';
import type { BillboardPlayer, BillboardRivalry, BillboardSnapshot, BillboardTournament } from '../data/snapshots';
import { AdCarousel } from './ad-carousel';
import { InitialsMark, Shield } from './broadcast';
import { initialsOf } from './player-portrait';
import { elo, firstName, formatWhen, monogram, signed, tagOf } from './format';
import { CountRoll } from './motion';
import { push } from './nav';
import { SportPress } from './press';
import { colors, font, layout, space } from './theme';
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
function TileHead({ title, action, onAction, icon }: { title: string; action?: string; onAction?: () => void; icon?: UiIconName }) {
  return (
    <View style={styles.tileHead}>
      {icon === 'estrella' ? <SolidStar size={14} color={colors.accentText} /> : icon ? <Icon name={icon} size={16} color={colors.accentText} /> : null}
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

// Cromo coleccionable: propuesta 1 de Stan, idéntica a la maqueta (assets/estrellas-propuestas/_build/html/1-cromo.html).
// Marco dorado degradado de 6 pt (dibujado en SVG para que se vea nítido en las cuatro esquinas), filete dorado interior,
// foto a la derecha fundida con el morado (cover centrado: una foto cuadrada se ve bien), número de serie = ranking,
// grilla Elo · victorias · V-E-D y el ranking en dorado. Solo datos reales. Sin foto: iniciales en el mismo lugar.
const GOLD = { hi: '#F1D27A', mid: '#D4AF37', lo: '#8A6A16' } as const;
const CROMO = { h: 236, frame: 6, radius: 20, innerRadius: 15, photoW: 188 } as const;
const cromoForm = { win: '#00FF87', draw: '#B99BC6', loss: '#FF4D8D' } as const;

/** Estrella rellena de la maqueta (el ícono «estrella» del paquete es de trazo). */
function SolidStar({ size, color }: { size: number; color: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M12 2.8l2.7 5.9 6.4.7-4.8 4.3 1.4 6.3L12 16.8 6.3 20l1.4-6.3L2.9 9.4l6.4-.7z" fill={color} />
    </Svg>
  );
}

function StarCard({ star, me, width }: { star: BillboardSnapshot['stars'][number]; me: string; width: number }) {
  const { player, reason } = star;
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
  const rest = lastNames(player.profile.displayName);
  const sub = [rest, `@${player.profile.username}`].filter(Boolean).join(' · ');
  const socials = socialEntries(player.profile.socialLinks).slice(0, 4);
  const innerW = width - CROMO.frame * 2;
  const innerH = CROMO.h - CROMO.frame * 2;
  return (
    <SportPress
      style={[styles.cromo, { width }]}
      onPress={() => push(playerHref(me, player.profile.id))}
      accessibilityLabel={`${starKicker(reason)}: ${player.profile.displayName}`}
    >
      {/* Marco: degradado dorado a 150° (como el CSS) en un rect redondeado, sin depender de overflow. */}
      <Svg width={width} height={CROMO.h} style={StyleSheet.absoluteFill} pointerEvents="none">
        <Defs>
          <LinearGradient id={`f${uid}`} x1="0.25" y1="0" x2="0.75" y2="1">
            <Stop offset="0" stopColor={GOLD.hi} />
            <Stop offset="0.35" stopColor={GOLD.mid} />
            <Stop offset="0.7" stopColor={GOLD.lo} />
            <Stop offset="1" stopColor={GOLD.mid} />
          </LinearGradient>
        </Defs>
        <Rect x={0} y={0} width={width} height={CROMO.h} rx={CROMO.radius} ry={CROMO.radius} fill={`url(#f${uid})`} />
      </Svg>
      <View style={[styles.cromoIn, { width: innerW, height: innerH }]}>
        <Svg width={innerW} height={innerH} style={StyleSheet.absoluteFill} pointerEvents="none">
          <Defs>
            <LinearGradient id={`b${uid}`} x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor="#4A0A55" />
              <Stop offset="1" stopColor="#2A0030" />
            </LinearGradient>
          </Defs>
          <Rect x={0} y={0} width={innerW} height={innerH} fill={`url(#b${uid})`} />
        </Svg>
        <View style={[styles.cromoPhoto, { width: CROMO.photoW }]} pointerEvents="none">
          <T variant="display" color={GOLD.hi} style={styles.cromoInitials}>
            {initialsOf(player.profile.displayName)}
          </T>
          <PhotoLayer uri={player.profile.photoUrl} />
          {/* Fundido: de izquierda (#3E0748 → transparente al 45 %) y de abajo (#2A0030 → transparente al 40 %). */}
          <Svg width={CROMO.photoW} height={innerH} style={StyleSheet.absoluteFill}>
            <Defs>
              <LinearGradient id={`l${uid}`} x1="0" y1="0" x2="1" y2="0">
                <Stop offset="0" stopColor="#3E0748" stopOpacity={1} />
                <Stop offset="0.45" stopColor="#3E0748" stopOpacity={0} />
              </LinearGradient>
              <LinearGradient id={`d${uid}`} x1="0" y1="1" x2="0" y2="0">
                <Stop offset="0" stopColor="#2A0030" stopOpacity={1} />
                <Stop offset="0.4" stopColor="#2A0030" stopOpacity={0} />
              </LinearGradient>
            </Defs>
            <Rect x={0} y={0} width={CROMO.photoW} height={innerH} fill={`url(#l${uid})`} />
            <Rect x={0} y={0} width={CROMO.photoW} height={innerH} fill={`url(#d${uid})`} />
          </Svg>
        </View>
        <View style={styles.cromoHair} pointerEvents="none" />
        {player.place ? (
          <View style={styles.cromoSerial} pointerEvents="none">
            <T variant="tiny" color="#37003C" style={styles.cromoSerialText}>
              {`N.º ${String(player.place).padStart(2, '0')}`}
            </T>
          </View>
        ) : null}
        <View style={styles.cromoText}>
          <View style={styles.cromoKicker}>
            <SolidStar size={12} color={GOLD.hi} />
            <T variant="tiny" color={GOLD.hi} style={styles.cromoLabel} numberOfLines={1}>
              {starKicker(reason)}
            </T>
          </View>
          <T variant="display" style={styles.cromoName} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.5}>
            {firstName(player.profile.displayName)}
          </T>
          <T color="#C9A2FF" style={styles.cromoSub} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>
            {sub}
          </T>
          {socials.length ? (
            <View style={styles.cromoSocial}>
              {socials.map(([network]) => (
                <SocialGlyph key={network} network={network} size={15} color={GOLD.hi} />
              ))}
            </View>
          ) : null}
          <View style={styles.cromoGrid}>
            <CromoStat w={62} value={player.rating} label="Elo" format={(n) => elo(Math.round(n))} />
            {reason === 'top' ? (
              <CromoStat w={52} value={Math.round(player.winRate * 100)} label="% Vict." />
            ) : (
              <CromoStat w={52} value={player.windowWins} label={reason === 'week' ? 'Vict·sem' : 'Vict·mes'} />
            )}
            <View style={{ width: 76 }}>
              <T variant="display" style={styles.cromoNum} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.6}>
                {`${player.wins}-${player.draws}-${player.losses}`}
              </T>
              <T variant="tiny" color={GOLD.hi} style={styles.cromoStatLabel} numberOfLines={1}>
                V-E-D
              </T>
            </View>
          </View>
          <View style={styles.cromoFoot}>
            {reason !== 'top' && player.windowDelta > 0 ? (
              <View style={styles.cromoDelta}>
                <Icon name="tendencia-sube" size={11} color="#00FF87" />
                <T color="#00FF87" style={styles.cromoDeltaText}>
                  {`${signed(Math.round(player.windowDelta))} Elo`}
                </T>
              </View>
            ) : null}
            {player.form.length ? (
              <View style={styles.cromoForm} accessibilityLabel="Últimos resultados">
                {player.form.slice(0, 5).map((outcome, i) => (
                  <View key={i} style={[styles.cromoFd, { backgroundColor: cromoForm[outcome] }]}>
                    <T color="#37003C" style={styles.cromoFdText}>
                      {formLetter[outcome]}
                    </T>
                  </View>
                ))}
              </View>
            ) : null}
          </View>
        </View>
        {player.place ? (
          <View style={styles.cromoPlace} pointerEvents="none" accessibilityLabel={`Ranking #${player.place}`}>
            <T variant="tiny" color={GOLD.hi} style={styles.cromoPlaceLabel}>
              Ranking
            </T>
            <T variant="display" color={GOLD.hi} style={styles.cromoPlaceNum}>
              {`#${player.place}`}
            </T>
          </View>
        ) : null}
      </View>
    </SportPress>
  );
}

function CromoStat({ value, label, w, format = (n) => String(Math.round(n)) }: { value: number; label: string; w: number; format?: (n: number) => string }) {
  return (
    <View style={{ width: w }}>
      <CountRoll value={value} format={format}>
        {(shown) => (
          <T variant="display" style={styles.cromoNum} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.6}>
            {shown}
          </T>
        )}
      </CountRoll>
      <T variant="tiny" color={GOLD.hi} style={styles.cromoStatLabel} numberOfLines={1}>
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
      <TileHead title="Las estrellas" icon="estrella" action="Ranking" onAction={() => push('/ranking')} />
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
        {board.stars.map((star) => (
          <StarCard key={star.player.profile.id} star={star} me={me} width={width} />
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

/* ---------- Torneos más calientes (con el carrusel de anuncios «inicio-copas» al final) ---------- */

export function HotCups({ items, ads = true }: { items: BillboardTournament[]; ads?: boolean }) {
  if (!items.length && !ads) return null;
  return (
    <View style={styles.block}>
      <TileHead title="Torneos más calientes" icon="racha" action="Ver todos" onAction={() => push('/torneos')} />
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
                <Shield letters={monogram(item.tournament.name)} photoUrl={item.tournament.photoUrl} kind="tournaments" id={item.tournament.id} logo={item.tournament.logo} size={40} />
                <View style={[styles.status, { backgroundColor: live ? colors.yellow : colors.gold }]}>
                  {live ? <View style={styles.liveDot} /> : <Icon name="trofeo" size={9} color={colors.ink} />}
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
        {/* Dentro de este carrusel horizontal, el de anuncios no se desliza: rota fundiéndose. */}
        {ads ? <AdCarousel section="inicio-copas" swipeable={false} style={styles.cupAd} /> : null}
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
      <TileHead title="Top ranking" icon="podio" action="Ver" onAction={() => push('/ranking')} />
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
      <TileHead title="En alza" icon="tendencia-sube" />
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
      <TileHead title="Rachas" icon="racha" />
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
      <TileHead title="Resultados recientes" icon="balon" />
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
      <TileHead title="Grupo más reñido" icon="rayo" />
      <View style={styles.rivalryHead}>
        <Shield letters={monogram(item.group.name)} photoUrl={item.group.photoUrl} kind="groups" id={item.group.id} logo={item.group.logo} size={28} />
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
  plain: { textTransform: 'none', letterSpacing: 0 },
  block: { gap: GAP },
  bentoRow: { flexDirection: 'row', gap: GAP, alignItems: 'stretch' },
  bleed: { marginHorizontal: -space.lg },
  bleedContent: { paddingHorizontal: space.lg, gap: GAP },
  tileHead: { flexDirection: 'row', alignItems: 'center', gap: space.sm, minHeight: 20 },
  tileTitle: { flex: 1, fontSize: 12 },
  tile: { ...cardBase, flex: 1, padding: space.md, gap: GAP },
  /* estrellas: cromo (valores de 1-cromo.html) */
  cromo: { height: CROMO.h, borderRadius: CROMO.radius, padding: CROMO.frame },
  cromoIn: { borderRadius: CROMO.innerRadius, overflow: 'hidden' },
  cromoPhoto: { position: 'absolute', right: 0, top: 0, bottom: 0, alignItems: 'center', justifyContent: 'center', backgroundColor: '#3E0748' },
  cromoInitials: { fontSize: 72, lineHeight: 80, fontStyle: 'normal', opacity: 0.5 },
  cromoHair: { position: 'absolute', top: 7, left: 7, right: 7, bottom: 7, borderWidth: 1, borderColor: 'rgba(241,210,122,0.45)', borderRadius: 10 },
  cromoSerial: { position: 'absolute', right: 16, top: 16, backgroundColor: GOLD.hi, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 5 },
  cromoSerialText: { fontSize: 11, lineHeight: 14, fontFamily: font.bold, letterSpacing: 1.5, textTransform: 'none' },
  cromoText: { position: 'absolute', left: 20, top: 20, bottom: 18, width: 200 },
  cromoKicker: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  cromoLabel: { fontSize: 10, lineHeight: 13, letterSpacing: 1.3 },
  cromoName: { fontSize: 44, lineHeight: 44, marginTop: 8, fontStyle: 'normal', letterSpacing: -1 },
  cromoSub: { fontSize: 18, lineHeight: 23, fontFamily: font.medium },
  cromoSocial: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 8 },
  cromoGrid: { flexDirection: 'row', gap: 4, marginTop: 'auto', borderTopWidth: 1, borderTopColor: 'rgba(241,210,122,0.35)', paddingTop: 10 },
  cromoNum: { fontSize: 20, lineHeight: 20, fontStyle: 'normal', letterSpacing: -0.5 },
  cromoStatLabel: { fontSize: 9, lineHeight: 11, letterSpacing: 1.3, marginTop: 3 },
  cromoFoot: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8, minHeight: 14 },
  cromoDelta: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  cromoDeltaText: { fontSize: 11, lineHeight: 14, fontFamily: font.bold },
  cromoForm: { flexDirection: 'row', gap: 4 },
  cromoFd: { width: 14, height: 14, borderRadius: 4, alignItems: 'center', justifyContent: 'center' },
  cromoFdText: { fontSize: 9, lineHeight: 11, fontFamily: font.display },
  cromoPlace: { position: 'absolute', right: 16, bottom: 16, alignItems: 'flex-end' },
  cromoPlaceLabel: { fontSize: 9, lineHeight: 11, letterSpacing: 1.3 },
  cromoPlaceNum: { fontSize: 40, lineHeight: 40, fontStyle: 'normal', letterSpacing: -0.5 },
  star: { ...cardBase, minHeight: 232, overflow: 'hidden', backgroundColor: colors.navy, padding: space.lg, justifyContent: 'flex-end', borderRadius: 22 },
  starEmpty: { gap: layout.inCard, justifyContent: 'center', minHeight: 200 },
  emptyTitle: { fontSize: 30, lineHeight: 32, fontStyle: 'normal' },
  cta: { alignSelf: 'flex-start', backgroundColor: colors.yellow, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 999 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: space.xs, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999 },
  form: { flexDirection: 'row', gap: space.xs },
  formDot: { borderRadius: 5, alignItems: 'center', justifyContent: 'center' },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: 6 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.28)' },
  dotOn: { width: 20, backgroundColor: '#FFFFFF' },
  /* accesos */
  cupAd: { width: 168, flexShrink: 0 },
  cup: { ...cardBase, width: 168, minHeight: 168, flexGrow: 0, flexShrink: 0, flexBasis: 'auto', padding: space.md, gap: space.sm },
  cupLive: { borderColor: colors.yellow },
  cupTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: space.xs },
  status: { flexDirection: 'row', alignItems: 'center', gap: space.xs, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 999 },
  liveDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: colors.ink },
  cupName: { fontSize: 16, lineHeight: 18 },
  cupWho: { flexDirection: 'row', alignItems: 'center', gap: space.sm, marginTop: 'auto' },
  /* mini filas */
  miniList: { gap: layout.card },
  mini: { flexDirection: 'row', alignItems: 'center', gap: space.sm, minHeight: 28 },
  miniPlace: { width: 14, fontSize: 15, fontStyle: 'normal', textAlign: 'center' },
  miniName: { flex: 1, fontSize: 13 },
  miniValue: { fontSize: 14 },
  /* resultados */
  grid2: { flexDirection: 'row', flexWrap: 'wrap', gap: GAP },
  result: { flexBasis: '48%', flexGrow: 1, padding: space.sm + 2, gap: layout.inCard },
  resultFace: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  resultScore: { flex: 1, alignItems: 'center' },
  resultNum: { fontSize: 24, lineHeight: 26, fontStyle: 'normal' },
  side: { alignItems: 'center', gap: space.xxs },
  sideRing: { borderWidth: 2, borderColor: 'transparent', borderRadius: 10, padding: 1, overflow: 'hidden' },
  /* reñidos */
  rivalryHead: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
});
