import { Text as RNText, type StyleProp, type TextProps, type TextStyle } from 'react-native';
import { colors } from './theme';

type Variant = 'display' | 'title' | 'body' | 'medium' | 'strong' | 'label' | 'tiny';

const family: Record<Variant, string> = {
  display: 'SpaceGrotesk_700Bold',
  title: 'SpaceGrotesk_600SemiBold',
  body: 'Sora_400Regular',
  medium: 'Sora_500Medium',
  strong: 'Sora_600SemiBold',
  label: 'Sora_500Medium',
  tiny: 'Sora_500Medium',
};

const size: Record<Variant, number> = {
  display: 34,
  title: 22,
  body: 15,
  medium: 15,
  strong: 15,
  label: 12,
  tiny: 11,
};

export function T({
  variant = 'body',
  color = colors.text,
  style,
  ...props
}: TextProps & { variant?: Variant; color?: string; style?: StyleProp<TextStyle> }) {
  return (
    <RNText
      {...props}
      style={[{ fontFamily: family[variant], fontSize: size[variant], color, lineHeight: size[variant] * 1.35 }, style]}
    />
  );
}
