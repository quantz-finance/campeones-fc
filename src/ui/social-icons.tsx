// Glifos propios (no los logos oficiales) para las redes del jugador: siluetas simples en blanco.
import { Share, StyleSheet, View } from 'react-native';
import Svg, { Circle, Path, Rect } from 'react-native-svg';
import { isStoredSocial, SOCIAL_NETWORKS, socialHandle, socialLabel, type SocialLinks, type SocialNetwork } from '../domain/social';
import { SportPress } from './press';
import { copyText, openExternal } from './share';
import { T } from './text';
import { colors, space } from './theme';

export function SocialGlyph({ network, size = 18, color = '#FFFFFF' }: { network: SocialNetwork; size?: number; color?: string }) {
  const stroke = { stroke: color, strokeWidth: 2.2, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, fill: 'none' };
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      {network === 'tiktok' ? (
        // Nota musical: plica con bandera y cabeza redonda.
        <>
          <Path d="M13 3.5v11.2" {...stroke} />
          <Path d="M13 3.5c.6 2.6 2.6 4.4 5.5 4.6" {...stroke} />
          <Circle cx={9.6} cy={15.6} r={3.6} {...stroke} />
        </>
      ) : network === 'instagram' ? (
        // Cámara redondeada con lente y flash.
        <>
          <Rect x={3.5} y={3.5} width={17} height={17} rx={5} {...stroke} />
          <Circle cx={12} cy={12} r={3.8} {...stroke} />
          <Circle cx={17} cy={7} r={1.1} fill={color} />
        </>
      ) : network === 'youtube' ? (
        // Pantalla con botón de reproducir.
        <>
          <Rect x={2.5} y={5.5} width={19} height={13} rx={4} {...stroke} />
          <Path d="M10 9.2v5.6l4.8-2.8z" fill={color} />
        </>
      ) : network === 'twitch' ? (
        // Globo de chat con dos barras.
        <>
          <Path d="M5 3.5h15v10l-4 4h-4l-3 3v-3H5z" {...stroke} />
          <Path d="M11 8v4M15.5 8v4" {...stroke} />
        </>
      ) : network === 'kick' ? (
        // K gruesa en bloques.
        <Path d="M5 3.5h4.2v5.2h1.6l3.4-5.2h4.8l-4.6 8.5 4.6 8.5h-4.8l-3.4-5.2H9.2v5.2H5z" fill={color} />
      ) : network === 'x' ? (
        // Dos trazos cruzados.
        <Path d="M5 4.5l14 15M19 4.5l-14 15" {...stroke} strokeWidth={2.6} />
      ) : (
        // Control de juego (Discord = usuario, no enlace).
        <>
          <Path d="M7 7h10c2.4 0 3.6 4.6 3.9 8.2.2 2-1.9 2.8-3.1 1.4L16 14.5H8l-1.8 2.1c-1.2 1.4-3.3.6-3.1-1.4C3.4 11.6 4.6 7 7 7z" {...stroke} />
          <Circle cx={9} cy={11} r={1.2} fill={color} />
          <Circle cx={15} cy={11} r={1.2} fill={color} />
        </>
      )}
    </Svg>
  );
}

/** Redes con valor válido, en el orden fijo de SOCIAL_NETWORKS. */
export function socialEntries(links: SocialLinks | null | undefined): [SocialNetwork, string][] {
  if (!links) return [];
  return SOCIAL_NETWORKS.filter((network) => isStoredSocial(network, links[network])).map((network) => [network, links[network]!]);
}

async function openSocial(network: SocialNetwork, value: string) {
  // Se vuelve a validar antes de abrir: solo dominios permitidos y https.
  if (!isStoredSocial(network, value)) return;
  if (network === 'discord') {
    if (!(await copyText(value).catch(() => false))) await Share.share({ message: `Discord: ${value}` });
    return;
  }
  openExternal(value);
}

/** Fila de íconos compactos (tarjetas de estrella). Solo dibuja; no abre nada. */
export function SocialDots({ links, size = 13, max = 4 }: { links: SocialLinks | null | undefined; size?: number; max?: number }) {
  const entries = socialEntries(links).slice(0, max);
  if (!entries.length) return null;
  return (
    <View style={styles.dots} accessibilityLabel={`Redes: ${entries.map(([n]) => socialLabel[n]).join(', ')}`}>
      {entries.map(([network]) => (
        <View key={network} style={[styles.dot, { width: size + 9, height: size + 9 }]}>
          <SocialGlyph network={network} size={size} />
        </View>
      ))}
    </View>
  );
}

/** Botones grandes de la ficha pública: ícono + @usuario. */
export function SocialButtons({ links }: { links: SocialLinks | null | undefined }) {
  const entries = socialEntries(links);
  if (!entries.length) return null;
  return (
    <View style={styles.buttons}>
      {entries.map(([network, value]) => (
        <SportPress
          key={network}
          style={styles.button}
          onPress={() => void openSocial(network, value)}
          accessibilityRole={network === 'discord' ? 'button' : 'link'}
          accessibilityLabel={`${socialLabel[network]}: ${socialHandle(network, value)}`}
        >
          <View style={styles.buttonIcon}>
            <SocialGlyph network={network} size={16} />
          </View>
          <View style={{ flexShrink: 1 }}>
            <T variant="tiny" color={colors.muted}>
              {socialLabel[network]}
            </T>
            <T variant="strong" numberOfLines={1} style={{ fontSize: 13 }}>
              {socialHandle(network, value)}
            </T>
          </View>
        </SportPress>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  dots: { flexDirection: 'row', gap: space.xs },
  dot: { borderRadius: 999, backgroundColor: 'rgba(0,0,0,0.35)', alignItems: 'center', justifyContent: 'center' },
  buttons: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    paddingVertical: 8,
    paddingLeft: 8,
    paddingRight: 12,
    borderRadius: 14,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.line,
    maxWidth: '100%',
  },
  buttonIcon: { width: 30, height: 30, borderRadius: 999, backgroundColor: colors.violet, alignItems: 'center', justifyContent: 'center' },
});
