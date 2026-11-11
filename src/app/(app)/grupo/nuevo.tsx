import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { track } from '../../../lib/analytics';
import { useApp } from '../../../state/app-provider';
import { useQuery } from '../../../state/use-query';
import { Banner, Button, Field, Gate } from '../../../ui/controls';
import { Panel, Screen, Top } from '../../../ui/screen';
import { colors, space } from '../../../ui/theme';
import { T } from '../../../ui/text';
import { push, replace } from '../../../ui/nav';
import { rules } from '../../../domain/rules';
import { humanError } from '../../../ui/errors';
import { PersonPick } from '../../../ui/person-pick';
import { SearchEmpty, SearchField } from '../../../ui/search-field';
import { filterPeople, SEARCH_MIN_ITEMS } from '../../../domain/search';
import { defaultLogo } from '../../../content/crests';
import { LogoPicker } from '../../../ui/logo-picker';

export default function NewGroup() {
  const { repo, userId, version } = useApp();
  const friends = useQuery(() => repo.friendsSnapshot(userId!), [repo, userId, version]);
  const [name, setName] = useState('');
  const [selected, setSelected] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  // Escudo inicial al azar (el usuario lo cambia en la cuadrícula).
  const [logo, setLogo] = useState(() => defaultLogo('groups', String(Math.random())));

  const [search, setSearch] = useState('');
  const missing =
    name.trim().length < 3
      ? 'Ponle un nombre de al menos 3 letras.'
      : selected.length < 1
        ? 'Elige al menos un amigo para el grupo.'
        : null;

  function toggle(id: string) {
    setSelected((current) => (current.includes(id) ? current.filter((item) => item !== id) : [...current, id]));
  }

  return (
    <Screen>
      <Top title="Nuevo grupo" kicker="Junta" back icon="friends" />
      <Field label="Nombre" value={name} onChangeText={setName} placeholder="La junta del viernes" autoCapitalize="sentences" maxLength={rules.maxGroupName} />
      <Panel>
        <LogoPicker kind="groups" value={logo} onChange={setLogo} photo={{ mode: 'create' }} />
      </Panel>
      <Gate query={friends}>
        {(data) => {
          const shown = filterPeople(data.friends, search, (f) => f.profile);
          return (
            <Panel>
              <View style={styles.head}>
                <T variant="strong" style={styles.flex}>
                  ¿Quién entra?
                </T>
                {selected.length ? (
                  <T variant="tiny" color={colors.accentText}>
                    {selected.length === 1 ? '1 elegido' : `${selected.length} elegidos`}
                  </T>
                ) : null}
              </View>
              {data.friends.length === 0 ? (
                <>
                  <T color={colors.muted}>Invita amigos antes de armar el grupo.</T>
                  <Button label="Ir a amigos" tone="ghost" onPress={() => push('/amigos')} />
                </>
              ) : (
                <>
                  {data.friends.length >= SEARCH_MIN_ITEMS ? <SearchField value={search} onChange={setSearch} placeholder="Busca por nombre o @usuario" /> : null}
                  {shown.map((friend) => (
                    <PersonPick key={friend.profile.id} profile={friend.profile} on={selected.includes(friend.profile.id)} onPress={() => toggle(friend.profile.id)} />
                  ))}
                  {search && shown.length === 0 ? <SearchEmpty query={search} hint="Solo entran tus amigos. Si no está, invítalo desde Amigos." /> : null}
                </>
              )}
            </Panel>
          );
        }}
      </Gate>
      {error ? <Banner tone="danger" title="No se creó" body={error} /> : null}
      {missing ? <T color={colors.muted}>{missing}</T> : null}
      <Button
        label={busy ? 'Creando…' : 'Crear grupo'}
        pending={busy}
        disabled={busy || Boolean(missing)}
        onPress={() => {
          setBusy(true);
          setError(null);
          void repo
            .createGroup(userId!, name, selected, logo)
            .then((group) => {
              track('group_created');
              replace(`/grupo/${group.id}`);
            })
            .catch((cause: unknown) => setError(humanError(cause)))
            .finally(() => setBusy(false));
        }}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  flex: { flex: 1 },
});
