import { Pressable, StyleSheet, View } from 'react-native';
import { colors, radius, space } from './theme';
import { T } from './text';
import { setLang, useLang, type Lang } from '../i18n/lang';

const OPTIONS: { key: Lang; label: string }[] = [
  { key: 'es', label: 'Español' },
  { key: 'en', label: 'English' },
];

/** Idioma de la app (Ajustes, al final del perfil). Se guarda en este dispositivo (cfc-lang). */
export function LangSetting() {
  const lang = useLang();
  return (
    <View style={styles.segment} accessibilityRole="radiogroup" testID="lang-setting">
      {OPTIONS.map((o) => {
        const on = lang === o.key;
        return (
          <Pressable
            key={o.key}
            accessibilityRole="radio"
            accessibilityState={{ selected: on }}
            accessibilityLabel={o.label}
            disabled={on}
            onPress={() => setLang(o.key)}
            style={[styles.item, on && styles.on]}
          >
            {/* Nombre del idioma en su propio idioma: no pasa por la traducción. */}
            <T variant="strong" color={on ? colors.ink : colors.text} style={styles.label} accessibilityLanguage={o.key}>
              {o.label}
            </T>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  segment: { flexDirection: 'row', gap: space.sm, padding: space.xs, borderWidth: 1, borderColor: colors.lineStrong, borderRadius: radius.lg },
  item: { flex: 1, alignItems: 'center', justifyContent: 'center', minHeight: 48, borderRadius: radius.md },
  on: { backgroundColor: colors.yellow },
  label: { fontSize: 15 },
});
