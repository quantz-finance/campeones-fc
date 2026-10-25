import { useEffect, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  Animated,
  Easing,
  Image,
  Platform,
  StyleSheet,
  View,
  type LayoutChangeEvent,
} from 'react-native';
import { Toro } from './broadcast';
import { colors } from './theme';
import { T } from './text';

const anchor = require('../../assets/banners/comentarista-ticker.webp');

/** Alto de la cinta (sin contar al comentarista, que sobresale hacia arriba). */
export const TICKER_BAR = 40;
/** Lado del recuadro del comentarista. */
export const TICKER_ANCHOR = 112;
/** Cuánto sube el comentarista por encima de la cinta. */
export const TICKER_RISE = TICKER_ANCHOR - TICKER_BAR + 6;
/** Espacio total que ocupa la cinta con el comentarista. */
export const TICKER_SPACE = TICKER_BAR + TICKER_RISE;

const SPEED = 46; // px por segundo, ritmo de cinta de tele
const ROTATE_MS = 6000;

function useReduceMotion(): boolean {
  const [reduce, setReduce] = useState(false);
  useEffect(() => {
    let alive = true;
    AccessibilityInfo.isReduceMotionEnabled()
      .then((value) => alive && setReduce(value))
      .catch(() => {});
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', (value: boolean) => setReduce(value));
    return () => {
      alive = false;
      sub?.remove?.();
    };
  }, []);
  return reduce;
}

function Items({ items }: { items: string[] }) {
  return (
    <>
      {items.map((item, index) => (
        <View key={`${index}-${item}`} style={styles.item}>
          <T variant="label" numberOfLines={1} style={styles.itemText}>
            {item}
          </T>
          <View style={styles.sep}>
            <Toro size={16} />
          </View>
        </View>
      ))}
    </>
  );
}

/**
 * Cinta de noticias tipo tele, fija abajo del inicio: el comentarista sentado de
 * frente sobre la cinta y los titulares corriendo de derecha a izquierda.
 */
export function NewsTicker({ items }: { items: string[] }) {
  const reduce = useReduceMotion();
  const shift = useRef(new Animated.Value(0)).current;
  const [copyWidth, setCopyWidth] = useState(0);
  const [index, setIndex] = useState(0);
  const key = items.join('|');

  useEffect(() => {
    if (reduce || copyWidth <= 0) {
      shift.setValue(0);
      return;
    }
    shift.setValue(0);
    const loop = Animated.loop(
      Animated.timing(shift, {
        toValue: -copyWidth,
        duration: (copyWidth / SPEED) * 1000,
        easing: Easing.linear,
        useNativeDriver: Platform.OS !== 'web',
        isInteraction: false,
      }),
    );
    loop.start();
    return () => loop.stop();
  }, [reduce, copyWidth, key, shift]);

  useEffect(() => {
    if (!reduce || items.length < 2) return;
    const timer = setInterval(() => setIndex((value) => (value + 1) % items.length), ROTATE_MS);
    return () => clearInterval(timer);
  }, [reduce, items.length]);

  const onCopy = (event: LayoutChangeEvent) => {
    const width = Math.round(event.nativeEvent.layout.width);
    if (width > 0 && width !== copyWidth) setCopyWidth(width);
  };

  return (
    <View style={styles.root} pointerEvents="box-none">
      <View
        style={styles.bar}
        accessible
        accessibilityRole="text"
        accessibilityLabel={`En vivo. ${items.join('. ')}`}
      >
        <View style={styles.chip}>
          <View style={styles.dot} />
          <T variant="label" color={colors.accentInk} style={styles.chipText}>
            En vivo
          </T>
        </View>
        <View style={styles.track}>
          {reduce ? (
            <View style={styles.staticRow}>
              <T variant="label" numberOfLines={1} style={styles.itemText}>
                {items[index % Math.max(items.length, 1)] ?? ''}
              </T>
            </View>
          ) : (
            <Animated.View style={[styles.row, { transform: [{ translateX: shift }] }]}>
              <View style={styles.copy} onLayout={onCopy}>
                <Items items={items} />
              </View>
              <View style={styles.copy} aria-hidden importantForAccessibility="no-hide-descendants">
                <Items items={items} />
              </View>
            </Animated.View>
          )}
        </View>
      </View>
      <View style={styles.anchor} pointerEvents="none">
        <Image
          source={anchor}
          style={styles.anchorImage}
          resizeMode="cover"
          accessible
          accessibilityRole="image"
          accessibilityLabel="Comentarista de Campeones FC"
        />
        <View
          style={[
            styles.anchorFade,
            Platform.OS === 'web'
              ? ({ backgroundImage: 'linear-gradient(to bottom, rgba(8,11,19,0) 0%, rgba(8,11,19,0.0) 70%, rgba(46,75,240,0.55) 100%)' } as object)
              : null,
          ]}
        />
      </View>
    </View>
  );
}

const ARCH = TICKER_ANCHOR / 2;

const styles = StyleSheet.create({
  root: { height: TICKER_SPACE, justifyContent: 'flex-end' },
  bar: {
    height: TICKER_BAR,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.blue,
    borderTopWidth: 3,
    borderTopColor: colors.red,
    paddingLeft: TICKER_ANCHOR + 14,
    overflow: 'hidden',
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: colors.yellow,
    paddingHorizontal: 7,
    paddingVertical: 3,
    transform: [{ skewX: '-10deg' }],
    zIndex: 2,
  },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.red },
  chipText: { fontSize: 11 },
  track: { flex: 1, height: '100%', overflow: 'hidden', marginLeft: 10, justifyContent: 'center' },
  row: { position: 'absolute', left: 0, top: 0, bottom: 0, flexDirection: 'row', alignItems: 'center' },
  copy: { flexDirection: 'row', alignItems: 'center', flexShrink: 0 },
  item: { flexDirection: 'row', alignItems: 'center', flexShrink: 0 },
  itemText: { fontSize: 13, color: colors.text, flexShrink: 0 },
  sep: { marginHorizontal: 12, opacity: 0.95 },
  staticRow: { paddingRight: 8 },
  anchor: {
    position: 'absolute',
    left: 8,
    bottom: 0,
    width: TICKER_ANCHOR,
    height: TICKER_ANCHOR,
    borderTopLeftRadius: ARCH,
    borderTopRightRadius: ARCH,
    overflow: 'hidden',
    backgroundColor: colors.bg,
    borderWidth: 2,
    borderBottomWidth: 0,
    borderColor: colors.red,
    zIndex: 3,
  },
  anchorImage: { width: '100%', height: '100%' },
  anchorFade: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0 },
});
