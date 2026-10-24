import { router } from 'expo-router';
import type { ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, space } from './theme';
import { T } from './text';

export function Screen({
  children,
  scroll = true,
}: {
  children: ReactNode;
  scroll?: boolean;
}) {
  const body = <View style={styles.inner}>{children}</View>;
  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      {scroll ? (
        <ScrollView style={styles.flex} contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          {body}
        </ScrollView>
      ) : (
        <View style={styles.flex}>{body}</View>
      )}
    </SafeAreaView>
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
          <Pressable onPress={() => router.back()} hitSlop={12} style={styles.back} accessibilityRole="button">
            <Ionicons name="chevron-back" size={20} color={colors.text} />
          </Pressable>
        ) : null}
        <View style={styles.flex}>
          {kicker ? (
            <T variant="label" color={colors.accent} style={styles.kicker}>
              {kicker}
            </T>
          ) : null}
          <T variant="title">{title}</T>
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
  safe: { flex: 1, backgroundColor: colors.bg },
  flex: { flex: 1 },
  scroll: { flexGrow: 1, paddingBottom: 28 },
  inner: {
    width: '100%',
    maxWidth: 880,
    alignSelf: 'center',
    paddingHorizontal: space.lg,
    paddingTop: space.md,
    gap: space.lg,
  },
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space.md },
  topText: { flexDirection: 'row', alignItems: 'center', gap: space.sm, flex: 1 },
  back: {
    width: 36,
    height: 36,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
  },
  kicker: { letterSpacing: 1.1, textTransform: 'uppercase' },
  panel: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.line,
    padding: space.lg,
    gap: space.md,
  },
});
