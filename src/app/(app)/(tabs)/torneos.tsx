import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '../../../state/app-provider';
import { useQuery } from '../../../state/use-query';
import { Button, Empty, Gate } from '../../../ui/controls';
import { Screen, Top } from '../../../ui/screen';
import { colors } from '../../../ui/theme';
import { T } from '../../../ui/text';

export default function TournamentsTab() {
  const { repo, userId, version } = useApp();
  const query = useQuery(async () => {
    const groups = await repo.groupsSnapshot(userId!);
    const details = await Promise.all(groups.map((group) => repo.groupSnapshot(group.group.id, userId!)));
    return details.flatMap((group) =>
      group.tournaments.map((tournament) => ({
        id: tournament.id,
        name: tournament.name,
        status: tournament.status,
        groupName: group.group.name,
        groupId: group.group.id,
      })),
    );
  }, [repo, userId, version]);

  return (
    <Screen tab>
      <Top title="Torneos" kicker="Cuadros y copas" />
      <Gate query={query}>
        {(list) =>
          list.length === 0 ? (
            <Empty
              title="Todavía no hay copas"
              body="Ármala dentro de un grupo: eliminación de 4, 8 o 16, o una liga de todos contra todos."
              action={<Button label="Ver grupos" onPress={() => router.push('/grupos')} />}
            />
          ) : (
            list.map((item) => (
              <Pressable key={item.id} style={styles.card} onPress={() => router.push(`/torneo/${item.id}`)} accessibilityRole="button">
                <View style={[styles.flag, { backgroundColor: item.status === 'completed' ? colors.yellow : colors.red }]}>
                  <Ionicons name="trophy" size={18} color={item.status === 'completed' ? colors.ink : '#fff'} />
                </View>
                <View style={styles.flex}>
                  <T variant="title" style={{ fontStyle: 'italic' }} numberOfLines={1}>
                    {item.name}
                  </T>
                  <T variant="tiny" color={colors.muted}>
                    {item.groupName}
                  </T>
                </View>
                <T variant="tiny" color={item.status === 'completed' ? colors.up : colors.yellow}>
                  {item.status === 'completed' ? 'Finalizado' : 'En juego'}
                </T>
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
    alignItems: 'center',
    gap: 12,
    padding: 12,
    backgroundColor: 'rgba(16,22,64,0.88)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  flag: { width: 42, height: 42, alignItems: 'center', justifyContent: 'center' },
  flex: { flex: 1, gap: 2 },
});
