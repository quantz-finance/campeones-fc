// Fila elegible de una persona (rival, miembro de grupo, jugador de torneo): avatar, nombre, @usuario y check.
import { Icon } from './icon';
import { Pressable, StyleSheet, View } from 'react-native';
import type { Profile } from '../data/types';
import { Avatar } from './avatar';
import { colors, radius, space } from './theme';
import { T } from './text';

export function PersonPick({
  profile,
  on,
  onPress,
  order,
  detail,
}: {
  profile: Profile;
  on: boolean;
  onPress: () => void;
  /** Número de orden (cuadro del torneo) en vez del check. */
  order?: number;
  detail?: string;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.row, on && styles.on, pressed && styles.pressed]}
      accessibilityRole="checkbox"
      accessibilityState={{ checked: on }}
      accessibilityLabel={profile.displayName}
    >
      <Avatar avatarKey={profile.avatarKey} name={profile.displayName} photoUrl={profile.photoUrl} size={40} />
      <View style={styles.flex}>
        <T variant="strong" numberOfLines={1}>
          {profile.displayName}
        </T>
        <T variant="tiny" color={colors.muted} style={styles.plain} numberOfLines={1}>
          {detail ? `@${profile.username} · ${detail}` : `@${profile.username}`}
        </T>
      </View>
      {on && order ? (
        <View style={styles.order}>
          <T variant="label" color={colors.accentInk}>
            {String(order)}
          </T>
        </View>
      ) : on ? (
        <Icon name="confirmado" size={22} color={colors.accentText} />
      ) : (
        <View style={styles.radioOff} />
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    minHeight: 56,
    paddingHorizontal: space.sm,
    paddingVertical: space.sm,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  on: { borderColor: colors.accent, backgroundColor: colors.bg },
  pressed: { opacity: 0.85 },
  flex: { flex: 1, minWidth: 0 },
  plain: { textTransform: 'none', letterSpacing: 0 },
  radioOff: { width: 20, height: 20, margin: 1, borderRadius: 999, borderWidth: 1.75, borderColor: colors.faint },
  order: { width: 24, height: 24, borderRadius: 999, backgroundColor: colors.yellow, alignItems: 'center', justifyContent: 'center' },
});
