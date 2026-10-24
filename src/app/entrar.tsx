import { Redirect } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { branding } from '../../config/branding';
import { track } from '../lib/analytics';
import { authErrorText } from '../lib/cavos/auth-ux';
import { cavosConfigured, cavosSupported } from '../lib/cavos/config';
import { exchangeCavosSession, type WalletLink } from '../lib/cavos/session';
import { cavosStore, useCavosState } from '../lib/cavos/store';
import { useApp } from '../state/app-provider';
import { Avatar } from '../ui/avatar';
import { Affiliation, Wordmark } from '../ui/broadcast';
import { Banner, Button } from '../ui/controls';
import { Screen } from '../ui/screen';
import { colors, space } from '../ui/theme';
import { T } from '../ui/text';

type Phase = 'idle' | 'opening' | 'session';

export default function Login() {
  const app = useApp();
  const { bridged } = useCavosState();
  const [phase, setPhase] = useState<Phase>('idle');
  const [error, setError] = useState<string | null>(null);
  const [wallet, setWallet] = useState<WalletLink | null>(null);
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
    if (!bridged.isAuthenticated || !bridged.address || exchanging.current || error) return;
    exchanging.current = true;
    setPhase('session');
    exchangeCavosSession(bridged)
      .then((w) => {
        setWallet(w);
        track('sign_in', { method: 'cavos', wallet: w.status });
      })
      .catch((cause) => {
        setError(cause instanceof Error ? authErrorText(cause.message) : 'No se pudo entrar.');
        setPhase('idle');
      })
      .finally(() => {
        exchanging.current = false;
      });
  }, [configured, app.userId, bridged, error]);

  useEffect(() => {
    if (bridged?.error) {
      setError(bridged.error);
      setPhase('idle');
    }
  }, [bridged?.error]);

  if (app.ready && app.userId && wallet?.status !== 'other_wallet') return <Redirect href="/inicio" />;

  function openCavos() {
    setError(null);
    if (!bridged || bridged.isLoading) {
      setPhase('opening');
      cavosStore.want();
      return;
    }
    if (bridged.isAuthenticated && bridged.address) return; // el efecto de arriba acuña la sesión
    bridged.openModal();
  }

  // Si tocaste el botón mientras el SDK cargaba, abrir el modal apenas esté listo.
  useEffect(() => {
    if (phase !== 'opening' || !bridged || bridged.isLoading) return;
    setPhase('idle');
    if (!bridged.isAuthenticated) bridged.openModal();
  }, [phase, bridged]);

  const busy = phase !== 'idle';
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
              <Pressable key={account.id} style={styles.account} onPress={() => app.signInDemo(account.id)}>
                <Avatar avatarKey={account.avatarKey} name={account.displayName} size={40} />
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
          <Button label={label} disabled={busy} onPress={openCavos} />
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

      {wallet?.status === 'other_wallet' ? (
        <Banner
          tone="warn"
          title="Tu cuenta ya tiene otra billetera"
          body="Entraste con un método distinto al de la primera vez. Tu marcador está a salvo, pero para firmar resultados entra con el mismo método que usaste antes."
        />
      ) : null}
      {wallet?.status === 'other_wallet' ? <Button label="Seguir al inicio" tone="ghost" onPress={() => setWallet(null)} /> : null}
      {error ? <Banner tone="danger" title="No se pudo entrar" body={error} /> : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: { gap: space.md, paddingTop: space.lg },
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
