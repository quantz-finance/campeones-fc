import { StyleSheet, View } from 'react-native';
import { DRAFT_NOTICE, type LegalDoc } from '../content/legal';
import { useLang } from '../i18n/lang';
import { Banner } from './controls';
import { Screen, Top } from './screen';
import { colors, layout, space } from './theme';
import { T } from './text';

/** Página legal en el idioma de la app (ES base, EN con su propio texto, no por diccionario). */
export function LegalPage({ doc: docs }: { doc: { es: LegalDoc; en: LegalDoc } }) {
  const lang = useLang();
  const doc = docs[lang] ?? docs.es;
  return (
    <Screen>
      <Top title={doc.title} kicker="Campeones FC" back />
      <Banner tone="danger" title="Borrador" body={DRAFT_NOTICE[lang] ?? DRAFT_NOTICE.es} />
      <T variant="tiny" color={colors.muted} style={styles.plain}>
        {(lang === 'en' ? 'Last updated: ' : 'Última actualización: ') + doc.updated}
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
  section: { gap: layout.title },
});
