import { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  Platform,
  StyleSheet,
  View,
  type LayoutChangeEvent,
} from 'react-native';
import { Toro } from './broadcast';
import { cssAnim, useReducedMotion } from './motion';
import { colors, space } from './theme';
import { T } from './text';

/** Alto de la cinta de noticias. */
export const TICKER_BAR = 27;
/** Espacio total que ocupa la cinta. */
export const TICKER_SPACE = TICKER_BAR;

const SPEED = 40; // px por segundo, ritmo de cinta de tele
const ROTATE_MS = 6000;

const web = Platform.OS === 'web';
// En web basta un View: el movimiento lo hace el CSS, no `Animated`.
const Row = (web ? View : Animated.View) as typeof Animated.View;

function Items({ items }: { items: string[] }) {
  return (
    <>
      {items.map((item, index) => (
        <View key={`${index}-${item}`} style={styles.item}>
          <T variant="label" numberOfLines={1} style={styles.itemText}>
            {item}
          </T>
          <View style={styles.sep}>
            <Toro size={12} />
          </View>
        </View>
      ))}
    </>
  );
}

/**
 * Cinta de noticias tipo tele, fija abajo del inicio: los titulares corriendo de derecha a izquierda.
 */
export function NewsTicker({ items }: { items: string[] }) {
  const reduce = useReducedMotion();
  const shift = useRef(new Animated.Value(0)).current;
  const [copyWidth, setCopyWidth] = useState(0);
  const [index, setIndex] = useState(0);
  const key = items.join('|');

  useEffect(() => {
    // En web la cinta corre con una animación CSS en el compositor (ver `cssLoop`), no en JS.
    if (web) return;
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
            <Row style={[styles.row, web ? cssLoop(copyWidth) : { transform: [{ translateX: shift }] }]}>
              <View style={styles.copy} onLayout={onCopy}>
                <Items items={items} />
              </View>
              <View style={styles.copy} aria-hidden importantForAccessibility="no-hide-descendants">
                <Items items={items} />
              </View>
            </Row>
          )}
        </View>
      </View>
    </View>
  );
}

/** Bucle infinito de la cinta en CSS: solo transform, corre en el hilo del compositor. */
function cssLoop(width: number) {
  if (width <= 0) return null;
  return cssAnim(
    { from: { transform: [{ translateX: 0 }] }, to: { transform: [{ translateX: -width }] } },
    Math.round((width / SPEED) * 1000),
    0,
    { animationTimingFunction: 'linear', animationIterationCount: 'infinite', animationFillMode: 'none' },
  );
}

const styles = StyleSheet.create({
  root: { height: TICKER_SPACE, justifyContent: 'flex-end' },
  bar: {
    height: TICKER_BAR,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.blue,
    borderTopWidth: 2,
    borderTopColor: colors.red,
    paddingLeft: 8,
    overflow: 'hidden',
    borderRadius: 14,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.xs,
    backgroundColor: colors.yellow,
    paddingHorizontal: 5,
    paddingVertical: 1,
    transform: [{ skewX: '0deg' }],
    zIndex: 2,
    borderRadius: 999,
  },
  dot: { width: 5, height: 5, borderRadius: 2.5, backgroundColor: colors.red },
  chipText: { fontSize: 9, lineHeight: 12, letterSpacing: 0.8 },
  track: { flex: 1, height: '100%', overflow: 'hidden', marginLeft: space.sm, justifyContent: 'center' },
  row: { position: 'absolute', left: 0, top: 0, bottom: 0, flexDirection: 'row', alignItems: 'center' },
  copy: { flexDirection: 'row', alignItems: 'center', flexShrink: 0 },
  item: { flexDirection: 'row', alignItems: 'center', flexShrink: 0 },
  itemText: { fontSize: 11, lineHeight: 14, letterSpacing: 0.8, color: colors.text, flexShrink: 0 },
  sep: { marginHorizontal: space.sm, opacity: 0.95 },
  staticRow: { paddingRight: 8 },
});
