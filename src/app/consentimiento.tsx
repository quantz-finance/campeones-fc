import { Redirect } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useApp } from '../state/app-provider';
import { refreshConsent, useConsent } from '../state/consent';
import { Wordmark } from '../ui/broadcast';
import { ConsentForm, useConsentForm } from '../ui/consent-form';
import { Banner, Button } from '../ui/controls';
import { humanError } from '../ui/errors';
import { push } from '../ui/nav';
import { Screen } from '../ui/screen';
import { colors, space } from '../ui/theme';
import { T } from '../ui/text';

/** Después de entrar con Cavos: edad y aceptación de Términos y Aviso de privacidad. Menor de 13: se borra la cuenta. */
export default function ConsentScreen() {
  const app = useApp();
  const { consent, consentError } = useConsent();
  const form = useConsentForm();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!app.ready) return null;
  if (app.userId && consent === 'ok') return <Redirect href="/inicio" />;
  const preview = !app.userId; // sin sesión se puede leer el formulario, pero no guardarlo

  async function save() {
    setBusy(true);
    setError(null);
    try {
      const band = await app.repo.recordConsent(app.userId!, form.draft);
      if (band === 'under_13_deleted') {
        await app.signOut();
        push('/');
        return;
      }
      refreshConsent();
    } catch (cause) {
      setError(humanError(cause));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen>
      <View style={styles.head}>
        <Wordmark size={24} />
        <T variant="title">Antes de seguir</T>
        <T color={colors.muted}>Confirma tu edad y acepta los Términos de uso y el Aviso de privacidad para usar Campeones FC.</T>
      </View>
      <ConsentForm form={form} />
      {error || consentError ? <Banner tone="danger" title="No se pudo guardar" body={error ?? consentError ?? ''} /> : null}
      {preview ? (
        <Button label="Entra para aceptar" tone="ghost" onPress={() => push('/entrar')} />
      ) : form.blocked ? (
        <Button
          label={busy ? 'Borrando…' : 'Entendido'}
          tone="danger"
          pending={busy}
          disabled={busy || form.age.birthDate == null}
          onPress={() => void save()}
        />
      ) : (
        <>
          <Button
            label={busy ? 'Guardando…' : 'Aceptar y seguir'}
            pending={busy}
            disabled={busy || !form.valid}
            onPress={() => void save()}
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
