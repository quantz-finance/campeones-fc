import { Anton_400Regular } from '@expo-google-fonts/anton';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useFonts } from 'expo-font';
import { useEffect } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AppProvider, useAppMaybe } from '../state/app-provider';
import { colors } from '../ui/theme';
import { TransitionHost } from '../ui/transition';

void SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [loaded, error] = useFonts({
    Anton_400Regular,
    Barlow_400Regular: require('../../assets/fonts/Barlow-Regular.ttf'),
    Barlow_500Medium: require('../../assets/fonts/Barlow-Medium.ttf'),
    Barlow_600SemiBold: require('../../assets/fonts/Barlow-SemiBold.ttf'),
    ArchivoEtiqueta_600SemiBold: require('../../assets/fonts/ArchivoEtiqueta-SemiBold.ttf'),
    ArchivoEtiqueta_700Bold: require('../../assets/fonts/ArchivoEtiqueta-Bold.ttf'),
    ArchivoEtiqueta_800ExtraBold: require('../../assets/fonts/ArchivoEtiqueta-ExtraBold.ttf'),
  });

  if (!loaded && !error) return null;

  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      <AppProvider>
        <TransitionHost>
          <BootSplash />
          <Stack screenOptions={{ headerShown: false, animation: 'none', contentStyle: { backgroundColor: colors.bg } }} />
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
