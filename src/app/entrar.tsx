import { Redirect } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';
import { branding } from '../../config/branding';
import { Ionicons } from '@expo/vector-icons';
import { useGoogleEntry } from '../lib/google-auth';
import { useApp } from '../state/app-provider';
import { Avatar } from '../ui/avatar';
import { Affiliation, Wordmark } from '../ui/broadcast';
import { Banner, Button } from '../ui/controls';
import { transit } from '../ui/nav';
import { Screen } from '../ui/screen';
import { colors, space } from '../ui/theme';
import { T } from '../ui/text';

export default function Login() {
  const app = useApp();
  const { configured, error, busy, signIn } = useGoogleEntry();
  const accounts = app.mode === 'demo' ? app.repo.demoAccounts() : [];

  // Después de todos los hooks: un return temprano antes de un hook rompe el orden (error #300 de React).
  if (app.ready && app.userId) return <Redirect href="/inicio" />;

  return (
    <Screen
      footer={
        <View style={styles.legal}>
          <Affiliation />
        </View>
      }
    >
      <View style={styles.hero}>
        <Wordmark size={30} />
        <T variant="label" color={colors.yellow}>
          {branding.company} · {branding.country}
        </T>
        <T color={colors.muted}>{branding.tagline}</T>
      </View>
      <View style={styles.stripe} pointerEvents="none">
        <View style={[styles.bit, { backgroundColor: colors.red }]} />
        <View style={[styles.bit, { backgroundColor: colors.yellow }]} />
        <View style={[styles.bit, { backgroundColor: colors.blue }]} />
      </View>

      {app.mode === 'demo' ? (
        <>
          <Banner
            tone="accent"
            title="Modo demostración"
            body="Los datos viven en este navegador. Abre otra ventana e inicia sesión con otra cuenta para confirmar un partido entre los dos."
          />
          <View style={styles.list}>
            <T variant="label" color={colors.yellow}>
              Cuentas de ejemplo
            </T>
            {accounts.map((account) => (
              <Pressable key={account.id} style={styles.account} onPress={() => transit(() => app.signInDemo(account.id))}>
                <Avatar avatarKey={account.avatarKey} name={account.displayName} photoUrl={account.photoUrl} size={40} />
                <View style={styles.flex}>
                  <T variant="strong">{account.displayName}</T>
                  <T variant="tiny" color={colors.muted} style={styles.plain}>
                    @{account.username}
                  </T>
                </View>
              </Pressable>
            ))}
          </View>
        </>
      ) : configured ? (
        <>
          <Button
            label={busy ? 'Abriendo Google…' : 'Entrar con Google'}
            icon={<Ionicons name="logo-google" size={18} color={colors.ink} />}
            pending={busy}
            disabled={busy}
            onPress={signIn}
          />
          <T color={colors.muted}>Entras con tu cuenta de Google. Si es tu primera vez, tu perfil se crea en el mismo paso.</T>
        </>
      ) : (
        <Banner tone="warn" title="Entrada no disponible" body="La entrada con Google se activa cuando la app tenga su servidor configurado. Vuelve pronto." />
      )}

      {error ? <Banner tone="danger" title="No se pudo entrar" body={error} /> : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: { gap: space.md, paddingTop: space.lg, paddingRight: 62 },
  stripe: { flexDirection: 'row', height: 4 },
  bit: { flex: 1 },
  list: { gap: space.sm },
  account: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    paddingVertical: space.sm,
    paddingHorizontal: space.sm,
    backgroundColor: 'rgba(19,26,42,0.72)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  flex: { flex: 1 },
  plain: { textTransform: 'none', letterSpacing: 0 },
  legal: {
    paddingHorizontal: 16,
    backgroundColor: colors.bg,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.08)',
  },
});
