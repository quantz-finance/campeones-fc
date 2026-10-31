// Aviso visible de analítica. Hoy no se muestra nunca (ANALYTICS_ENABLED = false en lib/analytics.ts).
// Cuando se conecte un proveedor, aparece abajo con la opción de excluirse; sin grabación de sesión.
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { analyticsActive, setOptOut } from '../lib/analytics';
import { storage } from '../lib/storage';
import { Button } from './controls';
import { colors, space } from './theme';
import { T } from './text';

const SEEN_KEY = 'campeonesfc.analytics.notice';

export function AnalyticsNotice() {
  const [hidden, setHidden] = useState(() => storage.get(SEEN_KEY) === '1');
  if (hidden || !analyticsActive()) return null;
  const close = (out: boolean) => {
    if (out) setOptOut(true);
    storage.set(SEEN_KEY, '1');
    setHidden(true);
  };
  return (
    <View style={styles.box} role="dialog" aria-label="Aviso de analítica">
      <T style={styles.text}>
        Medimos de forma anónima qué pantallas se usan para mejorar la app. No grabamos tu sesión ni enviamos tu nombre o correo.
      </T>
      <View style={styles.row}>
        <Button label="Entendido" onPress={() => close(false)} />
        <Button label="No, gracias" tone="ghost" onPress={() => close(true)} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  box: { position: 'absolute', left: 12, right: 12, bottom: 12, padding: space.md, gap: space.sm, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.yellow },
  text: { textTransform: 'none', letterSpacing: 0 },
  row: { gap: space.sm },
});
