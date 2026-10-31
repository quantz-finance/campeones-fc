// Skeletons con la forma real de cada pantalla. Un solo pulso de opacidad por bloque (CSS / native driver).
import { memo } from 'react';
import { Animated, StyleSheet, View, type DimensionValue } from 'react-native';
import { FadeIn, useShimmerStyle } from './motion';
import { colors, space } from './theme';

const BONE = 'rgba(255,255,255,0.09)';

function Shimmer({ children }: { children: React.ReactNode }) {
  const pulse = useShimmerStyle();
  return (
    <FadeIn ms={160}>
      <Animated.View style={[styles.col, pulse]} accessibilityLabel="Cargando" accessibilityRole="progressbar">
        {children}
      </Animated.View>
    </FadeIn>
  );
}

export const Bone = memo(function Bone({
  w = '100%',
  h = 14,
  round = false,
  skew = false,
  color = BONE,
}: {
  w?: DimensionValue;
  h?: number;
  round?: boolean;
  skew?: boolean;
  color?: string;
}) {
  return (
    <View
      style={{
        width: w,
        height: h,
        backgroundColor: color,
        borderRadius: round ? 999 : 2,
        transform: skew ? [{ skewX: '-8deg' }] : undefined,
      }}
    />
  );
});

function Row() {
  return (
    <View style={styles.row}>
      <Bone w={22} h={20} />
      <Bone w={40} h={40} skew />
      <View style={styles.flexGap}>
        <Bone w="55%" h={14} />
        <Bone w="35%" h={10} />
      </View>
      <Bone w={46} h={20} />
    </View>
  );
}

/** Filas tipo ranking / historial (avatar, nombre, dato a la derecha). */
export function ListSkeleton({ rows = 8, intro = true }: { rows?: number; intro?: boolean }) {
  return (
    <Shimmer>
      {intro ? (
        <View style={styles.intro}>
          <Bone w="96%" h={12} />
          <Bone w="90%" h={12} />
          <Bone w="94%" h={12} />
          <Bone w="70%" h={12} />
        </View>
      ) : null}
      <View style={styles.rows}>
        {Array.from({ length: rows }, (_, i) => (
          <Row key={i} />
        ))}
      </View>
    </Shimmer>
  );
}

/** Tarjetas con escudo (grupos, torneos, amigos). */
export function CardsSkeleton({ cards = 4 }: { cards?: number }) {
  return (
    <Shimmer>
      {Array.from({ length: cards }, (_, i) => (
        <View key={i} style={styles.card}>
          <Bone w={52} h={58} skew />
          <View style={styles.flexGap}>
            <Bone w="60%" h={18} />
            <Bone w="45%" h={10} />
            <Bone w="38%" h={12} />
          </View>
        </View>
      ))}
    </Shimmer>
  );
}

/** Inicio: ficha (bloque rojo + datos), "por confirmar" y accesos rápidos. */
export function HomeSkeleton() {
  return (
    <Shimmer>
      <View style={styles.brand}>
        <View style={styles.brandLeft}>
          <Bone w={44} h={44} round />
          <Bone w={110} h={24} />
          <Bone w={80} h={18} skew />
        </View>
        <Bone w={42} h={42} skew />
      </View>
      <View style={styles.hero}>
        <View style={[styles.heroLeft]}>
          <Bone w={60} h={44} color="rgba(255,255,255,0.12)" />
          <Bone w={56} h={10} />
        </View>
        <View style={styles.heroRight}>
          <Bone w={50} h={10} />
          <Bone w="80%" h={30} />
          <Bone w={110} h={30} skew />
          <Bone w="70%" h={8} />
        </View>
      </View>
      <View style={styles.head}>
        <Bone w="45%" h={18} />
        <Bone w={60} h={12} />
      </View>
      {[0, 1].map((i) => (
        <View key={i} style={styles.scorebar}>
          <Bone w={44} h={26} skew />
          <Bone w={70} h={30} />
          <Bone w={44} h={26} skew />
        </View>
      ))}
      <Bone w="40%" h={18} />
      <View style={styles.grid}>
        {[0, 1, 2, 3].map((i) => (
          <View key={i} style={styles.tile}>
            <Bone w="50%" h={10} />
            <Bone w="70%" h={22} />
          </View>
        ))}
      </View>
    </Shimmer>
  );
}

/** Detalle (partido, versus): marcador grande + bloques. */
export function DetailSkeleton() {
  return (
    <Shimmer>
      <View style={styles.scorebarBig}>
        <Bone w={64} h={64} round />
        <Bone w={96} h={48} />
        <Bone w={64} h={64} round />
      </View>
      <Bone w="70%" h={14} />
      <Bone w="50%" h={14} />
      <View style={styles.panel}>
        <Bone w="40%" h={12} />
        <Bone w="90%" h={12} />
        <Bone w="80%" h={12} />
      </View>
      <Bone w="100%" h={50} skew />
    </Shimmer>
  );
}

const styles = StyleSheet.create({
  col: { gap: 14 },
  intro: { gap: 10, marginBottom: 10 },
  rows: { gap: 4, marginTop: -14 },
  brand: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 48 },
  brandLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  flexGap: { flex: 1, gap: 6 },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.md, padding: space.sm, minHeight: 56 },
  card: { flexDirection: 'row', alignItems: 'center', gap: space.md, padding: space.md, minHeight: 92, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
  hero: { flexDirection: 'row', minHeight: 184, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
  heroLeft: { width: '38%', backgroundColor: 'rgba(255,90,31,0.22)', padding: 12, gap: 8 },
  heroRight: { flex: 1, padding: 12, gap: 10, justifyContent: 'center' },
  head: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  scorebar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 12, minHeight: 64, backgroundColor: colors.surface },
  scorebarBig: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around', paddingVertical: 20 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  tile: { width: '48%', flexGrow: 1, minHeight: 84, padding: 12, gap: 8, backgroundColor: 'rgba(255,255,255,0.05)' },
  panel: { padding: 12, gap: 8, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
});
