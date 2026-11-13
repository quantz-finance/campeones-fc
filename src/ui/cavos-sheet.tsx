// Hoja de Cavos en iOS/Android: reemplaza el modal del kit (sin estilos, en inglés y con promesas sin catch).
// La monta bridge.native.tsx; aquí solo hay presentación y validación, la lógica del kit queda en el puente.
import { useEffect, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Wordmark } from './broadcast';
import { Banner, Button, Field } from './controls';
import { colors, layout, space } from './theme';
import { T } from './text';
import { authErrorText } from '../lib/cavos/auth-ux';
import { normalizeRecoveryCode, recoveryCodeProblem, recoveryWordCount, RECOVERY_WORDS } from '../lib/cavos/recovery-code';

type Provider = 'google' | 'apple' | 'email';
type Action = Provider | 'passkey' | 'recover' | 'other';

export type CavosSheetProps = {
  open: boolean;
  onClose: () => void;
  /** El kit carga la identidad guardada o está creando / conectando la billetera. */
  loading: boolean;
  authenticated: boolean;
  needsApproval: boolean;
  hasPasskey: boolean;
  loginWith: (provider: Provider) => Promise<void>;
  approveWithPasskey: () => Promise<void>;
  recover: (code: string) => Promise<void>;
  otherAccount: () => Promise<void>;
};

export function CavosSheet(p: CavosSheetProps) {
  const insets = useSafeAreaInsets();
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [doing, setDoing] = useState<Action | null>(null);
  const [tried, setTried] = useState(false);

  useEffect(() => {
    if (!p.open) {
      setCode('');
      setError(null);
      setTried(false);
    }
  }, [p.open]);

  async function run(action: Action, fn: () => Promise<void>) {
    if (doing) return; // una acción a la vez
    setError(null);
    setDoing(action);
    try {
      await fn();
    } catch (e) {
      setError(authErrorText(e instanceof Error ? e.message : String(e)));
    } finally {
      setDoing(null);
    }
  }

  const problem = recoveryCodeProblem(code);
  const words = recoveryWordCount(code);
  function submitRecovery() {
    setTried(true);
    if (problem) return;
    void run('recover', () => p.recover(normalizeRecoveryCode(code)));
  }

  const approving = p.authenticated && p.needsApproval;
  const busy = doing !== null;
  const waiting = p.loading && !busy;

  return (
    <Modal visible={p.open} animationType="slide" presentationStyle="pageSheet" onRequestClose={p.onClose}>
      <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          style={styles.flex}
          contentContainerStyle={[styles.content, { paddingBottom: Math.max(insets.bottom, space.md) + layout.bottom }]}
          alwaysBounceVertical={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.header}>
            <Wordmark size={22} />
            <Pressable onPress={p.onClose} hitSlop={10} accessibilityRole="button" accessibilityLabel="Cerrar">
              <T variant="label" color={colors.muted}>
                Cerrar
              </T>
            </Pressable>
          </View>

          {waiting ? (
            <View style={styles.center}>
              <ActivityIndicator color={colors.accentText} />
              <T color={colors.muted}>Preparando tu billetera…</T>
            </View>
          ) : approving ? (
            <View style={styles.block}>
              <View style={styles.hero}>
                <T variant="display" style={styles.title}>
                  Trae tu billetera a este iPhone
                </T>
                <T color={colors.muted}>
                  Tu billetera de Cavos se creó en otro dispositivo. Confírmala con tu passkey o con tu código de recuperación.
                </T>
              </View>
              {p.hasPasskey ? (
                <Button
                  label="Confirmar con mi passkey"
                  pending={doing === 'passkey'}
                  disabled={busy && doing !== 'passkey'}
                  onPress={() => void run('passkey', p.approveWithPasskey)}
                />
              ) : null}
              <View style={styles.block}>
                <Field
                  label="Código de recuperación"
                  value={code}
                  onChangeText={(v) => {
                    setCode(v);
                    if (error) setError(null);
                  }}
                  placeholder={`Las ${RECOVERY_WORDS} palabras, separadas por espacios`}
                  multiline
                  onSubmit={submitRecovery}
                />
                <T variant="tiny" color={tried && problem ? colors.danger : colors.faint} style={styles.plain}>
                  {tried && problem ? problem : `${words} de ${RECOVERY_WORDS} palabras`}
                </T>
                <Button
                  label="Recuperar con mi código"
                  tone={p.hasPasskey ? 'ghost' : 'accent'}
                  pending={doing === 'recover'}
                  disabled={!!problem || (busy && doing !== 'recover')}
                  onPress={submitRecovery}
                />
              </View>
              <Button label="Entrar con otra cuenta" tone="ghost" disabled={busy} onPress={() => void run('other', p.otherAccount)} />
            </View>
          ) : !p.authenticated ? (
            <View style={styles.block}>
              <View style={styles.hero}>
                <T variant="display" style={styles.title}>
                  Entra a tu cuenta
                </T>
                <T color={colors.muted}>Si todavía no tienes cuenta, se crea en el mismo paso.</T>
              </View>
              {(['apple', 'google', 'email'] as const).map((provider, i) => (
                <Button
                  key={provider}
                  label={provider === 'apple' ? 'Continuar con Apple' : provider === 'google' ? 'Continuar con Google' : 'Continuar con mi correo'}
                  tone={i === 0 ? 'accent' : 'ghost'}
                  pending={doing === provider}
                  disabled={busy && doing !== provider}
                  onPress={() => void run(provider, () => p.loginWith(provider))}
                />
              ))}
              <T color={colors.muted} style={styles.hint}>
                El correo con tu código puede llegar a Spam. Revísalo si no lo ves.
              </T>
            </View>
          ) : (
            <View style={styles.center}>
              <ActivityIndicator color={colors.accentText} />
              <T color={colors.muted}>Abriendo tu sesión…</T>
            </View>
          )}

          {error ? <Banner tone="danger" title="No se pudo completar" body={error} /> : null}
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  flex: { flex: 1 },
  content: { paddingHorizontal: space.xl, paddingTop: space.xl, gap: layout.stack },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  hero: { gap: space.sm, paddingTop: space.sm },
  title: { fontSize: 30, lineHeight: 34 },
  block: { gap: layout.button },
  center: { alignItems: 'center', gap: space.md, paddingVertical: space.xxl },
  hint: { fontSize: 14, lineHeight: 20 },
  plain: { textTransform: 'none', letterSpacing: 0 },
});
