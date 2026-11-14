// Confirmación de «Pide tu espacio» (maqueta de Stan, assets/anuncios/confirmacion-solicitud.png),
// con los datos reales que la persona acaba de enviar.
import { useLocalSearchParams } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import Svg, { Circle, Defs, Ellipse, LinearGradient, Path, RadialGradient, Stop } from 'react-native-svg';
import { AD_SPACE, isAdSection } from '../../../domain/ad-request';
import { Icon } from '../../../ui/icon';
import { navigate } from '../../../ui/nav';
import { SportPress } from '../../../ui/press';
import { Screen } from '../../../ui/screen';
import { T } from '../../../ui/text';
import { colors, font, hex, space } from '../../../ui/theme';

const STAGE = 230;
// Dorado suave de la maqueta (no el amarillo de marca).
const GOLD = '#D9B45A';
const DOTS = 28;

export default function AdRequestSent() {
  const params = useLocalSearchParams<{ negocio?: string; espacio?: string; contacto?: string }>();
  const rows: [string, string][] = [
    ['Negocio', String(params.negocio ?? '').trim() || '—'],
    ['Sección', isAdSection(params.espacio) ? AD_SPACE[params.espacio].label : '—'],
    ['Contacto', String(params.contacto ?? '').trim() || '—'],
  ];
  return (
    <Screen>
      <View style={styles.stage} accessible accessibilityRole="image" accessibilityLabel="Solicitud enviada">
        <Svg width="100%" height={STAGE + 40} viewBox={`0 0 360 ${STAGE + 40}`} style={StyleSheet.absoluteFill}>
          <Defs>
            <LinearGradient id="beamL" x1="0" y1="0" x2="1" y2="1">
              <Stop offset="0" stopColor="#FFFFFF" stopOpacity="0.16" />
              <Stop offset="1" stopColor="#FFFFFF" stopOpacity="0" />
            </LinearGradient>
            <LinearGradient id="beamR" x1="1" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor={hex.violet} stopOpacity="0.3" />
              <Stop offset="1" stopColor={hex.violet} stopOpacity="0" />
            </LinearGradient>
            <RadialGradient id="floor" cx="50%" cy="50%" rx="50%" ry="50%">
              <Stop offset="0" stopColor={GOLD} stopOpacity="0.35" />
              <Stop offset="1" stopColor={hex.gold} stopOpacity="0" />
            </RadialGradient>
          </Defs>
          <Path d={`M0 0 L70 0 L190 ${STAGE + 20} L60 ${STAGE + 20} Z`} fill="url(#beamL)" />
          <Path d={`M290 0 L360 0 L300 ${STAGE + 20} L170 ${STAGE + 20} Z`} fill="url(#beamR)" />
          <Ellipse cx="180" cy={STAGE + 14} rx="150" ry="26" fill="url(#floor)" />
          {Array.from({ length: DOTS }, (_, i) => {
            const a = (i / DOTS) * Math.PI * 2;
            return <Circle key={i} cx={180 + Math.cos(a) * 112} cy={STAGE / 2 + Math.sin(a) * 112} r={2.2} fill={i % 2 ? GOLD : hex.faint} opacity={i % 2 ? 0.9 : 0.6} />;
          })}
          <Circle cx="180" cy={STAGE / 2} r="88" fill={hex.ink} stroke={GOLD} strokeOpacity={0.45} strokeWidth={1.5} />
        </Svg>
        <View style={styles.check}>
          <Icon name="confirmado" size={58} color={colors.accentInk} />
        </View>
      </View>

      <View style={styles.strip}>
        <T variant="strong" color={colors.accentInk} style={styles.stripMain}>
          Solicitud enviada
        </T>
        <View style={styles.stripTag}>
          <T variant="label" color={colors.ink}>
            En revisión
          </T>
        </View>
      </View>

      <View style={styles.copy}>
        <T variant="display" style={styles.title}>
          Recibimos tu solicitud, la revisamos y te contactamos.
        </T>
        <T color={colors.muted}>Te escribimos al correo o teléfono que nos dejaste para afinar tu anuncio antes de publicarlo.</T>
      </View>

      <View style={styles.summary}>
        {rows.map(([label, value], i) => (
          <View key={label} style={[styles.row, i > 0 && styles.rowLine]}>
            <T color={colors.muted} style={styles.rowLabel}>
              {label}
            </T>
            <T variant="strong" style={styles.rowValue} numberOfLines={2}>
              {value}
            </T>
          </View>
        ))}
      </View>

      <SportPress onPress={() => navigate('/inicio')} style={styles.home} accessibilityRole="button" accessibilityLabel="Volver al inicio">
        <Icon name="atras" size={20} color={colors.accentInk} />
        <T style={styles.homeLabel} color={colors.accentInk}>
          Volver al inicio
        </T>
      </SportPress>
    </Screen>
  );
}

const styles = StyleSheet.create({
  stage: { height: STAGE + 40, alignItems: 'center', justifyContent: 'flex-start', marginHorizontal: -space.lg },
  check: { position: 'absolute', top: STAGE / 2 - 62, width: 124, height: 124, borderRadius: 62, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center' },
  strip: { flexDirection: 'row', alignItems: 'stretch', borderRadius: 4, overflow: 'hidden', minHeight: 46 },
  stripMain: { flex: 1, backgroundColor: colors.accent, paddingHorizontal: space.lg, textAlignVertical: 'center', paddingVertical: 12 },
  stripTag: { backgroundColor: GOLD, paddingHorizontal: space.lg, justifyContent: 'center' },
  copy: { gap: space.md },
  title: { fontSize: 27, lineHeight: 32 },
  summary: { borderRadius: 16, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.bgDeep, paddingHorizontal: space.lg },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingVertical: 14 },
  rowLine: { borderTopWidth: 1, borderTopColor: colors.line },
  rowLabel: { fontSize: 14 },
  rowValue: { flex: 1, textAlign: 'right' },
  home: { minHeight: 58, borderRadius: 16, backgroundColor: colors.accent, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: space.sm },
  homeLabel: { fontFamily: font.bold, fontSize: 18 },
});
