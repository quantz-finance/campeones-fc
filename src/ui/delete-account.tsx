// Eliminar la cuenta desde Perfil (guía 5.1.1 de Apple). Confirmación en dos pasos.
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { apiPost } from '../lib/api';
import { accessToken } from '../lib/cavos/session';
import { getSupabase } from '../lib/supabase';
import { useApp } from '../state/app-provider';
import { Banner, Button, Field } from './controls';
import { humanError } from './errors';
import { colors, layout, space } from './theme';
import { T } from './text';

const CONFIRM = 'ELIMINAR';

function isSharedTestAccount(meta: Record<string, unknown> | undefined, email: string | undefined) {
  return meta?.demo_login === true || /@prueba\.campeonesfc\.invalid$/i.test(email ?? '');
}

export function DeleteAccount() {
  const app = useApp();
  const [step, setStep] = useState<0 | 1 | 2>(0);
  const [typed, setTyped] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (app.mode !== 'supabase') {
    return (
      <T variant="tiny" color={colors.muted} style={styles.plain}>
        En el modo demostración no hay una cuenta real que borrar.
      </T>
    );
  }


  async function forbiddenLocally(): Promise<string | null> {
    const { data } = await getSupabase().auth.getSession();
    if (!data.session) return 'Tu sesión venció. Vuelve a entrar.';
    if (isSharedTestAccount(data.session.user.app_metadata, data.session.user.email)) {
      return 'La cuenta de prueba compartida no se puede eliminar.';
    }
    return null;
  }

  async function onStart() {
    setError(null);
    const blocked = await forbiddenLocally();
    if (blocked) {
      setError(blocked);
      return;
    }
    setStep(1);
  }

  async function onDelete() {
    if (typed !== CONFIRM) {
      setError('Para confirmar, escribe ELIMINAR.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const blocked = await forbiddenLocally();
      if (blocked) throw new Error(blocked);
      const token = await accessToken();
      await apiPost('/api/account', token, { step: 'delete', confirm: CONFIRM });
      await app.signOut();
    } catch (cause) {
      setError(humanError(cause));
      setBusy(false);
    }
  }

  return (
    <View style={styles.box}>
      {step === 0 ? (
        <Button label="Eliminar cuenta" tone="ghost" onPress={() => void onStart()} />
      ) : null}
      {step === 1 ? (
        <>
          <Banner
            tone="danger"
            title="Vas a eliminar tu cuenta"
            body="Se borran tu nombre, foto, correo, amistades y avisos, y no podrás volver a entrar. Los partidos ya confirmados se conservan para tu rival y la verificación, pero sin tus datos personales. Esta acción no se puede deshacer."
          />
          <Button label="Continuar" tone="danger" onPress={() => setStep(2)} />
          <Button label="Cancelar" tone="ghost" onPress={() => setStep(0)} />
        </>
      ) : null}
      {step === 2 ? (
        <>
          <T style={styles.plain}>
            Escribe ELIMINAR para confirmar que quieres borrar tu cuenta para siempre.
          </T>
          <Field label="Confirmación" value={typed} onChangeText={(value) => setTyped(value.replace(/\s/g, '').toUpperCase())} placeholder="ELIMINAR" />
          <Button
            label={busy ? 'Eliminando…' : 'Sí, eliminar definitivamente'}
            tone="danger"
            pending={busy}
            disabled={busy || typed !== CONFIRM}
            onPress={() => void onDelete()}
          />
          <Button label="Cancelar" tone="ghost" disabled={busy} onPress={() => { setStep(0); setTyped(''); setError(null); }} />
        </>
      ) : null}
      {error ? <Banner tone="danger" title="No se pudo eliminar" body={error} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  box: { gap: layout.stack },
  plain: { textTransform: 'none', letterSpacing: 0 },
});
