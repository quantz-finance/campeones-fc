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

export default function NewTournament() {
  const { grupo } = useLocalSearchParams<{ grupo: string }>();
  const { repo, userId, version } = useApp();
  const query = useQuery(() => repo.groupSnapshot(String(grupo), userId!), [repo, userId, version, grupo]);
  const [name, setName] = useState('');
  const [format, setFormat] = useState<'single_elim' | 'round_robin'>('single_elim');
  const [selected, setSelected] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [logo, setLogo] = useState(() => defaultLogo('tournaments', String(Math.random())));


  const elimOk = format === 'round_robin' || [4, 8, 16].includes(selected.length);
  const robinOk = format === 'single_elim' || (selected.length >= 3 && selected.length <= 16);

  return (
    <Screen
      action={
        <>
          <T color={colors.muted} style={styles.hint} numberOfLines={1}>
            {name.trim().length < 3
              ? 'Ponle un nombre de al menos 3 letras.'
              : selected.length === 0
                ? 'Marca a los jugadores que entran.'
                : !elimOk
                  ? `Llevas ${selected.length}. Tienen que ser 4, 8 o 16.`
                  : !robinOk
                    ? `Llevas ${selected.length}. La liga pide de 3 a 16.`
                    : `${selected.length} jugadores · listo para crear`}
          </T>
          <Button
            label={busy ? 'Creando…' : 'Crear torneo'}
            pending={busy}
            disabled={busy || name.trim().length < 3 || !elimOk || !robinOk}
            onPress={() => {
              setBusy(true);
              setError(null);
              void repo
                .createTournament({
                  me: userId!,
                  groupId: String(grupo),
                  name,
                  format,
                  playerIds: selected,
                  logo,
                })
                .then((tournament) => {
                  track('tournament_created', { format });
                  replace(`/torneo/${tournament.id}`);
                })
                .catch((cause: unknown) => setError(humanError(cause)))
                .finally(() => setBusy(false));
            }}
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
      <T color={colors.muted}>
        {format === 'single_elim'
          ? 'Elige 4, 8 o 16 jugadores. El orden en que los marcas es el orden del cuadro.'
          : 'Todos contra todos. Gana quien sume más puntos. Si hay empate arriba, no hay campeón único.'}
      </T>
      <Panel>
        <LogoPicker kind="tournaments" value={logo} onChange={setLogo} photo={{ mode: 'create' }} />
      </Panel>
      <Gate query={query}>
        {(group) => {
          return (
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
          );
        }}
      </Gate>
      {error ? <Banner tone="danger" title="No se creó el torneo" body={error} /> : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: layout.button },
  head: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  flex: { flex: 1, minWidth: 0 },
  hint: { fontSize: 14, lineHeight: 18, textAlign: 'center' },
  all: { alignSelf: 'flex-start', minHeight: 32, justifyContent: 'center' },
});
