// Carrusel de un espacio de anuncio. Solo Animated de React Native (sin Reanimated ni módulos nativos).
// - Tamaño exacto: el ancho que le dé su contenedor y el alto por la proporción del arte de Stan.
// - Avanza solo cada 5 s, en bucle. Se pausa mientras lo tocas, si la pantalla no está a la vista
//   o si VoiceOver está encendido (ahí se pasa con tres dedos).
// - Se desliza con el dedo; con swipeable={false} (dentro de otro carrusel) se funde de una a otra.
// - Puntos de página. La última lámina siempre es «Quiero ver mi anuncio aquí».
// - Cada PNG ya trae su texto y la etiqueta «Anuncio»: se pinta solo la imagen, con su texto alterno.
import { useIsFocused, type Href } from 'expo-router';
import { Image } from 'expo-image';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  Animated,
  Linking,
  Platform,
  StyleSheet,
  View,
  type LayoutChangeEvent,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { adSpace, type AdPiece, type AdSection } from '../content/ads';
import { useReducedMotion } from './motion';
import { push } from './nav';
import { SportPress } from './press';
import { colors } from './theme';

export const AD_INTERVAL_MS = 5000;

type Card = { type: 'ad' | 'cta'; piece: AdPiece };

export function adCards(section: AdSection): Card[] {
  const art = adSpace(section);
  return [...art.ads.map((piece) => ({ type: 'ad' as const, piece })), { type: 'cta' as const, piece: art.cta }];
}

/** Siguiente página del bucle. */
export function nextPage(page: number, count: number): number {
  return count <= 1 ? 0 : (page + 1) % count;
}

function useScreenReader(): boolean {
  const [on, setOn] = useState(false);
  useEffect(() => {
    let alive = true;
    void AccessibilityInfo.isScreenReaderEnabled().then((v) => alive && setOn(v));
    const sub = AccessibilityInfo.addEventListener('screenReaderChanged', setOn);
    return () => {
      alive = false;
      sub.remove();
    };
  }, []);
  return on;
}

function openAd(href: string) {
  if (/^https?:\/\//.test(href)) void Linking.openURL(href);
  else push(href as Href);
}

export function openAdRequest(section: AdSection) {
  push(`/anuncio?espacio=${section}` as Href);
}

export function AdCarousel({
  section,
  swipeable = true,
  startAt = 0,
  style,
}: {
  section: AdSection;
  /** false = no se desliza (cuando vive dentro de otro carrusel horizontal); se funde de una a otra. */
  swipeable?: boolean;
  /** Página inicial (para que dos carruseles iguales en la misma pantalla no muestren lo mismo). */
  startAt?: number;
  style?: StyleProp<ViewStyle>;
}) {
  const cards = useMemo(() => adCards(section), [section]);
  const { aspect } = adSpace(section);
  const count = cards.length;
  const [width, setWidth] = useState(0);
  const [page, setPage] = useState(() => startAt % count);
  const [touching, setTouching] = useState(false);
  const focused = useIsFocused();
  const reader = useScreenReader();
  const reduced = useReducedMotion();
  const scroll = useRef<any>(null);
  const x = useRef(new Animated.Value(0)).current;
  const fade = useRef(new Animated.Value(1)).current;
  const paused = touching || !focused || reader || count <= 1 || !width;
  const height = width ? Math.round((width / aspect) * 100) / 100 : 0;

  const goTo = useCallback(
    (target: number, animated = true) => {
      setPage(target);
      if (swipeable) {
        scroll.current?.scrollTo({ x: target * width, animated: animated && !reduced });
      } else if (reduced || !animated) {
        fade.setValue(1);
      } else {
        fade.setValue(0.2);
        Animated.timing(fade, { toValue: 1, duration: 320, useNativeDriver: Platform.OS !== 'web' }).start();
      }
    },
    [fade, reduced, swipeable, width],
  );

  // Al medir el ancho, ubicarse en la página actual sin animación.
  useEffect(() => {
    if (width && swipeable && page) scroll.current?.scrollTo({ x: page * width, animated: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [width]);

  // Avance automático: el temporizador se reinicia en cada cambio de página o de pausa.
  useEffect(() => {
    if (paused) return;
    const timer = setTimeout(() => goTo(nextPage(page, count)), AD_INTERVAL_MS);
    return () => clearTimeout(timer);
  }, [paused, page, count, goTo]);

  const onLayout = (e: LayoutChangeEvent) => {
    const w = Math.round(e.nativeEvent.layout.width);
    if (w && w !== width) setWidth(w);
  };
  const onMomentumEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (!width) return;
    setPage(Math.max(0, Math.min(count - 1, Math.round(e.nativeEvent.contentOffset.x / width))));
    setTouching(false);
  };

  const render = (card: Card, index: number) => (
    <Slide key={card.piece.id} card={card} section={section} index={index} count={count} width={width} height={height} />
  );

  return (
    <View style={style}>
      <View
        style={[styles.frame, { aspectRatio: aspect }]}
        onLayout={onLayout}
        onTouchStart={() => setTouching(true)}
        onTouchEnd={() => setTouching(false)}
        onTouchCancel={() => setTouching(false)}
      >
        {!width ? null : swipeable ? (
          <Animated.ScrollView
            ref={scroll}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            scrollEventThrottle={16}
            onScroll={Animated.event([{ nativeEvent: { contentOffset: { x } } }], { useNativeDriver: false })}
            onScrollBeginDrag={() => setTouching(true)}
            onMomentumScrollEnd={onMomentumEnd}
            contentOffset={{ x: page * width, y: 0 }}
          >
            {cards.map(render)}
          </Animated.ScrollView>
        ) : (
          <Animated.View style={{ opacity: fade }}>{render(cards[page], page)}</Animated.View>
        )}
      </View>
      {count > 1 ? <Dots count={count} page={page} x={swipeable && width ? x : null} width={width} onPick={(p) => goTo(p)} /> : null}
    </View>
  );
}

function Slide({ card, section, index, count, width, height }: { card: Card; section: AdSection; index: number; count: number; width: number; height: number }) {
  const { piece } = card;
  const cta = card.type === 'cta';
  const onPress = cta ? () => openAdRequest(section) : piece.href ? () => openAd(piece.href!) : undefined;
  return (
    <SportPress
      style={[styles.slide, { width, height }]}
      onPress={onPress}
      accessibilityRole={onPress ? (cta ? 'button' : 'link') : 'image'}
      accessibilityLabel={`${piece.alt} (${index + 1} de ${count})`}
      accessibilityHint={cta ? 'Abre el formulario para pedir tu espacio.' : undefined}
    >
      <Image source={piece.image} style={StyleSheet.absoluteFill} contentFit="cover" accessible={false} transition={0} />
    </SportPress>
  );
}

function Dots({ count, page, x, width, onPick }: { count: number; page: number; x: Animated.Value | null; width: number; onPick: (p: number) => void }) {
  return (
    <View style={styles.dots} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      {Array.from({ length: count }, (_, i) => {
        const range = [(i - 1) * width, i * width, (i + 1) * width];
        // Con deslizamiento, el punto crece siguiendo el dedo; si no, salta al cambiar de página.
        const grow = x ? x.interpolate({ inputRange: range, outputRange: [6, 16, 6], extrapolate: 'clamp' }) : i === page ? 16 : 6;
        const opacity = x ? x.interpolate({ inputRange: range, outputRange: [0.35, 1, 0.35], extrapolate: 'clamp' }) : i === page ? 1 : 0.35;
        return (
          <SportPress key={i} onPress={() => onPick(i)} hitSlop={6} style={styles.dotHit}>
            <Animated.View style={[styles.dot, { width: grow, opacity }]} />
          </SportPress>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  // Las piezas traen esquinas redondeadas de 16 pt sobre blanco: se recorta a 17 para no ver ese borde.
  frame: { width: '100%', borderRadius: 17, overflow: 'hidden', backgroundColor: colors.bgDeep },
  slide: { overflow: 'hidden' },
  dots: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: 6 },
  dotHit: { paddingHorizontal: 2, paddingVertical: 3 },
  dot: { height: 5, borderRadius: 3, backgroundColor: colors.text },
});
