import { useState, type ReactNode } from 'react';
import { Redirect } from 'expo-router';
import { Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';
import { branding } from '../../config/branding';
import { cavosSupported } from '../lib/cavos/config';
import { useCavosEntry } from '../lib/cavos/use-entry';
import { useApp } from '../state/app-provider';
import { Avatar } from '../ui/avatar';
import { Affiliation, Wordmark } from '../ui/broadcast';
import { Banner, Button } from '../ui/controls';
import { transit } from '../ui/nav';
import { Screen } from '../ui/screen';
import { colors, layout, space } from '../ui/theme';
import { T } from '../ui/text';
import { TestUserButton } from '../ui/test-user';
import { LegalLinks } from '../ui/legal-links';
import { LoginDrawer } from '../ui/login-drawer';

/** iPhone SE (667pt) y similares: el contenido puede no caber y ahí sí hay scroll. */
const SCROLL_BELOW = 700;

/** Columna a pantalla completa, sin huecos fijos: el aire lo reparte el flex. */
function LoginBody({ children }: { children: ReactNode }) {
  return <View style={styles.body}>{children}</View>;
}
(LoginBody as { passthrough?: boolean }).passthrough = true;

export default function Login() {
  const app = useApp();
  const { configured, phase, error, busy, label, signingWith, openCavos, approveDevice, otherAccount, loginWith, openRecovery, canRecover, native } = useCavosEntry();
  const accounts = app.mode === 'demo' ? app.repo.demoAccounts() : [];
  const { height } = useWindowDimensions();
  const allowScroll = height < SCROLL_BELOW;
  const [drawer, setDrawer] = useState(false);

  // Después de todos los hooks: un return temprano antes de un hook rompe el orden (error #300 de React).
  if (app.ready && app.userId) return <Redirect href="/inicio" />;

  return (
    <Screen
      scroll={allowScroll}
      fill={!allowScroll}
      footer={
        <View style={styles.legal}>
          <Affiliation />
        </View>
      }
    >
      <LoginBody>
        <View style={styles.hero}>
          <Wordmark size={30} />
          <T variant="display" style={styles.title}>
            Entra a tu cuenta
          </T>
          <T color={colors.muted}>{branding.tagline}</T>
        </View>

        <View style={styles.main}>
          {app.mode === 'demo' ? (
            <>
              <Banner
                tone="accent"
                title="Modo demostración"
                body="Los datos viven en este navegador. Abre otra ventana e inicia sesión con otra cuenta para confirmar un partido entre los dos."
              />
              <TestUserButton tone="accent" />
              <View style={styles.list}>
                <T variant="label" color={colors.accentText}>
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
                <View style={styles.actions}>
                  <Banner
                    tone="accent"
                    title="Confirma que eres tú"
                    body="Tu billetera de Cavos se creó en otro dispositivo. Usa tu passkey para traerla a este."
                  />
                  <Button label="Confirmar con mi passkey" onPress={approveDevice} />
                  {canRecover ? <Button label="Usar mi código de recuperación" tone="ghost" onPress={openRecovery} /> : null}
                  <Button label="Entrar con otra cuenta" tone="ghost" onPress={otherAccount} />
                </View>
              ) : phase === 'nokey' ? (
                <View style={styles.actions}>
                  <Banner
                    tone="warn"
                    title="Tu billetera está en otro dispositivo"
                    body={
                canRecover
                  ? 'Tu billetera de Cavos se creó en otro dispositivo. Si guardaste tu código de recuperación, úsalo para traerla a este iPhone. Si no, entra desde ese dispositivo.'
                  : 'Creaste tu cuenta en otro navegador y no le agregaste una passkey, así que tu billetera solo vive allá. Entra desde ese navegador para seguir jugando con tu cuenta.'
              }
                  />
                  {canRecover ? <Button label="Usar mi código de recuperación" onPress={openRecovery} /> : null}
                  <Button label="Entrar con otra cuenta" tone="ghost" onPress={otherAccount} />
                </View>
              ) : native ? (
                <>
                  <View style={styles.actions}>
                    <Button
                      label={phase === 'session' ? 'Abriendo tu sesión…' : busy ? 'Entrando…' : 'Entrar'}
                      pending={busy}
                      onPress={() => setDrawer(true)}
                    />
                  </View>
                  <TestUserButton />
                  <LoginDrawer
                    open={drawer}
                    onClose={() => setDrawer(false)}
                    onPick={(provider) => {
                      setDrawer(false);
                      // Espera a que el cajón termine de cerrarse: iOS no abre el login encima de un modal.
                      setTimeout(() => void loginWith(provider), 450);
                    }}
                  />
                </>
              ) : (
                <>
                  <View style={styles.actions}>
                    <Button label={label} disabled={busy} onPress={openCavos} />
                    <SpamHint />
                  </View>
                  <TestUserButton />
                </>
              )}
              <T color={colors.muted} style={styles.blurb}>
                {native
                  ? 'Cada resultado que confirmen los dos queda verificado, sin dinero real.'
                  : 'Al entrar recibes tu billetera. Cada resultado que confirmen los dos queda registrado, sin dinero real.'}
              </T>
            </>
          ) : (
            <Banner
              tone="warn"
              title="Cavos no configurado"
              body={
                cavosSupported
                  ? 'La entrada con Cavos (Google, Apple o correo) se activa cuando el equipo agregue el appId de Cavos. Vuelve pronto.'
                  : 'En el iPhone todavía no está activa la entrada con Cavos. Mientras tanto, puedes entrar con la cuenta de prueba.'
              }
            />
          )}
          {!configured && app.mode !== 'demo' ? <TestUserButton /> : null}
          {error ? <Banner tone="danger" title="No se pudo entrar" body={error} /> : null}
        </View>

        <View style={styles.foot}>
          <LegalLinks />
        </View>
      </LoginBody>
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
  body: {
    flex: 1,
    justifyContent: 'space-between',
    gap: layout.stack,
  },
  hero: {
    gap: space.sm,
    flexShrink: 0,
    paddingTop: space.xl,
  },
  title: { fontSize: 34, lineHeight: 38 },
  main: { gap: layout.stack, flexShrink: 0 },
  actions: { gap: layout.button, alignSelf: 'stretch' },
  hintText: { fontSize: 14, lineHeight: 20, marginTop: space.xs },
  blurb: { fontSize: 14, lineHeight: 20 },
  list: { gap: layout.card },
  account: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    paddingVertical: space.sm,
    paddingHorizontal: space.sm,
    borderRadius: 16,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.line,
  },
  flex: { flex: 1 },
  plain: { textTransform: 'none', letterSpacing: 0 },
  foot: { paddingTop: space.sm, paddingBottom: space.xs, flexShrink: 0 },
  legal: {
    paddingHorizontal: 16,
    backgroundColor: colors.bg,
    borderTopWidth: 1,
    borderTopColor: colors.line,
    borderRadius: 14,
  },
});
