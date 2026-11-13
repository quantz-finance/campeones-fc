// Cajón inferior de entrada (iOS/Android): en la pantalla queda un solo botón «Entrar»
// y aquí viven las tres opciones. Mismo estilo que la hoja de Cavos (src/ui/cavos-sheet.tsx).
import type { ReactNode } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { NativeProvider } from '../lib/cavos/use-entry';
import { Wordmark } from './broadcast';
import { Button } from './controls';
import { colors, layout, radius, space } from './theme';
import { T } from './text';

// `icon`: aquí van los iconos de Apple, Google y correo cuando Stan los entregue (se pintan a la izquierda del texto).
const OPTIONS: { provider: NativeProvider; label: string; icon?: ReactNode }[] = [
  { provider: 'apple', label: 'Continuar con Apple' },
  { provider: 'google', label: 'Continuar con Google' },
  { provider: 'email', label: 'Continuar con mi correo' },
];

export function LoginDrawer({
  open,
  onClose,
  onPick,
}: {
  open: boolean;
  onClose: () => void;
  /** Se llama después de cerrar el cajón: el login del sistema no se abre encima de otro modal. */
  onPick: (provider: NativeProvider) => void;
}) {
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={open} transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <View style={styles.root}>
        <Pressable style={styles.scrim} onPress={onClose} accessibilityRole="button" accessibilityLabel="Cerrar" />
        <View style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, space.lg) + layout.bottom }]} testID="login-drawer">
          <View style={styles.grip} />
          <View style={styles.header}>
            <Wordmark size={22} />
            <Pressable onPress={onClose} hitSlop={12} accessibilityRole="button" accessibilityLabel="Cerrar">
              <T variant="label" color={colors.muted}>
                Cerrar
              </T>
            </Pressable>
          </View>
          <View style={styles.hero}>
            <T variant="display" style={styles.title}>
              Entra a tu cuenta
            </T>
            <T color={colors.muted}>Si todavía no tienes cuenta, se crea en el mismo paso.</T>
          </View>
          <View style={styles.actions}>
            {OPTIONS.map((o, i) => (
              <Button key={o.provider} label={o.label} icon={o.icon} tone={i === 0 ? 'accent' : 'ghost'} onPress={() => onPick(o.provider)} />
            ))}
          </View>
          <T color={colors.muted} style={styles.hint}>
            El correo con tu código puede llegar a Spam. Revísalo si no lo ves.
          </T>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, justifyContent: 'flex-end' },
  scrim: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(10, 0, 14, 0.55)' },
  sheet: {
    backgroundColor: colors.bg,
    borderTopLeftRadius: radius.lg + 8,
    borderTopRightRadius: radius.lg + 8,
    borderWidth: 1,
    borderBottomWidth: 0,
    borderColor: colors.line,
    paddingHorizontal: space.xl,
    paddingTop: space.md,
    gap: space.xl,
  },
  grip: { alignSelf: 'center', width: 44, height: 5, borderRadius: radius.pill, backgroundColor: colors.lineStrong },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  hero: { gap: space.sm },
  title: { fontSize: 30, lineHeight: 34 },
  actions: { gap: layout.field },
  hint: { fontSize: 14, lineHeight: 20 },
});
