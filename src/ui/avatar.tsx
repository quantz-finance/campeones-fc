import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, View } from 'react-native';
import { avatarByKey } from '../../config/branding';
import { T } from './text';

export function Avatar({ avatarKey, size = 44, label }: { avatarKey: string; size?: number; label?: string }) {
  const avatar = avatarByKey(avatarKey);
  return (
    <View style={[styles.wrap, { width: size, height: size, borderRadius: size / 2, backgroundColor: avatar.background }]}>
      <Ionicons name={avatar.icon as keyof typeof Ionicons.glyphMap} size={size * 0.46} color={avatar.foreground} />
      {label ? <T variant="tiny">{label}</T> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', justifyContent: 'center' },
});
