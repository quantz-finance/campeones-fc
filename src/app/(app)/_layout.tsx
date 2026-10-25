import { Redirect, Stack } from 'expo-router';
import { useApp } from '../../state/app-provider';
import { colors } from '../../ui/theme';

export default function AppStack() {
  const { ready, userId } = useApp();
  if (!ready) return null;
  if (!userId) return <Redirect href="/entrar" />;
  return (
    <Stack screenOptions={{ headerShown: false, animation: 'fade', animationDuration: 180, contentStyle: { backgroundColor: colors.bg } }} />
  );
}
