import { StyleSheet, View } from 'react-native';
import Svg, { Defs, LinearGradient, Path, Stop } from 'react-native-svg';
import { RARITY_LABEL, RARITY_TONE, trophySections, type TrophyRarity } from '../content/trophies';
import type { AchievementCode } from '../domain/types';
import type { TrophyView } from '../data/snapshots';
import { AchievementBadge } from './achievement-badge';
import { formatDay } from './format';
import { SportPress } from './press';
import { colors, space } from './theme';
import { T } from './text';

const RARITY_ORDER: TrophyRarity[] = ['comun', 'rara', 'epica', 'legendaria'];

/** Gancho para el detalle de un logro. El modal todavía no está aprobado: no navega. */
export function onTrophyPress(_code: AchievementCode) {}

function Scoreboard({ trophies }: { trophies: TrophyView[] }) {
  const earned = trophies.filter((item) => item.earned).length;
  return (
    <View style={styles.board}>
      <View style={styles.boardGold}>
        <Svg width="100%" height="100%" viewBox="0 0 72 58" preserveAspectRatio="none" style={StyleSheet.absoluteFill}>
          <Defs>
            <LinearGradient id="cfcBoardGold" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor="#F1D27A" />
              <Stop offset="1" stopColor="#D4AF37" />
            </LinearGradient>
          </Defs>
          <Path d="M0 0 H72 V58 H0 Z" fill="url(#cfcBoardGold)" />
        </Svg>
        <T style={styles.boardNum} color="#2A1800">
          {String(earned)}
        </T>
        <T style={styles.boardOf} color="#2A1800">
          DE 24
        </T>
      </View>
      <View style={styles.boardGrid}>
        {RARITY_ORDER.map((rarity) => {
          const all = trophies.filter((item) => item.rarity === rarity);
          const got = all.filter((item) => item.earned).length;
          return (
            <View key={rarity} style={styles.boardCell}>
              <T style={styles.boardCount} color={RARITY_TONE[rarity].text}>
                {`${got}/${all.length}`}
              </T>
              <T style={styles.boardRarity}>{RARITY_LABEL[rarity]}</T>
            </View>
          );
        })}
      </View>
    </View>
  );
}

function Stripe({ title, got, total, gradId }: { title: string; got: number; total: number; gradId: string }) {
  return (
    <View style={styles.stripe}>
      <Svg width="100%" height="28" viewBox="0 0 100 28" preserveAspectRatio="none" style={StyleSheet.absoluteFill}>
        <Defs>
          <LinearGradient id={gradId} x1="0" y1="0" x2="1" y2="0">
            <Stop offset="0" stopColor="#00FF87" />
            <Stop offset="1" stopColor="#00C76A" />
          </LinearGradient>
        </Defs>
        <Path d="M0 0 H100 L97 28 H0 Z" fill={`url(#${gradId})`} />
      </Svg>
      <T style={styles.stripeTitle} color="#37003C">
        {title}
      </T>
      <T style={styles.stripeCount} color="#37003C">
        {`${got}/${total}`}
      </T>
    </View>
  );
}

function Row({ trophy, last }: { trophy: TrophyView; last: boolean }) {
  const tone = RARITY_TONE[trophy.rarity];
  const progress = trophy.progress;
  const showBar = !trophy.earned && progress != null;
  const ratio = showBar && progress.target > 0 ? Math.min(1, progress.current / progress.target) : 0;
  return (
    <SportPress
      onPress={() => onTrophyPress(trophy.code)}
      style={[styles.row, !last && styles.rowLine, trophy.earned && styles.rowEarned]}
      accessibilityRole="button"
      accessibilityLabel={`${trophy.title}${trophy.earned ? ', ganado' : ', bloqueado'}`}
    >
      <AchievementBadge code={trophy.code} unlocked={trophy.earned} size={46} progress={trophy.progress} />
      <View style={styles.rowBody}>
        <View style={styles.rowTitle}>
          <T style={styles.name} numberOfLines={1}>
            {trophy.title}
          </T>
          <View style={[styles.chip, { backgroundColor: tone.chip }]}>
            <T style={styles.chipText} color={tone.text}>
              {RARITY_LABEL[trophy.rarity]}
            </T>
          </View>
        </View>
        <T style={styles.condition} color="#B99BC6" numberOfLines={1}>
          {trophy.description}
        </T>
      </View>
      {trophy.earned ? (
        <View style={styles.right}>
          <T style={styles.won}>GANADO</T>
          {trophy.earnedAt ? (
            <T style={styles.wonDate} color="#E4D4EE">
              {formatDay(trophy.earnedAt)}
            </T>
          ) : null}
        </View>
      ) : showBar ? (
        <View style={styles.meter}>
          <T style={styles.meterNum} color="#F1D27A">
            {`${Math.min(progress!.current, progress!.target)}/${progress!.target}`}
          </T>
          <View style={styles.bar}>
            <View style={[styles.barFill, { width: `${Math.round(ratio * 100)}%` }]} />
          </View>
        </View>
      ) : (
        <T style={styles.pending}>POR GANAR</T>
      )}
    </SportPress>
  );
}

/** Marcador de TV y tablas por sección (propuesta 5 de Stan, Tabla de transmisión). */
export function TrofeosTabla({ trophies }: { trophies: TrophyView[] }) {
  return (
    <View style={styles.root}>
      <Scoreboard trophies={trophies} />
      {trophySections.map((section) => {
        const rows = trophies.filter((item) => item.section === section.id);
        if (!rows.length) return null;
        const got = rows.filter((item) => item.earned).length;
        return (
          <View key={section.id} style={styles.table}>
            <Stripe title={section.title} got={got} total={rows.length} gradId={`cfcStripe-${section.id}`} />
            <View style={styles.body}>
              {rows.map((trophy, index) => (
                <Row key={trophy.code} trophy={trophy} last={index === rows.length - 1} />
              ))}
            </View>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { gap: 12 },
  board: { flexDirection: 'row', alignItems: 'stretch', borderRadius: 6, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(241,210,122,0.4)', minHeight: 58 },
  boardGold: { width: 72, paddingVertical: 8, paddingHorizontal: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: '#D4AF37' },
  boardNum: { fontSize: 30, fontWeight: '800', letterSpacing: -0.5, lineHeight: 32 },
  boardOf: { fontSize: 9, fontWeight: '800', letterSpacing: 1.2 },
  boardGrid: { flex: 1, flexDirection: 'row', backgroundColor: 'rgba(36,0,42,0.8)' },
  boardCell: { flex: 1, alignItems: 'center', justifyContent: 'center', borderLeftWidth: 1, borderLeftColor: 'rgba(201,162,255,0.15)', paddingVertical: 8 },
  boardCount: { fontSize: 17, fontWeight: '800', letterSpacing: -0.3, lineHeight: 20 },
  boardRarity: { fontSize: 8, fontWeight: '800', letterSpacing: 1, color: '#B99BC6', marginTop: 4, textTransform: 'uppercase' },
  table: {},
  stripe: { height: 28, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10 },
  stripeTitle: { flex: 1, fontSize: 11, fontWeight: '800', letterSpacing: 1.4, textTransform: 'uppercase' },
  stripeCount: { fontSize: 10, fontWeight: '800', letterSpacing: 1, marginRight: 12 },
  body: { backgroundColor: 'rgba(255,255,255,0.035)', borderWidth: 1, borderColor: 'rgba(201,162,255,0.16)', borderTopWidth: 0 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8, paddingHorizontal: 10 },
  rowLine: { borderBottomWidth: 1, borderBottomColor: 'rgba(201,162,255,0.12)' },
  rowEarned: { backgroundColor: 'rgba(241,210,122,0.08)' },
  rowBody: { flex: 1, minWidth: 0, gap: 3 },
  rowTitle: { flexDirection: 'row', gap: 6, alignItems: 'center' },
  name: { fontSize: 14, fontWeight: '800', textTransform: 'uppercase', flexShrink: 1 },
  chip: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 5, flexShrink: 0 },
  chipText: { fontSize: 7.5, fontWeight: '800', letterSpacing: 1, textTransform: 'uppercase' },
  condition: { fontSize: 11, textTransform: 'none', letterSpacing: 0 },
  right: { alignItems: 'flex-end', flexShrink: 0 },
  won: { fontSize: 10, fontWeight: '800', color: '#00FF87', letterSpacing: 0.8 },
  wonDate: { fontSize: 11, marginTop: 2 },
  meter: { width: 62, alignItems: 'flex-end', flexShrink: 0 },
  meterNum: { fontSize: 15, fontWeight: '800', letterSpacing: -0.3, lineHeight: 18 },
  bar: { marginTop: 5, height: 4, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.1)', width: 62, overflow: 'hidden' },
  barFill: { height: 4, borderRadius: 4, backgroundColor: '#E3C15A' },
  pending: { fontSize: 10, fontWeight: '700', color: '#B99BC6', flexShrink: 0 },
});
