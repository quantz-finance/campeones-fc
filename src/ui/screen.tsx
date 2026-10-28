import { useIsFocused } from 'expo-router';
import type { ReactNode } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { AudioToggle } from './audio-toggle';
import { Backdrop, tabBarSpace } from './broadcast';
import { useGlobalExit } from './motion-context';
import { back as goBack } from './nav';
import { SportPress } from './press';
import { BroadcastSlash, Scene } from './scene';
import { TabReplica } from './tabs';
import { colors, space } from './theme';
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
  const bottom = docked ? tabBarSpace(insets.bottom) + (footer ? footerHeight + 12 : 18) : Math.max(insets.bottom, 12) + 16;
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
        <AudioToggle />
      </View>
      <View style={[styles.safe, { paddingTop: insets.top + TOP_AIR }]}>
        {scroll ? (
          <ScrollView
            style={[styles.flex, footerReserve ? { marginBottom: footerReserve } : null]}
            contentContainerStyle={{ flexGrow: 1, paddingBottom: bottom }}
            keyboardShouldPersistTaps="handled"
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
}: {
  title: string;
  kicker?: string;
  back?: boolean;
  right?: ReactNode;
}) {
  return (
    <View style={styles.top}>
      <View style={styles.topText}>
        {back ? (
          <SportPress onPress={() => goBack()} hitSlop={8} style={styles.back} accessibilityLabel="Volver">
            <View style={styles.unskew}>
              <Ionicons name="chevron-back" size={22} color={colors.text} />
            </View>
          </SportPress>
        ) : null}
        <View style={styles.flex}>
          {kicker ? (
            <T variant="label" color={colors.muted} style={styles.kicker}>
              {kicker}
            </T>
          ) : null}
          <T variant="display" style={styles.title} numberOfLines={2}>
            {title}
          </T>
        </View>
      </View>
      {right}
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
    gap: 14,
  },
  footer: { position: 'absolute', left: 0, right: 0, zIndex: 5 },
  sound: { position: 'absolute', right: 10, zIndex: 45 },
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space.md, minHeight: 44, paddingRight: 62 },
  topText: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  back: {
    width: 44,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
    transform: [{ skewX: '-14deg' }],
  },
  unskew: { transform: [{ skewX: '14deg' }] },
  kicker: { fontSize: 11 },
  title: { fontSize: 28, fontStyle: 'italic' },
  panel: {
    backgroundColor: 'rgba(19,26,42, 0.88)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    padding: space.md,
    gap: space.md,
  },
});
