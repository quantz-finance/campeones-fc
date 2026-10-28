import { Redirect } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';
import { branding } from '../../config/branding';
import { cavosSupported } from '../lib/cavos/config';
import { useCavosEntry } from '../lib/cavos/use-entry';
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
  const { configured, phase, error, busy, label, openCavos, approveDevice, otherAccount } = useCavosEntry();
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
          {phase === 'approve' ? (
            <>
              <Banner
                tone="accent"
                title="Confirma que eres tú"
                body="Tu billetera de Cavos se creó en otro dispositivo. Usa tu passkey para traerla a este."
              />
              <Button label="Confirmar con mi passkey" onPress={approveDevice} />
              <Button label="Entrar con otra cuenta" tone="ghost" onPress={otherAccount} />
            </>
          ) : phase === 'nokey' ? (
            <>
              <Banner
                tone="warn"
                title="Tu billetera está en otro dispositivo"
                body="Creaste tu cuenta en otro navegador y no le agregaste una passkey, así que tu billetera solo vive allá. Entra desde ese navegador para seguir jugando con tu cuenta."
              />
              <Button label="Entrar con otra cuenta" tone="ghost" onPress={otherAccount} />
            </>
          ) : (
            <>
              <Button label={label} disabled={busy} onPress={openCavos} />
              <SpamHint />
            </>
          )}
          <T color={colors.muted}>
            Entra con Google, Apple o tu correo. Al entrar recibes tu billetera en Stellar y cada resultado que confirmen los dos queda registrado ahí.
          </T>
        </>
      ) : (
        <Banner
          tone="warn"
          title="Cavos no configurado"
          body={
            cavosSupported
              ? 'La entrada con Cavos (Google, Apple o correo) se activa cuando el equipo agregue el appId de Cavos. Vuelve pronto.'
              : 'Por ahora la entrada con Cavos funciona en la versión web. Ábrela desde el navegador.'
          }
        />
      )}

      {error ? <Banner tone="danger" title="No se pudo entrar" body={error} /> : null}
    </Screen>
  );
}

/** Los códigos de Cavos suelen caer en Spam (Gmail): avisarlo fuera del modal. */
function SpamHint() {
  return (
    <T style={styles.hintText} color={colors.muted}>
      El correo con tu código puede llegar a Spam. Revísalo si no lo ves.
    </T>
  );
}

const styles = StyleSheet.create({
  hintText: { fontSize: 14, lineHeight: 20 },
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
