import { Redirect } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { branding } from '../../config/branding';
import { track } from '../lib/analytics';
import { authErrorText } from '../lib/cavos/auth-ux';
import { cavosConfigured, cavosSupported } from '../lib/cavos/config';
import { DeviceApprovalNeeded, exchangeCavosSession, loginPath, NoDeviceKey } from '../lib/cavos/session';
import { cavosStore, useCavosState } from '../lib/cavos/store';
import { useApp } from '../state/app-provider';
import { Avatar } from '../ui/avatar';
import { Affiliation, Wordmark } from '../ui/broadcast';
import { Banner, Button } from '../ui/controls';
import { transit } from '../ui/nav';
import { Screen } from '../ui/screen';
import { colors, space } from '../ui/theme';
import { T } from '../ui/text';

type Phase = 'idle' | 'opening' | 'session' | 'approve' | 'nokey';

export default function Login() {
  const app = useApp();
  const { bridged, signedOut } = useCavosState();
  const [phase, setPhase] = useState<Phase>('idle');
  const [error, setError] = useState<string | null>(null);
  const exchanging = useRef(false);
  const configured = app.mode === 'supabase' && cavosConfigured();
  const accounts = app.mode === 'demo' ? app.repo.demoAccounts() : [];

  // Cargar el SDK de Cavos al abrir la pantalla (también procesa la vuelta del login con Google/Apple).
  useEffect(() => {
    if (configured) cavosStore.want();
  }, [configured]);

  // Cavos ya entró (modal o vuelta de OAuth) y todavía no hay sesión: cambiarla por una de Supabase.
  useEffect(() => {
    if (!configured || app.userId || !bridged || bridged.isLoading) return;
    if (!bridged.isAuthenticated || !bridged.address || exchanging.current || error || signedOut) return;
    // Estado del kit a medio cambiar (p. ej. justo después de salir): sin token todavía no hay nada que cambiar.
    if (!bridged.token()) return;
    // Esperar a que el kit sepa si la llave de la billetera está en este navegador.
    const path = loginPath(bridged.wallet);
    if (path === null || (path === 'approve' && phase === 'approve') || phase === 'nokey') return;
    exchanging.current = true;
    setPhase('session');
    exchangeCavosSession(bridged)
      .then((w) => {
        track('sign_in', { method: 'cavos', wallet: w.status });
      })
      .catch((cause) => {
        if (cause instanceof DeviceApprovalNeeded) {
          setPhase('approve');
          return;
        }
        if (cause instanceof NoDeviceKey) {
          setPhase('nokey');
          return;
        }
        setError(cause instanceof Error ? authErrorText(cause.message) : 'No se pudo entrar.');
        setPhase('idle');
      })
      .finally(() => {
        exchanging.current = false;
      });
  }, [configured, app.userId, bridged, error, phase, signedOut]);

  async function approveDevice() {
    if (!bridged) return;
    setError(null);
    try {
      await bridged.approveDevice();
      setPhase('idle'); // con la llave lista, el efecto de arriba acuña la sesión
    } catch (cause) {
      setError(cause instanceof Error ? authErrorText(cause.message) : 'No se pudo confirmar.');
    }
  }

  /** Salir de esta cuenta de Cavos (la llave del dispositivo se queda) y abrir el login otra vez. */
  async function otherAccount() {
    setError(null);
    setPhase('idle');
    if (bridged) {
      await bridged.logout().catch(() => undefined);
      bridged.openModal();
    }
  }

  useEffect(() => {
    if (bridged?.error) {
      setError(bridged.error);
      setPhase('idle');
    }
  }, [bridged?.error]);

  function openCavos() {
    setError(null);
    if (signedOut) {
      // Después de "Cerrar sesión": empezar de cero con el modal (el estado del kit puede estar viejo).
      cavosStore.setSignedOut(false);
      if (bridged?.isAuthenticated) {
        void otherAccount();
        return;
      }
    }
    if (!bridged || bridged.isLoading) {
      setPhase('opening');
      cavosStore.want();
      return;
    }
    // Ya entró a Cavos pero falló el paso siguiente: volver a empezar en vez de reintentar lo mismo en bucle.
    if (bridged.isAuthenticated && bridged.address) {
      void otherAccount();
      return;
    }
    bridged.openModal();
  }

  // Si tocaste el botón mientras el SDK cargaba, abrir el modal apenas esté listo.
  useEffect(() => {
    if (phase !== 'opening' || !bridged || bridged.isLoading) return;
    setPhase('idle');
    if (!bridged.isAuthenticated) bridged.openModal();
  }, [phase, bridged]);

  // Después de todos los hooks: un return temprano antes de un hook rompe el orden (error #300 de React).
  if (app.ready && app.userId) return <Redirect href="/inicio" />;

  const busy = phase === 'opening' || phase === 'session';
  const label =
    phase === 'session' ? 'Abriendo tu sesión…' : phase === 'opening' ? 'Cargando Cavos…' : 'Entrar con Cavos';

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
