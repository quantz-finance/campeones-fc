// Carta del jugador (ficha pública y Perfil): retrato a sangre, propuesta 2 de Stan.
// Foto cuadrada 1:1 a sangre en la esquina superior derecha, fundida al morado; nombre
// gigante en mayúsculas, Elo en oro y una tira de 6 stats en una sola fila.
// La carta es siempre oscura (igual en modo claro y oscuro), como una carta física.
import { Image } from 'expo-image';
import { useId, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import { AchievementBadge } from './achievement-badge';
import { elo, firstName, pct } from './format';
import { achievementsLabel, fichaAchievementStrip, rankLabel, streakText, type PlayerCardData } from './player-card-data';
import { CountRoll, useReducedMotion } from './motion';
import { initialsOf, PORTRAIT } from './player-portrait';
import { SportPress } from './press';
import { T } from './text';
import { space } from './theme';

const GOLD = '#F1D27A';
const GOLD_MID = '#D4AF37';
const GOLD_LO = '#8A6A16';
const INK = {
  text: '#FFFFFF',
  muted: '#E4D4EE',
  faint: '#B99BC6',
  lilac: '#C9A2FF',
  // Posición · @usuario: un poco más claro que el lila para que se lea a 12 pt sobre la foto.
  lilacBright: '#DCC2FF',
  plate: '#2A0030',
  plateHi: '#45094F',
  fade: '#3F0848',
  initialsBg: '#5A1466',
  chip: 'rgba(36,0,42,0.7)',
  chipLine: 'rgba(255,255,255,0.2)',
  strip: 'rgba(212,175,55,0.25)',
  stripLine: 'rgba(212,175,55,0.18)',
};

/** Alto del retrato a sangre y lado del cuadrado de la foto (pt del mockup). */
const HERO = 212;

function Cell({
  value,
  label,
  accent,
  first,
  lines = 1,
}: {
  value: string;
  label: string;
  accent?: boolean;
  first?: boolean;
  lines?: 1 | 2;
}) {
  return (
    <View style={[styles.cell, first && styles.cellFirst]}>
      {/* Número en una franja de alto fijo: todos quedan en la misma línea aunque una etiqueta use 2. */}
      <View style={styles.cellNumRow}>
        <T
          variant="display"
          color={accent ? GOLD : INK.text}
          style={styles.cellNum}
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.7}
        >
          {value}
        </T>
      </View>
      <T
        variant="label"
        color={GOLD}
        style={styles.cellLabel}
        numberOfLines={lines}
        adjustsFontSizeToFit={lines === 1}
        minimumFontScale={0.8}
      >
        {label}
      </T>
    </View>
  );
}

function GoldFrame({ uid, children }: { uid: string; children: ReactNode }) {
  return (
    <View style={styles.gold}>
      <Svg style={StyleSheet.absoluteFill} width="100%" height="100%" preserveAspectRatio="none" pointerEvents="none">
        <Defs>
          <LinearGradient id={`g${uid}`} x1="0" y1="0" x2="0.85" y2="1">
            <Stop offset="0" stopColor={GOLD} />
            <Stop offset="0.4" stopColor={GOLD_MID} />
            <Stop offset="1" stopColor={GOLD_LO} />
          </LinearGradient>
        </Defs>
        <Rect x="0" y="0" width="100%" height="100%" fill={`url(#g${uid})`} />
      </Svg>
      <View style={styles.inner}>{children}</View>
    </View>
  );
}

function BleedPortrait({
  uid,
  name,
  photoUrl,
}: {
  uid: string;
  name: string;
  photoUrl?: string | null;
}) {
  const reduced = useReducedMotion();
  return (
    <View style={styles.bleed} accessibilityRole="image" accessibilityLabel={name}>
      {photoUrl ? (
        <Image
          source={{ uri: photoUrl }}
          recyclingKey={photoUrl}
          style={StyleSheet.absoluteFill}
          contentFit="cover"
          contentPosition={{ top: '14%', left: '50%' }}
          cachePolicy="memory-disk"
          transition={reduced ? 0 : 180}
          accessible={false}
        />
      ) : (
        <>
          <Svg style={StyleSheet.absoluteFill} width={HERO} height={HERO} pointerEvents="none">
            <Defs>
              <LinearGradient id={`i${uid}`} x1="0" y1="0" x2="1" y2="1">
                <Stop offset="0" stopColor={INK.initialsBg} />
                <Stop offset="1" stopColor={INK.plate} />
              </LinearGradient>
            </Defs>
            <Rect x="0" y="0" width={HERO} height={HERO} fill={`url(#i${uid})`} />
          </Svg>
          <T variant="display" color="rgba(241,210,122,0.85)" style={styles.initials}>
            {initialsOf(name)}
          </T>
        </>
      )}
      {/* Fundido al morado: de izquierda a derecha y desde abajo, como en el mockup. */}
      <Svg style={StyleSheet.absoluteFill} width={HERO} height={HERO} pointerEvents="none">
        <Defs>
          <LinearGradient id={`h${uid}`} x1="0" y1="0" x2="1" y2="0">
            <Stop offset="0" stopColor={INK.fade} stopOpacity="1" />
            <Stop offset="0.26" stopColor={INK.fade} stopOpacity="0.55" />
            <Stop offset="0.55" stopColor={INK.fade} stopOpacity="0" />
          </LinearGradient>
          <LinearGradient id={`v${uid}`} x1="0" y1="1" x2="0" y2="0">
            <Stop offset="0" stopColor={INK.plate} stopOpacity="0.85" />
            <Stop offset="0.3" stopColor={INK.plate} stopOpacity="0" />
          </LinearGradient>
        </Defs>
        <Rect x="0" y="0" width={HERO} height={HERO} fill={`url(#h${uid})`} />
        <Rect x="0" y="0" width={HERO} height={HERO} fill={`url(#v${uid})`} />
      </Svg>
    </View>
  );
}

export function PlayerCard({ data, kicker, onPress }: { data: PlayerCardData; kicker?: string; onPress?: () => void }) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
  const rest = data.profile.displayName.trim().split(/\s+/).slice(1).join(' ');
  const unlocked = data.achievements.filter((item) => item.unlocked).length;
  const strip = fichaAchievementStrip(data.achievements);
  const subtitle = rest ? `${rest} · @${data.profile.username}` : `@${data.profile.username}`;
  return (
    <SportPress style={styles.card} onPress={onPress} disabled={!onPress} accessibilityLabel={`Ficha de ${data.profile.displayName}`}>
      <GoldFrame uid={uid}>
        <Svg style={StyleSheet.absoluteFill} width="100%" height="100%" preserveAspectRatio="none" pointerEvents="none">
          <Defs>
            <LinearGradient id={`p${uid}`} x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor={INK.plateHi} />
              <Stop offset="1" stopColor={INK.plate} />
            </LinearGradient>
          </Defs>
          <Rect x="0" y="0" width="100%" height="100%" fill={`url(#p${uid})`} />
        </Svg>

        <View style={styles.hero}>
          <BleedPortrait uid={uid} name={data.profile.displayName} photoUrl={data.profile.photoUrl} />
          <View style={styles.chips}>
            <View style={styles.kicker}>
              <T variant="label" color={PORTRAIT.plate} style={styles.chipText} numberOfLines={1}>
                {kicker ?? 'Ficha del jugador'}
              </T>
            </View>
            <View style={styles.rank}>
              <T variant="label" color={INK.muted} style={styles.chipText} numberOfLines={1}>
                {rankLabel(data.place, data.rankedPlayers)}
              </T>
            </View>
          </View>
          <View style={styles.identity}>
            <T
              variant="display"
              color={INK.text}
              style={styles.first}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.5}
            >
              {firstName(data.profile.displayName)}
            </T>
            <T variant="strong" color={INK.lilacBright} style={styles.sub} numberOfLines={1}>
              {subtitle}
            </T>
            <View style={styles.elo}>
              <CountRoll value={data.rating} format={(n) => elo(Math.round(n))}>
                {(shown) => (
                  <T variant="display" color={GOLD} style={styles.eloNum}>
                    {shown}
                  </T>
                )}
              </CountRoll>
              <T variant="label" color={PORTRAIT.green} style={styles.eloLbl}>
                Elo
              </T>
              <T variant="strong" color={INK.muted} style={styles.record}>
                {`${data.wins}-${data.draws}-${data.losses}`} · {pct(data.winRate)}
              </T>
            </View>
          </View>
        </View>

        <View style={styles.body}>
          <View style={styles.strip}>
            <Cell value={String(data.played)} label="Partidos" first />
            <Cell value={String(data.goalsFor)} label="Goles" />
            <Cell value={String(data.bestWinStreak)} label="Mejor racha" lines={2} />
            <Cell value={streakText(data.streak)} label="Racha" accent={data.streak.type === 'win' && data.streak.count > 0} />
            <Cell value={elo(data.peak)} label="Elo máx." accent lines={2} />
            <Cell value={String(data.titles)} label="Títulos" accent={data.titles > 0} />
          </View>
          <View style={styles.foot}>
            <View style={styles.badges}>
              {strip.shown.map((item, index) => (
                <AchievementBadge key={item.code} code={item.code} unlocked={item.unlocked} index={index} size={38} />
              ))}
              {strip.extra > 0 ? (
                <T variant="strong" color="#F1D27A" style={styles.more}>
                  {`+${strip.extra}`}
                </T>
              ) : null}
            </View>
            <T variant="label" color={INK.faint} style={styles.achievements}>
              {achievementsLabel(unlocked, data.achievements.length)}
            </T>
          </View>
        </View>
      </GoldFrame>
    </SportPress>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 18, overflow: 'hidden' },
  gold: { borderRadius: 18, overflow: 'hidden', padding: 1.5, backgroundColor: GOLD_MID },
  inner: { borderRadius: 16.5, overflow: 'hidden', backgroundColor: INK.plate },
  hero: { height: HERO, position: 'relative' },
  bleed: { position: 'absolute', right: 0, top: 0, width: HERO, height: HERO, overflow: 'hidden' },
  initials: {
    position: 'absolute',
    right: 26,
    top: 48,
    fontSize: 54,
    lineHeight: 58,
    letterSpacing: -1.5,
    fontStyle: 'normal',
  },
  chips: {
    position: 'absolute',
    top: 14,
    left: 14,
    right: 12,
    zIndex: 2,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: space.sm,
  },
  kicker: { backgroundColor: PORTRAIT.green, paddingVertical: 4, paddingHorizontal: 9, borderRadius: 6, maxWidth: '52%', flexShrink: 1 },
  rank: {
    backgroundColor: INK.chip,
    borderWidth: 1,
    borderColor: INK.chipLine,
    paddingVertical: 4,
    paddingHorizontal: 9,
    borderRadius: 6,
    maxWidth: '48%',
    flexShrink: 1,
  },
  chipText: { fontSize: 9.5, lineHeight: 12.5, letterSpacing: 1.3, fontStyle: 'normal' },
  identity: { position: 'absolute', left: 16, bottom: 14, right: 96, zIndex: 2 },
  first: { fontSize: 40, lineHeight: 44, letterSpacing: -1.6, textTransform: 'uppercase', fontStyle: 'normal' },
  sub: { fontSize: 12, lineHeight: 16, marginTop: 4, textTransform: 'none', letterSpacing: 0 },
  elo: { flexDirection: 'row', alignItems: 'baseline', gap: 6, marginTop: 10 },
  eloNum: { fontSize: 27, lineHeight: 29, letterSpacing: -0.5, fontStyle: 'normal' },
  eloLbl: { fontSize: 9.5, lineHeight: 12.5, letterSpacing: 1.3 },
  record: { fontSize: 11.5, lineHeight: 15, marginLeft: 4, textTransform: 'none', letterSpacing: 0 },
  body: { paddingTop: 12, paddingHorizontal: 14, paddingBottom: 14 },
  strip: {
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: INK.strip,
    borderRadius: 10,
    overflow: 'hidden',
  },
  cell: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingVertical: 9,
    paddingHorizontal: 2,
    borderLeftWidth: 1,
    borderLeftColor: INK.stripLine,
    minWidth: 0,
    gap: 4,
  },
  cellFirst: { borderLeftWidth: 0 },
  cellNumRow: { height: 20, justifyContent: 'flex-end', alignSelf: 'stretch', alignItems: 'center' },
  cellNum: { fontSize: 15.5, lineHeight: 18.5, letterSpacing: -0.5, fontStyle: 'normal' },
  // 9.5 pt Outfit 700 (Rolando: letras un poco más chicas, sin volver a los 7.5 pt del mockup); 2 líneas si no cabe.
  cellLabel: { fontSize: 9.5, lineHeight: 11.5, letterSpacing: -0.1, textAlign: 'center', fontStyle: 'normal' },
  foot: { gap: 8, marginTop: 12 },
  badges: { flexDirection: 'row', gap: 10, alignItems: 'center' },
  achievements: { fontSize: 9.5, lineHeight: 12.5, letterSpacing: 1.3, fontStyle: 'normal' },
  more: { fontSize: 13, fontWeight: '800', letterSpacing: 0.2, color: '#F1D27A' },
});

export { cardFromFicha, cardFromPublic, type PlayerCardData } from './player-card-data';
