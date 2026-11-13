import { memo, useCallback, useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, View } from 'react-native';
import type { RankingSnapshot } from '../../data/snapshots';
import { CountRoll, Pop, Rise } from '../../ui/motion';
import { ListSkeleton } from '../../ui/skeleton';
import { rules } from '../../domain/rules';
import { appModeOf } from '../../lib/app-mode';
import { useApp } from '../../state/app-provider';
import { useQuery } from '../../state/use-query';
import { Avatar } from '../../ui/avatar';
import { Banner, Gate } from '../../ui/controls';
import { elo, pct } from '../../ui/format';
import { Screen, Top } from '../../ui/screen';
import { colors, layout, radius, space } from '../../ui/theme';
import { T } from '../../ui/text';
import { push } from '../../ui/nav';
import { SearchEmpty, SearchField } from '../../ui/search-field';
import { filterPeople, SEARCH_MIN_ITEMS } from '../../domain/search';

type RankRow = RankingSnapshot['rows'][number];

const Row = memo(function Row({ row, index, me }: { row: RankRow; index: number; me: boolean }) {
  return (
    <Rise index={index}>
      <Pressable
        style={[styles.row, me && styles.you]}
        onPress={() => push(`/jugador/${row.playerId}`)}
        accessibilityRole="link"
        accessibilityLabel={row.profile.displayName}
      >
        <T variant="title" color={index < 3 ? colors.gold : colors.muted} style={styles.place}>
          {index + 1}
        </T>
        <Avatar avatarKey={row.profile.avatarKey} name={row.profile.displayName} photoUrl={row.profile.photoUrl} size={40} />
        <View style={styles.flex}>
          <T variant="strong">{row.profile.displayName}</T>
          <T variant="tiny" color={colors.muted}>
            {pct(row.winRate)} · {row.played} PJ
          </T>
        </View>
        <Pop value={row.rating}>
          <CountRoll value={row.rating} format={(n) => elo(Math.round(n))}>
            {(shown) => <T variant="title">{shown}</T>}
          </CountRoll>
        </Pop>
      </Pressable>
    </Rise>
  );
});

export default function Ranking() {
  const { repo, userId, version, mode, profile } = useApp();
  const fake = appModeOf(profile, mode !== 'supabase') === 'fake';
  const query = useQuery(() => repo.rankingSnapshot(userId!), [repo, userId, version]);
  const [search, setSearch] = useState('');
  // El puesto es el del ranking completo, aunque el buscador filtre.
  const places = useMemo(() => new Map((query.data?.rows ?? []).map((row, index) => [row.playerId, index])), [query.data]);
  const renderItem = useCallback(
    ({ item, index }: { item: RankRow; index: number }) => <Row row={item} index={places.get(item.playerId) ?? index} me={item.playerId === userId} />,
    [userId, places],
  );
  return (
    <Screen scroll={false} fill>
      <Top title="Ranking" kicker="Tu círculo" back />
      <Gate query={query} skeleton={<ListSkeleton rows={9} />} fill>
        {(data) => (
          <FlatList
            style={styles.flex}
            data={filterPeople(data.rows, search, (row) => row.profile)}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
            keyExtractor={(row) => row.playerId}
            renderItem={renderItem}
            initialNumToRender={12}
            maxToRenderPerBatch={12}
            windowSize={7}
            removeClippedSubviews
            contentContainerStyle={styles.list}
            showsVerticalScrollIndicator={false}
            ListHeaderComponent={
              <View style={styles.head}>
                <T color={colors.muted}>
                  Elo como en el ajedrez (reglas FIDE): todos arrancan en 1200, ganarle a alguien más fuerte suma más y
                  empatarle también suma. Ordenado por Elo; hacen falta {rules.minMatchesForRanking} partidos para aparecer.
                </T>
                {!data.qualified && data.you ? (
                  <Banner
                    title="Todavía no entras"
                    body={`Te faltan ${data.missing} ${data.missing === 1 ? 'partido' : 'partidos'} confirmados para salir en la lista.`}
                  />
                ) : null}
                {data.rows.length >= SEARCH_MIN_ITEMS ? <SearchField value={search} onChange={setSearch} placeholder="Busca un jugador" /> : null}
              </View>
            }
            ListEmptyComponent={
              search ? <SearchEmpty query={search} hint="Puede que aún no tenga los partidos mínimos para salir en el ranking." /> : <T color={colors.muted}>Nadie del círculo acumula los partidos mínimos.</T>
            }
          />
        )}
      </Gate>
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
  },
  you: { backgroundColor: colors.surface, borderRadius: 14 },
  place: { width: 28 },
  flex: { flex: 1 },
  list: { gap: layout.card, paddingBottom: space.sm },
  head: { gap: layout.stack, marginBottom: space.sm },
  note: { textAlign: 'center', marginTop: space.md, fontSize: 10, textTransform: 'none', letterSpacing: 0 },
});
