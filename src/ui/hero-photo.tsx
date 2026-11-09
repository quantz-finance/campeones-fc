import { createElement } from 'react';
import { Image, Platform, StyleSheet, useWindowDimensions, View } from 'react-native';
import { colors, space } from './theme';
import { T } from './text';

// Jugador de la landing (personaje ficticio, imagen generada con IA) arriba a la derecha.
// La foto se funde a la izquierda y abajo con el fondo para que el texto se lea en los dos modos.
// En web: <picture> con WebP (precache del SW) y JPG de respaldo.
const WEBP = '/media/hero-player.webp';
const JPG = '/media/hero-player.jpg';

/** Aviso obligatorio de la foto; va debajo del texto del hero, a la derecha. */
export function HeroPhotoNote() {
  return (
    <T variant="tiny" color={colors.faint} style={styles.note}>
      Personaje ficticio. Imagen generada con IA.
    </T>
  );
}

export function HeroPhoto({ height = 320 }: { height?: number }) {
  // En pantallas anchas la foto no toca el borde: se funde también arriba y a la derecha.
  const wide = useWindowDimensions().width >= 600;
  return (
    <View pointerEvents="none" style={[styles.box, { height }]} testID="hero-photo">
      {Platform.OS === 'web' ? (
        createElement(
          'picture',
          { style: { position: 'absolute', inset: 0, display: 'block', ...fadeMask(wide) } },
          createElement('source', { srcSet: WEBP, type: 'image/webp' }),
          createElement('img', {
            src: JPG,
            alt: 'Jugador de Campeones FC',
            decoding: 'async',
            fetchPriority: 'high',
            style: { width: '100%', height: '100%', objectFit: 'cover', objectPosition: '55% 18%', display: 'block' },
          }),
        )
      ) : (
        <Image source={{ uri: JPG }} style={StyleSheet.absoluteFill} resizeMode="cover" />
      )}
    </View>
  );
}

// Máscara: la foto se vuelve transparente hacia la izquierda y abajo (y arriba/derecha en
// pantallas anchas), así se funde con el fondo morado o claro que haya detrás, sin bordes.
function fadeMask(wide: boolean): Record<string, string> {
  const layers = [
    'linear-gradient(90deg, transparent 0%, #000 46%)',
    'linear-gradient(180deg, #000 45%, transparent 96%)',
    ...(wide ? ['linear-gradient(270deg, transparent 0%, #000 22%)', 'linear-gradient(0deg, #000 80%, transparent 100%)'] : []),
  ].join(', ');
  return {
    maskImage: layers,
    WebkitMaskImage: layers,
    maskComposite: 'intersect',
    WebkitMaskComposite: 'source-in',
  };
}

const styles = StyleSheet.create({
  box: {
    position: 'absolute',
    top: -24,
    right: -space.lg,
    width: '64%',
    maxWidth: 340,
    overflow: 'hidden',
  },
  note: { alignSelf: 'flex-end', textTransform: 'none', letterSpacing: 0, fontSize: 10, marginTop: -6 },
});
