import { Redirect, Stack } from 'expo-router';
import { View } from 'react-native';
import { useApp } from '../../state/app-provider';
import { NoticeToast } from '../../ui/notice-toast';
import { colors } from '../../ui/theme';

export default function AppStack() {
  const { ready, userId, consent } = useApp();
  if (!ready) return null;
  if (!userId) return <Redirect href="/entrar" />;
  if (consent === 'loading') return <View style={{ flex: 1, backgroundColor: colors.bg }} />;
  if (consent === 'missing') return <Redirect href="/consentimiento" />;
  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <Stack screenOptions={{ headerShown: false, animation: 'none', contentStyle: { backgroundColor: colors.bg } }} />
      <NoticeToast />
    </View>
  );
}
