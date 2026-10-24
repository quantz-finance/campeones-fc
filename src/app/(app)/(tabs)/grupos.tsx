import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';
import { useApp } from '../../../state/app-provider';
import { useQuery } from '../../../state/use-query';
import { Shield } from '../../../ui/broadcast';
import { Button, Empty, Gate } from '../../../ui/controls';
import { monogram } from '../../../ui/format';
import { Screen, Top } from '../../../ui/screen';
import { colors } from '../../../ui/theme';
import { T } from '../../../ui/text';

export default function Groups() {
  const { repo, userId, version } = useApp();
  const query = useQuery(() => repo.groupsSnapshot(userId!), [repo, userId, version]);

  return (
    <Screen tab>
      <Top title="Grupos" kicker="La junta" right={<Button label="Crear" onPress={() => router.push('/grupo/nuevo')} />} />
      <Gate query={query}>
        {(groups) =>
          groups.length === 0 ? (
            <Empty
              title="Arma tu junta"
              body="Un grupo tiene tabla, ranking y torneos. Solo entran tus amigos."
              action={<Button label="Crear grupo" onPress={() => router.push('/grupo/nuevo')} />}
            />
          ) : (
            groups.map((item) => (
              <Pressable key={item.group.id} style={styles.card} onPress={() => router.push(`/grupo/${item.group.id}`)}>
                <Shield letters={monogram(item.group.name)} />
                <View style={styles.flex}>
                  <T variant="title" style={{ fontStyle: 'italic' }} numberOfLines={1}>
                    {item.group.name}
                  </T>
                  <T variant="tiny" color={colors.muted}>
                    {item.memberCount} jugadores · {item.yourPlace ? `vas ${item.yourPlace}º` : 'aún fuera del ranking'}
                  </T>
                  <T variant="strong" color={colors.yellow}>
                    {item.leader ? `Manda ${item.leader.displayName}` : 'Nadie manda todavía'}
                  </T>
                </View>
              </Pressable>
            ))
          )
        }
      </Gate>
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
    padding: 12,
    backgroundColor: 'rgba(16,22,64,0.88)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  flex: { flex: 1, gap: 4 },
});
