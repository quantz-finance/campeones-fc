import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useApp } from '../../../state/app-provider';
import { useQuery } from '../../../state/use-query';
import { Shield } from '../../../ui/broadcast';
import { Button, Empty, Gate } from '../../../ui/controls';
import { monogram } from '../../../ui/format';
import { Screen, Top } from '../../../ui/screen';
import { colors, space } from '../../../ui/theme';
import { T } from '../../../ui/text';
import { Rise } from '../../../ui/motion';
import { push } from '../../../ui/nav';
import { SearchEmpty, SearchField } from '../../../ui/search-field';
import { matchesText, SEARCH_MIN_ITEMS } from '../../../domain/search';

export default function Groups() {
  const { repo, userId, version } = useApp();
  const query = useQuery(() => repo.groupsSnapshot(userId!), [repo, userId, version]);
  const [search, setSearch] = useState('');

  return (
    <Screen tab>
      <Top title="Grupos" kicker="La junta" icon="friends" right={<Button label="Crear" onPress={() => push('/grupo/nuevo')} />} />
      <Gate query={query}>
        {(groups) =>
          groups.length === 0 ? (
            <Empty
              title="Arma tu junta"
              body="Un grupo tiene tabla, ranking y torneos. Solo entran tus amigos."
              action={<Button label="Crear grupo" onPress={() => push('/grupo/nuevo')} />}
            />
          ) : (
            <>
            {groups.length >= SEARCH_MIN_ITEMS ? <SearchField value={search} onChange={setSearch} placeholder="Busca un grupo" /> : null}
            {search && !groups.some((item) => matchesText(search, item.group.name)) ? <SearchEmpty query={search} hint="Revisa el nombre del grupo." /> : null}
            {groups.filter((item) => matchesText(search, item.group.name)).map((item, index) => (
              <Rise key={item.group.id} index={index}>
              <Pressable style={styles.card} onPress={() => push(`/grupo/${item.group.id}`)} accessibilityRole="button">
                <Shield letters={monogram(item.group.name)} photoUrl={item.group.photoUrl} kind="groups" id={item.group.id} logo={item.group.logo} size={48} />
                <View style={styles.flex}>
                  <T variant="title" style={{ fontStyle: 'normal' }} numberOfLines={1}>
                    {item.group.name}
                  </T>
                  <T variant="tiny" color={colors.muted}>
                    {item.memberCount} jugadores · {item.yourPlace ? `vas ${item.yourPlace}º` : 'aún fuera del ranking'}
                  </T>
                  <T variant="strong" color={colors.accentText}>
                    {item.leader ? `Manda ${item.leader.displayName}` : 'Nadie manda todavía'}
                  </T>
                </View>
              </Pressable>
              </Rise>
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
    gap: space.md,
    alignItems: 'center',
    padding: 12,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 14,
  },
  flex: { flex: 1, gap: space.sm },
});
