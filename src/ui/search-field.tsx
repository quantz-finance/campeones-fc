// Buscador de listas (amigos, rivales, miembros, grupos, torneos): filtra al escribir, con botón para limpiar.
import { Icon } from './icon';
import { useState } from 'react';
import { Keyboard, Platform, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { translate, useLang } from '../i18n/lang';
import { colors, font, layout, radius, space } from './theme';
import { T } from './text';

export function SearchField({
  value,
  onChange,
  placeholder = 'Busca por nombre o @usuario',
  label = 'Buscar',
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  /** Nombre para lectores de pantalla. */
  label?: string;
}) {
  const lang = useLang();
  const [focused, setFocused] = useState(false);
  return (
    <View style={[styles.box, focused && styles.focused]}>
      <Icon name="buscar" size={18} color={colors.faint} />
      <TextInput
        value={value}
        onChangeText={onChange}
        placeholder={translate(placeholder, lang)}
        placeholderTextColor={colors.faint}
        accessibilityLabel={translate(label, lang)}
        autoCapitalize="none"
        autoCorrect={false}
        returnKeyType="search"
        onSubmitEditing={() => Keyboard.dismiss()}
        clearButtonMode="never"
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        style={styles.input}
      />
      {value ? (
        <Pressable
          onPress={() => onChange('')}
          hitSlop={10}
          style={styles.clear}
          accessibilityRole="button"
          accessibilityLabel={translate('Borrar búsqueda', lang)}
        >
          <Icon name="cerrar" size={20} color={colors.muted} />
        </Pressable>
      ) : null}
    </View>
  );
}

/** Estado vacío del buscador: dice qué se buscó y qué hacer. */
export function SearchEmpty({ query, hint }: { query: string; hint?: string }) {
  return (
    <View style={styles.empty}>
      <T variant="strong">{`No encontramos a «${query.trim()}».`}</T>
      <T color={colors.muted}>{hint ?? 'Revisa cómo se escribe o busca por su @usuario.'}</T>
    </View>
  );
}

/** Título pequeño de una sublista ("Frecuentes", "Todos"). */
export function ListLabel({ children }: { children: string }) {
  return (
    <T variant="tiny" color={colors.faint} style={styles.label}>
      {children}
    </T>
  );
}

const styles = StyleSheet.create({
  box: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    minHeight: 48,
    paddingHorizontal: space.md,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.card,
    borderRadius: radius.md,
    alignSelf: 'stretch',
  },
  focused: { borderColor: colors.accentText },
  // En la web el borde de la caja ya marca el foco (sin el contorno del navegador).
  input: { flex: 1, minHeight: 46, color: colors.text, fontFamily: font.body, fontSize: 16, paddingVertical: 0, ...(Platform.OS === 'web' ? ({ outlineStyle: 'none' } as object) : null) },
  clear: { minWidth: 32, minHeight: 32, alignItems: 'center', justifyContent: 'center' },
  empty: { gap: space.sm, paddingVertical: space.md },
  label: { marginTop: layout.inline },
});
