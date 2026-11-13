// Carta del jugador (ficha pública y Perfil): carta de colección sobria, de club. Placa morada con degradado
// sutil y un filete lila interior (marco de carta), retrato con anillo, y una jerarquía clara:
// nombre → puesto en el ranking → ELO y récord → números → logros (con brillo holo) y redes.
// No copia formas de cartas de videojuegos: es rectangular, sin escudo recortado ni media en la esquina.
// La carta es siempre oscura (igual en modo claro y oscuro), como una carta física.
import { useId } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import { trophyCatalog } from '../content/trophies';
import type { PublicPlayer } from '../data/public-player';
import type { AchievementCode, Outcome } from '../domain/types';
import type { SocialLinks } from '../domain/social';
import { AchievementBadge } from './achievement-badge';
import { FormDots } from './billboard';
import { elo, firstName, pct } from './format';
import { CountRoll } from './motion';
import { PORTRAIT, PlayerPortrait } from './player-portrait';
import { SportPress } from './press';
import { SocialDots } from './social-icons';
import { T } from './text';
import { layout, space } from './theme';

const INK = {
  text: '#FFFFFF',
  muted: '#E4D4EE',
  faint: '#B99BC6',
  line: 'rgba(201,162,255,0.22)',
  cell: 'rgba(255,255,255,0.05)',
};

export type PlayerCardData = {
  profile: { displayName: string; username: string; photoUrl?: string | null; socialLinks?: SocialLinks | null };
  rating: number;
  peak: number;
  place: number | null;
  rankedPlayers: number;
  played: number;
  wins: number;
  draws: number;
  losses: number;
  winRate: number;
  goalsFor: number;
  bestWinStreak: number;
  streak: { type: Outcome | 'none'; count: number };
  form: Outcome[];
  titles: number;
  achievements: { code: AchievementCode; unlocked: boolean; title: string }[];
};

function streakText(streak: PlayerCardData['streak']): string {
  if (streak.type === 'none' || streak.count === 0) return '–';
  return `${streak.count}${streak.type === 'win' ? 'V' : streak.type === 'draw' ? 'E' : 'D'}`;
}

function Cell({ value, label, accent }: { value: string; label: string; accent?: boolean }) {
  return (
    <View style={styles.cell}>
      <T variant="display" color={accent ? PORTRAIT.green : INK.text} style={styles.cellNum} numberOfLines={1}>
        {value}
      </T>
      <T variant="tiny" color={INK.faint} style={styles.cellLabel} numberOfLines={1}>
        {label}
      </T>
    </View>
  );
}

export function PlayerCard({ data, kicker, onPress }: { data: PlayerCardData; kicker?: string; onPress?: () => void }) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
  const leader = data.place === 1;
  const rest = data.profile.displayName.trim().split(/\s+/).slice(1).join(' ');
  return (
    <SportPress style={styles.card} onPress={onPress} disabled={!onPress} accessibilityLabel={`Ficha de ${data.profile.displayName}`}>
      <Svg style={StyleSheet.absoluteFill} width="100%" height="100%" preserveAspectRatio="none" pointerEvents="none">
        <Defs>
          <LinearGradient id={`c${uid}`} x1="0" y1="0" x2="0.35" y2="1">
            <Stop offset="0" stopColor="#4A0A55" />
            <Stop offset="0.55" stopColor={PORTRAIT.plate} />
            <Stop offset="1" stopColor="#24002A" />
          </LinearGradient>
        </Defs>
        <Rect x="0" y="0" width="100%" height="100%" fill={`url(#c${uid})`} />
      </Svg>
      <View style={styles.frame} pointerEvents="none" />

      <View style={styles.top}>
        <T variant="tiny" color={leader ? PORTRAIT.gold : PORTRAIT.green}>
          {kicker ?? 'Ficha del jugador'}
        </T>
        <T variant="tiny" color={INK.faint}>
          {data.place ? `Ranking #${data.place} de ${data.rankedPlayers}` : 'Sin ranking aún'}
        </T>
      </View>

      <View style={styles.head}>
        <PlayerPortrait
          name={data.profile.displayName}
          photoUrl={data.profile.photoUrl}
          size={116}
          accent={leader ? 'gold' : 'green'}
          tag={data.place ? `#${data.place}` : null}
        />
        <View style={styles.id}>
          <T variant="display" color={INK.text} style={styles.first} numberOfLines={1} adjustsFontSizeToFit>
            {firstName(data.profile.displayName)}
          </T>
          {rest ? (
            <T variant="strong" color={INK.muted} style={styles.last} numberOfLines={1}>
              {rest}
            </T>
          ) : null}
          <T variant="tiny" color={INK.faint} style={styles.plain} numberOfLines={1}>
            @{data.profile.username}
          </T>
          <View style={styles.elo}>
            <CountRoll value={data.rating} format={(n) => elo(Math.round(n))}>
              {(shown) => (
                <T variant="display" color={INK.text} style={styles.eloNum}>
                  {shown}
                </T>
              )}
            </CountRoll>
            <T variant="tiny" color={PORTRAIT.green}>
              Elo
            </T>
          </View>
          <T variant="strong" color={INK.muted} style={styles.record}>
            {`${data.wins}-${data.draws}-${data.losses}`} · {pct(data.winRate)}
          </T>
        </View>
      </View>

      <View style={styles.rule} />
      <View style={styles.grid}>
        <Cell value={String(data.played)} label="Partidos" />
        <Cell value={String(data.goalsFor)} label="Goles" />
        <Cell value={String(data.bestWinStreak)} label="Mejor racha" />
        <Cell value={streakText(data.streak)} label="Racha" accent={data.streak.type === 'win' && data.streak.count > 0} />
        <Cell value={elo(data.peak)} label="Elo máx." />
        <Cell value={String(data.titles)} label="Títulos" accent={data.titles > 0} />
      </View>

      <View style={styles.foot}>
        <View style={styles.badges}>
          {data.achievements.map((item, index) => (
            <AchievementBadge key={item.code} code={item.code} unlocked={item.unlocked} index={index} size={36} />
          ))}
        </View>
        <View style={styles.footRight}>
          <FormDots form={data.form} size={14} />
          <SocialDots links={data.profile.socialLinks} size={11} />
        </View>
      </View>
    </SportPress>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 20, overflow: 'hidden', padding: space.lg, gap: layout.inCard, backgroundColor: PORTRAIT.plate },
  frame: { position: 'absolute', left: 6, top: 6, right: 6, bottom: 6, borderRadius: 15, borderWidth: 1, borderColor: INK.line },
  plain: { textTransform: 'none', letterSpacing: 0 },
  top: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: space.sm },
  head: { flexDirection: 'row', alignItems: 'center', gap: space.lg },
  id: { flex: 1, minWidth: 0, gap: space.xs },
  first: { fontSize: 34, lineHeight: 38, fontStyle: 'normal' },
  last: { fontSize: 15, lineHeight: 18 },
  elo: { flexDirection: 'row', alignItems: 'baseline', gap: space.xs, marginTop: space.xs },
  eloNum: { fontSize: 30, lineHeight: 34, fontStyle: 'normal' },
  record: { fontSize: 13 },
  rule: { height: 1, backgroundColor: INK.line, marginTop: space.xs },
  grid: { flexDirection: 'row', flexWrap: 'wrap', rowGap: space.sm },
  cell: { width: '33.33%', alignItems: 'center', gap: space.xxs, paddingHorizontal: space.xxs },
  cellNum: { fontSize: 20, lineHeight: 24, fontStyle: 'normal' },
  cellLabel: { fontSize: 10 },
  foot: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space.sm, paddingTop: space.sm, borderTopWidth: 1, borderTopColor: INK.line },
  badges: { flexDirection: 'row', gap: space.xs },
  footRight: { alignItems: 'flex-end', gap: space.xs },
});

/** Datos de la carta a partir de la ficha pública (lo usa también Perfil). */
export function cardFromPublic(data: PublicPlayer, nameOverride?: string): PlayerCardData {
  return {
    profile: { ...data.profile, displayName: nameOverride || data.profile.displayName },
    rating: data.rating,
    peak: data.peak,
    place: data.place,
    rankedPlayers: data.rankedPlayers,
    played: data.played,
    wins: data.wins,
    draws: data.draws,
    losses: data.losses,
    winRate: data.winRate,
    goalsFor: data.goalsFor,
    bestWinStreak: data.bestWinStreak,
    streak: data.streak,
    form: data.form,
    titles: data.titles.length,
    achievements: trophyCatalog.map((trophy) => ({
      code: trophy.code,
      title: trophy.title,
      unlocked: data.achievements.some((item) => item.code === trophy.code),
    })),
  };
}

