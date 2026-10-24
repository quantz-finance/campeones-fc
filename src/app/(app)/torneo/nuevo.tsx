import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { track } from '../../../lib/analytics';
import { useApp } from '../../../state/app-provider';
import { useQuery } from '../../../state/use-query';
import { Banner, Button, Chip, Field, Gate } from '../../../ui/controls';
import { Panel, Screen, Top } from '../../../ui/screen';
import { colors, radius, space } from '../../../ui/theme';
import { T } from '../../../ui/text';

export default function NewTournament() {
  const { grupo } = useLocalSearchParams<{ grupo: string }>();
  const { repo, userId, version } = useApp();
  const query = useQuery(() => repo.groupSnapshot(String(grupo), userId!), [repo, userId, version, grupo]);
  const [name, setName] = useState('');
  const [format, setFormat] = useState<'single_elim' | 'round_robin'>('single_elim');
  const [selected, setSelected] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  function toggle(id: string) {
    setSelected((current) => (current.includes(id) ? current.filter((item) => item !== id) : [...current, id]));
  }

  const elimOk = format === 'round_robin' || [4, 8, 16].includes(selected.length);
  const robinOk = format === 'single_elim' || (selected.length >= 3 && selected.length <= 16);

  return (
    <Screen>
      <Top title="Nuevo torneo" kicker="Bracket" back />
      <Field label="Nombre" value={name} onChangeText={setName} placeholder="Copa relámpago" autoCapitalize="sentences" />
      <View style={styles.row}>
        <Chip label="Eliminación" active={format === 'single_elim'} onPress={() => setFormat('single_elim')} />
        <Chip label="Liga" active={format === 'round_robin'} onPress={() => setFormat('round_robin')} />
      </View>
      <T color={colors.muted}>
        {format === 'single_elim'
          ? 'Elige 4, 8 o 16 jugadores. El orden en que los marcas es el orden del cuadro.'
          : 'Todos contra todos. Gana quien sume más puntos. Si hay empate arriba, no hay campeón único.'}
      </T>
      <Gate query={query}>
        {(group) => (
            <Panel>
              <T variant="strong">{group.group.name}</T>
              {group.members.map((member) => {
                const on = selected.includes(member.id);
                return (
                  <Pressable key={member.id} onPress={() => toggle(member.id)} style={[styles.member, on && styles.on]}>
                    <T>{on ? `${selected.indexOf(member.id) + 1}. ` : ''}{member.displayName}</T>
                  </Pressable>
                );
              })}
            </Panel>
        )}
      </Gate>
      {!elimOk || !robinOk ? (
        <Banner
          title="Revisa el cupo"
          body={format === 'single_elim' ? `Llevas ${selected.length}. Tienen que ser 4, 8 o 16.` : `Llevas ${selected.length}. La liga pide de 3 a 16.`}
        />
      ) : null}
      {error ? <Banner tone="danger" title="No se creó el torneo" body={error} /> : null}
      <Button
        label={busy ? 'Creando…' : 'Crear torneo'}
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
            })
            .then((tournament) => {
              track('tournament_created', { format });
              router.replace(`/torneo/${tournament.id}`);
            })
            .catch((cause: unknown) => setError(cause instanceof Error ? cause.message : 'No se pudo crear.'))
            .finally(() => setBusy(false));
        }}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: space.sm },
  member: {
    padding: space.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.line,
  },
  on: { borderColor: colors.accent, backgroundColor: colors.bg },
});
