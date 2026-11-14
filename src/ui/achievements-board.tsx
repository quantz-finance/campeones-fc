import { StyleSheet, View } from 'react-native';
import { trophySections, type TrophySectionId } from '../content/trophies';
import type { AchievementCode } from '../domain/types';
import { AchievementBadge } from './achievement-badge';
import { formatDay } from './format';
import { colors, layout, space } from './theme';
import { T } from './text';

export type BoardTrophy = {
  code: AchievementCode;
  title: string;
  description: string;
  section: TrophySectionId;
  earned: boolean;
  earnedAt?: string | null;
};

/** Los 24 logros agrupados en las 6 secciones, con nombre y condición. */
export function AchievementsBoard({
  items,
  size = 72,
  layout: kind = 'album',
}: {
  items: BoardTrophy[];
  size?: number;
  layout?: 'album' | 'list';
}) {
  return (
    <View style={styles.root}>
      {trophySections.map((section) => {
        const rows = items.filter((item) => item.section === section.id);
        if (!rows.length) return null;
        return (
          <View key={section.id} style={styles.section}>
            <T variant="label" color={colors.muted} style={styles.heading}>
              {section.title}
            </T>
            {kind === 'list' ? (
              rows.map((trophy, index) => (
                <View key={trophy.code} style={styles.row}>
                  <AchievementBadge code={trophy.code} unlocked={trophy.earned} index={index} size={64} />
                  <View style={styles.flex}>
                    <T variant="title">{trophy.title}</T>
                    <T color={colors.muted}>{trophy.description}</T>
                    <T variant="tiny" color={trophy.earned ? colors.accentText : colors.faint}>
                      {trophy.earned && trophy.earnedAt ? `Lo conseguiste el ${formatDay(trophy.earnedAt)}` : 'Bloqueado'}
                    </T>
                  </View>
                </View>
              ))
            ) : (
              <View style={styles.album}>
                {rows.map((trophy, index) => (
                  <AchievementBadge
                    key={trophy.code}
                    code={trophy.code}
                    unlocked={trophy.earned}
                    index={index}
                    size={size}
                    title={trophy.title}
                    detail={trophy.description}
                  />
                ))}
              </View>
            )}
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { gap: layout.section },
  section: { gap: space.md },
  heading: { letterSpacing: 1.2 },
  album: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-around', gap: layout.card },
  row: { flexDirection: 'row', gap: layout.field, alignItems: 'center', backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, borderRadius: 14, padding: 12 },
  flex: { flex: 1, gap: layout.inline },
});
