// Botones del cajón «Entrar» con los logos oficiales (paquete de Stan, assets/login; guías de Apple y Google en su README).
// - Apple: estilo White sobre fondo oscuro: botón blanco, logo y texto negros. El arte oficial va a la altura del botón, sin recortar.
// - Google: tema claro oficial (#FFFFFF, borde #747775, texto #1F1F1F) con la G oficial en PNG (el SVG usa filtros que
//   react-native-svg no pinta). Nunca la G sobre morado ni recoloreada.
// - Textos: la tipografía de los botones de la app (buttonLabel en controls.tsx), no Google Sans ni la del sistema.
// - Correo: nuestro sobre (iconos de interfaz) en un botón verde de la app.
import type { ReactNode } from 'react';
import { ActivityIndicator, Image, Pressable, StyleSheet, View } from 'react-native';
import { SvgXml } from 'react-native-svg';
import type { NativeProvider } from '../lib/cavos/use-entry';
import { Icon } from './icon';
import { buttonLabel } from './controls';
import { T } from './text';

const H = 48; // misma altura para los tres: ninguno más chico que otro (Apple y Google lo piden)
const APPLE_LOGO = `<svg width="31px" height="44px" viewBox="0 0 31 44" version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink"> <g id="Left-Black-Logo-Medium" stroke="none" stroke-width="1" fill="none" fill-rule="evenodd"> <rect id="Rectangle" fill="#FFFFFF" x="0" y="0" width="31" height="44"></rect> <path d="M15.7099491,14.8846154 C16.5675461,14.8846154 17.642562,14.3048315 18.28274,13.5317864 C18.8625238,12.8312142 19.2852829,11.852829 19.2852829,10.8744437 C19.2852829,10.7415766 19.2732041,10.6087095 19.2490464,10.5 C18.2948188,10.5362365 17.1473299,11.140178 16.4588366,11.9494596 C15.9152893,12.56548 15.4200572,13.5317864 15.4200572,14.5222505 C15.4200572,14.6671964 15.4442149,14.8121424 15.4562937,14.8604577 C15.5166879,14.8725366 15.6133185,14.8846154 15.7099491,14.8846154 Z M12.6902416,29.5 C13.8618881,29.5 14.3812778,28.714876 15.8428163,28.714876 C17.3285124,28.714876 17.6546408,29.4758423 18.9591545,29.4758423 C20.2395105,29.4758423 21.0971074,28.292117 21.9063891,27.1325493 C22.8123013,25.8038779 23.1867451,24.4993643 23.2109027,24.4389701 C23.1263509,24.4148125 20.6743484,23.4122695 20.6743484,20.5979021 C20.6743484,18.1579784 22.6069612,17.0588048 22.7156707,16.974253 C21.4353147,15.1382708 19.490623,15.0899555 18.9591545,15.0899555 C17.5217737,15.0899555 16.3501271,15.9596313 15.6133185,15.9596313 C14.8161157,15.9596313 13.7652575,15.1382708 12.521138,15.1382708 C10.1536872,15.1382708 7.75,17.0950413 7.75,20.7911634 C7.75,23.0861411 8.64383344,25.513986 9.74300699,27.0842339 C10.6851558,28.4129053 11.5065162,29.5 12.6902416,29.5 Z" id="" fill="#000000" fill-rule="nonzero"></path> </g> </svg>`;

type Props = { onPress: () => void; disabled?: boolean; pending?: boolean };

function Shell({ onPress, disabled, pending, style, label, children }: Props & { style: object; label: string; children: ReactNode }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: !!disabled || !!pending, busy: !!pending }}
      disabled={disabled || pending}
      onPress={onPress}
      style={({ pressed }) => [styles.base, style, (disabled || pending) && styles.dim, pressed && styles.pressed]}
    >
      {children}
    </Pressable>
  );
}

export function AppleButton(p: Props) {
  return (
    <Shell {...p} label="Continuar con Apple" style={styles.apple}>
      <View style={styles.row}>
        <SvgXml xml={APPLE_LOGO} width={(31 / 44) * H} height={H} />
        <T variant="title" color="#000000" style={[buttonLabel, styles.appleText]}>
          Continuar con Apple
        </T>
      </View>
      {p.pending ? <ActivityIndicator style={styles.spin} color="#000000" /> : null}
    </Shell>
  );
}

export function GoogleButton(p: Props) {
  return (
    <Shell {...p} label="Continuar con Google" style={styles.google}>
      <View style={styles.row}>
        <Image source={require('../../assets/login/google-g.png')} style={styles.g} />
        <T variant="title" color="#1F1F1F" style={buttonLabel}>
          Continuar con Google
        </T>
      </View>
      {p.pending ? <ActivityIndicator style={styles.spin} color="#1F1F1F" /> : null}
    </Shell>
  );
}

export function EmailButton(p: Props) {
  return (
    <Shell {...p} label="Continuar con correo" style={styles.email}>
      <View style={styles.row}>
        <Icon name="correo" size={22} color="#37003C" />
        <T variant="title" color="#37003C" style={[buttonLabel, styles.emailText]}>
          Continuar con correo
        </T>
      </View>
      {p.pending ? <ActivityIndicator style={styles.spin} color="#37003C" /> : null}
    </Shell>
  );
}

export function ProviderButton({ provider, ...p }: Props & { provider: NativeProvider }) {
  if (provider === 'apple') return <AppleButton {...p} />;
  if (provider === 'google') return <GoogleButton {...p} />;
  return <EmailButton {...p} />;
}

const styles = StyleSheet.create({
  base: { height: H, minWidth: 140, borderRadius: H / 2, alignItems: 'center', justifyContent: 'center', overflow: 'hidden', alignSelf: 'stretch' },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  dim: { opacity: 0.5 },
  pressed: { opacity: 0.85, transform: [{ scale: 0.985 }] },
  spin: { position: 'absolute', right: 18 },
  apple: { backgroundColor: '#FFFFFF' },
  // Misma tipografía que todos los botones de la app (buttonLabel: Outfit 700, 17). El logo ya trae su margen.
  appleText: { marginRight: 8 },
  google: { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#747775' },
  // La G de la grilla de 24 trae 2 px de aire por lado: a 24 pt queda una G de 20 pt (medida oficial).
  g: { width: 24, height: 24, marginRight: 10 },
  email: { backgroundColor: '#00FF87' },
  emailText: { marginLeft: 10 },
});
