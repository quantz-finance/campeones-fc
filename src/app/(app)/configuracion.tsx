import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { APP_MODES, appModeOf } from '../../lib/app-mode';
import { useApp } from '../../state/app-provider';
import { Affiliation, SectionHead } from '../../ui/broadcast';
import { Button } from '../../ui/controls';
import { DeleteAccount } from '../../ui/delete-account';
import { LangSetting } from '../../ui/lang-toggle';
import { push } from '../../ui/nav';
import { Screen, Top } from '../../ui/screen';
import { colors, layout, radius, space } from '../../ui/theme';
import { T } from '../../ui/text';

/** Configuración: idioma, modo de la app, legal y cuenta. Lo público de la ficha se queda en Perfil. */
export default function Settings() {
  const app = useApp();
  const [showDemo, setShowDemo] = useState(app.profile?.showDemo === true);
  useEffect(() => setShowDemo(app.profile?.showDemo === true), [app.profile?.showDemo]);
  const current = appModeOf({ showDemo }, app.mode !== 'supabase');

  return (
    <Screen>
      <Top title="Configuración" back />

      <View style={styles.section}>
        <SectionHead title="Idioma" />
        <LangSetting />
      </View>

      <View style={styles.section}>
        <SectionHead title="Modo de la app" />
        <View style={styles.segment} accessibilityRole="radiogroup">
          {APP_MODES.map((m) => {
            const on = current === m.key;
            const locked = m.disabled || app.mode !== 'supabase';
            return (
              <Pressable
                key={m.key}
                disabled={locked || on}
                accessibilityRole="radio"
                accessibilityState={{ selected: on, disabled: locked }}
                accessibilityLabel={m.label}
                onPress={() => {
                  const next = m.key === 'fake';
                  setShowDemo(next);
                  void app.repo
                    .updateProfile(app.userId!, { showDemo: next })
                    .then(() => app.refresh())
                    .catch(() => setShowDemo(!next));
                }}
                style={[styles.segItem, on && styles.segOn, m.disabled && styles.segOff]}
              >
                <T variant="strong" color={on ? colors.ink : colors.text} style={styles.segLabel}>
                  {m.label}
                </T>
                {m.disabled ? (
                  <T variant="tiny" color={colors.muted} style={styles.soon}>
                    Próximamente
                  </T>
                ) : null}
              </Pressable>
            );
          })}
        </View>
        <T color={colors.muted} style={styles.note}>
          {current === 'fake'
            ? 'Datos falsos: ves el mundo de demostración (jugadores, partidos, grupos). Nada va a la blockchain.'
            : 'Testnet: solo jugadores y partidos reales. Verificación en Stellar (red de prueba, sin dinero real).'}
        </T>
      </View>

      <View style={styles.section}>
        <SectionHead title="Legal" />
        <View style={styles.buttons}>
          <Button label="Términos de uso" tone="ghost" onPress={() => push('/terminos')} />
          <Button label="Aviso de privacidad" tone="ghost" onPress={() => push('/privacidad')} />
        </View>
      </View>

      <View style={styles.section}>
        <SectionHead title="Cuenta" />
        <View style={styles.buttons}>
          {app.mode === 'demo' ? <Button label="Restablecer datos de demostración" tone="ghost" onPress={() => void app.repo.resetDemo()} /> : null}
          <DeleteAccount />
          <Button label="Cerrar sesión" tone="danger" onPress={() => void app.signOut()} />
        </View>
      </View>

      <Affiliation />
    </Screen>
  );
}

const styles = StyleSheet.create({
  section: { gap: layout.title },
  buttons: { gap: layout.button },
  segment: { flexDirection: 'row', gap: space.sm, padding: space.xs, borderWidth: 1, borderColor: colors.lineStrong, borderRadius: radius.lg },
  segItem: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: space.sm, minHeight: 52, borderRadius: radius.md },
  segOn: { backgroundColor: colors.yellow },
  segOff: { opacity: 0.5 },
  segLabel: { fontSize: 14 },
  soon: { fontSize: 9 },
  note: { fontSize: 14, lineHeight: 20 },
});
