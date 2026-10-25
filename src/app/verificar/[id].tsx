// Página pública: cualquiera (sin cuenta) comprueba que un resultado está registrado en Stellar.
import * as Linking from 'expo-linking';
import { useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';
import { canonicalJson } from '../../domain/match-proof';
import { cavosSignedBytes, runChecks, type Check, type VerifyResponse } from '../../lib/chain-verify';
import { Banner } from '../../ui/controls';
import { Screen, Top } from '../../ui/screen';
import { T } from '../../ui/text';
import { colors, space } from '../../ui/theme';

const mono = Platform.select({ web: 'ui-monospace, SFMono-Regular, Menlo, monospace', default: undefined });

async function verifySignatures(v: VerifyResponse): Promise<Record<string, boolean>> {
  const out: Record<string, boolean> = {};
  const players: any[] = Array.isArray(v.payload?.players) ? v.payload.players : [];
  if (!players.some((p) => p.signature)) return out;
  await import('../../lib/polyfills');
  const { Keypair } = await import('@stellar/stellar-sdk');
  for (const p of players) {
    if (!p.signature || !p.address) continue;
    try {
      const kp = Keypair.fromPublicKey(p.address);
      const sig = Buffer.from(p.signature, 'base64');
      const msg = String(v.payload.message);
      out[p.role] = kp.verify(Buffer.from(cavosSignedBytes(msg)), sig) || kp.verify(Buffer.from(msg, 'utf8'), sig);
    } catch {
      out[p.role] = false;
    }
  }
  return out;
}

function Mono({ children }: { children: string }) {
  return (
    <T variant="body" style={[styles.mono, mono ? { fontFamily: mono } : null]} selectable>
      {children}
    </T>
  );
}

function Link({ label, url }: { label: string; url: string }) {
  return (
    <Pressable onPress={() => void Linking.openURL(url)} accessibilityRole="link">
      <T variant="strong" color={colors.yellow}>
        {label}
      </T>
    </Pressable>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.card}>
      <T variant="label" color={colors.cyan}>
        {title}
      </T>
      {children}
    </View>
  );
}

export default function VerifyScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [data, setData] = useState<VerifyResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [checks, setChecks] = useState<Check[] | null>(null);
  const [sigs, setSigs] = useState<Record<string, boolean> | null>(null);

  useEffect(() => {
    if (!id) return;
    let active = true;
    void fetch(`/api/verificar?id=${encodeURIComponent(String(id))}`)
      .then(async (r) => {
        const body = await r.json().catch(() => ({}));
        if (!r.ok) throw new Error(body.error ?? 'No pudimos cargar el partido.');
        return body as VerifyResponse;
      })
      .then((v) => {
        if (!active) return;
        setData(v);
        void runChecks(v).then((c) => active && setChecks(c));
        void verifySignatures(v)
          .then((s) => active && setSigs(s))
          .catch(() => active && setSigs({}));
      })
      .catch((e: unknown) => active && setError(e instanceof Error ? e.message : String(e)));
    return () => {
      active = false;
    };
  }, [id]);

  const net = data?.network === 'mainnet' ? 'red principal' : 'red de prueba (testnet)';
  const anchored = data?.match.chain_status === 'anchored' && !!data.url;
  const allOk = checks && checks.length > 0 && checks.every((c) => c.ok);

  return (
    <Screen>
      <Top title={anchored ? 'Verificado en Stellar' : 'Verificación en Stellar'} kicker="Campeones FC" />
      {error ? <Banner tone="danger" title="No se pudo verificar" body={error} /> : null}
      {!data && !error ? <T color={colors.muted}>Cargando el registro…</T> : null}
      {data ? (
        <>
          <Section title={`Estado · ${net}`}>
            {anchored ? (
              <T variant="strong">Este resultado está registrado en Stellar y nadie lo puede cambiar sin que se note.</T>
            ) : (
              <T color={colors.muted}>Este resultado todavía no está registrado en Stellar. Vuelve en unos minutos.</T>
            )}
            {data.url ? <Link label="Ver la transacción en stellar.expert" url={data.url} /> : null}
            {checks === null && anchored ? <T color={colors.muted}>Comprobando en Stellar…</T> : null}
            {checks?.map((c) => (
              <T key={c.label} color={c.ok ? colors.win : c.ok === false ? colors.loss : colors.muted}>
                {c.ok ? '✓' : c.ok === false ? '✗' : '·'} {c.label}
              </T>
            ))}
            {allOk ? <T color={colors.muted}>Tu navegador lo comprobó directo en Stellar, sin confiar en nuestro servidor.</T> : null}
          </Section>

          <Section title="Resultado">
            <T>
              {data.current.result.draw ? 'Empate' : 'Ganó el jugador ' + (data.current.result.winner === data.current.result.player_a ? 'A' : 'B')} ·{' '}
              {String(data.current.result.goals_a)}-{String(data.current.result.goals_b)}
            </T>
            <T color={colors.muted}>Confirmado: {new Date(data.match.confirmed_at).toLocaleString('es-CR', { timeZone: 'America/Costa_Rica' })} (hora de Costa Rica)</T>
            <T color={colors.muted}>Los jugadores aparecen con su código público, sin nombres ni correos.</T>
          </Section>

          <Section title="Firmas de los jugadores">
            {data.match.backfill && data.signatures.count === 0 ? (
              <T color={colors.muted}>Sin firma: el partido es anterior al registro en Stellar. Lo registró Campeones FC con el resultado que confirmaron los dos.</T>
            ) : (
              <T>{data.signatures.count} de 2 firmaron con su billetera.</T>
            )}
            {data.signatures.players.map((p) => (
              <View key={p.role} style={styles.row}>
                <T variant="tiny" color={colors.muted}>
                  Jugador {p.role.toUpperCase()}
                </T>
                <Mono>{p.address ?? 'sin billetera'}</Mono>
                <T color={p.signed ? (sigs?.[p.role] === false ? colors.loss : colors.win) : colors.muted}>
                  {p.signed ? (sigs === null ? 'Firmó (comprobando…)' : sigs[p.role] ? '✓ Firma válida' : '✗ La firma no cuadra') : 'Sin firma'}
                </T>
              </View>
            ))}
          </Section>

          {data.hash ? (
            <Section title="Hash registrado (SHA-256)">
              <Mono>{data.hash}</Mono>
            </Section>
          ) : null}

          {data.payload ? (
            <Section title="JSON canónico">
              <T color={colors.muted}>El hash de arriba es el SHA-256 de este texto exacto.</T>
              <Mono>{canonicalJson(data.payload)}</Mono>
            </Section>
          ) : null}

          {data.daily ? (
            <Section title={`Acta del día ${data.daily.day}`}>
              <T color={colors.muted}>
                Cada noche se registra una raíz Merkle con todos los resultados confirmados del día ({data.daily.count}), encadenada con el acta anterior. Así
                no se puede borrar ni agregar un partido después.
              </T>
              <Mono>{data.daily.record_hash}</Mono>
              {data.daily.url ? <Link label="Ver el acta en stellar.expert" url={data.daily.url} /> : <T color={colors.muted}>El acta se registra esta noche.</T>}
            </Section>
          ) : (
            <Section title="Acta del día">
              <T color={colors.muted}>Todavía no está en un acta diaria. Las actas se registran cada noche.</T>
            </Section>
          )}
        </>
      ) : null}
    </Screen>
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
  row: { gap: 2 },
  mono: { fontSize: 12, lineHeight: 17, color: colors.text },
});
