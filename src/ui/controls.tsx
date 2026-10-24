import type { ReactNode } from 'react';
import { Pressable, StyleSheet, TextInput, View, type StyleProp, type ViewStyle } from 'react-native';
import { colors, radius, space } from './theme';
import { T } from './text';

type Tone = 'accent' | 'ghost' | 'danger' | 'gold';

export function Button({
  label,
  onPress,
  tone = 'accent',
  disabled = false,
  icon,
}: {
  label: string;
  onPress: () => void;
  tone?: Tone;
  disabled?: boolean;
  icon?: ReactNode;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        tone === 'accent' && styles.accent,
        tone === 'ghost' && styles.ghost,
        tone === 'danger' && styles.danger,
        tone === 'gold' && styles.gold,
        (pressed || disabled) && styles.dim,
      ]}
    >
      {icon}
      <T variant="strong" color={tone === 'accent' || tone === 'gold' ? colors.accentInk : colors.text}>
        {label}
      </T>
    </Pressable>
  );
}

export function Field({
  label,
  value,
  onChangeText,
  placeholder,
  autoCapitalize = 'none',
  keyboardType = 'default',
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder?: string;
  autoCapitalize?: 'none' | 'words' | 'sentences';
  keyboardType?: 'default' | 'email-address' | 'number-pad';
}) {
  return (
    <View style={styles.field}>
      <T variant="label" color={colors.muted}>
        {label}
      </T>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.faint}
        autoCapitalize={autoCapitalize}
        autoCorrect={false}
        keyboardType={keyboardType}
        style={styles.input}
      />
    </View>
  );
}

export function Chip({
  label,
  active = false,
  onPress,
}: {
  label: string;
  active?: boolean;
  onPress?: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={[styles.chip, active && styles.chipOn]}>
      <T variant="label" color={active ? colors.accentInk : colors.text}>
        {label}
      </T>
    </Pressable>
  );
}

export function Banner({
  title,
  body,
  tone = 'warn',
}: {
  title: string;
  body?: string;
  tone?: 'warn' | 'danger' | 'accent';
}) {
  const color = tone === 'danger' ? colors.danger : tone === 'accent' ? colors.accent : colors.warn;
  return (
    <View style={[styles.banner, { borderColor: color }]}>
      <T variant="strong">{title}</T>
      {body ? <T color={colors.muted}>{body}</T> : null}
    </View>
  );
}

export function Empty({ title, body, action }: { title: string; body: string; action?: ReactNode }) {
  return (
    <View style={styles.empty}>
      <T variant="title">{title}</T>
      <T color={colors.muted}>{body}</T>
      {action}
    </View>
  );
}

export function Loading({ label = 'Cargando el marcador…' }: { label?: string }) {
  return (
    <View style={styles.empty}>
      <T color={colors.muted}>{label}</T>
    </View>
  );
}

export function ErrorNote({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <View style={styles.empty}>
      <T variant="strong">No se pudo cargar</T>
      <T color={colors.muted}>{message}</T>
      {onRetry ? <Button label="Reintentar" tone="ghost" onPress={onRetry} /> : null}
    </View>
  );
}

export function Gate<T>({
  query,
  children,
}: {
  query: { data: T | null; error: string | null; loading: boolean };
  children: (data: T) => ReactNode;
}) {
  if (query.loading && !query.data) return <Loading />;
  if (query.error || !query.data) return <ErrorNote message={query.error ?? 'Sin datos'} />;
  return <>{children(query.data)}</>;
}

export function rowStyle(extra?: StyleProp<ViewStyle>) {
  return [styles.row, extra];
}

const styles = StyleSheet.create({
  button: {
    minHeight: 52,
    borderRadius: radius.md,
    paddingHorizontal: space.lg,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: space.sm,
  },
  accent: { backgroundColor: colors.accent },
  gold: { backgroundColor: colors.gold },
  ghost: { backgroundColor: colors.surface2, borderWidth: 1, borderColor: colors.line },
  danger: { backgroundColor: 'transparent', borderWidth: 1, borderColor: colors.danger },
  dim: { opacity: 0.55 },
  field: { gap: space.sm },
  input: {
    minHeight: 52,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.bg,
    color: colors.text,
    paddingHorizontal: space.md,
    fontFamily: 'Sora_400Regular',
    fontSize: 16,
  },
  chip: {
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.line,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: colors.bg,
  },
  chipOn: { backgroundColor: colors.accent, borderColor: colors.accent },
  banner: {
    borderRadius: radius.md,
    borderWidth: 1,
    padding: space.md,
    gap: 4,
    backgroundColor: colors.bgElevated,
  },
  empty: { gap: space.sm, paddingVertical: space.lg },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.md },
});
