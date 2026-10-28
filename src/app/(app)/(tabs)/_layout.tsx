import { Tabs } from 'expo-router/js-tabs';
import { BroadcastTabs } from '../../../ui/tabs';
import { colors } from '../../../ui/theme';
import { transit } from '../../../ui/nav';

export default function TabLayout() {
  return (
    <Tabs
      tabBar={(props) => (
        <BroadcastTabs
          state={props.state}
          onNavigate={(name) => {
            const route = props.state.routes.find((item) => item.name === name);
            const current = props.state.routes[props.state.index];
            if (!route || route.key === current?.key) return;
            transit(() => props.navigateToTab(route.key));
          }}
        />
      )}
      screenOptions={{
        headerShown: false,
        animation: 'none',
        sceneStyle: { backgroundColor: colors.bg },
        tabBarStyle: {
          position: 'absolute',
          backgroundColor: 'transparent',
          borderTopWidth: 0,
          elevation: 0,
          height: 96,
        },
      }}
    >
      <Tabs.Screen name="inicio" options={{ title: 'Inicio' }} />
      <Tabs.Screen name="grupos" options={{ title: 'Grupos' }} />
      <Tabs.Screen name="jugar" options={{ title: 'Registrar' }} />
      <Tabs.Screen name="torneos" options={{ title: 'Torneos' }} />
      <Tabs.Screen name="perfil" options={{ title: 'Perfil' }} />
    </Tabs>
  );
}
