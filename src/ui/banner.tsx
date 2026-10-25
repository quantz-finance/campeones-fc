import { Image, PixelRatio, StyleSheet, useWindowDimensions, View } from 'react-native';
import { radius } from './theme';

const wide = require('../../assets/banners/comentarista-1280.webp');
const small = require('../../assets/banners/comentarista-800.webp');

/** Ilustración decorativa del inicio: solo la imagen, sin texto encima. */
export function HomeBanner() {
  const { width } = useWindowDimensions();
  // El contenido de Screen mide como mucho 480 px de ancho.
  const pixels = PixelRatio.getPixelSizeForLayoutSize(Math.min(width, 480));
  return (
    <View style={styles.card}>
      <Image
        source={pixels <= 820 ? small : wide}
        style={styles.image}
        resizeMode="cover"
        accessible
        accessibilityRole="image"
        accessibilityLabel="Comentarista de Campeones FC"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    width: '100%',
    aspectRatio: 16 / 9,
    borderRadius: radius.lg,
    overflow: 'hidden',
    backgroundColor: '#080B13',
  },
  image: { width: '100%', height: '100%' },
});
