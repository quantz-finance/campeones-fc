// Marcador del partido · «Retrato a sangre» (propuesta 2 de Stan, elegida por Rolando), alcance (a).
// Rediseño de /partido/:id: las dos fotos a sangre con la diagonal dorada, los goles gigantes sobre cada
// foto y los − / + grandes debajo. El rival y el contexto llegan fijados (se eligieron al proponer o en
// el cuadro del torneo); el flujo de dos pasos sigue igual: proponer → aceptar → registrar → confirmar.
// Estados: propuesta, esperando, registrar (con o sin marcador, empate o eliminación), enviado,
// «Te toca confirmar», disputa, cerrado, expirado/cancelado. Tú en verde, el rival en oro.
// Solo Animated de React Native (transform/opacity).
import { useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Animated, Easing, Platform, Pressable, ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { track } from '../../../lib/analytics';
import type { MatchSnapshot } from '../../../data/snapshots';
import type { ReportDraft } from '../../../domain/types';
import { useApp } from '../../../state/app-provider';
import { useQuery } from '../../../state/use-query';
import { Backdrop } from '../../../ui/broadcast';
import { ChainCard } from '../../../ui/chain-card';
import { Gate } from '../../../ui/controls';
import { humanError } from '../../../ui/errors';
import { firstName } from '../../../ui/format';
import { Icon } from '../../../ui/icon';
import { useReducedMotion } from '../../../ui/motion';
import { push, replace } from '../../../ui/nav';
import { RetratoHeader, SplitPortraits, Thumb } from '../../../ui/retrato';
import { Scene } from '../../../ui/scene';
import { DetailSkeleton } from '../../../ui/skeleton';
import { T } from '../../../ui/text';
import { font } from '../../../ui/theme';
import { VERSUS } from '../../../ui/versus-data';
import {
  clampGoals,
  marcadorState,
  matchContext,
  mineFirst,
  repeatDelay,
  resultLine,
  voteText,
  type ContextKind,
  type MarcadorState,
  type Pick3,
} from '../../../ui/marcador-data';

const C = { ...VERSUS, alert: '#FF8FB1', soft: '#E4D4EE' };
/** Medidas del mockup (390 pt de ancho, barra de estado de 47 pt). */
const HERO = 410;
const native = Platform.OS !== 'web';

export default function MatchScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { repo, userId, version } = useApp();
  const query = useQuery(() => repo.matchSnapshot(String(id), userId!), [repo, userId, version, id], `match:${userId}:${id}`);
  const insets = useSafeAreaInsets();
  return (
    <View style={styles.root}>
      <Backdrop />
      <Gate query={query} skeleton={<View style={{ paddingTop: insets.top + 60, paddingHorizontal: 16 }}><DetailSkeleton /></View>}>
        {(snap) => <Marcador snap={snap} />}
      </Gate>
    </View>
  );
}

function Marcador({ snap }: { snap: MatchSnapshot }) {
  const { repo, userId, mode } = useApp();
  const insets = useSafeAreaInsets();
  const { width, height: windowH } = useWindowDimensions();
  const W = Math.min(width, 560);
  const k = W / 390;
  const extra = Math.max(0, insets.top - 47);
  const heroH = HERO + extra;
  // Las fotos cuadradas terminan antes que el héroe: el degradado llega al fondo justo donde acaban.
  const fadeTo = Math.min(1, (6 + extra + 300 * k + 8) / heroH / 0.97);

  const [choice, setChoice] = useState<Pick3>('me');
  const [withGoals, setWithGoals] = useState(true);
  const [mine, setMine] = useState(1);
  const [theirs, setTheirs] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState(false);

  // Si ya hay un voto (tuyo o del rival), arrancar con él: confirmar es un toque y no se crea una disputa por error.
  const prefilled = useRef<string | null>(null);
  useEffect(() => {
    const report = snap.yourReport ?? snap.opponentReport;
    if (snap.youAre === 'other' || !report) return;
    const key = `${snap.match.id}:${report.updatedAt}`;
    if (prefilled.current === key) return;
    prefilled.current = key;
    const meId = snap.youAre === 'a' ? snap.match.playerAId : snap.match.playerBId;
    setChoice(report.isDraw ? 'draw' : report.winnerId === meId ? 'me' : 'them');
    const goals = mineFirst(report, snap.youAre);
    setWithGoals(!!goals);
    if (goals) {
      setMine(goals.mine);
      setTheirs(goals.theirs);
    }
  }, [snap]);

  const viewer = snap.youAre === 'other';
  const meId = snap.youAre === 'b' ? snap.match.playerBId : snap.match.playerAId;
  const themId = snap.youAre === 'b' ? snap.match.playerAId : snap.match.playerBId;
  const you = snap.people[meId] ?? { displayName: 'Tú', photoUrl: null };
  const them = snap.people[themId] ?? { displayName: 'Rival', photoUrl: null };
  const youName = firstName(you.displayName);
  const themName = firstName(them.displayName);
  const ctx = matchContext(snap);
  const state: MarcadorState = marcadorState(snap, editing);
  const votes = [snap.yourReport, snap.opponentReport].filter(Boolean).length;

  // Con marcador, el ganador sale de los goles (el servidor rechaza un ganador que no cuadre con el marcador).
  const shown: Pick3 = withGoals ? (mine > theirs ? 'me' : mine < theirs ? 'them' : 'draw') : choice;
  const tieBlocked = shown === 'draw' && !snap.allowDraw;
  const draft = useMemo<ReportDraft | null>(() => {
    if (viewer) return null;
    const isDraw = shown === 'draw';
    const winnerId = isDraw ? null : shown === 'me' ? meId : themId;
    if (!withGoals) return { isDraw, winnerId, goalsA: null, goalsB: null };
    return { isDraw, winnerId, goalsA: snap.youAre === 'a' ? mine : theirs, goalsB: snap.youAre === 'a' ? theirs : mine };
  }, [viewer, shown, meId, themId, withGoals, snap.youAre, mine, theirs]);

  const theirDraft: ReportDraft | null = snap.opponentReport
    ? { isDraw: snap.opponentReport.isDraw, winnerId: snap.opponentReport.winnerId, goalsA: snap.opponentReport.goalsA, goalsB: snap.opponentReport.goalsB }
    : null;

  async function run(task: () => Promise<void>) {
    setBusy(true);
    setError(null);
    try {
      await task();
    } catch (cause) {
      setError(humanError(cause));
    } finally {
      setBusy(false);
    }
  }
  const submit = (next: ReportDraft) =>
    void run(async () => {
      await repo.submitReport(snap.match.id, userId!, next);
      track('report_submitted');
      setEditing(false);
    });

  function pickWinner(next: Pick3) {
    setChoice(next);
  }
  function toggleGoals() {
    if (withGoals) {
      // Sin marcador: el ganador que mostraban los goles queda elegido.
      setChoice(snap.allowDraw || shown !== 'draw' ? shown : 'me');
      setWithGoals(false);
      return;
    }
    // Con goles: dejarlos coherentes con el ganador elegido.
    if (choice === 'draw') setTheirs(mine);
    if (choice === 'me' && mine <= theirs) {
      if (theirs < 30) setMine(theirs + 1);
      else setTheirs(29);
    }
    if (choice === 'them' && theirs <= mine) {
      if (mine < 30) setTheirs(mine + 1);
      else setMine(29);
    }
    setWithGoals(true);
  }

  const goals = withGoals ? { mine, theirs } : null;
  const caption = `${youName} · ${ctx.kind === 'amistoso' ? 'Amistoso' : ctx.name} · ${themName}`;
  const voteLine = (vote: ReportDraft | null) => (vote ? voteText(vote, snap.youAre, meId, them.displayName) : null);
  const home = () => replace('/inicio');
  const errorView = error ? <Note tone="alert" title="No se guardó" body={error} /> : null;

  let header: { kicker: string; title: string; kickerColor?: string; pill?: { text: string; bg: string; ink: string } };
  let content: ReactNode;

  if (state === 'registrar') {
    const disputed = snap.match.status === 'disputed';
    header = {
      kicker: disputed ? 'En disputa · corrige tu voto' : ctx.kicker,
      kickerColor: disputed ? C.alert : C.you,
      title: disputed ? 'Corrige tu voto' : 'Marcador',
      pill: { text: `Voto ${votes}/2`, bg: C.them, ink: C.themInk },
    };
    const cta = snap.yourReport ? 'Actualizar mi resultado' : snap.opponentReport ? 'Enviar mi versión' : 'Registrar resultado';
    content = (
      <>
        <View style={{ width: W, height: heroH, alignSelf: 'center' }}>
          <SplitPortraits you={you} them={them} W={W} k={k} heroH={heroH} extra={extra} id="mar" fadeTo={fadeTo} />
          <SideColumn side="you" top={214 + extra} name={youName} tag="Tú">
            {withGoals ? (
              <Goals side="you" value={mine} onStep={(d) => setMine((v) => clampGoals(v + d))} />
            ) : (
              <WinnerPick side="you" active={shown === 'me'} label="Ganaste" onPress={() => pickWinner('me')} />
            )}
          </SideColumn>
          <SideColumn side="them" top={214 + extra} name={themName} tag="Rival">
            {withGoals ? (
              <Goals side="them" value={theirs} onStep={(d) => setTheirs((v) => clampGoals(v + d))} />
            ) : (
              <WinnerPick side="them" active={shown === 'them'} label={`Ganó ${themName}`} onPress={() => pickWinner('them')} />
            )}
          </SideColumn>
        </View>
        <View style={[styles.body, { marginTop: 12 }]}>
          <View style={styles.resultRow}>
            <ResultLine blocked={tieBlocked} draw={shown === 'draw'} text={tieBlocked ? 'En eliminación no hay empate' : resultLine(shown, you.displayName, them.displayName, goals)} />
            <Pressable onPress={toggleGoals} hitSlop={10} accessibilityRole="button">
              <T variant="strong" style={styles.link}>
                {withGoals ? 'Sin marcador' : 'Anotar goles'}
              </T>
            </Pressable>
          </View>
          {tieBlocked ? (
            <T style={styles.hint}>Es eliminación directa: ajusta el marcador para que gane uno.</T>
          ) : null}
          {!withGoals ? (
            snap.allowDraw ? (
              <Pressable onPress={() => pickWinner('draw')} accessibilityRole="button" accessibilityState={{ selected: shown === 'draw' }}>
                <View style={[styles.drawPick, shown === 'draw' && styles.drawPickOn]}>
                  <Icon name="empate" size={16} color={shown === 'draw' ? '#FFFFFF' : C.muted} />
                  <T variant="strong" style={[styles.drawText, shown === 'draw' && { color: '#FFFFFF' }]}>
                    Fue empate
                  </T>
                </View>
              </Pressable>
            ) : (
              <T style={styles.hint}>Eliminación directa: no hay empate, elige quién ganó. Los goles son opcionales.</T>
            )
          ) : null}
          <Section label="Contra quién" right="Fijo en este partido" />
          <View style={styles.rivalRow}>
            <View style={styles.rivalChip}>
              <View>
                <Thumb side="them" profile={them} size={46} id="marRival" />
                <View style={styles.rivalCheck}>
                  <Icon name="check" size={12} color={C.themInk} />
                </View>
              </View>
              <T variant="strong" style={styles.rivalName} numberOfLines={1}>
                {themName}
              </T>
            </View>
            <T style={styles.rivalNote}>El rival y para qué cuenta se fijaron al proponer el partido.</T>
          </View>
          <Section label="Cuenta para" />
          <ContextCards kind={ctx.kind} groupName={snap.groupName} />
          {errorView}
          <Cta
            label={busy ? 'Enviando…' : cta}
            icon="check"
            disabled={!draft || tieBlocked || busy}
            onPress={() => draft && submit(draft)}
          />
          {editing ? <Cta2 label="Volver sin cambiar" onPress={() => setEditing(false)} /> : null}
          <T style={styles.foot}>{`${themName} lo confirma. Si coinciden, el marcador se cierra y el Elo se mueve.`}</T>
        </View>
      </>
    );
  } else {
    // Pantallas de estado: badge + marcador grande al centro, votos, explicación y acciones.
    const reportGoals = (vote: ReportDraft | null) => (vote ? mineFirst(vote, snap.youAre === 'other' ? 'a' : snap.youAre) : null);
    const big = (vote: ReportDraft | null, fallback: string): { goals: { mine: number; theirs: number } | null; text: string } => {
      const g = reportGoals(vote);
      return { goals: g, text: g ? '' : vote ? voteText(vote, snap.youAre, meId, them.displayName) : fallback };
    };
    const yourVote: ReportDraft | null = snap.yourReport ?? null;
    let badge: { text: string; bg: string; ink: string };
    let score: { goals: { mine: number; theirs: number } | null; text: string; color?: string };
    let status: { text: string; color: string } | null = null;
    let info: string | null = null;
    let showVotes = true;
    let primary: { label: string; onPress: () => void } | null = null;
    let secondary: { label: string; onPress: () => void; tone?: 'alert' } | null = null;
    let extraBlock: ReactNode = null;
    let stack = false;
    const dimHero = state === 'expirado' || state === 'cancelado' || state === 'propuesta' || state === 'esperando';

    switch (state) {
      case 'propuesta':
        header = { kicker: `Propuesta · ${ctx.kicker}`, title: `${themName} quiere jugar`, kickerColor: C.them };
        badge = { text: 'Te propone un partido', bg: C.them, ink: C.themInk };
        score = { goals: null, text: 'VS', color: C.muted };
        status = { text: 'Pendiente · falta que aceptes', color: C.them };
        info = 'Acepta solo si de verdad están en ese partido, en la sala o en línea. Después cualquiera registra el resultado y el otro lo confirma.';
        showVotes = false;
        secondary = { label: 'Rechazar', tone: 'alert', onPress: () => void run(() => repo.declineMatch(snap.match.id, userId!).then(() => undefined)) };
        primary = {
          label: busy ? 'Aceptando…' : 'Aceptar partido',
          onPress: () =>
            void run(async () => {
              await repo.acceptMatch(snap.match.id, userId!);
              track('match_accepted');
            }),
        };
        break;
      case 'esperando':
        header = { kicker: `Propuesto · ${ctx.kicker}`, title: `Esperando a ${themName}`, kickerColor: C.them };
        badge = { text: 'Partido propuesto', bg: C.them, ink: C.themInk };
        score = { goals: null, text: 'VS', color: C.muted };
        status = { text: `Pendiente · falta que ${themName} acepte`, color: C.them };
        info = 'Si están juntos, ábrelo con su cuenta. Si no acepta antes de que venza, el partido expira y no suma.';
        showVotes = false;
        secondary = { label: 'Cancelar propuesta', onPress: () => void run(() => repo.declineMatch(snap.match.id, userId!).then(() => undefined)) };
        primary = { label: 'Volver al inicio', onPress: home };
        break;
      case 'enviado':
        header = { kicker: 'Pendiente de confirmar', title: 'Resultado enviado', pill: { text: `Voto ${votes}/2`, bg: C.you, ink: C.youInk } };
        badge = { text: 'Resultado enviado', bg: C.you, ink: C.youInk };
        score = big(yourVote, 'VS');
        status = { text: `Pendiente · falta que ${themName} confirme`, color: C.them };
        info = `No cuenta hasta que ${themName} diga lo mismo. Si coincide, el marcador se cierra y el Elo se mueve. Si no, queda en disputa hasta que uno corrija.`;
        secondary = { label: 'Corregir', onPress: () => setEditing(true) };
        primary = { label: 'Volver al inicio', onPress: home };
        break;
      case 'confirmar':
        header = { kicker: 'Pendiente de confirmar', title: 'Te toca confirmar', kickerColor: C.them, pill: { text: `Voto ${votes}/2`, bg: C.them, ink: C.themInk } };
        badge = { text: `${themName} registró`, bg: C.them, ink: C.themInk };
        score = big(theirDraft, 'VS');
        status = { text: 'Te toca · confirma o corrige', color: C.them };
        info = 'Si es correcto, confírmalo: el partido queda cerrado y el Elo se mueve. Si no, corrige y queda en disputa hasta que coincidan.';
        secondary = { label: 'No coincide, corregir', onPress: () => setEditing(true) };
        primary = { label: busy ? 'Confirmando…' : 'Confirmar resultado', onPress: () => theirDraft && submit(theirDraft) };
        break;
      case 'disputa':
        header = { kicker: 'No coinciden', title: 'En disputa', kickerColor: C.alert, pill: { text: `Voto ${votes}/2`, bg: C.draw, ink: '#FFFFFF' } };
        badge = { text: 'En disputa', bg: C.alert, ink: C.youInk };
        score = { goals: null, text: '≠', color: C.alert };
        status = { text: 'Nadie suma hasta que uno corrija', color: C.alert };
        info = `Tú dijiste ${voteLine(yourVote) ?? '—'} y ${themName} dice ${voteLine(theirDraft) ?? '—'}. Corrige tu voto o quédate con lo que dijo; cuando coincidan, el partido se cierra.`;
        secondary = { label: 'Corregir mi voto', onPress: () => setEditing(true) };
        primary = theirDraft ? { label: busy ? 'Confirmando…' : `Quedarme con lo de ${themName}`, onPress: () => submit(theirDraft) } : null;
        stack = true;
        break;
      case 'cerrado': {
        const final: ReportDraft = { isDraw: snap.match.isDraw, winnerId: snap.match.winnerId, goalsA: snap.match.goalsA, goalsB: snap.match.goalsB };
        header = { kicker: 'Resultado final', title: 'Partido cerrado', pill: { text: 'Voto 2/2', bg: C.you, ink: C.youInk } };
        badge = { text: 'Confirmado', bg: C.you, ink: C.youInk };
        score = big(final, 'VS');
        status = { text: snap.match.isDraw ? 'Empate · los dos coincidieron' : 'Los dos coincidieron · el Elo ya se movió', color: C.you };
        showVotes = !viewer && !!yourVote && !!theirDraft;
        primary = viewer ? null : { label: 'Ver el versus', onPress: () => push(`/versus/${themId}`) };
        secondary = { label: 'Volver al inicio', onPress: home };
        extraBlock = mode === 'supabase' ? <ChainCard match={snap.match} userId={userId!} canSign={!viewer} /> : null;
        break;
      }
      case 'expirado':
      case 'cancelado':
        header = { kicker: ctx.kicker, title: state === 'expirado' ? 'Partido vencido' : 'Partido cancelado', kickerColor: C.muted };
        badge = { text: state === 'expirado' ? 'Expiró' : 'Cancelado', bg: C.draw, ink: '#FFFFFF' };
        score = { goals: null, text: 'VS', color: C.muted };
        status = { text: 'No suma para nadie', color: C.muted };
        info = state === 'expirado' ? 'Nadie lo aceptó o lo cerró a tiempo. Propónganlo de nuevo cuando jueguen.' : 'Se rechazó o se canceló antes de jugarse.';
        showVotes = false;
        primary = { label: 'Volver al inicio', onPress: home };
        break;
      default:
        header = { kicker: ctx.kicker, title: 'Partido en juego' };
        badge = { text: 'En juego', bg: C.draw, ink: '#FFFFFF' };
        score = { goals: null, text: 'VS', color: C.muted };
        info = 'Solo los dos jugadores registran el resultado; cuando coincidan, aparece aquí.';
        showVotes = false;
        primary = { label: 'Volver al inicio', onPress: home };
    }

    if (snap.canReopen && snap.slotId) {
      extraBlock = (
        <>
          {extraBlock}
          <Cta2
            label={busy ? 'Proponiendo…' : 'Proponer el cruce de nuevo'}
            onPress={() =>
              void run(async () => {
                const next = await repo.reopenSlot(snap.slotId!, userId!);
                replace(`/partido/${next.id}`);
              })
            }
          />
        </>
      );
    }

    content = (
      <>
        <View style={{ width: W, height: heroH, alignSelf: 'center' }}>
          <SplitPortraits you={you} them={them} W={W} k={k} heroH={heroH} extra={extra} dim={dimHero} id="mar" fadeTo={fadeTo} />
          <BigScore top={260 + extra} badge={badge} score={score} caption={caption} />
        </View>
        <View style={styles.body}>
          {status ? (
            <View style={styles.status}>
              <View style={[styles.statusDot, { backgroundColor: status.color }]} />
              <T variant="label" style={[styles.statusText, { color: status.color }]} numberOfLines={2}>
                {status.text}
              </T>
            </View>
          ) : null}
          {showVotes ? (
            <View style={styles.votes}>
              <VoteCard side="you" profile={you} title={viewer ? youName : 'Tú'} line={yourVote ? `Votaste ${voteLine(yourVote)}` : 'Todavía no votas'} voted={!!yourVote} alert={state === 'disputa'} />
              <VoteCard side="them" profile={them} title={themName} line={theirDraft ? `Votó ${voteLine(theirDraft)}` : 'Todavía no vota'} voted={!!theirDraft} alert={state === 'disputa'} />
            </View>
          ) : null}
          {info ? (
            <View style={styles.info}>
              <T style={styles.infoText}>{info}</T>
            </View>
          ) : null}
          {errorView}
          {primary || secondary ? (
            stack ? (
              <View style={styles.ctaStack}>
                {primary ? <Cta label={primary.label} onPress={primary.onPress} disabled={busy} /> : null}
                {secondary ? <Cta2 label={secondary.label} onPress={secondary.onPress} tone={secondary.tone} disabled={busy} /> : null}
              </View>
            ) : (
              <View style={styles.ctaRow}>
                {secondary ? <Cta2 label={secondary.label} onPress={secondary.onPress} tone={secondary.tone} disabled={busy} flex /> : null}
                {primary ? <Cta label={primary.label} onPress={primary.onPress} disabled={busy} flex /> : null}
              </View>
            )
          ) : null}
          {extraBlock}
        </View>
      </>
    );
  }

  return (
    // Alto de la ventana: el Gate no da alto flexible a sus hijos.
    <View style={{ width, height: windowH, backgroundColor: C.plate }}>
      <ScrollView contentContainerStyle={{ paddingBottom: Math.max(insets.bottom, 16) + 24 }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <Scene>{content}</Scene>
      </ScrollView>
      <RetratoHeader
        top={insets.top}
        kicker={header.kicker}
        title={header.title}
        kickerColor={header.kickerColor}
        id="mar"
        right={
          header.pill ? (
            <View style={[styles.pill, { backgroundColor: header.pill.bg }]}>
              <T variant="strong" style={[styles.pillText, { color: header.pill.ink }]}>
                {header.pill.text}
              </T>
            </View>
          ) : undefined
        }
      />
    </View>
  );
}

function SideColumn({ side, top, name, tag, children }: { side: 'you' | 'them'; top: number; name: string; tag: string; children: ReactNode }) {
  const right = side === 'them';
  return (
    <View style={[styles.column, { top }, right ? { right: 18, alignItems: 'flex-end' } : { left: 18, alignItems: 'flex-start' }]}>
      <View style={right ? { alignItems: 'flex-end' } : undefined}>
        <T variant="display" style={[styles.colName, right && { textAlign: 'right' }]} numberOfLines={1}>
          {name}
        </T>
        <T variant="label" style={[styles.colTag, { color: side === 'you' ? C.you : C.them }]}>
          {tag}
        </T>
      </View>
      {children}
    </View>
  );
}

/** Goles gigantes + − / + de 64×56. El número nuevo entra con translateY −8 → 0 y opacidad. */
function Goals({ side, value, onStep }: { side: 'you' | 'them'; value: number; onStep: (delta: number) => void }) {
  const color = side === 'you' ? C.you : C.them;
  const reduced = useReducedMotion();
  const v = useRef(new Animated.Value(1)).current;
  const first = useRef(true);
  useEffect(() => {
    if (first.current || reduced) {
      first.current = false;
      return;
    }
    v.setValue(0);
    const anim = Animated.timing(v, { toValue: 1, duration: 160, easing: Easing.out(Easing.cubic), useNativeDriver: native });
    anim.start();
    return () => anim.stop();
  }, [value, v, reduced]);
  return (
    <>
      <Animated.View style={{ opacity: v, transform: [{ translateY: v.interpolate({ inputRange: [0, 1], outputRange: [-8, 0] }) }] }}>
        <T variant="display" style={[styles.goal, { color }]} accessibilityLabel={`${value} goles`}>
          {String(value)}
        </T>
      </Animated.View>
      <View style={styles.steps}>
        <StepButton side={side} kind="minus" disabled={value <= 0} onStep={() => onStep(-1)} />
        <StepButton side={side} kind="plus" disabled={value >= 30} onStep={() => onStep(1)} />
      </View>
    </>
  );
}

/** − con borde, + relleno con el color del lado. Mantener presionado repite y acelera; se presiona a .94. */
function StepButton({ side, kind, disabled, onStep }: { side: 'you' | 'them'; kind: 'minus' | 'plus'; disabled: boolean; onStep: () => void }) {
  const color = side === 'you' ? C.you : C.them;
  const ink = side === 'you' ? C.youInk : C.themInk;
  const scale = useRef(new Animated.Value(1)).current;
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const count = useRef(0);
  const latest = useRef(onStep);
  latest.current = onStep;
  const stop = () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
  };
  useEffect(() => stop, []);
  useEffect(() => {
    if (disabled) stop();
  }, [disabled]);
  const tick = () => {
    latest.current();
    count.current += 1;
    timer.current = setTimeout(tick, repeatDelay(count.current));
  };
  const press = (to: number) => Animated.spring(scale, { toValue: to, speed: 40, bounciness: 0, useNativeDriver: native }).start();
  const plus = kind === 'plus';
  return (
    <Pressable
      disabled={disabled}
      onPressIn={() => {
        press(0.94);
        latest.current();
        count.current = 0;
        stop();
        timer.current = setTimeout(tick, 420);
      }}
      onPressOut={() => {
        press(1);
        stop();
      }}
      accessibilityRole="button"
      accessibilityLabel={plus ? 'Subir' : 'Bajar'}
      accessibilityState={{ disabled }}
    >
      <Animated.View
        style={[
          styles.step,
          plus ? { backgroundColor: color } : { borderWidth: 1.5, borderColor: `${color}88`, backgroundColor: 'rgba(36,0,42,0.55)' },
          { opacity: disabled ? 0.4 : 1, transform: [{ scale }] },
        ]}
      >
        <Icon name={plus ? 'agregar' : 'menos'} size={24} color={plus ? ink : color} />
      </Animated.View>
    </Pressable>
  );
}

/** Sin marcador: un botón grande por lado para decir quién ganó. */
function WinnerPick({ side, active, label, onPress }: { side: 'you' | 'them'; active: boolean; label: string; onPress: () => void }) {
  const color = side === 'you' ? C.you : C.them;
  const ink = side === 'you' ? C.youInk : C.themInk;
  return (
    <>
      <T variant="display" style={[styles.goal, { color: active ? color : 'rgba(255,255,255,0.18)', fontSize: 64, lineHeight: 96 }]}>
        {active ? 'V' : '–'}
      </T>
      <Pressable onPress={onPress} accessibilityRole="button" accessibilityState={{ selected: active }}>
        <View style={[styles.win, active ? { backgroundColor: color } : { borderWidth: 1.5, borderColor: `${color}88`, backgroundColor: 'rgba(36,0,42,0.55)' }]}>
          <T variant="strong" style={[styles.winText, { color: active ? ink : color }]} numberOfLines={1}>
            {label}
          </T>
        </View>
      </Pressable>
    </>
  );
}

/** «RESULTADO Gana Usuario · 4 – 2»: cambia con un fundido. */
function ResultLine({ text, draw, blocked }: { text: string; draw: boolean; blocked: boolean }) {
  const reduced = useReducedMotion();
  const v = useRef(new Animated.Value(1)).current;
  const first = useRef(true);
  useEffect(() => {
    if (first.current || reduced) {
      first.current = false;
      return;
    }
    v.setValue(0.25);
    const anim = Animated.timing(v, { toValue: 1, duration: 180, useNativeDriver: native });
    anim.start();
    return () => anim.stop();
  }, [text, v, reduced]);
  const bg = blocked ? C.alert : draw ? C.draw : C.you;
  return (
    <Animated.View style={[styles.resultLeft, { opacity: v }]}>
      <View style={[styles.resultTag, { backgroundColor: bg }]}>
        <T variant="label" style={[styles.resultTagText, { color: draw && !blocked ? '#FFFFFF' : C.youInk }]}>
          {blocked ? 'Empate' : 'Resultado'}
        </T>
      </View>
      <T variant="display" style={[styles.resultText, blocked && { color: C.alert }]} numberOfLines={1}>
        {text}
      </T>
    </Animated.View>
  );
}

function Section({ label, right }: { label: string; right?: string }) {
  return (
    <View style={styles.section}>
      <T variant="label" style={styles.sectionText}>
        {label}
      </T>
      {right ? (
        <T variant="label" style={[styles.sectionText, { color: C.muted, letterSpacing: 0.6 }]}>
          {right}
        </T>
      ) : null}
    </View>
  );
}

/** «Cuenta para»: fijo. La opción vigente en verde; las otras apagadas. Torneo siempre «Desde su llave». */
function ContextCards({ kind, groupName }: { kind: ContextKind; groupName: string | null }) {
  const cards: { kind: ContextKind; label: string; body: string }[] = [
    { kind: 'amistoso', label: 'Amistoso', body: 'Solo entre ustedes dos' },
    { kind: 'grupo', label: 'Grupo', body: kind === 'grupo' && groupName ? groupName : 'Uno de tus grupos' },
    { kind: 'torneo', label: 'Torneo', body: 'Desde su llave' },
  ];
  return (
    <View style={styles.ctxRow} accessible accessibilityLabel={`Cuenta para: ${cards.find((c) => c.kind === kind)?.body ?? ''}`}>
      {cards.map((card) => {
        const on = card.kind === kind;
        return (
          <View key={card.kind} style={[styles.ctx, on ? styles.ctxOn : styles.ctxOff]}>
            <T variant="label" style={[styles.ctxLabel, { color: on ? C.youInk : C.draw }]} numberOfLines={1}>
              {card.label}
            </T>
            <T variant="strong" style={[styles.ctxBody, { color: on ? C.youInk : C.draw }]} numberOfLines={2}>
              {card.body}
            </T>
          </View>
        );
      })}
    </View>
  );
}

/** Badge + marcador grande al centro (verde · lila · oro). Entra con scale .9 → 1 y opacidad. */
function BigScore({
  top,
  badge,
  score,
  caption,
}: {
  top: number;
  badge: { text: string; bg: string; ink: string };
  score: { goals: { mine: number; theirs: number } | null; text: string; color?: string };
  caption: string;
}) {
  const reduced = useReducedMotion();
  const v = useRef(new Animated.Value(reduced ? 1 : 0)).current;
  useEffect(() => {
    if (reduced) return;
    const anim = Animated.timing(v, { toValue: 1, duration: 380, delay: 80, easing: Easing.out(Easing.cubic), useNativeDriver: native });
    anim.start();
    return () => anim.stop();
  }, [v, reduced]);
  const label = score.goals ? `${score.goals.mine} a ${score.goals.theirs}` : score.text;
  return (
    <Animated.View style={[styles.big, { top, opacity: v, transform: [{ scale: v.interpolate({ inputRange: [0, 1], outputRange: [0.9, 1] }) }] }]} accessible accessibilityLabel={`${badge.text}. ${label}. ${caption}`}>
      <View style={[styles.badge, { backgroundColor: badge.bg }]}>
        <T variant="label" style={[styles.badgeText, { color: badge.ink }]} numberOfLines={1}>
          {badge.text}
        </T>
      </View>
      {score.goals ? (
        <View style={styles.bigRow}>
          <T variant="display" style={[styles.bigNum, { color: C.you }]}>
            {String(score.goals.mine)}
          </T>
          <View style={styles.bigDot} />
          <T variant="display" style={[styles.bigNum, { color: C.them }]}>
            {String(score.goals.theirs)}
          </T>
        </View>
      ) : (
        <T variant="display" style={[styles.bigNum, styles.bigWord, { color: score.color ?? C.them }, score.text.length > 3 && { fontSize: 52, lineHeight: 104 }]} numberOfLines={1}>
          {score.text}
        </T>
      )}
      <T variant="label" style={styles.bigCaption} numberOfLines={1}>
        {caption}
      </T>
    </Animated.View>
  );
}

function VoteCard({ side, profile, title, line, voted, alert }: { side: 'you' | 'them'; profile: { displayName: string; photoUrl?: string | null }; title: string; line: string; voted: boolean; alert: boolean }) {
  const color = side === 'you' ? C.you : C.them;
  return (
    <View style={[styles.vote, voted ? { borderColor: alert ? `${C.alert}88` : `${color}66` } : { borderStyle: 'dashed', borderColor: `${color}88` }]}>
      <Thumb side={side} profile={profile} id={`marVote${side}`} />
      <View style={styles.voteText}>
        <T variant="display" style={styles.voteTitle} numberOfLines={1}>
          {title}
        </T>
        <T variant="strong" style={[styles.voteLine, { color }]} numberOfLines={1}>
          {line}
        </T>
      </View>
    </View>
  );
}

function Note({ tone, title, body }: { tone: 'alert'; title: string; body: string }) {
  return (
    <View style={[styles.info, tone === 'alert' && { borderColor: `${C.alert}88` }]}>
      <T variant="strong" style={[styles.noteTitle, { color: C.alert }]}>
        {title}
      </T>
      <T style={styles.infoText}>{body}</T>
    </View>
  );
}

function Cta({ label, onPress, disabled = false, icon, flex = false }: { label: string; onPress: () => void; disabled?: boolean; icon?: 'check'; flex?: boolean }) {
  return (
    <Pressable onPress={onPress} disabled={disabled} accessibilityRole="button" accessibilityState={{ disabled }} style={flex ? styles.flex : undefined}>
      {({ pressed }) => (
        <View style={[styles.cta, { opacity: disabled ? 0.45 : 1, transform: [{ scale: pressed ? 0.97 : 1 }] }]}>
          {icon ? <Icon name={icon} size={18} color={C.youInk} /> : null}
          <T variant="display" style={styles.ctaText} numberOfLines={1}>
            {label}
          </T>
        </View>
      )}
    </Pressable>
  );
}

function Cta2({ label, onPress, disabled = false, tone, flex = false }: { label: string; onPress: () => void; disabled?: boolean; tone?: 'alert'; flex?: boolean }) {
  return (
    <Pressable onPress={onPress} disabled={disabled} accessibilityRole="button" accessibilityState={{ disabled }} style={flex ? styles.flex : undefined}>
      {({ pressed }) => (
        <View style={[styles.cta2, tone === 'alert' && { borderColor: `${C.alert}88` }, { opacity: disabled ? 0.45 : 1, transform: [{ scale: pressed ? 0.97 : 1 }] }]}>
          <T variant="strong" style={[styles.cta2Text, tone === 'alert' && { color: C.alert }]} numberOfLines={1}>
            {label}
          </T>
        </View>
      )}
    </Pressable>
  );
}

const plain = { textTransform: 'none' as const, fontStyle: 'normal' as const };

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.plate },
  flex: { flex: 1 },
  pill: { paddingHorizontal: 9, paddingVertical: 6, borderRadius: 9 },
  pillText: { ...plain, fontFamily: font.display, fontSize: 11, lineHeight: 14 },
  column: { position: 'absolute', zIndex: 5, width: 150, gap: 6 },
  colName: { ...plain, fontSize: 17, lineHeight: 21, color: '#FFFFFF', maxWidth: 150 },
  colTag: { fontSize: 9, lineHeight: 12, letterSpacing: 1.3 },
  goal: {
    ...plain,
    fontSize: 96,
    lineHeight: 100,
    letterSpacing: -3,
    textShadowColor: 'rgba(0,0,0,0.7)',
    textShadowOffset: { width: 0, height: 6 },
    textShadowRadius: 26,
  },
  steps: { flexDirection: 'row', gap: 8 },
  step: { width: 64, height: 56, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  win: { width: 136, height: 56, borderRadius: 14, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 8 },
  winText: { ...plain, fontFamily: font.display, fontSize: 15, lineHeight: 19 },
  body: { paddingHorizontal: 16, marginTop: 12, gap: 11, width: '100%', maxWidth: 560, alignSelf: 'center' },
  resultRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  resultLeft: { flexDirection: 'row', alignItems: 'center', gap: 8, flexShrink: 1 },
  resultTag: { paddingHorizontal: 5, paddingVertical: 2, borderRadius: 4 },
  resultTagText: { fontSize: 8.5, lineHeight: 11, letterSpacing: 1 },
  resultText: { ...plain, fontSize: 14, lineHeight: 18, color: '#FFFFFF', flexShrink: 1 },
  link: { ...plain, fontSize: 12, lineHeight: 16, color: C.you },
  hint: { ...plain, fontSize: 12, lineHeight: 16, color: C.muted, marginTop: -4 },
  drawPick: { height: 44, borderRadius: 13, borderWidth: 1.5, borderColor: `${C.draw}AA`, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  drawPickOn: { backgroundColor: C.draw, borderColor: C.draw },
  drawText: { ...plain, fontSize: 14, lineHeight: 18, color: C.muted },
  section: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginTop: 2 },
  sectionText: { fontSize: 11, lineHeight: 14, letterSpacing: 1.4, color: C.muted },
  rivalRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  rivalChip: { alignItems: 'center', gap: 5, width: 58 },
  rivalCheck: { position: 'absolute', right: -5, top: -5, width: 20, height: 20, borderRadius: 6, backgroundColor: C.them, alignItems: 'center', justifyContent: 'center' },
  rivalName: { ...plain, fontSize: 11.5, lineHeight: 14, color: C.them, fontFamily: font.display },
  rivalNote: { ...plain, flex: 1, fontSize: 12, lineHeight: 16, color: C.muted },
  ctxRow: { flexDirection: 'row', gap: 6 },
  ctx: { flex: 1, minWidth: 0, borderRadius: 11, paddingVertical: 7, paddingHorizontal: 9 },
  ctxOn: { backgroundColor: C.you },
  ctxOff: { backgroundColor: 'rgba(255,255,255,0.03)', borderWidth: 1, borderStyle: 'dashed', borderColor: 'rgba(201,162,255,0.28)' },
  ctxLabel: { fontSize: 9, lineHeight: 12, letterSpacing: 1.2 },
  ctxBody: { ...plain, fontFamily: font.bold, fontSize: 11.5, lineHeight: 13.5, marginTop: 2 },
  cta: { height: 48, borderRadius: 13, backgroundColor: C.you, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingHorizontal: 12 },
  ctaText: { ...plain, fontSize: 15.5, lineHeight: 19, color: C.youInk, flexShrink: 1 },
  cta2: { height: 48, borderRadius: 13, borderWidth: 1, borderColor: 'rgba(201,162,255,0.4)', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 12 },
  cta2Text: { ...plain, fontFamily: font.bold, fontSize: 14, lineHeight: 18, color: '#FFFFFF', flexShrink: 1 },
  ctaRow: { flexDirection: 'row', gap: 8 },
  ctaStack: { gap: 8 },
  foot: { ...plain, fontSize: 11.5, lineHeight: 15, color: C.muted, textAlign: 'center', marginTop: -4 },
  big: { position: 'absolute', left: 0, right: 0, alignItems: 'center', zIndex: 5 },
  badge: { paddingHorizontal: 9, paddingVertical: 4, borderRadius: 6 },
  badgeText: { fontSize: 11, lineHeight: 14, letterSpacing: 1.2 },
  bigRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  bigNum: {
    ...plain,
    fontSize: 96,
    lineHeight: 104,
    letterSpacing: -3,
    textShadowColor: 'rgba(0,0,0,0.7)',
    textShadowOffset: { width: 0, height: 6 },
    textShadowRadius: 28,
  },
  bigWord: { marginTop: 4, letterSpacing: -1.5 },
  bigDot: { width: 18, height: 18, borderRadius: 9, backgroundColor: C.muted, marginHorizontal: 16 },
  bigCaption: { fontSize: 10, lineHeight: 13, letterSpacing: 1.3, color: '#FFFFFF', marginTop: 2, paddingHorizontal: 16 },
  status: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  statusDot: { width: 8, height: 8, borderRadius: 2 },
  statusText: { fontSize: 10.5, lineHeight: 14, letterSpacing: 1.3, flexShrink: 1, textAlign: 'center' },
  votes: { flexDirection: 'row', gap: 8 },
  vote: { flex: 1, minWidth: 0, backgroundColor: 'rgba(255,255,255,0.045)', borderWidth: 1, borderRadius: 16, padding: 10, flexDirection: 'row', alignItems: 'center', gap: 9 },
  voteText: { flex: 1, minWidth: 0 },
  voteTitle: { ...plain, fontSize: 13, lineHeight: 17, color: '#FFFFFF' },
  voteLine: { ...plain, fontFamily: font.bold, fontSize: 11, lineHeight: 14 },
  info: { backgroundColor: 'rgba(255,255,255,0.045)', borderWidth: 1, borderColor: 'rgba(201,162,255,0.2)', borderRadius: 16, paddingVertical: 12, paddingHorizontal: 14, gap: 4 },
  infoText: { ...plain, fontSize: 13, lineHeight: 18, color: C.soft },
  noteTitle: { ...plain, fontSize: 13, lineHeight: 17 },
});
