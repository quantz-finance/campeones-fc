import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useApp } from '../../../state/app-provider';
import { useQuery } from '../../../state/use-query';
import { Shield } from '../../../ui/broadcast';
import { Button, Empty, Gate } from '../../../ui/controls';
import { Screen, Top } from '../../../ui/screen';
import { colors, space } from '../../../ui/theme';
import { T } from '../../../ui/text';
import { monogram } from '../../../ui/format';
import { push } from '../../../ui/nav';
import { SearchEmpty, SearchField } from '../../../ui/search-field';
import { matchesText, SEARCH_MIN_ITEMS } from '../../../domain/search';

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
        logo: tournament.logo ?? null,
        status: tournament.status,
        groupName: group.group.name,
        groupId: group.group.id,
      })),
    );
  }, [repo, userId, version]);

  const [search, setSearch] = useState('');
  return (
    <Screen tab>
      <Top title="Torneos" kicker="Cuadros y copas" icon="tournaments" />
      <Gate query={query}>
        {(list) =>
          list.length === 0 ? (
            <Empty
              title="Todavía no hay copas"
              body="Ármala dentro de un grupo: eliminación de 4, 8 o 16, o una liga de todos contra todos."
              action={<Button label="Ver grupos" onPress={() => push('/grupos')} />}
            />
          ) : (
            <>
            {list.length >= SEARCH_MIN_ITEMS ? <SearchField value={search} onChange={setSearch} placeholder="Busca un torneo o grupo" /> : null}
            {search && !list.some((item) => matchesText(search, item.name, item.groupName)) ? <SearchEmpty query={search} hint="Busca por el nombre del torneo o de su grupo." /> : null}
            {list.filter((item) => matchesText(search, item.name, item.groupName)).map((item) => (
              <Pressable key={item.id} style={styles.card} onPress={() => push(`/torneo/${item.id}`)} accessibilityRole="button">
                <Shield letters={monogram(item.name)} photoUrl={item.photoUrl} kind="tournaments" id={item.id} logo={item.logo} size={48} />
                <View style={styles.flex}>
                  <T variant="title" style={{ fontStyle: 'normal' }} numberOfLines={1}>
                    {item.name}
                  </T>
                  <T variant="tiny" color={colors.muted}>
                    {item.groupName}
                  </T>
                </View>
                <T variant="tiny" color={item.status === 'completed' ? colors.up : colors.accentText}>
                  {item.status === 'completed' ? 'Finalizado' : 'En juego'}
                </T>
              </Pressable>
            ))}
            </>
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
    gap: space.md,
    padding: 12,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 14,
  },
  flex: { flex: 1, gap: space.xs },
});
