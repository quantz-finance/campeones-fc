import { Ionicons } from '@expo/vector-icons';
import { useEffect } from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';
import { branding } from '../../config/branding';
import { useGoogleEntry } from '../lib/google-auth';
import { useApp } from '../state/app-provider';
import { playIntro } from './audio';
import { Avatar } from './avatar';
import { Affiliation, SkewBlock, Toro } from './broadcast';
import { Banner, Button } from './controls';
import { BroadcastView, cssAnim, useReducedMotion } from './motion';
import { transit } from './nav';
import { SportPress } from './press';
import { Screen } from './screen';
import { openExternal } from './share';
import { colors, space } from './theme';
import { T } from './text';

const sweepFrames = {
  from: { opacity: 0, transform: [{ translateX: -220 }, { skewX: '-22deg' }] },
  '35%': { opacity: 0.9 },
  to: { opacity: 0, transform: [{ translateX: 280 }, { skewX: '-22deg' }] },
};

const chips = [
  { label: 'Partidos', color: colors.red, ink: colors.redInk },
  { label: 'Grupos', color: colors.blue, ink: colors.blueInk },
  { label: 'Torneos', color: colors.yellow, ink: colors.ink },
] as const;

/** El toro de marca, con entrada propia y un barrido de luz. */
function LogoMark() {
  const reduced = useReducedMotion();
  const web = Platform.OS === 'web';
  return (
    <BroadcastView variant="logo" index={0} style={styles.logoWrap}>
      <View style={styles.logoPlate}>
        <Toro size={188} />
        {reduced || !web ? null : <View pointerEvents="none" style={[styles.sweep, cssAnim(sweepFrames, 780, 160)]} />}
      </View>
    </BroadcastView>
  );
}
(LogoMark as { passthrough?: boolean }).passthrough = true;

function SocialLink({ icon, label, url }: { icon: 'logo-instagram' | 'logo-x'; label: string; url: string }) {
  return (
    <SportPress accessibilityRole="link" accessibilityLabel={label} onPress={() => openExternal(url)}>
      <SkewBlock color="rgba(255,255,255,0.06)" border="rgba(255,255,255,0.28)" padH={12} padV={8} angle="-10deg">
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
  const { configured, error, busy, signIn } = useGoogleEntry();
  const accounts = app.mode === 'demo' ? app.repo.demoAccounts() : [];

  useEffect(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined') return;
    const onGesture = () => playIntro();
    window.addEventListener('pointerdown', onGesture, { once: true });
    return () => window.removeEventListener('pointerdown', onGesture);
  }, []);

  function enter() {
    playIntro();
    signIn();
  }

  return (
    <Screen>
      <View style={styles.stripe} pointerEvents="none">
        <View style={[styles.bit, { backgroundColor: colors.red }]} />
        <View style={[styles.bit, { backgroundColor: colors.yellow }]} />
        <View style={[styles.bit, { backgroundColor: colors.blue }]} />
      </View>
      <LogoMark />
      <View style={styles.lockup}>
        <T variant="label" color={colors.yellow}>
          El marcador del pique
        </T>
        <T variant="display" style={styles.title}>
          Campeones
        </T>
        <SkewBlock color={colors.yellow} shadow={colors.red} padH={10} padV={4} angle="-12deg">
          <T variant="title" style={styles.fc}>
            FC
          </T>
        </SkewBlock>
      </View>
      <T color={colors.muted} style={styles.pitch}>
        {branding.tagline}
      </T>
      <View style={styles.chips}>
        {chips.map((chip) => (
          <SkewBlock key={chip.label} color={chip.color} padH={10} padV={6} angle="-8deg">
            <T variant="label" color={chip.ink}>
              {chip.label}
            </T>
          </SkewBlock>
        ))}
      </View>
      {app.mode === 'demo' ? (
        <View style={styles.accounts}>
          <T variant="label" color={colors.yellow}>
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
      ) : configured ? (
        <>
          <Button
            label={busy ? 'Abriendo Google…' : 'Entrar con Google'}
            icon={<Ionicons name="logo-google" size={18} color={colors.ink} />}
            pending={busy}
            disabled={busy}
            onPress={enter}
          />
          <T variant="tiny" color={colors.faint} style={styles.note}>
            Entras con tu cuenta de Google. Si es tu primera vez, tu perfil se crea en el mismo paso.
          </T>
        </>
      ) : (
        <Banner tone="warn" title="Entrada no disponible" body="La entrada con Google se activa cuando la app tenga su servidor configurado. Vuelve pronto." />
      )}
      {error ? <Banner tone="danger" title="No se pudo entrar" body={error} /> : null}
      <View style={styles.footer}>
        <View style={styles.socials}>
          <SocialLink icon="logo-instagram" label="Instagram" url={branding.social.instagram} />
          <SocialLink icon="logo-x" label="X" url={branding.social.x} />
        </View>
        <T variant="tiny" color={colors.faint}>
          {branding.company} · {branding.country}
        </T>
        <Affiliation />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  stripe: { flexDirection: 'row', height: 6, marginTop: 4 },
  bit: { flex: 1 },
  logoWrap: { alignItems: 'center', marginTop: 8 },
  logoPlate: {
    width: 220,
    height: 220,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    backgroundColor: 'rgba(8,11,19,0.45)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    transform: [{ skewX: '-8deg' }],
  },
  sweep: {
    position: 'absolute',
    top: -20,
    bottom: -20,
    width: 42,
    backgroundColor: 'rgba(255,255,255,0.55)',
    opacity: 0,
  },
  lockup: { alignItems: 'flex-start', gap: 6 },
  title: { fontSize: 64, lineHeight: 64, fontStyle: 'italic' },
  fc: { fontSize: 22, color: colors.ink },
  pitch: { textTransform: 'none', letterSpacing: 0 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  note: { textTransform: 'none', letterSpacing: 0, lineHeight: 16 },
  accounts: { gap: space.sm },
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
  accountCopy: { flex: 1 },
  footer: { gap: space.sm, marginTop: 12, paddingBottom: 8 },
  socials: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  socialRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
});
