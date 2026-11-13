import type { ReactNode } from 'react';
import { Keyboard, Pressable, StyleSheet, TextInput, View, type StyleProp, type ViewStyle } from 'react-native';
import { SkewBlock } from './broadcast';
import { Animated } from 'react-native';
import { useDelayed, useShimmerStyle } from './motion';
import { Shine, SportPress } from './press';
import { Scene } from './scene';
import { CardsSkeleton } from './skeleton';
import { colors, font, layout, radius, space } from './theme';
import { T } from './text';
import { translate, useLang } from '../i18n/lang';

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
  const fill = tone === 'danger' ? 'transparent' : tone === 'ghost' ? colors.wash : colors.yellow;
  const ink = tone === 'accent' || tone === 'gold' ? colors.accentInk : tone === 'danger' ? colors.danger : colors.text;
  const border = tone === 'ghost' ? colors.lineStrong : tone === 'danger' ? colors.danger : undefined;
  return (
    <SportPress
      disabled={disabled || pending}
      onPress={onPress}
      accessibilityState={{ disabled: disabled || pending, busy: pending }}
      style={[styles.hit, disabled && styles.dim, pending && styles.pending]}
    >
      {({ glint }) => (
        <View style={styles.stretch}>
          <SkewBlock
            color={fill}
            shadow={tone === 'accent' || tone === 'gold' ? colors.red : undefined}
            border={border}
            padH={18}
            padV={14}
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

/** Botón compacto dentro de una fila (p. ej. "Invitar"). Área táctil de 44 pt con el hitSlop. */
export function MiniButton({ label, onPress, disabled = false }: { label: string; onPress: () => void; disabled?: boolean }) {
  const lang = useLang();
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      hitSlop={6}
      accessibilityRole="button"
      accessibilityLabel={translate(label, lang)}
      accessibilityState={{ disabled }}
      style={({ pressed }) => [styles.mini, disabled && styles.dim, pressed && { opacity: 0.8 }]}
    >
      <T variant="label" color={colors.accentInk}>
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
  maxLength,
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder?: string;
  autoCapitalize?: 'none' | 'words' | 'sentences';
  keyboardType?: 'default' | 'email-address' | 'number-pad';
  maxLength?: number;
}) {
  const lang = useLang();
  return (
    <View style={styles.field}>
      <T variant="label" color={colors.accentText}>
        {label}
      </T>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder ? translate(placeholder, lang) : placeholder}
        placeholderTextColor={colors.faint}
        autoCapitalize={autoCapitalize}
        autoCorrect={false}
        keyboardType={keyboardType}
        maxLength={maxLength}
        accessibilityLabel={translate(label, lang)}
        returnKeyType="done"
        onSubmitEditing={() => Keyboard.dismiss()}
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
    <SportPress onPress={onPress} disabled={!onPress} hitSlop={6} accessibilityRole="button" accessibilityState={{ selected: active }}>
      {({ glint }) => (
        <SkewBlock
          color={active ? colors.red : colors.wash}
          shadow={active ? colors.yellow : undefined}
          border={active ? undefined : colors.lineStrong}
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
  const color = tone === 'danger' ? colors.danger : tone === 'accent' ? colors.accentText : colors.accentText;
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
      <T variant="label" color={colors.accentText}>
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
  btnLabel: { fontSize: 17, textAlign: 'center', fontFamily: font.bold, letterSpacing: 0 },
  dim: { opacity: 0.5 },
  pending: { opacity: 0.85 },
  dots: { flexDirection: 'row', gap: space.xs, marginLeft: space.xxs },
  dot: { width: 5, height: 5, borderRadius: 999 },
  field: { gap: space.md, alignSelf: 'stretch' },
  input: {
    minHeight: 52,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.card,
    color: colors.text,
    paddingHorizontal: space.lg,
    fontFamily: font.body,
    fontSize: 16,
    borderRadius: radius.md,
  },
  banner: {
    borderLeftWidth: 4,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.card,
    borderRadius: radius.md,
    padding: space.md,
    gap: space.xs,
  },
  empty: { gap: layout.stack, paddingVertical: space.lg },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  mini: {
    minHeight: 34,
    minWidth: 76,
    paddingHorizontal: space.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.pill,
    backgroundColor: colors.yellow,
  },
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
