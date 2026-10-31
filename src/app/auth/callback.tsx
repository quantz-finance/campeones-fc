import { Redirect } from 'expo-router';
import { useEffect, useState } from 'react';
import { oauthErrorFrom } from '../../lib/google-auth';
import { useApp } from '../../state/app-provider';
import { Banner, Button, Loading } from '../../ui/controls';
import { replace } from '../../ui/nav';
import { Screen } from '../../ui/screen';

/** Vuelta de Google: supabase-js canjea el código y abre la sesión; aquí solo esperamos o mostramos el error. */
export default function Callback() {
  const { ready, userId } = useApp();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const fromUrl = oauthErrorFrom(window.location.href);
    if (fromUrl) {
      setError(fromUrl);
      return;
    }
    const timer = setTimeout(() => setError('La entrada tardó demasiado. Vuelve a intentarlo.'), 15_000);
    return () => clearTimeout(timer);
  }, []);

  if (ready && userId) return <Redirect href="/inicio" />;
  return (
    <Screen>
      {error ? (
        <>
          <Banner tone="danger" title="No se pudo entrar" body={error} />
          <Button label="Volver a intentar" onPress={() => replace('/entrar')} />
        </>
      ) : (
        <Loading label="Confirmando tu entrada…" />
      )}
    </Screen>
  );
}
