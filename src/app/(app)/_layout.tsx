import { Redirect, Stack, useSegments } from 'expo-router';
import { View } from 'react-native';
import { useApp } from '../../state/app-provider';
import { NoticeToast } from '../../ui/notice-toast';
import { Screen } from '../../ui/screen';
import { spectatorAllows } from '../../ui/spectator-routes';
import { SpectatorInvite } from '../../ui/spectator';
import { colors } from '../../ui/theme';

export default function AppStack() {
  const { ready, userId, spectator } = useApp();
  const segments = useSegments() as string[];
  if (!ready) return null;
  if (!userId) return <Redirect href="/entrar" />;
  // Espectador: fuera de las pantallas de solo mirar (amigos, avisos, crear grupo o torneo, versus...) va la invitación.
  if (spectator && !spectatorAllows(segments)) {
    return (
      <Screen>
        <SpectatorInvite title="Esto es para jugadores" body="Crea tu perfil para retar, invitar amigos y ver tus estadísticas. Como espectador puedes ver grupos, copas y partidos." back />
      </Screen>
    );
  }
  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <Stack screenOptions={{ headerShown: false, animation: 'none', contentStyle: { backgroundColor: colors.bg } }} />
      {spectator ? null : <NoticeToast />}
    </View>
  );
}
