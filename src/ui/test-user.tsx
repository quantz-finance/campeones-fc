import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useApp } from '../state/app-provider';
import { Banner, Button } from './controls';
import { colors, space } from './theme';
import { T } from './text';

/** "Entrar con usuario de prueba": cuenta compartida con datos de ejemplo, sin registro. */
export function TestUserButton({ tone = 'ghost' }: { tone?: 'accent' | 'ghost' }) {
  const app = useApp();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  return (
    <View style={styles.wrap} testID="test-user">
      <Button
        label="Entrar con usuario de prueba"
        tone={tone}
        pending={busy}
        disabled={busy}
        onPress={() => {
          setError(null);
          setBusy(true);
          app
            .signInTestUser()
            .catch((e: unknown) => setError(e instanceof Error ? e.message : 'No pudimos abrir el usuario de prueba.'))
            .finally(() => setBusy(false));
        }}
      />
      <T variant="tiny" color={colors.faint} style={styles.note}>
        {app.mode === 'demo'
          ? 'Entra con una cuenta de ejemplo. Los datos viven en este navegador.'
          : 'Cuenta compartida con datos de ejemplo. Lo que hagas ahí lo pueden ver otras personas que la prueben.'}
      </T>
      {error ? <Banner tone="danger" title="No se pudo entrar" body={error} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: space.md, alignSelf: 'stretch' },
  note: { textTransform: 'none', letterSpacing: 0, lineHeight: 16 },
});
