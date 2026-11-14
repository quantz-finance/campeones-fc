// Aviso fijo abajo (mismo lugar que los avisos) cuando no hay conexión con el servidor. Se reintenta solo (ver AppProvider);
// el botón fuerza un intento ya. Desaparece en cuanto vuelve la red.
import { usePathname } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '../state/app-provider';
import { Icon } from './icon';
import { T } from './text';
import { colors, radius, space } from './theme';
import { toastBottom } from './toast-place';

export function OfflineBar() {
  const { offline, retry } = useApp();
  const insets = useSafeAreaInsets();
  const path = usePathname();
  if (!offline) return null;
  return (
    <View pointerEvents="box-none" style={[styles.wrap, { bottom: toastBottom(path, insets.bottom) }]}>
      <View style={styles.bar} accessibilityRole="alert" accessibilityLiveRegion="polite">
        <Icon name="alerta" size={18} color={colors.warn} />
        <T style={styles.text} numberOfLines={2}>
          Sin conexión. Revisa tu internet.
        </T>
        <Pressable accessibilityRole="button" hitSlop={8} onPress={retry} style={styles.button}>
          <T variant="label" color={colors.accentInk}>
            Reintentar
          </T>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', left: space.lg, right: space.lg, zIndex: 50 },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    backgroundColor: colors.surface,
    borderColor: colors.lineStrong,
    borderWidth: 1,
    borderRadius: radius.md,
    paddingLeft: space.md,
    paddingRight: space.xs,
    paddingVertical: space.xs,
  },
  text: { flex: 1, fontSize: 14, lineHeight: 18 },
  button: { backgroundColor: colors.accent, borderRadius: radius.pill, paddingHorizontal: space.md, paddingVertical: space.sm },
});
