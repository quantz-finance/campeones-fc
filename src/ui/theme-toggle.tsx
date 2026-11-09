import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet } from 'react-native';
import { toggleStyles } from './audio-toggle';
import { colors } from './theme';
import { toggleTheme, useThemeMode } from './theme-mode';

/** Cambia entre modo oscuro y claro. Se guarda en el navegador. */
export function ThemeToggle() {
  const mode = useThemeMode();
  const dark = mode === 'dark';
  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityLabel={dark ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
      accessibilityState={{ checked: dark }}
      testID="theme-toggle"
      hitSlop={8}
      onPress={toggleTheme}
      style={({ pressed }) => [toggleStyles.face, styles.face, pressed && styles.pressed]}
    >
      <Ionicons name={dark ? 'sunny' : 'moon'} size={17} color={colors.text} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  face: { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.lineStrong },
  pressed: { transform: [{ scale: 0.94 }] },
});
