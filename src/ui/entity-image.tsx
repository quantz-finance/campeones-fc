// Foto de jugador / grupo / torneo. Caja de tamaño fijo (sin saltos de layout): el placeholder de marca
// (iniciales o escudo) se pinta debajo y la foto entra encima con un fundido corto. expo-image cachea en memoria y disco.
import { Image } from 'expo-image';
import { memo, type ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { useReducedMotion } from './motion';

export const EntityImage = memo(function EntityImage({
  uri,
  size,
  children,
  style,
  label,
}: {
  uri?: string | null;
  size: number;
  /** Placeholder (iniciales / escudo) mientras carga o si no hay foto. */
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  label?: string;
}) {
  const reduced = useReducedMotion();
  return (
    <View style={[{ width: size, height: size }, styles.box, style]} accessibilityLabel={label} accessibilityRole={label ? 'image' : undefined}>
      {children}
      {uri ? (
        <Image
          source={{ uri }}
          recyclingKey={uri}
          style={StyleSheet.absoluteFill}
          contentFit="cover"
          contentPosition="center"
          cachePolicy="memory-disk"
          transition={reduced ? 0 : 180}
          accessible={false}
        />
      ) : null}
    </View>
  );
});

/** Solo la capa de foto (para componentes con su propia forma: avatar cuadrado, escudo). Cover y centrada. */
export const PhotoLayer = memo(function PhotoLayer({ uri }: { uri?: string | null }) {
  const reduced = useReducedMotion();
  if (!uri) return null;
  return (
    <Image
      source={{ uri }}
      recyclingKey={uri}
      style={StyleSheet.absoluteFill}
      contentFit="cover"
      contentPosition="center"
      cachePolicy="memory-disk"
      transition={reduced ? 0 : 180}
      accessible={false}
    />
  );
});

const styles = StyleSheet.create({
  box: { overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
});
