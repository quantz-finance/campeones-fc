import { StyleSheet, View } from 'react-native';
import { DRAFT_NOTICE, type LegalDoc } from '../content/legal';
import { Banner } from './controls';
import { Screen, Top } from './screen';
import { colors, space } from './theme';
import { T } from './text';

export function LegalPage({ doc }: { doc: LegalDoc }) {
  return (
    <Screen>
      <Top title={doc.title} kicker="Campeones FC" back />
      <Banner tone="danger" title="Borrador" body={DRAFT_NOTICE} />
      <T variant="tiny" color={colors.muted} style={styles.plain}>
        Última actualización: {doc.updated}
      </T>
      <T style={styles.plain}>{doc.intro}</T>
      {doc.sections.map((section) => (
        <View key={section.title} style={styles.section}>
          <T variant="strong">{section.title}</T>
          {section.body.map((p) => (
            <T key={p} color={colors.muted} style={styles.plain}>
              {p}
            </T>
          ))}
        </View>
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  plain: { textTransform: 'none', letterSpacing: 0 },
  section: { gap: space.sm },
});
