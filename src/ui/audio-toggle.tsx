import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet } from 'react-native';
import { playClick, playConfirm, toggleMuted, unlockAudio, useMuted } from './audio';
import { useReducedMotion } from './motion';
import { colors } from './theme';

/** Interruptor siempre visible. El silencio se guarda en el navegador. */
export function AudioToggle() {
  const muted = useMuted();
  const reduced = useReducedMotion();
  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityLabel={muted ? 'Activar sonido' : 'Silenciar sonido'}
      accessibilityState={{ checked: !muted }}
      hitSlop={8}
      onPress={() => {
        unlockAudio();
        if (muted) {
          toggleMuted();
          playConfirm();
        } else {
          playClick();
          toggleMuted();
        }
      }}
      style={({ pressed }) => [styles.face, muted ? styles.off : styles.on, !reduced && pressed && styles.pressed]}
    >
      <Ionicons name={muted ? 'volume-mute' : 'volume-high'} size={17} color={muted ? colors.text : colors.accentInk} />
    </Pressable>
  );
}

export const toggleStyles = StyleSheet.create({
  face: {
    width: 38,
    height: 38,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

const styles = StyleSheet.create({
  face: toggleStyles.face,
  on: { backgroundColor: colors.yellow },
  off: { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.lineStrong },
  pressed: { transform: [{ scale: 0.94 }] },
});
