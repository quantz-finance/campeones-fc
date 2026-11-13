import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useFonts } from 'expo-font';
import { useEffect } from 'react';
import { Platform } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { startPwaUpdates } from '../lib/pwa-update';
import { AppProvider, useAppMaybe } from '../state/app-provider';
import { colors } from '../ui/theme';
import { ErrorScreen } from '../ui/error-screen';
import { TransitionHost } from '../ui/transition';
import { LaunchIntro } from '../ui/launch-intro';

void SplashScreen.preventAutoHideAsync();

/** expo-router: si una pantalla falla al pintar, se muestra esto (con Reintentar) y el error se reporta. */
export function ErrorBoundary(props: { error: Error; retry: () => Promise<void> }) {
  if (typeof document !== 'undefined') document.getElementById('boot-splash')?.remove();
  return <ErrorScreen {...props} />;
}

export default function RootLayout() {
  useEffect(() => startPwaUpdates(), []);

  // Web: Outfit autoalojada con un @font-face por peso (public/index.html). Nativo: la variable en assets.
  // iOS no fija el peso de una fuente variable por familia: usamos un archivo estático por peso.
  const [loaded, error] = useFonts(
    Platform.OS === 'web'
      ? {}
      : {
          Outfit_400: require('../../assets/fonts/Outfit-400.ttf'),
          Outfit_500: require('../../assets/fonts/Outfit-500.ttf'),
          Outfit_600: require('../../assets/fonts/Outfit-600.ttf'),
          Outfit_700: require('../../assets/fonts/Outfit-700.ttf'),
          Outfit_800: require('../../assets/fonts/Outfit-800.ttf'),
        },
  );

  if (!loaded && !error) return null;

  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      <AppProvider>
        <TransitionHost>
          <BootSplash />
          <Stack screenOptions={{ headerShown: false, animation: 'none', contentStyle: { backgroundColor: colors.bg } }} />
          <LaunchIntro />
        </TransitionHost>
      </AppProvider>
    </SafeAreaProvider>
  );
}

/** Mantiene el splash (nativo + inline web) hasta que fuentes y sesión están listas: sin pantalla vacía entre ambos. */
function BootSplash() {
  const app = useAppMaybe();
  const ready = app ? app.ready : true;
  useEffect(() => {
    if (!ready) return;
    void SplashScreen.hideAsync();
    if (typeof document !== 'undefined') {
      const splash = document.getElementById('boot-splash');
      if (splash) {
        splash.classList.add('out');
        setTimeout(() => splash.remove(), 220);
      }
    }
  }, [ready]);
  return null;
}
