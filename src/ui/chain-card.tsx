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
import { push } from './nav';

type ChainInfo = { status: string | null; tx: string | null; backfill: boolean; signers: string[] };

/** Lo anclado en otra red (antes de cambiar de red) cuenta como pendiente en la red actual. */
const here = (network: unknown) => !network || network === STELLAR_NETWORK;

async function loadChain(matchId: string): Promise<ChainInfo> {
  const db = getSupabase();
  const [m, a] = await Promise.all([
    db.from('matches').select('chain_status,chain_tx,chain_backfill,chain_network').eq('id', matchId).maybeSingle(),
    db.from('match_attestations').select('user_id').eq('match_id', matchId),
  ]);
  const sameNet = here(m.data?.chain_network);
  return {
    status: sameNet ? ((m.data?.chain_status as string | null) ?? null) : 'pending',
    tx: sameNet ? ((m.data?.chain_tx as string | null) ?? null) : null,
    backfill: !!m.data?.chain_backfill,
    signers: ((a.data ?? []) as { user_id: string }[]).map((r) => r.user_id),
  };
}

export function ChainCard({ match, userId, canSign = true }: { match: Match; userId: string; canSign?: boolean }) {
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
    if (info.signers.length < 2 || !canSign) return;
    nudged.current = true;
    void requestAnchor(match.id)
      .catch(() => undefined)
      .finally(refresh);
  }, [info, match.id, refresh, canSign]);

  if (!info || info.status === null) return null;
  const signed = info.signers.includes(userId);

  async function sign() {
    setBusy(true);
    setError(null);
    try {
      await signResult(match);
    } catch (e) {
      const raw = e instanceof Error ? e.message : String(e);
      setError(
        /no corresponde a tu billetera/i.test(raw)
          ? 'La billetera abierta en Cavos no es la de esta cuenta. Entra a Cavos con la misma cuenta con la que juegas y vuelve a firmar.'
          : authErrorText(raw),
      );
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
        {info.backfill && info.signers.length === 0 ? 'Sin firma: partido anterior al registro en Stellar' : `Firmas: ${info.signers.length} de 2`}
      </T>
      {info.status === 'anchored' && info.tx ? (
        <>
          <Pressable onPress={() => push(`/verificar/${match.id}`)} accessibilityRole="link">
            <T variant="strong" color={colors.yellow}>
              ✓ Verificado en Stellar
            </T>
          </Pressable>
          <Pressable onPress={() => void Linking.openURL(explorerTxUrl(info.tx!, STELLAR_NETWORK))} accessibilityRole="link">
            <T variant="tiny" color={colors.muted} style={styles.plain}>
              Ver la transacción en stellar.expert
            </T>
          </Pressable>
        </>
      ) : info.status === 'failed' ? (
        <T color={colors.muted}>No pudimos registrarlo en Stellar. El equipo lo revisa; el marcador sí cuenta.</T>
      ) : (
        <T color={colors.muted}>
          {info.signers.length >= 2
            ? 'Registrando en Stellar…'
            : 'Cuando los dos firmen con su billetera, el resultado queda registrado en Stellar.'}
        </T>
      )}
      {canSign && !signed && info.status !== 'anchored' && cavosConfigured() ? (
        <>
          <T variant="tiny" color={colors.muted} style={styles.plain}>
            Opcional: el resultado ya cuenta para el ranking. Tu firma solo lo sella en Stellar.
          </T>
          <Button label={busy ? 'Firmando…' : 'Firmar el resultado (opcional)'} tone="ghost" disabled={busy} onPress={() => void sign()} />
        </>
      ) : null}
      {error ? <Banner tone="danger" title="No se firmó (el resultado sigue confirmado)" body={error} /> : null}
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
