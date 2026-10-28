import { useState, type ReactNode } from 'react';
import { Platform, Pressable, StyleSheet, View, type StyleProp, type ViewStyle, type PressableProps } from 'react-native';
import { playClick, unlockAudio } from './audio';
import { cssAnim, useReducedMotion } from './motion';

const shineFrames = {
  from: { opacity: 0, transform: [{ translateX: -180 }, { skewX: '-18deg' }] },
  '30%': { opacity: 0.85 },
  to: { opacity: 0, transform: [{ translateX: 420 }, { skewX: '-18deg' }] },
};

/** Barrido de luz al pulsar. Solo web: es un transform. */
export function Shine({ tick }: { tick: number }) {
  if (!tick || Platform.OS !== 'web') return null;
  return <View pointerEvents="none" key={tick} style={[styles.shine, cssAnim(shineFrames, 480)]} />;
}

type SportChild = ReactNode | ((state: { pressed: boolean; glint: number }) => ReactNode);

/**
 * Pulsación con escala, hover en web y un clic corto.
 * El brillo lo pinta quien reciba `glint` (los botones sesgados).
 */
export function SportPress({
  onPress,
  disabled = false,
  style,
  children,
  hitSlop,
  accessibilityLabel,
  accessibilityRole,
  accessibilityState,
}: {
  onPress?: () => void;
  disabled?: boolean;
  style?: StyleProp<ViewStyle> | ((pressed: boolean, hover: boolean) => StyleProp<ViewStyle>);
  children: SportChild;
  hitSlop?: PressableProps['hitSlop'];
  accessibilityLabel?: string;
  accessibilityRole?: PressableProps['accessibilityRole'];
  accessibilityState?: PressableProps['accessibilityState'];
}) {
  const reduced = useReducedMotion();
  const [hover, setHover] = useState(false);
  const [glint, setGlint] = useState(0);
  return (
    <Pressable
      disabled={disabled || !onPress}
      hitSlop={hitSlop}
      accessibilityLabel={accessibilityLabel}
      accessibilityRole={accessibilityRole}
      accessibilityState={accessibilityState}
      onHoverIn={() => setHover(true)}
      onHoverOut={() => setHover(false)}
      onPress={() => {
        if (disabled || !onPress) return;
        unlockAudio();
        playClick();
        if (!reduced) setGlint((n) => n + 1);
        onPress();
      }}
      style={({ pressed }) => {
        const base = typeof style === 'function' ? style(pressed, hover) : style;
        return [base, !reduced && hover && !pressed && !disabled ? styles.hover : null, !reduced && pressed && !disabled ? styles.pressed : null];
      }}
    >
      {({ pressed }) => (typeof children === 'function' ? children({ pressed, glint }) : children)}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  hover: { transform: [{ translateY: -2 }] },
  pressed: { transform: [{ scale: 0.97 }, { translateY: 1 }] },
  shine: {
    position: 'absolute',
    top: -12,
    bottom: -12,
    width: 28,
    backgroundColor: 'rgba(255,255,255,0.55)',
  },
});
