import { Ionicons } from '@expo/vector-icons';
import { useEffect } from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';
import { branding } from '../../config/branding';
import { cavosSupported } from '../lib/cavos/config';
import { useCavosEntry } from '../lib/cavos/use-entry';
import { useApp } from '../state/app-provider';
import { playIntro } from './audio';
import { Avatar } from './avatar';
import { Affiliation, FeatureBadge, SkewBlock, Toro, type FeatureIconName } from './broadcast';
import { TestUserButton } from './test-user';
import { Banner, Button } from './controls';
import { BroadcastView, cssAnim, useReducedMotion } from './motion';
import { transit } from './nav';
import { SportPress } from './press';
import { Screen } from './screen';
import { openExternal } from './share';
import { colors, space } from './theme';
import { T } from './text';

const sweepFrames = {
  from: { opacity: 0, transform: [{ translateX: -220 }, { skewX: '0deg' }] },
  '35%': { opacity: 0.9 },
  to: { opacity: 0, transform: [{ translateX: 280 }, { skewX: '0deg' }] },
};

/** Lo que la app hace de verdad (mismo contenido que la landing). */
const features: { icon: FeatureIconName; title: string; body: string }[] = [
  { icon: 'friends', title: 'Amigos e invitaciones', body: 'Invita con un enlace y arma tu lista de rivales.' },
  { icon: 'matches', title: 'Partidos con doble confirmación', body: 'Registras el resultado y tu rival lo confirma. Sin discusiones.' },
  { icon: 'ranking', title: 'Ranking Elo', body: 'Cada partido mueve tu Elo. Mira quién manda en tu grupo.' },
  { icon: 'tournaments', title: 'Grupos y torneos', body: 'Crea tu grupo y arma torneos con llaves.' },
  { icon: 'trophies', title: 'Trofeos', body: 'Rachas, goleadas y títulos quedan en tu vitrina.' },
  { icon: 'versus', title: 'Versus', body: 'Tu historial contra cada rival y la revancha a un toque.' },
  { icon: 'install', title: 'Se instala en tu celular', body: 'Agrégala a tu pantalla de inicio desde el navegador.' },
];

/** El toro de marca, con entrada propia y un barrido de luz. */
function LogoMark() {
  const reduced = useReducedMotion();
  const web = Platform.OS === 'web';
  return (
    <BroadcastView variant="logo" index={0} style={styles.logoWrap}>
      <View style={styles.logoPlate}>
        <Toro size={124} />
        {reduced || !web ? null : <View pointerEvents="none" style={[styles.sweep, cssAnim(sweepFrames, 780, 160)]} />}
      </View>
    </BroadcastView>
  );
}
(LogoMark as { passthrough?: boolean }).passthrough = true;

function SocialLink({ icon, label, url }: { icon: 'logo-instagram' | 'logo-x'; label: string; url: string }) {
  return (
    <SportPress accessibilityRole="link" accessibilityLabel={label} onPress={() => openExternal(url)}>
      <SkewBlock color={colors.wash} border={colors.lineStrong} padH={12} padV={8}>
        <View style={styles.socialRow}>
          <Ionicons name={icon} size={16} color={colors.text} />
          <T variant="label">{label}</T>
        </View>
      </SkewBlock>
    </SportPress>
  );
}

export function Landing() {
  const app = useApp();
  const { configured, phase, error, busy, openCavos, approveDevice, otherAccount } = useCavosEntry();
  const accounts = app.mode === 'demo' ? app.repo.demoAccounts() : [];
  const cavosLabel = phase === 'session' ? 'Abriendo tu sesión…' : phase === 'opening' ? 'Cargando Cavos…' : 'Entrar';

  useEffect(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined') return;
    const onGesture = () => playIntro();
    window.addEventListener('pointerdown', onGesture, { once: true });
    return () => window.removeEventListener('pointerdown', onGesture);
  }, []);

  function enter() {
    playIntro();
    openCavos();
  }

  return (
    <Screen>
      <View style={styles.hero}>
        <LogoMark />
        <View style={styles.lockup}>
          <T variant="label" color={colors.accentText}>
            La app de tus partidos
          </T>
          <T variant="display" style={styles.title}>
            Campeones FC
          </T>
          <T color={colors.muted} style={styles.pitch}>
            {branding.tagline}
          </T>
        </View>
      </View>

      {app.mode === 'demo' ? (
        <View style={styles.ctas}>
          <TestUserButton tone="accent" />
        </View>
      ) : configured ? (
        phase === 'approve' ? (
          <>
            <Banner
              tone="accent"
              title="Confirma que eres tú"
              body="Tu billetera de Cavos se creó en otro dispositivo. Usa tu passkey para traerla a este."
            />
            <Button label="Confirmar con mi passkey" onPress={approveDevice} />
            <Button label="Entrar con otra cuenta" tone="ghost" onPress={() => void otherAccount()} />
          </>
        ) : phase === 'nokey' ? (
          <>
            <Banner
              tone="warn"
              title="Tu billetera está en otro dispositivo"
              body="Creaste tu cuenta en otro navegador y no le agregaste una passkey, así que tu billetera solo vive allá. Entra desde ese navegador para seguir jugando con tu cuenta."
            />
            <Button label="Entrar con otra cuenta" tone="ghost" onPress={() => void otherAccount()} />
          </>
        ) : (
          <View style={styles.ctas}>
            <Button label={cavosLabel} pending={busy} disabled={busy} onPress={enter} />
            <T variant="tiny" color={colors.faint} style={styles.note}>
              Google, Apple o correo. Si todavía no tienes cuenta, se crea en el mismo paso. El código puede caer en Spam.
            </T>
            <TestUserButton />
          </View>
        )
      ) : (
        <>
          <Banner
            tone="warn"
            title="Cavos no configurado"
            body={
              cavosSupported
                ? 'La entrada con Cavos (Google, Apple o correo) se activa cuando el equipo agregue el appId de Cavos. Vuelve pronto.'
                : 'Por ahora la entrada con Cavos funciona en la versión web. Ábrela desde el navegador.'
            }
          />
          <TestUserButton />
        </>
      )}
      {error ? <Banner tone="danger" title="No se pudo entrar" body={error} /> : null}

      <View style={styles.features}>
        <T variant="title" style={styles.featuresTitle}>
          Todo lo que pasa en la cancha
        </T>
        {features.map((f) => (
          <View key={f.icon} style={styles.feature}>
            <FeatureBadge name={f.icon} size={52} />
            <View style={styles.featureCopy}>
              <T variant="strong">{f.title}</T>
              <T variant="body" color={colors.muted} style={styles.featureBody}>
                {f.body}
              </T>
            </View>
          </View>
        ))}
      </View>

      {app.mode === 'demo' ? (
        <View style={styles.accounts}>
          <T variant="label" color={colors.accentText}>
            Cuentas de ejemplo
          </T>
          {accounts.map((account) => (
            <Pressable key={account.id} style={styles.account} onPress={() => transit(() => app.signInDemo(account.id))}>
              <Avatar avatarKey={account.avatarKey} name={account.displayName} photoUrl={account.photoUrl} size={40} />
              <View style={styles.accountCopy}>
                <T variant="strong">{account.displayName}</T>
                <T variant="tiny" color={colors.muted} style={styles.note}>
                  @{account.username}
                </T>
              </View>
            </Pressable>
          ))}
        </View>
      ) : null}

      <View style={styles.footer}>
        <View style={styles.socials}>
          <SocialLink icon="logo-instagram" label="Instagram" url={branding.social.instagram} />
          <SocialLink icon="logo-x" label="X" url={branding.social.x} />
        </View>
        <Affiliation />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: { gap: space.lg, alignItems: 'flex-start' },
  logoWrap: { alignItems: 'flex-start', marginTop: 8 },
  logoPlate: {
    width: 132,
    height: 132,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    backgroundColor: '#37003C',
    borderWidth: 1,
    borderColor: colors.line,
  },
  sweep: {
    position: 'absolute',
    top: -20,
    bottom: -20,
    width: 42,
    backgroundColor: 'rgba(255,255,255,0.35)',
    opacity: 0,
  },
  lockup: { alignItems: 'flex-start', gap: 8 },
  title: { fontSize: 48, lineHeight: 52, letterSpacing: -1 },
  pitch: { fontSize: 18, lineHeight: 26 },
  ctas: { gap: space.md, alignSelf: 'stretch' },
  note: { textTransform: 'none', letterSpacing: 0, lineHeight: 16 },
  features: { gap: space.md, marginTop: space.lg },
  featuresTitle: { fontSize: 26, lineHeight: 30 },
  feature: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    padding: space.md,
    borderRadius: 16,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.line,
  },
  featureCopy: { flex: 1, gap: 2 },
  featureBody: { fontSize: 14, lineHeight: 20 },
  accounts: { gap: space.sm },
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
  accountCopy: { flex: 1 },
  footer: { gap: space.sm, marginTop: 12, paddingBottom: 8 },
  socials: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  socialRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
});
