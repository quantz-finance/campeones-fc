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
import { Picker } from '../../../ui/picker';
import { friendItem } from '../../../ui/pick-items';
import { useRecentPicks } from '../../../ui/recent-picks';
import { mostFrequent, quickIds } from '../../../domain/search';
import { defaultLogo } from '../../../content/crests';
import { LogoPicker } from '../../../ui/logo-picker';
import { AccessFields } from '../../../ui/access-fields';
import type { JoinPolicy, Visibility } from '../../../data/types';

export default function NewGroup() {
  const { repo, userId, version } = useApp();
  const friends = useQuery(() => repo.friendsSnapshot(userId!), [repo, userId, version]);
  const [name, setName] = useState('');
  const [selected, setSelected] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  // Escudo inicial al azar (el usuario lo cambia en la cuadrícula).
  const [logo, setLogo] = useState(() => defaultLogo('groups', String(Math.random())));
  const [visibility, setVisibility] = useState<Visibility>('private');
  const [joinPolicy, setJoinPolicy] = useState<JoinPolicy>('invite');

  const recentRivals = useRecentPicks('rivals');
  const missing = name.trim().length < 3 ? 'Ponle un nombre de al menos 3 letras.' : null;

  const createButton = (
    <Button
      label={busy ? 'Creando…' : 'Crear grupo'}
      pending={busy}
      disabled={busy || Boolean(missing)}
      onPress={() => {
        setBusy(true);
        setError(null);
        void repo
          .createGroup(userId!, name, selected, logo, { visibility, joinPolicy })
          .then((group) => {
            track('group_created');
            replace(`/grupo/${group.id}`);
          })
          .catch((cause: unknown) => setError(humanError(cause)))
          .finally(() => setBusy(false));
      }}
    />
  );

  return (
    <Screen
      action={
        <>
          {missing ? (
            <T color={colors.muted} style={styles.hint} numberOfLines={1}>
              {missing}
            </T>
          ) : null}
          {createButton}
        </>
      }
    >
      <Top title="Nuevo grupo" kicker="Junta" back />
      <Field label="Nombre" value={name} onChangeText={setName} placeholder="La junta del viernes" autoCapitalize="sentences" maxLength={rules.maxGroupName} />
      <Panel>
        <AccessFields visibility={visibility} joinPolicy={joinPolicy} onVisibility={setVisibility} onPolicy={setJoinPolicy} kind="group" />
      </Panel>
      <Panel>
        <LogoPicker kind="groups" value={logo} onChange={setLogo} photo={{ mode: 'create' }} />
      </Panel>
      <Gate query={friends}>
        {(data) => {
          const ids = new Set(data.friends.map((f) => f.profile.id));
          const frequent = mostFrequent(data.friends, (f) => f.record.played, 8).map((f) => f.profile.id);
          return (
            <Panel>
              <View style={styles.head}>
                <T variant="strong" style={styles.flex}>
                  ¿Quién entra? (opcional)
                </T>
                {selected.length ? (
                  <T variant="tiny" color={colors.accentText}>
                    {selected.length === 1 ? '1 elegido' : `${selected.length} elegidos`}
                  </T>
                ) : null}
              </View>
              {data.friends.length === 0 ? (
                <>
                  <T color={colors.muted}>Puedes crear el grupo solo y sumar amigos después.</T>
                  <Button label="Ir a amigos" tone="ghost" onPress={() => push('/amigos')} />
                </>
              ) : (
                <Picker
                  multi
                  items={data.friends.map(friendItem)}
                  selected={selected}
                  onChange={setSelected}
                  quick={quickIds(recentRivals, frequent, (id) => ids.has(id))}
                  quickLabel="Frecuentes"
                  noMatchHint="Solo entran tus amigos. Si no está, invítalo desde Amigos."
                />
              )}
            </Panel>
          );
        }}
      </Gate>
      {error ? <Banner tone="danger" title="No se creó" body={error} /> : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  flex: { flex: 1 },
  hint: { fontSize: 14, lineHeight: 18, textAlign: 'center' },
});
