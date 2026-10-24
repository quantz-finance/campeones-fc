import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { track } from '../../../lib/analytics';
import type { ReportDraft } from '../../../domain/types';
import { useApp } from '../../../state/app-provider';
import { useQuery } from '../../../state/use-query';
import { Avatar } from '../../../ui/avatar';
import { Pill } from '../../../ui/bits';
import { Banner, Button, Gate } from '../../../ui/controls';
import { firstName, formatWhen, scoreText, statusLabel, statusTone } from '../../../ui/format';
import { Panel, Screen, Top } from '../../../ui/screen';
import { colors, radius, space } from '../../../ui/theme';
import { T } from '../../../ui/text';

type Choice = 'me' | 'them' | 'draw';

export default function MatchScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { repo, userId, version } = useApp();
  const query = useQuery(() => repo.matchSnapshot(String(id), userId!), [repo, userId, version, id]);
  const [choice, setChoice] = useState<Choice>('me');
  const [withGoals, setWithGoals] = useState(false);
  const [mine, setMine] = useState(1);
  const [theirs, setTheirs] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const draft = useMemo(() => {
    const snap = query.data;
    if (!snap || snap.youAre === 'other') return null;
    const meId = snap.youAre === 'a' ? snap.match.playerAId : snap.match.playerBId;
    const themId = snap.youAre === 'a' ? snap.match.playerBId : snap.match.playerAId;
    const isDraw = choice === 'draw';
    const winnerId = isDraw ? null : choice === 'me' ? meId : themId;
    if (!withGoals) return { isDraw, winnerId, goalsA: null, goalsB: null } satisfies ReportDraft;
    const goalsA = snap.youAre === 'a' ? mine : theirs;
    const goalsB = snap.youAre === 'a' ? theirs : mine;
    return { isDraw, winnerId, goalsA, goalsB } satisfies ReportDraft;
  }, [choice, mine, query.data, theirs, withGoals]);

  function pick(next: Choice) {
    setChoice(next);
    if (next === 'draw') {
      setTheirs(mine);
      return;
    }
    if (next === 'me' && mine <= theirs) {
      if (mine < 30) setMine(Math.min(30, Math.max(mine + 1, theirs + 1)));
      else setTheirs(29);
    }
    if (next === 'them' && theirs <= mine) {
      if (theirs < 30) setTheirs(Math.min(30, Math.max(theirs + 1, mine + 1)));
      else setMine(29);
    }
  }

  async function run(task: () => Promise<void>) {
    setBusy(true);
    setError(null);
    try {
      await task();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No se pudo completar.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen>
      <Gate query={query}>
        {(snap) => {
          const a = snap.people[snap.match.playerAId];
          const b = snap.people[snap.match.playerBId];
          const you = snap.youAre === 'a' ? a : b;
          const them = snap.youAre === 'a' ? b : a;
          const score = scoreText(snap.match.goalsA, snap.match.goalsB);
          const voting = snap.youAre !== 'other' && (snap.match.status === 'in_progress' || snap.match.status === 'disputed');
          return (
            <>
              <Top title="Partido" kicker={snap.tournamentName ?? snap.groupName ?? 'Amistoso'} back />
              <Panel>
                <View style={styles.score}>
                  <Player name={a?.displayName ?? 'Jugador'} avatar={a?.avatarKey ?? 'rayo'} />
                  <View style={styles.center}>
                    <T variant="display">{score ?? 'VS'}</T>
                    <Pill label={statusLabel[snap.match.status]} tone={statusTone(snap.match.status)} />
                  </View>
                  <Player name={b?.displayName ?? 'Jugador'} avatar={b?.avatarKey ?? 'rayo'} />
                </View>
                <T color={colors.muted}>
                  {snap.match.status === 'pending_accept'
                    ? `Expira ${formatWhen(snap.match.expiresAt)}.`
                    : `Creado ${formatWhen(snap.match.createdAt)}.`}
                </T>
                {snap.match.status === 'confirmed' ? (
                  <T variant="strong">
                    {snap.match.isDraw
                      ? 'Empate confirmado por los dos.'
                      : `Ganó ${snap.people[snap.match.winnerId ?? '']?.displayName ?? 'alguien'}. Los dos coincidieron.`}
                  </T>
                ) : null}
                {snap.match.status === 'disputed' ? (
                  <T color={colors.danger}>En disputa: nadie suma hasta que uno corrija su voto.</T>
                ) : null}
              </Panel>
              {snap.yourReport || snap.opponentReport ? (
                <Panel>
                  <T variant="strong">Votos</T>
                  <VoteLine label="Tú" report={snap.yourReport} people={snap.people} />
                  <VoteLine label={them?.displayName ?? 'Rival'} report={snap.opponentReport} people={snap.people} />
                </Panel>
              ) : null}
              {snap.match.status === 'pending_accept' && snap.youAre === 'b' ? (
                <Panel>
                  <T variant="title">{firstName(a?.displayName ?? 'Tu rival')} quiere jugar</T>
                  <T color={colors.muted}>Acepta solo si de verdad están en ese partido, en la sala o en línea.</T>
                  <Button
                    label="Aceptar partido"
                    disabled={busy}
                    onPress={() =>
                      void run(async () => {
                        await repo.acceptMatch(snap.match.id, userId!);
                        track('match_accepted');
                      })
                    }
                  />
                  <Button
                    label="Rechazar"
                    tone="danger"
                    disabled={busy}
                    onPress={() => void run(() => repo.declineMatch(snap.match.id, userId!).then(() => undefined))}
                  />
                </Panel>
              ) : null}
              {snap.match.status === 'pending_accept' && snap.youAre === 'a' ? (
                <Panel>
                  <T variant="title">Esperando a {firstName(b?.displayName ?? 'tu rival')}</T>
                  <T color={colors.muted}>
                    Ábrelo en otra ventana con su cuenta si están juntos. Si no acepta, el partido expira y no suma.
                  </T>
                  <Button
                    label="Cancelar propuesta"
                    tone="ghost"
                    disabled={busy}
                    onPress={() => void run(() => repo.declineMatch(snap.match.id, userId!).then(() => undefined))}
                  />
                </Panel>
              ) : null}
              {voting && you && them ? (
                <Panel>
                  <T variant="title">{snap.match.status === 'disputed' ? 'Corrige tu voto' : '¿Quién ganó?'}</T>
                  <View style={styles.choices}>
                    <ChoiceButton label={firstName(you.displayName)} active={choice === 'me'} onPress={() => pick('me')} />
                    {snap.allowDraw ? (
                      <ChoiceButton label="Empate" active={choice === 'draw'} onPress={() => pick('draw')} />
                    ) : null}
                    <ChoiceButton label={firstName(them.displayName)} active={choice === 'them'} onPress={() => pick('them')} />
                  </View>
                  <Button
                    label={withGoals ? 'Quitar goles' : 'Anotar goles'}
                    tone="ghost"
                    onPress={() => setWithGoals((value) => !value)}
                  />
                  {withGoals ? (
                    <View style={styles.goals}>
                      <Stepper label="Tus goles" value={mine} onChange={setMine} />
                      <Stepper label={`Goles de ${firstName(them.displayName)}`} value={theirs} onChange={setTheirs} />
                    </View>
                  ) : (
                    <T variant="tiny" color={colors.faint}>
                      Los goles son opcionales. Si los dos los anotan, tienen que coincidir.
                    </T>
                  )}
                  <Button
                    label={busy ? 'Enviando…' : snap.yourReport ? 'Actualizar mi voto' : 'Enviar mi voto'}
                    disabled={busy || !draft}
                    onPress={() =>
                      void run(async () => {
                        if (!draft) return;
                        await repo.submitReport(snap.match.id, userId!, draft);
                        track('report_submitted');
                      })
                    }
                  />
                </Panel>
              ) : null}
              {snap.match.status === 'in_progress' && snap.yourReport && !snap.opponentReport ? (
                <Banner title="Falta el voto de tu rival" body="El resultado no cuenta hasta que los dos digan lo mismo." />
              ) : null}
              {snap.canReopen && snap.slotId ? (
                <Button
                  label="Proponer el cruce de nuevo"
                  disabled={busy}
                  onPress={() =>
                    void run(async () => {
                      const next = await repo.reopenSlot(snap.slotId!, userId!);
                      router.replace(`/partido/${next.id}`);
                    })
                  }
                />
              ) : null}
              {snap.match.status === 'confirmed' && snap.youAre !== 'other' ? (
                <Button
                  label="Ver el versus"
                  tone="ghost"
                  onPress={() => router.push(`/versus/${snap.youAre === 'a' ? snap.match.playerBId : snap.match.playerAId}`)}
                />
              ) : null}
              {error ? <Banner tone="danger" title="No se guardó" body={error} /> : null}
            </>
          );
        }}
      </Gate>
    </Screen>
  );
}

function Player({ name, avatar }: { name: string; avatar: string }) {
  return (
    <View style={styles.player}>
      <Avatar avatarKey={avatar} size={56} />
      <T variant="strong" style={styles.centerText}>
        {firstName(name)}
      </T>
    </View>
  );
}

function ChoiceButton({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={[styles.choice, active && styles.choiceOn]}>
      <T variant="label" color={active ? colors.accentInk : colors.text} style={styles.centerText}>
        {label}
      </T>
    </Pressable>
  );
}

function Stepper({ label, value, onChange }: { label: string; value: number; onChange: (value: number) => void }) {
  return (
    <View style={styles.step}>
      <T variant="tiny" color={colors.muted}>
        {label}
      </T>
      <View style={styles.stepRow}>
        <Pressable onPress={() => onChange(Math.max(0, value - 1))} style={styles.stepBtn}>
          <T variant="title">−</T>
        </Pressable>
        <T variant="title">{value}</T>
        <Pressable onPress={() => onChange(Math.min(30, value + 1))} style={styles.stepBtn}>
          <T variant="title">+</T>
        </Pressable>
      </View>
    </View>
  );
}

function VoteLine({
  label,
  report,
  people,
}: {
  label: string;
  report: { isDraw: boolean; winnerId: string | null; goalsA: number | null; goalsB: number | null } | null;
  people: Record<string, { displayName: string }>;
}) {
  if (!report) return <T color={colors.muted}>{label}: todavía no vota.</T>;
  const who = report.isDraw ? 'empate' : `ganó ${people[report.winnerId ?? '']?.displayName ?? 'alguien'}`;
  const goals = scoreText(report.goalsA, report.goalsB);
  return (
    <T>
      {label}: {who}
      {goals ? ` (${goals})` : ''}
    </T>
  );
}

const styles = StyleSheet.create({
  score: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space.sm },
  center: { alignItems: 'center', gap: space.sm, flex: 1 },
  player: { width: 88, alignItems: 'center', gap: space.sm },
  centerText: { textAlign: 'center' },
  choices: { flexDirection: 'row', gap: space.sm },
  choice: {
    flex: 1,
    minHeight: 64,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.line,
    alignItems: 'center',
    justifyContent: 'center',
    padding: space.sm,
    backgroundColor: colors.bg,
  },
  choiceOn: { backgroundColor: colors.accent, borderColor: colors.accent },
  goals: { flexDirection: 'row', gap: space.md },
  step: { flex: 1, gap: space.sm },
  stepRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  stepBtn: {
    width: 40,
    height: 40,
    borderRadius: radius.pill,
    backgroundColor: colors.surface2,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
