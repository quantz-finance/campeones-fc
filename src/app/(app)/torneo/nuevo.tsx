import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { track } from '../../../lib/analytics';
import { useApp } from '../../../state/app-provider';
import { useQuery } from '../../../state/use-query';
import { Banner, Button, Chip, Field, Gate } from '../../../ui/controls';
import { Panel, Screen, Top } from '../../../ui/screen';
import { colors, layout, space } from '../../../ui/theme';
import { T } from '../../../ui/text';
import { replace } from '../../../ui/nav';
import { rules } from '../../../domain/rules';
import { humanError } from '../../../ui/errors';
import { Picker } from '../../../ui/picker';
import { profileItem } from '../../../ui/pick-items';
import { defaultLogo } from '../../../content/crests';
import { LogoPicker } from '../../../ui/logo-picker';
import { AccessFields } from '../../../ui/access-fields';
import type { JoinPolicy, Visibility } from '../../../data/types';

function parseStarts(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const iso = Date.parse(trimmed.includes('T') ? trimmed : trimmed.replace(' ', 'T'));
  if (Number.isNaN(iso)) throw new Error('Pon la fecha como 2026-11-28 21:00.');
  return new Date(iso).toISOString();
}

export default function NewTournament() {
  const { grupo } = useLocalSearchParams<{ grupo?: string }>();
  const groupId = grupo ? String(grupo) : '';
  const { repo, userId, version } = useApp();
  const query = useQuery(
    () => (groupId ? repo.groupSnapshot(groupId, userId!) : Promise.resolve(null)),
    [repo, userId, version, groupId],
  );
  const [name, setName] = useState('');
  const [format, setFormat] = useState<'single_elim' | 'round_robin'>('single_elim');
  const [selected, setSelected] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [logo, setLogo] = useState(() => defaultLogo('tournaments', String(Math.random())));
  const [mode, setMode] = useState<'now' | 'registration'>(groupId ? 'now' : 'registration');
  const [visibility, setVisibility] = useState<Visibility>(groupId ? 'private' : 'public');
  const [joinPolicy, setJoinPolicy] = useState<JoinPolicy>(groupId ? 'invite' : 'open');
  const [maxPlayers, setMaxPlayers] = useState(8);
  const [startsAt, setStartsAt] = useState('');

  const elimOk = format === 'round_robin' || [4, 8, 16].includes(mode === 'now' ? selected.length : maxPlayers);
  const robinOk = format === 'single_elim' || (mode === 'now' ? selected.length >= 3 && selected.length <= 16 : maxPlayers >= 3 && maxPlayers <= 16);
  const ready = name.trim().length >= 3 && elimOk && robinOk && (mode === 'registration' || selected.length > 0);

  const hint =
    name.trim().length < 3
      ? 'Ponle un nombre de al menos 3 letras.'
      : mode === 'now' && selected.length === 0
        ? 'Marca a los jugadores que entran.'
        : !elimOk
          ? `Llevas ${mode === 'now' ? selected.length : maxPlayers}. Tienen que ser 4, 8 o 16.`
          : !robinOk
            ? `Llevas ${mode === 'now' ? selected.length : maxPlayers}. La liga pide de 3 a 16.`
            : mode === 'registration'
              ? `${maxPlayers} cupos · listo para abrir inscripciones`
              : `${selected.length} jugadores · listo para crear`;

  const create = () => {
    setBusy(true);
    setError(null);
    const go = async () => {
      if (mode === 'now') {
        if (!groupId) throw new Error('Para empezar ya, elige un grupo.');
        return repo.createTournament({ me: userId!, groupId, name, format, playerIds: selected, logo });
      }
      return repo.createRegistrationTournament({
        me: userId!,
        name,
        format,
        groupId: groupId || null,
        visibility: groupId ? visibility : 'public',
        joinPolicy,
        maxPlayers,
        startsAt: parseStarts(startsAt),
        logo,
      });
    };
    void go()
      .then((tournament) => {
        track('tournament_created', { format, mode });
        replace(`/torneo/${tournament.id}`);
      })
      .catch((cause: unknown) => setError(humanError(cause)))
      .finally(() => setBusy(false));
  };

  return (
    <Screen
      action={
        <>
          <T color={colors.muted} style={styles.hint} numberOfLines={1}>
            {hint}
          </T>
          <Button
            label={busy ? 'Creando…' : mode === 'registration' ? 'Abrir inscripciones' : 'Crear torneo'}
            pending={busy}
            disabled={busy || !ready}
            onPress={create}
          />
        </>
      }
    >
      <Top title="Nuevo torneo" kicker="Llaves" back />
      <Field label="Nombre" value={name} onChangeText={setName} placeholder="Copa relámpago" autoCapitalize="sentences" maxLength={rules.maxTournamentName} />
      <View style={styles.row}>
        <Chip label="Eliminación" active={format === 'single_elim'} onPress={() => setFormat('single_elim')} />
        <Chip label="Liga" active={format === 'round_robin'} onPress={() => setFormat('round_robin')} />
      </View>
      {groupId ? (
        <View style={styles.row}>
          <Chip label="Empezar ya" active={mode === 'now'} onPress={() => setMode('now')} />
          <Chip label="Abrir inscripciones" active={mode === 'registration'} onPress={() => setMode('registration')} />
        </View>
      ) : (
        <T color={colors.muted}>Este torneo queda público y arranca cuando el organizador cierra las inscripciones.</T>
      )}
      <T color={colors.muted}>
        {format === 'single_elim'
          ? mode === 'now'
            ? 'Elige 4, 8 o 16 jugadores. El orden en que los marcas es el orden del cuadro.'
            : 'La eliminación directa es de 4, 8 o 16 jugadores.'
          : mode === 'now'
            ? 'Todos contra todos. Gana quien sume más puntos. Si hay empate arriba, no hay campeón único.'
            : 'La liga necesita entre 3 y 16 jugadores.'}
      </T>
      {mode === 'registration' ? (
        <Panel>
          {groupId ? (
            <AccessFields visibility={visibility} joinPolicy={joinPolicy} onVisibility={setVisibility} onPolicy={setJoinPolicy} kind="tournament" />
          ) : (
            <>
              <T variant="tiny">Cómo se inscriben</T>
              <View style={styles.row}>
                <Chip label="Abierto" active={joinPolicy === 'open'} onPress={() => setJoinPolicy('open')} />
                <Chip label="Con invitación" active={joinPolicy === 'invite'} onPress={() => setJoinPolicy('invite')} />
              </View>
            </>
          )}
          <T variant="tiny">Cupos</T>
          <View style={styles.row}>
            {(format === 'single_elim' ? [4, 8, 16] : [4, 8, 12, 16]).map((n) => (
              <Chip key={n} label={String(n)} active={maxPlayers === n} onPress={() => setMaxPlayers(n)} />
            ))}
          </View>
          <Field label="Inicio (opcional)" value={startsAt} onChangeText={setStartsAt} placeholder="2026-11-28 21:00" autoCapitalize="none" />
        </Panel>
      ) : null}
      <Panel>
        <LogoPicker kind="tournaments" value={logo} onChange={setLogo} photo={{ mode: 'create' }} />
      </Panel>
      {mode === 'now' ? (
        <Gate query={query}>
          {(group) =>
            group ? (
              <Panel>
                <View style={styles.head}>
                  <T variant="strong" style={styles.flex} numberOfLines={1}>
                    {group.group.name}
                  </T>
                  <T variant="tiny" color={selected.length ? colors.accentText : colors.faint}>
                    {selected.length === 1 ? '1 elegido' : `${selected.length} elegidos`}
                  </T>
                </View>
                <Picker
                  multi
                  ordered={format === 'single_elim'}
                  items={group.members.map((m) => profileItem(m))}
                  selected={selected}
                  onChange={setSelected}
                  noMatchHint="Solo pueden jugar los miembros de este grupo."
                />
                {group.members.length > 1 && selected.length < group.members.length ? (
                  <Pressable onPress={() => setSelected(group.members.map((m) => m.id))} hitSlop={8} style={styles.all} accessibilityRole="button">
                    <T variant="label" color={colors.accentText}>
                      Elegir a todos
                    </T>
                  </Pressable>
                ) : selected.length > 0 ? (
                  <Pressable onPress={() => setSelected([])} hitSlop={8} style={styles.all} accessibilityRole="button">
                    <T variant="label" color={colors.accentText}>
                      Quitar a todos
                    </T>
                  </Pressable>
                ) : null}
              </Panel>
            ) : null
          }
        </Gate>
      ) : null}
      {error ? <Banner tone="danger" title="No se creó el torneo" body={error} /> : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: layout.button },
  head: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  flex: { flex: 1, minWidth: 0 },
  hint: { fontSize: 14, lineHeight: 18, textAlign: 'center' },
  all: { alignSelf: 'flex-start', minHeight: 32, justifyContent: 'center' },
});
