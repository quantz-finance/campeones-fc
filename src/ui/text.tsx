import { Text as RNText, type StyleProp, type TextProps, type TextStyle } from 'react-native';
import { colors, font } from './theme';

type Variant = 'display' | 'title' | 'body' | 'medium' | 'strong' | 'label' | 'tiny';

const family: Record<Variant, string> = {
  display: font.display,
  title: font.display,
  body: font.body,
  medium: font.medium,
  strong: font.strong,
  label: font.label,
  tiny: font.labelSoft,
};

const size: Record<Variant, number> = {
  display: 34,
  title: 22,
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
  const anton = variant === 'display' || variant === 'title';
  const upper = variant === 'display' || variant === 'title' || variant === 'label' || variant === 'tiny';
  return (
    <RNText
      {...props}
      style={[
        {
          fontFamily: family[variant],
          fontSize: size[variant],
          color,
          lineHeight: anton ? size[variant] * 1.02 : Math.round(size[variant] * (variant === 'label' || variant === 'tiny' ? 1.35 : 1.4)),
          letterSpacing: variant === 'label' ? 1.1 : variant === 'tiny' ? 0.6 : anton ? 0.3 : 0.1,
          textTransform: upper ? 'uppercase' : 'none',
        },
        style,
      ]}
    />
  );
}
