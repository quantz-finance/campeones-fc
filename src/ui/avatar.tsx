// Foto de perfil: siempre un cuadro 1:1 (las fotos se suben cuadradas), con la foto en cover y centrada.
// Sin foto: iniciales sobre el color del avatar. Igual en iPhone y en la web.
import { Ionicons } from '@expo/vector-icons';
import { Platform, StyleSheet, View } from 'react-native';
import { avatarByKey } from '../../config/branding';
import { initials } from './format';
import { T } from './text';
import { PhotoLayer } from './entity-image';

/** Radio de las esquinas de una foto de perfil cuadrada (proporcional al tamaño). */
export function photoRadius(size: number): number {
  return Math.round(size * 0.2);
}

export function Avatar({
  avatarKey,
  size = 44,
  name,
  photoUrl,
}: {
  avatarKey: string;
  size?: number;
  name?: string;
  photoUrl?: string | null;
}) {
  const avatar = avatarByKey(avatarKey);
  return (
    <View
      style={[
        styles.wrap,
        { width: size, height: size, borderRadius: photoRadius(size), backgroundColor: avatar.background },
        Platform.OS === 'web' ? ({ backgroundImage: `linear-gradient(160deg, ${avatar.background}, ${avatar.wash})` } as object) : null,
      ]}
    >
      {name ? (
        <T variant="display" style={{ fontSize: Math.max(12, Math.round(size * 0.36)), color: '#fff' }}>
          {initials(name)}
        </T>
      ) : (
        <Ionicons name={avatar.icon as keyof typeof Ionicons.glyphMap} size={size * 0.42} color={avatar.foreground} />
      )}
      <PhotoLayer uri={photoUrl} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
});
