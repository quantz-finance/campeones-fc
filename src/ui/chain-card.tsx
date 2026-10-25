// Registro en Stellar de un partido confirmado: firmas de los dos jugadores y la transacción.
import * as Linking from 'expo-linking';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { explorerTxUrl } from '../domain/match-proof';
import type { Match } from '../domain/types';
import { authErrorText } from '../lib/cavos/auth-ux';
import { cavosConfigured, STELLAR_NETWORK } from '../lib/cavos/config';
import { requestAnchor, signResult } from '../lib/cavos/session';
import { cavosStore } from '../lib/cavos/store';
import { getSupabase } from '../lib/supabase';
import { Banner, Button } from './controls';
import { colors, space } from './theme';
import { T } from './text';

type ChainInfo = { status: string | null; tx: string | null; signers: string[] };

async function loadChain(matchId: string): Promise<ChainInfo> {
  const db = getSupabase();
  const [m, a] = await Promise.all([
    db.from('matches').select('chain_status,chain_tx').eq('id', matchId).maybeSingle(),
    db.from('match_attestations').select('user_id').eq('match_id', matchId),
  ]);
  return {
    status: (m.data?.chain_status as string | null) ?? null,
    tx: (m.data?.chain_tx as string | null) ?? null,
    signers: ((a.data ?? []) as { user_id: string }[]).map((r) => r.user_id),
  };
}

export function ChainCard({ match, userId }: { match: Match; userId: string }) {
  const [info, setInfo] = useState<ChainInfo | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const nudged = useRef(false);

  const refresh = useCallback(() => {
    void loadChain(match.id)
      .then(setInfo)
      .catch(() => undefined);
  }, [match.id]);

  useEffect(() => {
    refresh();
    // Preparar el SDK de Cavos para firmar sin esperar.
    if (cavosConfigured()) cavosStore.want();
  }, [refresh]);

  // Con las dos firmas y sin anclar todavía: pedir el anclaje (idempotente; el cron también lo hace).
  useEffect(() => {
    if (!info || nudged.current || info.status === 'anchored' || info.status === null) return;
    if (info.signers.length < 2) return;
    nudged.current = true;
    void requestAnchor(match.id)
      .catch(() => undefined)
      .finally(refresh);
  }, [info, match.id, refresh]);

  if (!info || info.status === null) return null;
  const signed = info.signers.includes(userId);

  async function sign() {
    setBusy(true);
    setError(null);
    try {
      await signResult(match);
    } catch (e) {
      setError(authErrorText(e instanceof Error ? e.message : String(e)));
    } finally {
      setBusy(false);
      refresh();
    }
  }

  return (
    <View style={styles.card}>
      <T variant="label" color={colors.cyan}>
        Registro en Stellar · {STELLAR_NETWORK === 'mainnet' ? 'red principal' : 'red de prueba'}
      </T>
      <T variant="tiny" color={colors.muted} style={styles.plain}>
        Firmas: {info.signers.length} de 2
      </T>
      {info.status === 'anchored' && info.tx ? (
        <Pressable onPress={() => void Linking.openURL(explorerTxUrl(info.tx!, STELLAR_NETWORK))}>
          <T variant="strong" color={colors.yellow}>
            Resultado registrado. Ver la transacción
          </T>
        </Pressable>
      ) : info.status === 'failed' ? (
        <T color={colors.muted}>No pudimos registrarlo en Stellar. El equipo lo revisa; el marcador sí cuenta.</T>
      ) : (
        <T color={colors.muted}>
          {info.signers.length >= 2
            ? 'Registrando en Stellar…'
            : 'Cuando los dos firmen con su billetera, el resultado queda registrado en Stellar.'}
        </T>
      )}
      {!signed && info.status !== 'anchored' && cavosConfigured() ? (
        <Button label={busy ? 'Firmando…' : 'Firmar el resultado'} tone="ghost" disabled={busy} onPress={() => void sign()} />
      ) : null}
      {error ? <Banner tone="danger" title="No se firmó" body={error} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: space.sm,
    padding: space.md,
    borderWidth: 1,
    borderColor: 'rgba(34,225,255,0.25)',
    backgroundColor: 'rgba(8,12,36,0.72)',
  },
  plain: { textTransform: 'none', letterSpacing: 0 },
});
