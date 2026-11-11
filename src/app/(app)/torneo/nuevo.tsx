import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { track } from '../../../lib/analytics';
import { useApp } from '../../../state/app-provider';
import { useQuery } from '../../../state/use-query';
import { Banner, Button, Chip, Field, Gate } from '../../../ui/controls';
import { Panel, Screen, Top } from '../../../ui/screen';
import { colors, space } from '../../../ui/theme';
import { T } from '../../../ui/text';
import { replace } from '../../../ui/nav';
import { rules } from '../../../domain/rules';
import { humanError } from '../../../ui/errors';
import { PersonPick } from '../../../ui/person-pick';
import { SearchEmpty, SearchField } from '../../../ui/search-field';
import { filterPeople, SEARCH_MIN_ITEMS } from '../../../domain/search';
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

  const [search, setSearch] = useState('');

  function toggle(id: string) {
    setSelected((current) => (current.includes(id) ? current.filter((item) => item !== id) : [...current, id]));
  }

  const elimOk = format === 'round_robin' || [4, 8, 16].includes(selected.length);
  const robinOk = format === 'single_elim' || (selected.length >= 3 && selected.length <= 16);

  return (
    <Screen>
      <Top title="Nuevo torneo" kicker="Llaves" back icon="tournaments" />
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
          const shown = filterPeople(group.members, search, (m) => m);
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
              {group.members.length >= SEARCH_MIN_ITEMS ? <SearchField value={search} onChange={setSearch} placeholder="Busca por nombre o @usuario" /> : null}
              {shown.map((member) => {
                const on = selected.includes(member.id);
                return (
                  <PersonPick
                    key={member.id}
                    profile={member}
                    on={on}
                    order={format === 'single_elim' && on ? selected.indexOf(member.id) + 1 : undefined}
                    onPress={() => toggle(member.id)}
                  />
                );
              })}
              {search && shown.length === 0 ? <SearchEmpty query={search} hint="Solo pueden jugar los miembros de este grupo." /> : null}
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
      {selected.length === 0 ? (
        <T color={colors.muted}>Marca a los jugadores que entran.</T>
      ) : !elimOk || !robinOk ? (
        <Banner
          title="Revisa el cupo"
          body={format === 'single_elim' ? `Llevas ${selected.length}. Tienen que ser 4, 8 o 16.` : `Llevas ${selected.length}. La liga pide de 3 a 16.`}
        />
      ) : null}
      {error ? <Banner tone="danger" title="No se creó el torneo" body={error} /> : null}
      {name.trim().length < 3 ? <T color={colors.muted}>Ponle un nombre de al menos 3 letras.</T> : null}
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
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: space.sm },
  head: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  flex: { flex: 1, minWidth: 0 },
  all: { alignSelf: 'flex-start', minHeight: 32, justifyContent: 'center' },
});
