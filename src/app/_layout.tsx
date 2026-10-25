import { Anton_400Regular } from '@expo-google-fonts/anton';
import {
  Archivo_400Regular,
  Archivo_500Medium,
  Archivo_600SemiBold,
  Archivo_700Bold,
} from '@expo-google-fonts/archivo';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useFonts } from 'expo-font';
import { useEffect } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AppProvider } from '../state/app-provider';
import { colors } from '../ui/theme';

void SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [loaded, error] = useFonts({
    Anton_400Regular,
    Archivo_400Regular,
    Archivo_500Medium,
    Archivo_600SemiBold,
    Archivo_700Bold,
    ArchivoEtiqueta_600SemiBold: require('../../assets/fonts/ArchivoEtiqueta-SemiBold.ttf'),
    ArchivoEtiqueta_700Bold: require('../../assets/fonts/ArchivoEtiqueta-Bold.ttf'),
    ArchivoEtiqueta_800ExtraBold: require('../../assets/fonts/ArchivoEtiqueta-ExtraBold.ttf'),
  });

  useEffect(() => {
    if (!loaded && !error) return;
    void SplashScreen.hideAsync();
    // Web: quita el splash inline de public/index.html.
    if (typeof document !== 'undefined') {
      const splash = document.getElementById('boot-splash');
      if (splash) {
        splash.classList.add('out');
        setTimeout(() => splash.remove(), 300);
      }
    }
  }, [loaded, error]);

  if (!loaded && !error) return null;

  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      <AppProvider>
        <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg } }} />
      </AppProvider>
    </SafeAreaProvider>
  );
}
