import { router } from 'expo-router';
import type { ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Backdrop, tabBarSpace } from './broadcast';
import { TabReplica } from './tabs';
import { colors, space } from './theme';
import { T } from './text';

export function Screen({
  children,
  scroll = true,
  tab = false,
  dock,
  footer,
}: {
  children: ReactNode;
  scroll?: boolean;
  tab?: boolean;
  dock?: 'inicio' | 'grupos' | 'jugar' | 'torneos' | 'perfil';
  footer?: ReactNode;
}) {
  const insets = useSafeAreaInsets();
  const docked = tab || Boolean(dock);
  const bottom = docked ? tabBarSpace(insets.bottom) + (footer ? 40 : 18) : Math.max(insets.bottom, 12) + 16;
  const body = <View style={styles.inner}>{children}</View>;
  return (
    <View style={styles.root}>
      <Backdrop />
      <View style={[styles.safe, { paddingTop: insets.top }]}>
        {scroll ? (
          <ScrollView style={styles.flex} contentContainerStyle={{ flexGrow: 1, paddingBottom: bottom }} keyboardShouldPersistTaps="handled">
            {body}
          </ScrollView>
        ) : (
          <View style={[styles.flex, { paddingBottom: bottom }]}>{body}</View>
        )}
        {footer ? <View style={[styles.footer, docked ? { bottom: tabBarSpace(insets.bottom) } : { bottom: 0 }]}>{footer}</View> : null}
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
          <Pressable onPress={() => router.back()} hitSlop={8} style={styles.back} accessibilityRole="button" accessibilityLabel="Volver">
            <View style={styles.unskew}>
              <Ionicons name="chevron-back" size={22} color={colors.text} />
            </View>
          </Pressable>
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
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space.md, minHeight: 44 },
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
    backgroundColor: 'rgba(16, 22, 64, 0.88)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    padding: space.md,
    gap: space.md,
  },
});
