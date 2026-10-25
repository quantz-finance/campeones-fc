// Apuesta del partido (Trustless Work, red de prueba): aceptar, depositar con la billetera, estado y pago verificado.
import * as Linking from 'expo-linking';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import type { Match } from '../domain/types';
import { authErrorText } from '../lib/cavos/auth-ux';
import {
  acceptStake, declineStake, depositStake, loadStake, netPot, payoutUrl, settleStake, units, type StakeRow, type StakeStatus,
} from '../lib/payments/stake';
import { SkewBlock } from './broadcast';
import { Pill } from './bits';
import { Banner, Button } from './controls';
import { firstName } from './format';
import { colors, space } from './theme';
import { T } from './text';

const CHIP: Record<StakeStatus, { label: string; tone: 'accent' | 'warn' | 'danger' | 'draw' | 'muted' | 'gold' | 'up' }> = {
  proposed: { label: 'Apuesta propuesta', tone: 'warn' },
  declined: { label: 'Sin apuesta', tone: 'muted' },
  deploying: { label: 'Creando custodia', tone: 'warn' },
  funding: { label: 'Esperando depósitos', tone: 'warn' },
  locked: { label: 'Pozo bloqueado', tone: 'accent' },
  settling: { label: 'Pagando', tone: 'warn' },
  paid: { label: 'Pagado', tone: 'up' },
  refunded: { label: 'Devuelto', tone: 'draw' },
  failed: { label: 'En revisión', tone: 'danger' },
};

type Side = 'a' | 'b' | 'other';

export function StakeCard({ match, userId, youAre, names }: { match: Match; userId: string; youAre: Side; names: Record<string, string> }) {
  const [stake, setStake] = useState<StakeRow | null | undefined>(undefined);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const nudged = useRef(false);

  const refresh = useCallback(() => {
    void loadStake(match.id).then(setStake).catch(() => setStake(null));
  }, [match.id]);
  useEffect(refresh, [refresh, match.status]);

  // Mientras algo se mueve on-chain, refrescar cada 5 s.
  useEffect(() => {
    if (!stake || !['deploying', 'settling'].includes(stake.status)) return;
    const t = setInterval(refresh, 5000);
    return () => clearInterval(t);
  }, [stake, refresh]);

  // Resultado confirmado con el pozo bloqueado: pedir el pago (idempotente; el cron también lo hace).
  useEffect(() => {
    if (!stake || nudged.current || youAre === 'other') return;
    if (match.status === 'confirmed' && ['funding', 'locked'].includes(stake.status)) {
      nudged.current = true;
      void settleStake(match.id).catch(() => undefined).finally(refresh);
    }
  }, [stake, match.status, match.id, youAre, refresh]);

  if (!stake) return null;
  const amount = units(stake.stake_stroops);
  const mine = youAre === 'a' ? stake.funded_a_tx : youAre === 'b' ? stake.funded_b_tx : null;
  const deposits = (stake.funded_a_tx ? 1 : 0) + (stake.funded_b_tx ? 1 : 0);
  const chip = CHIP[stake.status];

  async function run(label: string, fn: () => Promise<unknown>) {
    setBusy(label);
    setError(null);
    try {
      await fn();
    } catch (e) {
      setError(authErrorText(e instanceof Error ? e.message : String(e)));
    } finally {
      setBusy(null);
      refresh();
    }
  }

  const winner = stake.winner_id ? firstName(names[stake.winner_id] ?? 'El ganador') : null;

  return (
    <View style={styles.card}>
      <View style={styles.head}>
        <SkewBlock color={colors.yellow} padH={10} padV={4}>
          <T variant="title" style={styles.amount}>
            {amount} USDC c/u
          </T>
        </SkewBlock>
        <Pill label={chip.label} tone={chip.tone} />
      </View>
      <T variant="tiny" color={colors.muted} style={styles.plain}>
        Apuesta en custodia de Trustless Work · Stellar red de prueba · sin dinero real
      </T>

      {stake.status === 'proposed' && youAre !== 'other' && stake.proposed_by !== userId ? (
        <>
          <T color={colors.text}>Cada uno bloquea {amount} USDC de prueba. El que gane se lleva el pozo ({netPot(amount)} USDC neto).</T>
          <Button label={busy === 'accept' ? 'Preparando la custodia…' : 'Aceptar apuesta'} disabled={!!busy} onPress={() => void run('accept', () => acceptStake(match.id))} />
          <Button label="Jugar sin apuesta" tone="ghost" disabled={!!busy} onPress={() => void run('decline', () => declineStake(match.id))} />
        </>
      ) : null}
      {stake.status === 'proposed' && stake.proposed_by === userId ? (
        <T color={colors.muted}>Esperando que tu rival acepte la apuesta.</T>
      ) : null}
      {stake.status === 'deploying' ? <T color={colors.muted}>Creando la custodia en Stellar…</T> : null}

      {stake.status === 'funding' ? (
        <>
          <T color={colors.muted}>Depósitos: {deposits} de 2. Si falta uno al vencer el plazo, se devuelve lo depositado.</T>
          {youAre !== 'other' && !mine ? (
            <Button label={busy === 'fund' ? 'Firmando con tu billetera…' : `Depositar ${amount} USDC`} disabled={!!busy} onPress={() => void run('fund', () => depositStake(match.id))} />
          ) : youAre !== 'other' ? (
            <T variant="strong" color={colors.yellow}>✓ Tu depósito está en custodia</T>
          ) : null}
        </>
      ) : null}

      {stake.status === 'locked' ? (
        <T color={colors.text}>
          Pozo de {amount * 2} USDC bloqueado. Cuando los dos confirmen el resultado, se paga solo al ganador.
        </T>
      ) : null}
      {stake.status === 'settling' ? <T color={colors.muted}>Pagando en Stellar…</T> : null}

      {stake.status === 'paid' ? (
        <T variant="strong">{winner} se llevó el pozo: {netPot(amount)} USDC.</T>
      ) : null}
      {stake.status === 'refunded' ? (
        <T variant="strong">
          {stake.outcome === 'draw' ? 'Empate: ' : ''}a cada uno se le devolvió su depósito{deposits ? '' : ' (nadie había depositado)'}.
        </T>
      ) : null}
      {(stake.status === 'paid' || stake.status === 'refunded') && stake.settle_tx && stake.settle_tx !== 'onchain' ? (
        <Pressable onPress={() => void Linking.openURL(payoutUrl(stake.settle_tx!))} accessibilityRole="link">
          <T variant="strong" color={colors.yellow}>
            ✓ Verificado en Stellar
          </T>
          <T variant="tiny" color={colors.muted} style={styles.plain}>
            Ver el pago en stellar.expert
          </T>
        </Pressable>
      ) : null}
      {stake.status === 'failed' ? (
        <T color={colors.muted}>El pago no salió todavía. Lo reintentamos solos; los fondos siguen en custodia.</T>
      ) : null}
      {error ? <Banner tone="danger" title="No se pudo" body={error} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: space.sm,
    padding: space.md,
    borderWidth: 1,
    borderColor: 'rgba(255,214,0,0.35)',
    backgroundColor: 'rgba(8,12,36,0.72)',
  },
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space.sm },
  amount: { fontSize: 16, color: colors.ink, fontStyle: 'normal' },
  plain: { textTransform: 'none', letterSpacing: 0 },
});
