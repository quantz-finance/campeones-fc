import { Redirect } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { branding } from '../../config/branding';
import { useApp } from '../state/app-provider';
import { Avatar } from '../ui/avatar';
import { Wordmark } from '../ui/bits';
import { Banner, Button, Field } from '../ui/controls';
import { Screen } from '../ui/screen';
import { colors, space } from '../ui/theme';
import { T } from '../ui/text';

export default function Login() {
  const app = useApp();
  const [email, setEmail] = useState('');
  const [googleOpen, setGoogleOpen] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const accounts = app.mode === 'demo' ? app.repo.demoAccounts() : [];

  if (app.ready && app.userId) return <Redirect href="/inicio" />;

  async function run(task: () => Promise<void>) {
    setBusy(true);
    setError(null);
    try {
      await task();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No se pudo entrar.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen>
      <View style={styles.hero}>
        <Wordmark />
        <T color={colors.muted}>{branding.tagline}</T>
      </View>
      {app.mode === 'demo' ? (
        <Banner
          tone="accent"
          title="Modo demostración"
          body="Los datos viven en este navegador. Abre otra ventana e inicia sesión con otra cuenta para confirmar un partido entre los dos."
        />
      ) : null}
      <Button
        label={googleOpen ? 'Ocultar cuentas' : 'Continuar con Google'}
        tone="ghost"
        disabled={busy}
        onPress={() => {
          if (app.mode === 'supabase') {
            void run(() => app.signInGoogle());
            return;
          }
          setGoogleOpen((open) => !open);
        }}
      />
      {googleOpen ? (
        <View style={styles.list}>
          <T variant="label" color={colors.muted}>
            Elige una cuenta de ejemplo. Con Supabase, este botón abre Google.
          </T>
          {accounts.map((account) => (
            <Pressable key={account.id} style={styles.account} onPress={() => app.signInDemo(account.id)}>
              <Avatar avatarKey={account.avatarKey} />
              <View style={styles.flex}>
                <T variant="strong">{account.displayName}</T>
                <T variant="tiny" color={colors.muted}>
                  @{account.username}
                </T>
              </View>
            </Pressable>
          ))}
        </View>
      ) : null}
      <Field
        label="Correo"
        value={email}
        onChangeText={setEmail}
        placeholder="tu@correo.com"
        keyboardType="email-address"
      />
      <Button
        label={busy ? 'Enviando…' : 'Enviarme un enlace mágico'}
        disabled={busy || email.trim().length < 5}
        onPress={() =>
          void run(async () => {
            const result = await app.sendMagicLink(email);
            if (result === 'sent') setSent(true);
          })
        }
      />
      {sent ? (
        <Banner tone="accent" title="Revisa tu correo" body="El enlace te devuelve a Piquemos. Si no llega, mira la carpeta de spam." />
      ) : null}
      {app.mode === 'demo' ? (
        <T variant="tiny" color={colors.faint}>
          En demostración el enlace se abre aquí mismo. Prueba andre@demo.piquemos o cualquier correo nuevo.
        </T>
      ) : null}
      {error ? <Banner tone="danger" title="No se pudo entrar" body={error} /> : null}
      {app.mode === 'demo' && !googleOpen ? (
        <View style={styles.list}>
          <T variant="label" color={colors.muted}>
            Cuentas de ejemplo
          </T>
          {accounts.map((account) => (
            <Pressable key={account.id} style={styles.account} onPress={() => app.signInDemo(account.id)}>
              <Avatar avatarKey={account.avatarKey} size={36} />
              <T variant="medium">{account.displayName}</T>
            </Pressable>
          ))}
        </View>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: { gap: space.md, paddingTop: space.xl },
  list: { gap: space.sm },
  account: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    paddingVertical: space.sm,
  },
  flex: { flex: 1 },
});
