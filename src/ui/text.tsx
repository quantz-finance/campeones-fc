import { Children, type ReactNode } from 'react';
import { Text as RNText, type StyleProp, type TextProps, type TextStyle } from 'react-native';
import { translate, useLang, type Lang } from '../i18n/lang';
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

/** Traduce los textos sueltos de un nodo (ES es la base; en EN se busca en el diccionario). */
export function localize(children: ReactNode, lang: Lang): ReactNode {
  if (lang === 'es') return children;
  if (typeof children === 'string') return translate(children, lang);
  if (Array.isArray(children) && children.every((c) => typeof c === 'string' || typeof c === 'number')) {
    return translate(children.join(''), lang);
  }
  if (Array.isArray(children)) {
    return Children.map(children, (c) => (typeof c === 'string' ? translate(c, lang) : c));
  }
  return children;
}

export function T({
  variant = 'body',
  color = colors.text,
  style,
  children,
  accessibilityLabel,
  ...props
}: TextProps & { variant?: Variant; color?: string; style?: StyleProp<TextStyle> }) {
  const lang = useLang();
  const heading = variant === 'display' || variant === 'title';
  const upper = variant === 'label' || variant === 'tiny';
  return (
    <RNText
      {...props}
      accessibilityLabel={accessibilityLabel ? translate(accessibilityLabel, lang) : accessibilityLabel}
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
    >
      {localize(children, lang)}
    </RNText>
  );
}
