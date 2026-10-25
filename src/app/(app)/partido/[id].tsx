import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { track } from '../../../lib/analytics';
import type { ReportDraft } from '../../../domain/types';
import { useApp } from '../../../state/app-provider';
import { useQuery } from '../../../state/use-query';
import { SkewBlock } from '../../../ui/broadcast';
import { ChainCard } from '../../../ui/chain-card';
import { StakeCard } from '../../../ui/stake-card';
import { settleStake, stakesEnabled } from '../../../lib/payments/stake';
import { Banner, Button, Gate } from '../../../ui/controls';
import { firstName, formatWhen, scoreText, tagOf } from '../../../ui/format';
import { Screen, Top } from '../../../ui/screen';
import { colors } from '../../../ui/theme';
import { T } from '../../../ui/text';
import { DetailSkeleton } from '../../../ui/skeleton';
import { Avatar } from '../../../ui/avatar';

type Choice = 'me' | 'them' | 'draw';

export default function MatchScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { repo, userId, version, mode, profile } = useApp();
  const query = useQuery(() => repo.matchSnapshot(String(id), userId!), [repo, userId, version, id]);
  const [choice, setChoice] = useState<Choice>('me');
  const [withGoals, setWithGoals] = useState(true);
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
      <Gate query={query} skeleton={<DetailSkeleton />}>
        {(snap) => {
          const a = snap.people[snap.match.playerAId];
          const b = snap.people[snap.match.playerBId];
          const you = snap.youAre === 'a' ? a : b;
          const them = snap.youAre === 'a' ? b : a;
          const votes = [snap.yourReport, snap.opponentReport].filter(Boolean).length;
          const voting = snap.youAre !== 'other' && (snap.match.status === 'in_progress' || snap.match.status === 'disputed');
          const leftGoals = snap.youAre === 'b' ? theirs : mine;
          const rightGoals = snap.youAre === 'b' ? mine : theirs;
          const locked = scoreText(snap.match.goalsA, snap.match.goalsB);
          const scoreLabel = snap.match.status === 'confirmed' && locked ? locked.replace('–', ' : ') : withGoals && voting ? `${leftGoals} : ${rightGoals}` : 'VS';
          const cta =
            withGoals && draft && draft.goalsA != null && draft.goalsB != null
              ? `Confirmar ${draft.goalsA}-${draft.goalsB}`
              : snap.yourReport
                ? 'Actualizar mi voto'
                : 'Enviar mi voto';
          return (
            <>
              <Top
                title="Confirmar resultado"
                kicker={snap.tournamentName ?? snap.groupName ?? `Partido · ${formatWhen(snap.match.createdAt)}`}
                back
                right={
                  <View style={styles.live}>
                    <T variant="tiny" color={colors.ink}>
                      Voto {votes}/2
                    </T>
                  </View>
                }
              />
              <View style={styles.pitch}>
                <View style={[styles.half, { backgroundColor: colors.red }]}>
                  <T variant="display" style={styles.ghost}>
                    {tagOf(a?.displayName ?? 'LOC')}
                  </T>
                  {a ? <View style={styles.face}><Avatar avatarKey={a.avatarKey} name={a.displayName} photoUrl={a.photoUrl} size={44} /></View> : null}
                  <View style={styles.nameTag}>
                    <T variant="title" style={{ fontSize: 16, color: colors.ink }}>
                      {firstName(a?.displayName ?? 'Local')}
                    </T>
                    <T variant="tiny" color={colors.muted} style={styles.plain}>
                      Local
                    </T>
                  </View>
                </View>
                <View style={styles.cut} />
                <View style={[styles.half, { backgroundColor: colors.blue }]}>
                  <T variant="display" style={styles.ghost}>
                    {tagOf(b?.displayName ?? 'VIS')}
                  </T>
                  {b ? <View style={[styles.face, styles.faceRight]}><Avatar avatarKey={b.avatarKey} name={b.displayName} photoUrl={b.photoUrl} size={44} /></View> : null}
                  <View style={[styles.nameTag, styles.nameRight]}>
                    <T variant="title" style={{ fontSize: 16, color: colors.ink }}>
                      {firstName(b?.displayName ?? 'Visita')}
                    </T>
                    <T variant="tiny" color={colors.muted} style={styles.plain}>
                      Visita
                    </T>
                  </View>
                </View>
                <View style={styles.vs} pointerEvents="none">
                  <T variant="display" style={styles.vsText}>
                    VS
                  </T>
                </View>
              </View>
              <View style={styles.board}>
                <View style={[styles.boardSide, { backgroundColor: colors.red }]}>
                  <T variant="display" style={{ fontSize: 18, color: colors.redInk }}>
                    {tagOf(a?.displayName ?? 'LOC')}
                  </T>
                  <T variant="tiny" color={colors.redInk}>
                    Local
                  </T>
                </View>
                <View style={styles.boardScore}>
                  <T variant="display" style={styles.boardNum}>
                    {scoreLabel}
                  </T>
                  {voting && withGoals ? (
                    <View style={styles.steppers}>
                      <MiniStep
                        value={leftGoals}
                        onDec={() => (snap.youAre === 'b' ? setTheirs(Math.max(0, theirs - 1)) : setMine(Math.max(0, mine - 1)))}
                        onInc={() => (snap.youAre === 'b' ? setTheirs(Math.min(30, theirs + 1)) : setMine(Math.min(30, mine + 1)))}
                      />
                      <MiniStep
                        value={rightGoals}
                        onDec={() => (snap.youAre === 'b' ? setMine(Math.max(0, mine - 1)) : setTheirs(Math.max(0, theirs - 1)))}
                        onInc={() => (snap.youAre === 'b' ? setMine(Math.min(30, mine + 1)) : setTheirs(Math.min(30, theirs + 1)))}
                      />
                    </View>
                  ) : null}
                </View>
                <View style={[styles.boardSide, { backgroundColor: colors.blue }]}>
                  <T variant="display" style={{ fontSize: 18, color: '#fff' }}>
                    {tagOf(b?.displayName ?? 'VIS')}
                  </T>
                  <T variant="tiny" color="#fff">
                    Visita
                  </T>
                </View>
              </View>
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
              {mode === 'supabase' && stakesEnabled() && profile?.showDemo !== true ? (
                <StakeCard
                  match={snap.match}
                  userId={userId!}
                  youAre={snap.youAre}
                  names={Object.fromEntries(Object.entries(snap.people).map(([id, p]) => [id, p.displayName]))}
                />
              ) : null}
              {snap.match.status === 'pending_accept' && snap.youAre === 'b' ? (
                <View style={styles.block}>
                  <T variant="title">{firstName(a?.displayName ?? 'Tu rival')} quiere jugar</T>
                  <T color={colors.muted}>Acepta solo si de verdad están en ese partido, en la sala o en línea.</T>
                  <Button
                    label="Aceptar partido"
                    pending={busy}
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
                    pending={busy}
                    onPress={() => void run(() => repo.declineMatch(snap.match.id, userId!).then(() => undefined))}
                  />
                </View>
              ) : null}
              {snap.match.status === 'pending_accept' && snap.youAre === 'a' ? (
                <View style={styles.block}>
                  <T variant="title">Esperando a {firstName(b?.displayName ?? 'tu rival')}</T>
                  <T color={colors.muted}>
                    Ábrelo en otra ventana con su cuenta si están juntos. Si no acepta, el partido expira y no suma.
                  </T>
                  <Button
                    label="Cancelar propuesta"
                    tone="ghost"
                    pending={busy}
                    onPress={() => void run(() => repo.declineMatch(snap.match.id, userId!).then(() => undefined))}
                  />
                </View>
              ) : null}
              {voting && you && them ? (
                <View style={styles.block}>
                  <SkewBlock color="#fff" padH={10} padV={4}>
                    <T variant="title" style={{ fontSize: 16, color: colors.ink, fontStyle: 'normal' }}>
                      {snap.match.status === 'disputed' ? 'Corrige tu voto' : '¿Quién ganó?'}
                    </T>
                  </SkewBlock>
                  <View style={styles.choices}>
                    <ChoiceButton label={firstName(you.displayName)} active={choice === 'me'} onPress={() => pick('me')} />
                    {snap.allowDraw ? <ChoiceButton label="Empate" active={choice === 'draw'} onPress={() => pick('draw')} /> : null}
                    <ChoiceButton label={firstName(them.displayName)} active={choice === 'them'} onPress={() => pick('them')} />
                  </View>
                  <Pressable onPress={() => setWithGoals((value) => !value)}>
                    <T variant="label" color={colors.yellow}>
                      {withGoals ? 'Quitar el marcador' : 'Anotar goles'}
                    </T>
                  </Pressable>
                  {!withGoals ? (
                    <T variant="tiny" color={colors.faint} style={styles.plain}>
                      Los goles son opcionales. Si los dos los anotan, tienen que coincidir.
                    </T>
                  ) : null}
                  <View style={styles.review}>
                    <View style={styles.reviewHead}>
                      <T variant="label" color={colors.yellow}>
                        Revisión del resultado
                      </T>
                      <T variant="tiny" color={colors.muted}>
                        {votes} de 2 votos
                      </T>
                    </View>
                    <VoteRow
                      tag={tagOf(them?.displayName ?? 'Rival')}
                      name={firstName(them?.displayName ?? 'Rival')}
                      report={snap.opponentReport}
                      people={snap.people}
                      pending="Todavía no vota"
                    />
                    <VoteRow
                      tag={tagOf(you.displayName)}
                      name="Tú"
                      report={snap.yourReport}
                      people={snap.people}
                      pending="Tu voto cierra el partido"
                    />
                  </View>
                  <T color={colors.muted}>Si coinciden, el marcador queda cerrado y el Elo se mueve.</T>
                  <Pressable
                    onPress={() => pick(choice === 'them' ? 'me' : 'them')}
                   
                  >
                    <T variant="label" color={colors.cyan}>
                      ¿No coincide? Reportar diferencia
                    </T>
                  </Pressable>
                  <Button
                    label={busy ? 'Enviando…' : cta}
                    pending={busy}
                    disabled={!draft}
                    onPress={() =>
                      void run(async () => {
                        if (!draft) return;
                        await repo.submitReport(snap.match.id, userId!, draft);
                        track('report_submitted');
                        // Si con este voto quedó confirmado y hay pozo, pagarlo ya (idempotente; el cron también lo hace).
                        if (mode === 'supabase' && stakesEnabled()) void settleStake(snap.match.id).catch(() => undefined);
                      })
                    }
                  />
                </View>
              ) : null}
              {snap.match.status === 'in_progress' && snap.yourReport && !snap.opponentReport ? (
                <Banner title="Falta el voto de tu rival" body="El resultado no cuenta hasta que los dos digan lo mismo." />
              ) : null}
              {snap.canReopen && snap.slotId ? (
                <Button
                  label="Proponer el cruce de nuevo"
                  pending={busy}
                  onPress={() =>
                    void run(async () => {
                      const next = await repo.reopenSlot(snap.slotId!, userId!);
                      router.replace(`/partido/${next.id}`);
                    })
                  }
                />
              ) : null}
              {mode === 'supabase' && snap.match.status === 'confirmed' ? (
                <ChainCard match={snap.match} userId={userId!} canSign={snap.youAre !== 'other'} />
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

function MiniStep({ value, onDec, onInc }: { value: number; onDec: () => void; onInc: () => void }) {
  return (
    <View style={styles.mini}>
      <Pressable onPress={onDec} hitSlop={6} accessibilityLabel="Bajar">
        <T variant="title" color={colors.ink}>
          −
        </T>
      </Pressable>
      <T variant="tiny" color={colors.muted} style={styles.plain}>
        {value}
      </T>
      <Pressable onPress={onInc} hitSlop={6} accessibilityLabel="Subir">
        <T variant="title" color={colors.ink}>
          +
        </T>
      </Pressable>
    </View>
  );
}

function ChoiceButton({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={styles.choiceHit}>
      <SkewBlock color={active ? colors.red : 'rgba(255,255,255,0.06)'} shadow={active ? colors.yellow : undefined} border={active ? undefined : 'rgba(255,255,255,0.16)'} padH={8} padV={10} fill>
        <T variant="label" color={active ? colors.redInk : colors.text} style={{ textAlign: 'center' }}>
          {label}
        </T>
      </SkewBlock>
    </Pressable>
  );
}

function VoteRow({
  tag,
  name,
  report,
  people,
  pending,
}: {
  tag: string;
  name: string;
  report: { isDraw: boolean; winnerId: string | null; goalsA: number | null; goalsB: number | null } | null;
  people: Record<string, { displayName: string }>;
  pending: string;
}) {
  const goals = report ? scoreText(report.goalsA, report.goalsB) : null;
  const who = !report ? pending : report.isDraw ? 'Votó empate' : `Votó: ganó ${people[report.winnerId ?? '']?.displayName ?? 'alguien'}`;
  return (
    <View style={styles.vote}>
      <View style={styles.voteTag}>
        <T variant="tiny" color="#fff">
          {tag}
        </T>
      </View>
      <View style={styles.flex}>
        <T variant="strong">{name}</T>
        <T variant="tiny" color={colors.muted} style={styles.plain}>
          {who}
          {goals ? ` ${goals}` : ''}
        </T>
      </View>
      <View style={[styles.voteState, { backgroundColor: report ? colors.up : colors.yellow }]}>
        <T variant="tiny" color={report ? '#fff' : colors.ink}>
          {report ? 'Confirmado' : 'Pendiente'}
        </T>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  face: { position: 'absolute', top: 10, left: 10, zIndex: 2 },
  faceRight: { left: undefined, right: 10 },
  live: { backgroundColor: colors.yellow, paddingHorizontal: 8, paddingVertical: 5 },
  pitch: { height: 168, flexDirection: 'row', overflow: 'hidden', position: 'relative' },
  half: { flex: 1, justifyContent: 'flex-end', padding: 10, overflow: 'hidden' },
  ghost: { position: 'absolute', top: 8, left: 4, fontSize: 54, color: 'rgba(255,255,255,0.18)', fontStyle: 'italic' },
  cut: { width: 18, backgroundColor: colors.yellow, transform: [{ skewX: '-14deg' }], marginHorizontal: -6 },
  nameTag: { backgroundColor: '#fff', alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 4 },
  nameRight: { alignSelf: 'flex-end' },
  vs: { position: 'absolute', left: 0, right: 0, top: 36, alignItems: 'center' },
  vsText: {
    fontSize: 54,
    fontStyle: 'italic',
    color: colors.yellow,
    textShadowColor: '#000',
    textShadowOffset: { width: 3, height: 3 },
    textShadowRadius: 0,
  },
  board: { flexDirection: 'row', minHeight: 92, backgroundColor: '#fff' },
  boardSide: { width: 74, alignItems: 'center', justifyContent: 'center', gap: 2 },
  boardScore: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff' },
  boardNum: { fontSize: 42, color: colors.ink, fontStyle: 'italic' },
  steppers: { flexDirection: 'row', gap: 28 },
  mini: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  block: { gap: 12 },
  choices: { flexDirection: 'row', gap: 8 },
  choiceHit: { flex: 1 },
  review: {
    backgroundColor: 'rgba(19,26,42,0.9)',
    borderLeftWidth: 4,
    borderLeftColor: colors.yellow,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    padding: 12,
    gap: 10,
  },
  reviewHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  vote: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  voteTag: { width: 36, height: 36, backgroundColor: colors.blue, alignItems: 'center', justifyContent: 'center' },
  voteState: { paddingHorizontal: 8, paddingVertical: 4 },
  flex: { flex: 1 },
  plain: { textTransform: 'none', letterSpacing: 0 },
});
