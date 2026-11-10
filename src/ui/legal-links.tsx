// Pie con los enlaces legales (portada y /entrar).
import { Pressable, StyleSheet, View } from 'react-native';
import { push } from './nav';
import { colors, space } from './theme';
import { T } from './text';

export function LegalLinks() {
  return (
    <View style={styles.row}>
      <T variant="tiny" color={colors.muted} style={styles.plain}>
        Al entrar aceptas los
      </T>
      <Pressable role="link" onPress={() => push('/terminos')} hitSlop={6}>
        <T variant="tiny" color={colors.yellow} style={styles.link}>
          Términos de uso
        </T>
      </Pressable>
      <T variant="tiny" color={colors.muted} style={styles.plain}>
        y el
      </T>
      <Pressable role="link" onPress={() => push('/privacidad')} hitSlop={6}>
        <T variant="tiny" color={colors.yellow} style={styles.link}>
          Aviso de privacidad
        </T>
      </Pressable>
      <T variant="tiny" color={colors.muted} style={styles.plain}>
        . Necesitas tener al menos 13 años.
      </T>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: space.xs, paddingTop: space.sm },
  plain: { textTransform: 'none', letterSpacing: 0 },
  link: { textTransform: 'none', letterSpacing: 0, textDecorationLine: 'underline' },
});
