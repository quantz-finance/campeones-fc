import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, View } from 'react-native';
import { playClick, playConfirm, toggleMuted, unlockAudio, useMuted } from './audio';
import { useReducedMotion } from './motion';
import { colors } from './theme';
import { T } from './text';

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
      style={({ pressed }) => [!reduced && pressed && styles.pressed]}
    >
      <View style={[styles.face, muted ? styles.off : styles.on]}>
        <View style={styles.unskew}>
          <Ionicons name={muted ? 'volume-mute' : 'volume-high'} size={15} color={muted ? colors.text : colors.ink} />
          <T variant="tiny" color={muted ? colors.text : colors.ink} style={styles.caption}>
            {muted ? 'MUTE' : 'SONIDO'}
          </T>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  face: {
    minWidth: 52,
    paddingHorizontal: 6,
    paddingVertical: 5,
    transform: [{ skewX: '-12deg' }],
    alignItems: 'center',
  },
  unskew: { alignItems: 'center', gap: 1, transform: [{ skewX: '12deg' }] },
  on: { backgroundColor: colors.yellow },
  off: { backgroundColor: 'rgba(8,11,19,0.88)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.4)' },
  caption: { fontSize: 8, letterSpacing: 0.4 },
  pressed: { transform: [{ scale: 0.94 }] },
});
