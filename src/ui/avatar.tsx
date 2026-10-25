import { Ionicons } from '@expo/vector-icons';
import { Platform, StyleSheet, View } from 'react-native';
import { avatarByKey } from '../../config/branding';
import { initials } from './format';
import { T } from './text';
import { PhotoLayer } from './entity-image';

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
  const web = Platform.OS === 'web';
  return (
    <View
      style={[
        styles.wrap,
        {
          width: size,
          height: size,
          backgroundColor: avatar.background,
        },
        web ? styles.clip : { transform: [{ skewX: '-10deg' }] },
        web ? ({ backgroundImage: `linear-gradient(160deg, ${avatar.background}, ${avatar.wash})` } as object) : null,
      ]}
    >
      {name ? (
        <T
          variant="display"
          style={{
            fontSize: Math.max(12, Math.round(size * 0.36)),
            color: '#fff',
            transform: web ? undefined : [{ skewX: '10deg' }],
          }}
        >
          {initials(name)}
        </T>
      ) : (
        <View style={web ? undefined : { transform: [{ skewX: '10deg' }] }}>
          <Ionicons name={avatar.icon as keyof typeof Ionicons.glyphMap} size={size * 0.42} color={avatar.foreground} />
        </View>
      )}
      <PhotoLayer uri={photoUrl} counterSkew={web ? undefined : '10deg'} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  clip: { clipPath: 'polygon(14% 0, 100% 0, 86% 100%, 0 100%)' } as object,
});
