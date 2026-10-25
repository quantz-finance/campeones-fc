import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';
import { rules } from '../../domain/rules';
import { useApp } from '../../state/app-provider';
import { useQuery } from '../../state/use-query';
import { Avatar } from '../../ui/avatar';
import { Banner, Gate } from '../../ui/controls';
import { elo, pct } from '../../ui/format';
import { Screen, Top } from '../../ui/screen';
import { colors, radius, space } from '../../ui/theme';
import { T } from '../../ui/text';

export default function Ranking() {
  const { repo, userId, version } = useApp();
  const query = useQuery(() => repo.rankingSnapshot(userId!), [repo, userId, version]);
  return (
    <Screen>
      <Top title="Ranking" kicker="Tu círculo" back />
      <Gate query={query}>
        {(data) => (
          <>
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
            {data.rows.length === 0 ? (
              <T color={colors.muted}>Nadie del círculo acumula los partidos mínimos.</T>
            ) : (
              data.rows.map((row, index) => (
                <Pressable
                  key={row.playerId}
                  style={[styles.row, row.playerId === userId && styles.you]}
                  onPress={() => {
                    if (row.playerId !== userId) router.push(`/versus/${row.playerId}`);
                  }}
                >
                  <T variant="title" color={index < 3 ? colors.gold : colors.muted} style={styles.place}>
                    {index + 1}
                  </T>
                  <Avatar avatarKey={row.profile.avatarKey} size={40} />
                  <View style={styles.flex}>
                    <T variant="strong">{row.profile.displayName}</T>
                    <T variant="tiny" color={colors.muted}>
                      {pct(row.winRate)} · {row.played} PJ
                    </T>
                  </View>
                  <T variant="title">{elo(row.rating)}</T>
                </Pressable>
              ))
            )}
          </>
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
  you: { backgroundColor: colors.surface },
  place: { width: 28 },
  flex: { flex: 1 },
});
