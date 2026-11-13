// partido.campeonesfc.app/auth/correo-app?state=… — la abre la app de iPhone en una sesión de autenticación del
// sistema (ver email-handoff.ts). Usa el kit web tal cual: el código lo genera y verifica el enclave de Cavos, con
// su atestación comprobada aquí. Al terminar vuelve SOLO a campeones-fc://cavos-auth#… con el token y la preimagen
// de su nonce; no se guardan en este navegador ni se escriben en la consola.
import '../polyfills';
import { useMemo, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Wordmark } from '../../ui/broadcast';
import { Banner, Button, Field } from '../../ui/controls';
import { Screen } from '../../ui/screen';
import { colors, space } from '../../ui/theme';
import { T } from '../../ui/text';
import { authErrorText, otpGuard } from './auth-ux';
import { CAVOS_APP_ID } from './config';
import { handoffReturnUrl, isHandoffState, parseHandoffReturn } from './email-handoff';

type Step = 'email' | 'code' | 'done';
type Captured = { token: string; secret: string };
type HandoffAuth = { sendOtp(email: string): Promise<void>; verifyOtp(email: string, code: string): Promise<unknown> };

function readState(): string | null {
  if (typeof window === 'undefined') return null;
  const s = new URLSearchParams(window.location.search).get('state');
  return isHandoffState(s) ? s : null;
}

function guard() {
  try {
    return otpGuard(window.localStorage);
  } catch {
    return null;
  }
}

export default function EmailHandoffPage() {
  const state = useMemo(readState, []);
  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const authRef = useRef<{ auth: HandoffAuth; captured: { value: Captured | null } } | null>(null);

  async function getAuth() {
    if (authRef.current) return authRef.current;
    const { CavosAuth } = await import('@cavos/kit');
    const auth = new CavosAuth({ appId: CAVOS_APP_ID }) // sin persistSession:false: ese modo borra la sesión web guardada en este origen;
    const captured: { value: Captured | null } = { value: null };
    // verifyOtp termina en identityFromAuthData(id_token, 'email', correo, preimagen). Aquí solo se toma el token y
    // la preimagen para la app: nada se guarda en sessionStorage/localStorage de esta página.
    (auth as unknown as { identityFromAuthData: (...a: unknown[]) => Promise<unknown> }).identityFromAuthData = async (
      authData: unknown,
      _provider: unknown,
      address: unknown,
      secret: unknown,
    ) => {
      let token = String(authData ?? '');
      try {
        const parsed = JSON.parse(token);
        token = parsed.id_token ?? parsed.jwt ?? parsed.token ?? token;
      } catch {
        /* ya era el JWT */
      }
      captured.value = { token, secret: String(secret ?? '') };
      return { userId: '', email: address, provider: 'email' };
    };
    authRef.current = { auth: auth as unknown as HandoffAuth, captured };
    return authRef.current;
  }

  async function sendCode() {
    const address = email.trim();
    if (!address) return;
    setBusy(true);
    setError(null);
    const g = guard();
    try {
      const before = g?.before(address) ?? null;
      if (before === 'skip') {
        setStep('code');
        return;
      }
      if (before) throw new Error(before);
      const { auth } = await getAuth();
      try {
        await auth.sendOtp(address);
      } catch (e) {
        g?.failed(address, e);
        throw e;
      }
      g?.sent(address);
      setStep('code');
    } catch (e) {
      setError(authErrorText(e instanceof Error ? e.message : String(e)));
    } finally {
      setBusy(false);
    }
  }

  async function verify() {
    if (!state) return;
    const address = email.trim();
    setBusy(true);
    setError(null);
    try {
      const { auth, captured } = await getAuth();
      captured.value = null;
      await auth.verifyOtp(address, code);
      const got = captured.value as Captured | null;
      captured.value = null;
      if (!got) throw new Error('kit/auth: the enclave did not verify this email');
      const url = handoffReturnUrl({ state, token: got.token, secret: got.secret });
      parseHandoffReturn(url, state); // misma validación que hará la app: si no calza, mejor fallar aquí
      guard()?.verified(address);
      setStep('done');
      setCode('');
      window.location.replace(url);
    } catch (e) {
      setError(authErrorText(e instanceof Error ? e.message : String(e)));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen>
      <View style={styles.hero}>
        <Wordmark size={26} />
        <T variant="display" style={styles.title}>
          Entra con tu correo
        </T>
      </View>
      {!state ? (
        <Banner
          tone="warn"
          title="Abre esta página desde la app"
          body="Esta pantalla solo sirve para entrar a la app Campeones FC del iPhone. Toca «Continuar con correo» en la app."
        />
      ) : step === 'done' ? (
        <Banner tone="accent" title="Listo" body="Volviendo a la app Campeones FC… Si no pasa nada, cierra esta ventana y vuelve a intentarlo." />
      ) : step === 'email' ? (
        <>
          <T color={colors.muted}>Te enviamos un código para entrar a la app Campeones FC en este iPhone.</T>
          <Field label="Correo" value={email} onChangeText={setEmail} placeholder="tu@correo.com" keyboardType="email-address" />
          <Button label="Enviar código" pending={busy} disabled={!email.trim()} onPress={() => void sendCode()} />
        </>
      ) : (
        <>
          <T color={colors.muted}>
            Escribe el código que llegó a {email.trim()}. Si no lo ves en un minuto, revisa tu carpeta de Spam. Solo escribe aquí un
            código que pediste tú desde la app.
          </T>
          <Field label="Código" value={code} onChangeText={setCode} placeholder="9 caracteres" maxLength={11} />
          <Button label="Entrar" pending={busy} disabled={code.replace(/[\s-]/g, '').length < 9} onPress={() => void verify()} />
          <Button
            label="Usar otro correo"
            tone="ghost"
            disabled={busy}
            onPress={() => {
              setStep('email');
              setCode('');
              setError(null);
            }}
          />
        </>
      )}
      {error ? <Banner tone="danger" title="No se pudo entrar" body={error} /> : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: { gap: space.md, paddingTop: 48 },
  title: { fontSize: 30, lineHeight: 34 },
});
