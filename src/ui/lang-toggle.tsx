import { Pressable, StyleSheet } from 'react-native';
import { toggleStyles } from './audio-toggle';
import { colors, font } from './theme';
import { T } from './text';
import { toggleLang, useLang } from '../i18n/lang';

/** Cambia el idioma entre español e inglés. Se guarda en el navegador (cfc-lang). */
export function LangToggle() {
  const lang = useLang();
  const next = lang === 'es' ? 'EN' : 'ES';
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={lang === 'es' ? 'Switch to English' : 'Cambiar a español'}
      testID="lang-toggle"
      hitSlop={8}
      onPress={toggleLang}
      style={({ pressed }) => [toggleStyles.face, styles.face, pressed && styles.pressed]}
    >
      <T variant="label" style={styles.text}>
        {next}
      </T>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  face: { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.lineStrong },
  text: { fontFamily: font.label, fontSize: 12, letterSpacing: 0.4, color: colors.text },
  pressed: { transform: [{ scale: 0.94 }] },
});
