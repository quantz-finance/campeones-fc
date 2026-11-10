import { StyleSheet, View } from 'react-native';
import { useApp } from '../../state/app-provider';
import { useQuery } from '../../state/use-query';
import { Gate } from '../../ui/controls';
import { formatDay } from '../../ui/format';
import { Panel, Screen, Top } from '../../ui/screen';
import { colors, radius, space } from '../../ui/theme';
import { T } from '../../ui/text';

export default function Trophies() {
  const { repo, userId, version } = useApp();
  const query = useQuery(() => repo.trophies(userId!), [repo, userId, version]);
  return (
    <Screen>
      <Top title="Trofeos" kicker="Vitrina" back icon="trophies" />
      <Gate query={query}>
        {(trophies) => (
          <>
            {trophies.map((trophy) => (
              <Panel key={trophy.code}>
                <View style={styles.row}>
                  <View style={[styles.medal, !trophy.earned && styles.locked]}>
                    <T variant="title">{trophy.earned ? 'Sí' : '·'}</T>
                  </View>
                  <View style={styles.flex}>
                    <T variant="title">{trophy.title}</T>
                    <T color={colors.muted}>{trophy.description}</T>
                    <T variant="tiny" color={trophy.earned ? colors.gold : colors.faint}>
                      {trophy.earned && trophy.earnedAt ? `Lo conseguiste el ${formatDay(trophy.earnedAt)}` : 'Bloqueado'}
                    </T>
                  </View>
                </View>
              </Panel>
            ))}
          </>
        )}
      </Gate>
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: space.md, alignItems: 'center' },
  medal: {
    width: 52,
    height: 52,
    borderRadius: radius.md,
    backgroundColor: colors.gold,
    alignItems: 'center',
    justifyContent: 'center',
  },
  locked: { backgroundColor: colors.surface2, borderRadius: 14 },
  flex: { flex: 1, gap: space.xs },
});
