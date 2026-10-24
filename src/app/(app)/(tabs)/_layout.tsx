import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router/js-tabs';
import { useWindowDimensions } from 'react-native';
import { colors } from '../../../ui/theme';

export default function TabLayout() {
  const { width } = useWindowDimensions();
  const wide = width >= 980;
  const icon =
    (name: keyof typeof Ionicons.glyphMap) =>
    ({ color, size }: { color: unknown; size: number }) => (
      <Ionicons name={name} color={typeof color === 'string' ? color : colors.muted} size={size} />
    );

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarPosition: wide ? 'left' : 'bottom',
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.muted,
        tabBarStyle: wide
          ? { backgroundColor: colors.bgElevated, borderRightColor: colors.line, width: 220 }
          : {
              backgroundColor: colors.bgElevated,
              borderTopColor: colors.line,
              height: 68,
              paddingBottom: 8,
              paddingTop: 6,
            },
        tabBarLabelStyle: { fontFamily: 'Sora_500Medium', fontSize: 11 },
      }}
    >
      <Tabs.Screen name="inicio" options={{ title: 'Inicio', tabBarIcon: icon('home') }} />
      <Tabs.Screen name="amigos" options={{ title: 'Amigos', tabBarIcon: icon('people') }} />
      <Tabs.Screen name="jugar" options={{ title: 'Jugar', tabBarIcon: icon('flash') }} />
      <Tabs.Screen name="grupos" options={{ title: 'Grupos', tabBarIcon: icon('shield') }} />
      <Tabs.Screen name="perfil" options={{ title: 'Perfil', tabBarIcon: icon('person') }} />
    </Tabs>
  );
}
