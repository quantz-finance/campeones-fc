import { StyleSheet, View } from 'react-native';
import { useApp } from '../../state/app-provider';
import { useQuery } from '../../state/use-query';
import { AchievementBadge } from '../../ui/achievement-badge';
import { Gate } from '../../ui/controls';
import { formatDay } from '../../ui/format';
import { Panel, Screen, Top } from '../../ui/screen';
import { colors, layout } from '../../ui/theme';
import { T } from '../../ui/text';

export default function Trophies() {
  const { repo, userId, version } = useApp();
  const query = useQuery(() => repo.trophies(userId!), [repo, userId, version]);
  return (
    <Screen>
      <Top title="Trofeos" kicker="Vitrina" back />
      <Gate query={query}>
        {(trophies) => (
          <>
            {trophies.map((trophy, index) => (
              <Panel key={trophy.code}>
                <View style={styles.row}>
                  <AchievementBadge code={trophy.code} unlocked={trophy.earned} index={index} size={64} />
                  <View style={styles.flex}>
                    <T variant="title">{trophy.title}</T>
                    <T color={colors.muted}>{trophy.description}</T>
                    <T variant="tiny" color={trophy.earned ? colors.accentText : colors.faint}>
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
  row: { flexDirection: 'row', gap: layout.field, alignItems: 'center' },
  flex: { flex: 1, gap: layout.inline },
});
