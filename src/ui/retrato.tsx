// Piezas compartidas del estilo «Retrato a sangre» (propuesta 2 de Stan): Cara a cara y Marcador.
// Dos fotos cuadradas a sangre partidas por una diagonal dorada y el título sobre una banda oscura.
import { Image } from 'expo-image';
import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Defs, Line, LinearGradient, Rect, Stop } from 'react-native-svg';
import { monogram } from './format';
import { Icon } from './icon';
import { back } from './nav';
import { SportPress } from './press';
import { T } from './text';
import { VERSUS } from './versus-data';

const C = VERSUS;
/** Foto cuadrada de 300 pt en el mockup de 390 pt. */
export const RETRATO_PHOTO = 300;

type Person = { displayName: string; photoUrl?: string | null };

/** Título sobre una banda oscura que se funde: se lee encima de las caras. */
export function RetratoHeader({ top, kicker, title, right, kickerColor = C.you, id = 'rt' }: { top: number; kicker: string; title: string; right?: ReactNode; kickerColor?: string; id?: string }) {
  const band = top + 92;
  return (
    <View style={[styles.header, { height: band }]} pointerEvents="box-none">
      <Svg style={StyleSheet.absoluteFill} width="100%" height={band} pointerEvents="none">
        <Defs>
          <LinearGradient id={`${id}Band`} x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor="#1A001F" stopOpacity={0.88} />
            <Stop offset="0.62" stopColor="#1A001F" stopOpacity={0.62} />
            <Stop offset="1" stopColor="#1A001F" stopOpacity={0} />
          </LinearGradient>
        </Defs>
        <Rect x="0" y="0" width="100%" height={band} fill={`url(#${id}Band)`} />
      </Svg>
      <View style={[styles.headerRow, { marginTop: top + 25 }]}>
        <SportPress onPress={() => back()} style={styles.round} accessibilityRole="button" accessibilityLabel="Volver" hitSlop={8}>
          <Icon name="atras" size={18} color="#FFFFFF" />
        </SportPress>
        <View style={styles.headerText}>
          <T variant="label" color={kickerColor} style={styles.kicker} numberOfLines={1}>
            {kicker}
          </T>
          <T variant="display" style={styles.title} numberOfLines={1}>
            {title}
          </T>
        </View>
        {right}
      </View>
    </View>
  );
}

/** Botón cuadrado redondeado del encabezado (compartir, etc.). */
export function RetratoHeaderButton({ icon, label, onPress }: { icon: 'compartir'; label: string; onPress: () => void }) {
  return (
    <SportPress onPress={onPress} style={[styles.round, styles.square]} accessibilityRole="button" accessibilityLabel={label} hitSlop={8}>
      <Icon name={icon} size={18} color="#FFFFFF" />
    </SportPress>
  );
}

/**
 * Las dos fotos cuadradas a sangre, partidas por una diagonal dorada (58 % arriba → 42 % abajo).
 * La del rival va en un panel inclinado (skewX) con la foto contra-inclinada: se ve recta y el borde
 * del panel hace la diagonal. Sin foto: iniciales grandes sobre el degradado de su lado.
 */
/** `fadeTo`: fracción del alto donde el degradado llega al fondo (1 = abajo del todo; menos si el héroe es más alto que las fotos). */
export function SplitPortraits({ you, them, W, k, heroH, extra, dim = false, id = 'rt', fadeTo = 1 }: { you: Person; them: Person; W: number; k: number; heroH: number; extra: number; dim?: boolean; id?: string; fadeTo?: number }) {
  const mid = W / 2;
  const topX = W * 0.58;
  const bottomX = W * 0.42;
  const skew = (Math.atan((topX - bottomX) / heroH) * 180) / Math.PI;
  const size = RETRATO_PHOTO * k;
  const panelW = W - mid + 120;
  const youLeft = mid - 243 * k;
  const themLeft = mid - 57 * k;
  return (
    <View style={[StyleSheet.absoluteFill, { overflow: 'hidden', backgroundColor: C.plate }]} pointerEvents="none">
      <Portrait side="you" profile={you} left={youLeft} top={6 + extra} size={size} id={id} />
      <View style={{ position: 'absolute', top: 0, left: mid, width: panelW, height: heroH, overflow: 'hidden', transform: [{ skewX: `-${skew}deg` }] }}>
        <View style={{ position: 'absolute', top: 0, left: 0, width: panelW, height: heroH, backgroundColor: C.plate, transform: [{ skewX: `${skew}deg` }] }}>
          <Portrait side="them" profile={them} left={themLeft - mid} top={10 + extra} size={size} id={id} />
        </View>
      </View>
      <Svg style={StyleSheet.absoluteFill} width={W} height={heroH} pointerEvents="none">
        <Defs>
          <LinearGradient id={`${id}Fade`} x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor="#24002A" stopOpacity={0.6} />
            <Stop offset={0.26 * fadeTo} stopColor="#37003C" stopOpacity={0} />
            <Stop offset={0.55 * fadeTo} stopColor="#37003C" stopOpacity={0.15} />
            <Stop offset={0.97 * fadeTo} stopColor={C.plate} stopOpacity={1} />
            <Stop offset="1" stopColor={C.plate} stopOpacity={1} />
          </LinearGradient>
        </Defs>
        <Line x1={topX} y1={0} x2={bottomX} y2={heroH} stroke={C.them} strokeWidth={3} />
        <Rect x={0} y={0} width={W} height={heroH} fill={`url(#${id}Fade)`} />
        {dim ? <Rect x={0} y={0} width={W} height={heroH} fill="#2A0030" opacity={0.35} /> : null}
      </Svg>
    </View>
  );
}

export function Portrait({ side, profile, left, top, size, id = 'rt' }: { side: 'you' | 'them'; profile: Person; left: number; top: number; size: number; id?: string }) {
  const box = { position: 'absolute' as const, left, top, width: size, height: size };
  if (profile.photoUrl) {
    return (
      <Image
        source={{ uri: profile.photoUrl }}
        recyclingKey={profile.photoUrl}
        style={box}
        contentFit="cover"
        cachePolicy="memory-disk"
        transition={0}
        accessibilityLabel={profile.displayName}
      />
    );
  }
  return <Monogram side={side} name={profile.displayName} style={box} size={size} id={`${id}I${side}`} big />;
}

/** Iniciales sobre el degradado del lado (foto grande o miniatura de 36 pt). */
export function Monogram({ side, name, size, style, id, big = false }: { side: 'you' | 'them'; name: string; size: number; style?: object; id: string; big?: boolean }) {
  const color = side === 'you' ? C.you : C.them;
  return (
    <View style={[style, styles.initialsBox]} accessibilityRole="image" accessibilityLabel={name}>
      <Svg style={StyleSheet.absoluteFill} width={size} height={size} pointerEvents="none">
        <Defs>
          <LinearGradient id={id} x1={side === 'you' ? '0' : '1'} y1="0" x2={side === 'you' ? '1' : '0'} y2="1">
            <Stop offset="0" stopColor={color} stopOpacity={big ? 0.2 : 0.32} />
            <Stop offset="0.7" stopColor={color} stopOpacity={big ? 0.06 : 0.14} />
            <Stop offset="1" stopColor={color} stopOpacity={big ? 0 : 0.08} />
          </LinearGradient>
        </Defs>
        <Rect x={0} y={0} width={size} height={size} fill={`url(#${id})`} />
      </Svg>
      <T
        variant="display"
        style={[big ? styles.initials : styles.initialsSmall, { color, fontSize: size * (big ? 0.3 : 0.38), lineHeight: size * (big ? 0.36 : 0.46) }]}
        numberOfLines={1}
      >
        {monogram(name)}
      </T>
    </View>
  );
}

/** Miniatura cuadrada (tarjetas de voto): foto o iniciales, con borde del color del lado. */
export function Thumb({ side, profile, size = 36, id }: { side: 'you' | 'them'; profile: Person; size?: number; id: string }) {
  const color = side === 'you' ? C.you : C.them;
  const frame = { width: size, height: size, borderRadius: 6, borderWidth: 1.5, borderColor: color, overflow: 'hidden' as const };
  if (profile.photoUrl) {
    return <Image source={{ uri: profile.photoUrl }} recyclingKey={profile.photoUrl} style={frame} contentFit="cover" contentPosition={{ top: '18%' }} cachePolicy="memory-disk" transition={0} accessibilityLabel={profile.displayName} />;
  }
  return <Monogram side={side} name={profile.displayName} size={size - 3} style={frame} id={id} />;
}

const plain = { textTransform: 'none' as const, fontStyle: 'normal' as const };

const styles = StyleSheet.create({
  header: { position: 'absolute', top: 0, left: 0, right: 0, zIndex: 20 },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16 },
  headerText: { flex: 1, minWidth: 0 },
  kicker: { fontSize: 11, lineHeight: 14, letterSpacing: 1.4 },
  title: { ...plain, fontSize: 28, lineHeight: 30, letterSpacing: -0.5, color: '#FFFFFF' },
  round: { width: 38, height: 38, borderRadius: 19, borderWidth: 1, borderColor: 'rgba(201,162,255,0.3)', backgroundColor: 'rgba(36,0,42,0.5)', alignItems: 'center', justifyContent: 'center' },
  square: { borderRadius: 12 },
  initialsBox: { alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  initials: { ...plain, letterSpacing: -2, opacity: 0.6, marginTop: 24 },
  initialsSmall: { ...plain, letterSpacing: -0.5 },
});
