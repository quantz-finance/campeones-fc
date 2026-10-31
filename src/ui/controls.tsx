import type { ReactNode } from 'react';
import { StyleSheet, TextInput, View, type StyleProp, type ViewStyle } from 'react-native';
import { SkewBlock } from './broadcast';
import { Animated } from 'react-native';
import { useDelayed, useShimmerStyle } from './motion';
import { Shine, SportPress } from './press';
import { Scene } from './scene';
import { CardsSkeleton } from './skeleton';
import { colors, font, space } from './theme';
import { T } from './text';

type Tone = 'accent' | 'ghost' | 'danger' | 'gold';

export function Button({
  label,
  onPress,
  tone = 'accent',
  disabled = false,
  pending = false,
  icon,
}: {
  label: string;
  onPress: () => void;
  tone?: Tone;
  disabled?: boolean;
  /** Estado en curso inline (sin loader de pantalla completa). */
  pending?: boolean;
  icon?: ReactNode;
}) {
  const fill = tone === 'danger' ? 'transparent' : tone === 'ghost' ? 'rgba(255,255,255,0.04)' : colors.yellow;
  const ink = tone === 'accent' || tone === 'gold' ? colors.ink : tone === 'danger' ? colors.danger : colors.text;
  const border = tone === 'ghost' ? 'rgba(255,255,255,0.45)' : tone === 'danger' ? colors.danger : undefined;
  return (
    <SportPress
      disabled={disabled || pending}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: disabled || pending, busy: pending }}
      style={[styles.hit, disabled && styles.dim, pending && styles.pending]}
    >
      {({ glint }) => (
        <View style={styles.stretch}>
          <SkewBlock
            color={fill}
            shadow={tone === 'accent' || tone === 'gold' ? colors.red : undefined}
            border={border}
            padH={14}
            padV={12}
            angle="-8deg"
            fill
            overlay={<Shine tick={glint} />}
          >
            <View style={styles.rowCenter}>
              {icon}
              <T variant="title" color={ink} style={styles.btnLabel}>
                {label}
              </T>
              {pending ? <PendingDots color={ink} /> : null}
            </View>
          </SkewBlock>
        </View>
      )}
    </SportPress>
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
      <T variant="label" color={colors.yellow}>
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
        accessibilityLabel={label}
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
    <SportPress onPress={onPress} disabled={!onPress}>
      {({ glint }) => (
        <SkewBlock
          color={active ? colors.red : 'rgba(255,255,255,0.06)'}
          shadow={active ? colors.yellow : undefined}
          border={active ? undefined : 'rgba(255,255,255,0.2)'}
          padH={12}
          padV={8}
          overlay={<Shine tick={glint} />}
        >
          <T variant="label" color={active ? colors.redInk : colors.text}>
            {label}
          </T>
        </SkewBlock>
      )}
    </SportPress>
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
  const color = tone === 'danger' ? colors.danger : tone === 'accent' ? colors.yellow : colors.yellow;
  return (
    <View style={[styles.banner, { borderLeftColor: color }]}>
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
      <T variant="label" color={colors.yellow}>
        {label}
      </T>
    </View>
  );
}

export function ErrorNote({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <View style={styles.empty}>
      <T variant="title">No se pudo cargar</T>
      <T color={colors.muted}>{message}</T>
      {onRetry ? <Button label="Reintentar" tone="ghost" onPress={onRetry} /> : null}
    </View>
  );
}

export function Gate<T>({
  query,
  children,
  skeleton,
  fill = false,
}: {
  query: { data: T | null; error: string | null; loading: boolean };
  children: (data: T) => ReactNode;
  skeleton?: ReactNode;
  /** Ocupa el alto disponible (para FlatList en pantallas sin scroll). */
  fill?: boolean;
}) {
  const waiting = query.loading && !query.data;
  const showSkeleton = useDelayed(waiting);
  // Datos previos se quedan visibles mientras refresca (stale-while-revalidate).
  if (waiting) return showSkeleton ? <>{skeleton ?? <CardsSkeleton />}</> : null;
  if (!query.data) {
    return (
      <Scene>
        <ErrorNote message={query.error ?? 'Sin datos'} />
      </Scene>
    );
  }
  if (fill) {
    return (
      <View style={styles.fill}>
        <Scene>{children(query.data)}</Scene>
      </View>
    );
  }
  return <Scene>{children(query.data)}</Scene>;
}
(Gate as { passthrough?: boolean }).passthrough = true;

export function rowStyle(extra?: StyleProp<ViewStyle>) {
  return [styles.row, extra];
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  hit: { alignSelf: 'stretch' },
  stretch: { alignSelf: 'stretch' },
  full: { alignSelf: 'stretch' },
  rowCenter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: space.sm },
  btnLabel: { fontSize: 18, textAlign: 'center' },
  dim: { opacity: 0.5 },
  pending: { opacity: 0.85 },
  dots: { flexDirection: 'row', gap: 3, marginLeft: 2 },
  dot: { width: 5, height: 5, transform: [{ skewX: '-8deg' }] },
  field: { gap: 6, alignSelf: 'stretch' },
  input: {
    minHeight: 52,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.16)',
    backgroundColor: 'rgba(8,11,19,0.65)',
    color: colors.text,
    paddingHorizontal: space.md,
    fontFamily: font.body,
    fontSize: 16,
  },
  banner: {
    borderLeftWidth: 4,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    backgroundColor: 'rgba(14,19,32,0.9)',
    padding: space.md,
    gap: 4,
  },
  empty: { gap: space.sm, paddingVertical: space.lg },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.md },
});

function PendingDots({ color }: { color: string }) {
  const pulse = useShimmerStyle();
  return (
    <Animated.View style={[styles.dots, pulse]} accessibilityElementsHidden>
      {[0, 1, 2].map((i) => (
        <View key={i} style={[styles.dot, { backgroundColor: color }]} />
      ))}
    </Animated.View>
  );
}
