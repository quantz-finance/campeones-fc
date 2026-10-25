import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet } from 'react-native';
import { track } from '../../../lib/analytics';
import { useApp } from '../../../state/app-provider';
import { useQuery } from '../../../state/use-query';
import { Avatar } from '../../../ui/avatar';
import { Banner, Button, Field, Gate } from '../../../ui/controls';
import { Panel, Screen, Top } from '../../../ui/screen';
import { colors, radius, space } from '../../../ui/theme';
import { T } from '../../../ui/text';

export default function NewGroup() {
  const { repo, userId, version } = useApp();
  const friends = useQuery(() => repo.friendsSnapshot(userId!), [repo, userId, version]);
  const [name, setName] = useState('');
  const [selected, setSelected] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  function toggle(id: string) {
    setSelected((current) => (current.includes(id) ? current.filter((item) => item !== id) : [...current, id]));
  }

  return (
    <Screen>
      <Top title="Nuevo grupo" kicker="Junta" back />
      <Field label="Nombre" value={name} onChangeText={setName} placeholder="La junta del viernes" autoCapitalize="sentences" />
      <Gate query={friends}>
        {(data) => (
          <Panel>
            <T variant="strong">¿Quién entra?</T>
            {data.friends.length === 0 ? (
              <T color={colors.muted}>Invita amigos antes de armar el grupo.</T>
            ) : (
              data.friends.map((friend) => {
                const on = selected.includes(friend.profile.id);
                return (
                  <Pressable key={friend.profile.id} style={[styles.row, on && styles.on]} onPress={() => toggle(friend.profile.id)}>
                    <Avatar avatarKey={friend.profile.avatarKey} photoUrl={friend.profile.photoUrl} size={36} />
                    <T variant="medium">{friend.profile.displayName}</T>
                  </Pressable>
                );
              })
            )}
          </Panel>
        )}
      </Gate>
      {error ? <Banner tone="danger" title="No se creó" body={error} /> : null}
      <Button
        label={busy ? 'Creando…' : 'Crear grupo'}
        disabled={busy || name.trim().length < 3 || selected.length < 1}
        onPress={() => {
          setBusy(true);
          setError(null);
          void repo
            .createGroup(userId!, name, selected)
            .then((group) => {
              track('group_created');
              router.replace(`/grupo/${group.id}`);
            })
            .catch((cause: unknown) => setError(cause instanceof Error ? cause.message : 'No se pudo crear.'))
            .finally(() => setBusy(false));
        }}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    padding: space.sm,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  on: { borderColor: colors.accent, backgroundColor: colors.bg },
});
