// Marco de foto de jugador (estrella del inicio, ficha pública, perfil). Sobrio, de club: anillo exterior en
// verde (o dorado para el #1), filete morado y un hilo lila interior, con un degradado morado sutil detrás de la
// foto. La foto (cuadrada, 1:1) entra recortada al círculo en cover y centrada. Sin foto: iniciales
// en Outfit 800 sobre el mismo degradado, nada de avatares de colores. Igual en modo claro y oscuro.
import { Image } from 'expo-image';
import { memo, useId } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Circle, Defs, LinearGradient, RadialGradient, Stop } from 'react-native-svg';
import { useReducedMotion } from './motion';
import { T } from './text';

export const PORTRAIT = {
  plate: '#37003C',
  plateHi: '#5A1466',
  plateLo: '#1E0022',
  lila: '#C9A2FF',
  green: '#00FF87',
  greenLo: '#00B85F',
  gold: '#D4AF37',
  goldLo: '#8A6A16',
  ink: '#1A0A1C',
} as const;

export type PortraitAccent = 'green' | 'gold';

export function initialsOf(name: string): string {
  return (
    name
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0])
      .join('')
      .toUpperCase() || '·'
  );
}

export const PlayerPortrait = memo(function PlayerPortrait({
  name,
  photoUrl,
  size,
  accent = 'green',
  tag,
}: {
  name: string;
  photoUrl?: string | null;
  size: number;
  accent?: PortraitAccent;
  /** Pestaña abajo al centro (por ejemplo «#1»). */
  tag?: string | null;
}) {
  const reduced = useReducedMotion();
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
  const ring = Math.max(2, Math.round(size * 0.03));
  const gap = Math.max(2, Math.round(size * 0.03));
  const inset = ring + gap;
  const inner = size - inset * 2;
  const hi = accent === 'gold' ? PORTRAIT.gold : PORTRAIT.green;
  const lo = accent === 'gold' ? PORTRAIT.goldLo : PORTRAIT.greenLo;
  const c = size / 2;
  return (
    <View style={{ width: size, height: size }} accessibilityRole="image" accessibilityLabel={name}>
      <Svg width={size} height={size} style={StyleSheet.absoluteFill}>
        <Defs>
          <LinearGradient id={`r${uid}`} x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor={hi} />
            <Stop offset="0.55" stopColor={lo} />
            <Stop offset="1" stopColor={hi} />
          </LinearGradient>
          <RadialGradient id={`p${uid}`} cx="50%" cy="32%" r="70%">
            <Stop offset="0" stopColor={PORTRAIT.plateHi} />
            <Stop offset="0.6" stopColor={PORTRAIT.plate} />
            <Stop offset="1" stopColor={PORTRAIT.plateLo} />
          </RadialGradient>
        </Defs>
        <Circle cx={c} cy={c} r={c - ring / 2} stroke={`url(#r${uid})`} strokeWidth={ring} fill={PORTRAIT.plate} />
        <Circle cx={c} cy={c} r={inner / 2} fill={`url(#p${uid})`} />
      </Svg>
      <View style={[styles.photo, { left: inset, top: inset, width: inner, height: inner, borderRadius: inner / 2 }]}>
        {/* Iniciales siempre debajo: se ven sin foto, mientras carga o si la foto falla. */}
        <T variant="display" color="#FFFFFF" style={{ fontSize: Math.round(inner * 0.36), letterSpacing: 1, fontStyle: 'normal' }}>
          {initialsOf(name)}
        </T>
        {photoUrl ? (
          <Image
            source={{ uri: photoUrl }}
            recyclingKey={photoUrl}
            style={StyleSheet.absoluteFill}
            contentFit="cover"
            contentPosition="center"
            cachePolicy="memory-disk"
            transition={reduced ? 0 : 180}
            accessible={false}
          />
        ) : null}
      </View>
      {/* Hilo lila sobre el borde de la foto: separa la foto del filete morado. */}
      <Svg width={size} height={size} style={StyleSheet.absoluteFill} pointerEvents="none">
        <Circle cx={c} cy={c} r={inner / 2 - 0.5} stroke={PORTRAIT.lila} strokeOpacity={0.55} strokeWidth={1} fill="none" />
      </Svg>
      {tag ? (
        <View style={[styles.tagRow, { bottom: -Math.round(size * 0.05) }]} pointerEvents="none">
          <View style={[styles.tag, { backgroundColor: hi }]}>
            <T variant="tiny" color={PORTRAIT.ink} style={{ fontSize: Math.max(10, Math.round(size * 0.09)), letterSpacing: 0.5 }}>
              {tag}
            </T>
          </View>
        </View>
      ) : null}
    </View>
  );
});

const styles = StyleSheet.create({
  photo: { position: 'absolute', overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  tagRow: { position: 'absolute', left: 0, right: 0, alignItems: 'center' },
  tag: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999, borderWidth: 2, borderColor: PORTRAIT.plate },
});
