import { Link, router, type Href } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';
import { useApp } from '../../../state/app-provider';
import { useQuery } from '../../../state/use-query';
import { Button, Empty, Gate } from '../../../ui/controls';
import { Panel, Screen, Top } from '../../../ui/screen';
import { colors, space } from '../../../ui/theme';
import { T } from '../../../ui/text';

export default function Groups() {
  const { repo, userId, version } = useApp();
  const query = useQuery(() => repo.groupsSnapshot(userId!), [repo, userId, version]);

  return (
    <Screen>
      <Top
        title="Grupos"
        kicker="La junta"
        right={<Button label="Crear" onPress={() => router.push('/grupo/nuevo')} />}
      />
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
              <Link key={item.group.id} href={`/grupo/${item.group.id}` as Href} asChild>
              <Pressable>
                <Panel>
                  <T variant="title">{item.group.name}</T>
                  <View style={styles.meta}>
                    <T color={colors.muted}>{item.memberCount} jugadores</T>
                    <T color={colors.muted}>{item.yourPlace ? `Vas ${item.yourPlace}º` : 'Aún fuera del ranking'}</T>
                  </View>
                  <T variant="strong" color={colors.gold}>
                    {item.leader ? `Manda ${item.leader.displayName}` : 'Nadie manda todavía'}
                  </T>
                </Panel>
              </Pressable>
              </Link>
            ))
          )
        }
      </Gate>
    </Screen>
  );
}

const styles = StyleSheet.create({
  meta: { flexDirection: 'row', justifyContent: 'space-between', gap: space.md },
});
