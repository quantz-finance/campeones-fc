import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { writePendingInvite } from '../../data/demo-store';
import { useApp } from '../../state/app-provider';
import { Banner, Button } from '../../ui/controls';
import { Screen, Top } from '../../ui/screen';
import { T } from '../../ui/text';
import { colors } from '../../ui/theme';
import { replace } from '../../ui/nav';

export default function InviteScreen() {
  const { code } = useLocalSearchParams<{ code: string }>();
  const { ready, userId, repo } = useApp();
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!ready || !code) return;
    const value = String(code);
    if (!userId) {
      writePendingInvite(value);
      router.replace('/entrar');
      return;
    }
    let active = true;
    void repo
      .redeemInvite(userId, value)
      .then((result) => {
        if (!active) return;
        setMessage(result === 'already' ? 'Ya eran amigos. El pique sigue abierto.' : 'Listo. Ya son amigos, y ya le avisamos que entraste.');
      })
      .catch((cause: unknown) => {
        if (!active) return;
        setError(cause instanceof Error ? cause.message : 'No se pudo usar el enlace.');
      });
    return () => {
      active = false;
    };
  }, [code, ready, repo, userId]);

  return (
    <Screen>
      <Top title="Invitación" kicker="Amigos" />
      {message ? <Banner tone="accent" title={message} /> : null}
      {error ? <Banner tone="danger" title="Ese enlace no sirvió" body={error} /> : null}
      {!message && !error ? <T color={colors.muted}>Estamos uniendo las cuentas…</T> : null}
      {userId ? <Button label="Ir a tus amigos" onPress={() => replace('/amigos')} /> : null}
    </Screen>
  );
}
