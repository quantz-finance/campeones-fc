import { Text as RNText, type StyleProp, type TextProps, type TextStyle } from 'react-native';
import { colors, font } from './theme';

type Variant = 'display' | 'title' | 'body' | 'medium' | 'strong' | 'label' | 'tiny';

// Jerarquía de la landing: títulos Outfit 800/700 en tipo oración, etiquetas 700 en mayúsculas.
const family: Record<Variant, string> = {
  display: font.display,
  title: font.heading,
  body: font.body,
  medium: font.medium,
  strong: font.strong,
  label: font.label,
  tiny: font.labelSoft,
};

const size: Record<Variant, number> = {
  display: 32,
  title: 20,
  body: 16,
  medium: 16,
  strong: 16,
  label: 12,
  tiny: 11,
};

export function T({
  variant = 'body',
  color = colors.text,
  style,
  ...props
}: TextProps & { variant?: Variant; color?: string; style?: StyleProp<TextStyle> }) {
  const heading = variant === 'display' || variant === 'title';
  const upper = variant === 'label' || variant === 'tiny';
  return (
    <RNText
      {...props}
      style={[
        {
          fontFamily: family[variant],
          fontSize: size[variant],
          color,
          lineHeight: heading ? Math.round(size[variant] * 1.15) : Math.round(size[variant] * (upper ? 1.35 : 1.4)),
          letterSpacing: variant === 'label' ? 0.9 : variant === 'tiny' ? 0.5 : heading ? -0.3 : 0,
          textTransform: upper ? 'uppercase' : 'none',
        },
        style,
      ]}
    />
  );
}
