import { Redirect } from 'expo-router';
import { useApp } from '../state/app-provider';

export default function Index() {
  const { ready, userId } = useApp();
  if (!ready) return null;
  if (!userId) return <Redirect href="/entrar" />;
  return <Redirect href="/inicio" />;
}
