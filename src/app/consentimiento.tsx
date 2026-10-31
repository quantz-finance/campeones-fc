import { Redirect } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useApp } from '../state/app-provider';
import { Wordmark } from '../ui/broadcast';
import { ConsentForm, useConsentForm } from '../ui/consent-form';
import { Banner, Button } from '../ui/controls';
import { humanError } from '../ui/errors';
import { Screen } from '../ui/screen';
import { colors, space } from '../ui/theme';
import { T } from '../ui/text';

/** Si la cuenta todavía no tiene consentimiento guardado (p. ej. entró sin pasar por la portada), se pide aquí. */
export default function ConsentScreen() {
  const app = useApp();
  const form = useConsentForm();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!app.ready) return null;
  if (!app.userId) return <Redirect href="/entrar" />;
  if (app.consent === 'ok') return <Redirect href="/inicio" />;

  return (
    <Screen>
      <View style={styles.head}>
        <Wordmark size={24} />
        <T variant="title">Antes de seguir</T>
        <T color={colors.muted}>Confirma tu edad y acepta los Términos de uso y el Aviso de privacidad para usar Campeones FC.</T>
      </View>
      <ConsentForm form={form} />
      {error || app.consentError ? <Banner tone="danger" title="No se pudo guardar" body={error ?? app.consentError ?? ''} /> : null}
      {form.blocked ? (
        <Button label="Salir" tone="danger" onPress={() => void app.signOut()} />
      ) : (
        <>
          <Button
            label={busy ? 'Guardando…' : 'Aceptar y seguir'}
            pending={busy}
            disabled={busy || !form.valid}
            onPress={() => {
              setBusy(true);
              setError(null);
              void app.repo
                .recordConsent(app.userId!, form.draft)
                .then(() => app.refreshConsent())
                .catch((cause: unknown) => setError(humanError(cause)))
                .finally(() => setBusy(false));
            }}
          />
          <Button label="Salir" tone="ghost" onPress={() => void app.signOut()} />
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  head: { gap: space.sm, paddingTop: space.lg },
});
