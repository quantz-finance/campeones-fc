import { Pressable, StyleSheet, View } from 'react-native';
import { useApp } from '../../../state/app-provider';
import { useQuery } from '../../../state/use-query';
import { Shield } from '../../../ui/broadcast';
import { Button, Empty, Gate } from '../../../ui/controls';
import { Screen, Top } from '../../../ui/screen';
import { colors } from '../../../ui/theme';
import { T } from '../../../ui/text';
import { monogram } from '../../../ui/format';
import { push } from '../../../ui/nav';

export default function TournamentsTab() {
  const { repo, userId, version } = useApp();
  const query = useQuery(async () => {
    const groups = await repo.groupsSnapshot(userId!);
    const details = await Promise.all(groups.map((group) => repo.groupSnapshot(group.group.id, userId!)));
    return details.flatMap((group) =>
      group.tournaments.map((tournament) => ({
        id: tournament.id,
        name: tournament.name,
        photoUrl: tournament.photoUrl ?? null,
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
              action={<Button label="Ver grupos" onPress={() => push('/grupos')} />}
            />
          ) : (
            list.map((item) => (
              <Pressable key={item.id} style={styles.card} onPress={() => push(`/torneo/${item.id}`)}>
                <Shield letters={monogram(item.name)} photoUrl={item.photoUrl} size={44} />
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
    backgroundColor: 'rgba(19,26,42,0.88)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  flex: { flex: 1, gap: 2 },
});
