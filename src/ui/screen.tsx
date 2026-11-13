import { useIsFocused } from 'expo-router';
import type { ReactNode } from 'react';
import { Platform, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { AudioToggle } from './audio-toggle';
import { ThemeToggle } from './theme-toggle';
import { LangToggle } from './lang-toggle';
import { Backdrop, FeatureBadge, tabBarSpace, type FeatureIconName } from './broadcast';
import { useGlobalExit } from './motion-context';
import { back as goBack } from './nav';
import { SportPress } from './press';
import { BroadcastSlash, Scene } from './scene';
import { TabReplica } from './tabs';
import { colors, layout, radius, space } from './theme';
import { T } from './text';

/** Aire extra bajo el notch / Dynamic Island / barra de Safari (también en PWA standalone). */
export const TOP_AIR = 14;

export function Screen({
  children,
  scroll = true,
  tab = false,
  dock,
  footer,
  footerHeight = 40,
  fill = false,
}: {
  children: ReactNode;
  scroll?: boolean;
  tab?: boolean;
  dock?: 'inicio' | 'grupos' | 'jugar' | 'torneos' | 'perfil';
  footer?: ReactNode;
  /** Alto que ocupa el footer flotante, para que no tape el final del contenido. */
  footerHeight?: number;
  /** Sin scroll propio: el contenido (p. ej. FlatList) ocupa el alto y hace scroll. */
  fill?: boolean;
}) {
  const insets = useSafeAreaInsets();
  const exiting = useGlobalExit();
  const focused = useIsFocused();
  const docked = tab || Boolean(dock);
  const footerReserve = !docked && footer ? 36 + Math.max(insets.bottom, 8) : 0;
  // Aire bajo el contenido: nada queda tapado por la barra de pestañas, la cinta ni el borde seguro.
  const bottom = docked ? tabBarSpace(insets.bottom) + (footer ? footerHeight : 0) + layout.bottom : Math.max(insets.bottom, space.md) + layout.bottom;
  const body = (
    <View style={[styles.inner, fill && styles.flex]}>
      <Scene>{children}</Scene>
    </View>
  );
  return (
    <View style={styles.root}>
      <Backdrop />
      {exiting && focused ? <BroadcastSlash /> : null}
      <View pointerEvents="box-none" style={[styles.sound, { top: insets.top + 8 }]}>
        {docked ? null : <LangToggle />}
        {docked ? null : <ThemeToggle />}
        <AudioToggle />
      </View>
      <View style={[styles.safe, { paddingTop: insets.top + TOP_AIR }]}>
        {scroll ? (
          <ScrollView
            style={[styles.flex, footerReserve ? { marginBottom: footerReserve } : null]}
            contentContainerStyle={{ flexGrow: 1, paddingBottom: bottom }}
            keyboardShouldPersistTaps="handled"
            // El teclado no tapa el campo activo (iOS sube el contenido) y se cierra al deslizar.
            keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
            automaticallyAdjustKeyboardInsets
          >
            {body}
          </ScrollView>
        ) : (
          <View style={[styles.flex, { paddingBottom: bottom }, footerReserve ? { marginBottom: footerReserve } : null]}>{body}</View>
        )}
        {footer ? (
          <View
            pointerEvents="box-none"
            style={[
              styles.footer,
              docked ? { bottom: tabBarSpace(insets.bottom) + 2 } : { bottom: 0, height: footerReserve, justifyContent: 'center' },
            ]}
          >
            {footer}
          </View>
        ) : null}
        {dock ? <TabReplica active={dock} /> : null}
      </View>
    </View>
  );
}

export function Top({
  title,
  kicker,
  back = false,
  right,
  icon,
}: {
  title: string;
  kicker?: string;
  back?: boolean;
  right?: ReactNode;
  /** Ícono propio de la sección (silueta blanca sobre insignia morada). */
  icon?: FeatureIconName;
}) {
  return (
    <View style={styles.top}>
      {back || icon ? (
        <View style={styles.topLead}>
          {back ? (
            <SportPress onPress={() => goBack()} hitSlop={8} style={styles.back} accessibilityLabel="Volver" accessibilityRole="button">
              <View style={styles.unskew}>
                <Ionicons name="chevron-back" size={22} color={colors.text} />
              </View>
            </SportPress>
          ) : null}
          {icon ? <FeatureBadge name={icon} size={46} /> : null}
        </View>
      ) : null}
      <View style={[styles.topText, !(back || icon) && styles.topClear]}>
        <View style={styles.titleCol}>
          {kicker ? (
            <T variant="label" color={colors.accentText} style={styles.kicker} numberOfLines={2}>
              {kicker}
            </T>
          ) : null}
          <T variant="display" style={styles.title} numberOfLines={2}>
            {title}
          </T>
        </View>
        {right ? <View style={styles.topRight}>{right}</View> : null}
      </View>
    </View>
  );
}

export function Panel({ children }: { children: ReactNode }) {
  return <View style={styles.panel}>{children}</View>;
}

(Top as { broadcast?: string }).broadcast = 'header';

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  safe: { flex: 1 },
  flex: { flex: 1 },
  inner: {
    width: '100%',
    maxWidth: 480,
    alignSelf: 'center',
    paddingHorizontal: space.lg,
    paddingTop: 8,
    gap: layout.stack,
  },
  footer: { position: 'absolute', left: 0, right: 0, zIndex: 5 },
  sound: { position: 'absolute', right: 10, zIndex: 45, flexDirection: 'row', gap: space.sm },
  top: { gap: layout.title, minHeight: 44 },
  topLead: { flexDirection: 'row', alignItems: 'center', gap: space.sm, minHeight: 46, paddingRight: 146 },
  topText: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  topClear: { paddingRight: 146 },
  titleCol: { flex: 1, minWidth: 0 },
  topRight: { flexShrink: 0, alignItems: 'flex-end' },
  back: {
    width: 44,
    height: 44,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.line,
  },
  unskew: {},
  kicker: { fontSize: 11 },
  title: { fontSize: 30, lineHeight: 34 },
  panel: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.card,
    padding: space.lg,
    gap: layout.stack,
  },
});
