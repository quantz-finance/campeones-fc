import { Redirect } from 'expo-router';
import { Platform } from 'react-native';
import { useApp } from '../state/app-provider';
import { Landing } from '../ui/landing';

/** En el iPhone no hay landing: la primera pantalla es la de la app (entrar o inicio). La web conserva su portada. */
export default function Index() {
  const { ready, userId } = useApp();
  if (!ready) return null;
  if (userId) return <Redirect href="/inicio" />;
  if (Platform.OS !== 'web') return <Redirect href="/entrar" />;
  return <Landing />;
}
