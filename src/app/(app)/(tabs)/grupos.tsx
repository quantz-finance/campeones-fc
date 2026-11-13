import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
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
import { ListLabel, SearchEmpty, SearchField } from '../../../ui/search-field';
import { rememberPick, useRecentPicks } from '../../../ui/recent-picks';
import { matchesText, quickIds, SEARCH_MIN_ITEMS } from '../../../domain/search';

export default function Groups() {
  const { repo, userId, version } = useApp();
  const query = useQuery(() => repo.groupsSnapshot(userId!), [repo, userId, version]);
  const [search, setSearch] = useState('');
  const recent = useRecentPicks('groups');
  const open = (id: string) => {
    rememberPick('groups', id);
    push(`/grupo/${id}`);
  };

  return (
    <Screen tab>
      <Top title="Grupos" kicker="La junta" right={<Button label="Crear" onPress={() => push('/grupo/nuevo')} />} />
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
            {(() => {
              // Accesos rápidos: los grupos que abriste o usaste hace poco (con 4 o más grupos y sin búsqueda).
              const byId = new Map(groups.map((g) => [g.group.id, g]));
              const quick = groups.length >= 4 && !search ? quickIds(recent, [], (id) => byId.has(id), 8).map((id) => byId.get(id)!) : [];
              return quick.length ? (
                <View style={styles.quickWrap}>
                  <ListLabel>Recientes</ListLabel>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.quick}>
                    {quick.map((item) => (
                      <Pressable key={item.group.id} onPress={() => open(item.group.id)} style={styles.chip} accessibilityRole="button" accessibilityLabel={item.group.name}>
                        <Shield letters={monogram(item.group.name)} photoUrl={item.group.photoUrl} kind="groups" id={item.group.id} logo={item.group.logo} size={48} />
                        <T variant="tiny" style={styles.chipText} numberOfLines={1}>
                          {item.group.name}
                        </T>
                      </Pressable>
                    ))}
                  </ScrollView>
                </View>
              ) : null;
            })()}
            {search && !groups.some((item) => matchesText(search, item.group.name)) ? <SearchEmpty query={search} hint="Revisa el nombre del grupo." /> : null}
            {groups.filter((item) => matchesText(search, item.group.name)).map((item, index) => (
              <Rise key={item.group.id} index={index}>
              <Pressable style={styles.card} onPress={() => open(item.group.id)} accessibilityRole="button">
                <Shield letters={monogram(item.group.name)} photoUrl={item.group.photoUrl} kind="groups" id={item.group.id} logo={item.group.logo} size={44} />
                <View style={styles.flex}>
                  <T variant="strong" style={styles.name} numberOfLines={1}>
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
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 14,
  },
  flex: { flex: 1, gap: 2 },
  name: { fontSize: 17 },
  quickWrap: { gap: space.sm },
  quick: { gap: space.md, paddingRight: space.sm },
  chip: { width: 72, alignItems: 'center', gap: space.xs },
  chipText: { maxWidth: 72, textAlign: 'center', textTransform: 'none', letterSpacing: 0 },
});
