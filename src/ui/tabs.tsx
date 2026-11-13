import { type Href } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, font, space } from './theme';
import { T } from './text';
import { tabBarSpace } from './broadcast';
import { Icon, NavIcon, type NavIconName } from './icon';
import { navigate } from './nav';
import { SportPress } from './press';

// Iconos de Stan (assets/iconos-ui/nav): trazo inactivo, sólido activo.
const items: { name: string; label: string; icon: NavIconName; plus?: boolean }[] = [
  { name: 'inicio', label: 'Inicio', icon: 'inicio' },
  { name: 'grupos', label: 'Grupos', icon: 'grupos' },
  { name: 'jugar', label: 'Registrar', icon: 'registrar', plus: true },
  { name: 'torneos', label: 'Torneos', icon: 'torneos' },
  { name: 'perfil', label: 'Perfil', icon: 'perfil' },
];

function Bar({
  height,
  inset,
  active,
  onPress,
}: {
  height: number;
  inset: number;
  active: string | null;
  onPress: (name: string) => void;
}) {
  return (
    <View style={[styles.bar, { height, paddingBottom: Math.max(inset, 8) }]}>
      {items.map((item) => {
        const on = active === item.name;
        if (item.plus) {
          return (
            <SportPress
              key={item.name}
              accessibilityLabel={item.label}
              accessibilityState={{ selected: on }}
              onPress={() => onPress(item.name)}
              style={styles.tab}
            >
              <View style={styles.plus}>
                <Icon name="agregar" size={26} color={colors.accentInk} />
              </View>
              <T variant="label" color={colors.text} style={styles.caption}>
                {item.label}
              </T>
            </SportPress>
          );
        }
        return (
          <SportPress
            key={item.name}
            accessibilityLabel={item.label}
            accessibilityState={{ selected: on }}
            onPress={() => onPress(item.name)}
            style={styles.tab}
          >
            {on ? <View style={styles.mark} /> : <View style={styles.markOff} />}
            <NavIcon name={item.icon} active={on} size={24} color={on ? colors.text : colors.faint} />
            <T variant="label" color={on ? colors.text : colors.faint} style={styles.caption}>
              {item.label}
            </T>
          </SportPress>
        );
      })}
    </View>
  );
}

export function BroadcastTabs({
  state,
  onNavigate,
}: {
  state: { index: number; routes: { key: string; name: string }[] };
  onNavigate: (name: string) => void;
}) {
  const insets = useSafeAreaInsets();
  const active = state.routes[state.index]?.name ?? null;
  return <Bar height={tabBarSpace(insets.bottom)} inset={insets.bottom} active={active} onPress={onNavigate} />;
}

export function TabReplica({ active }: { active: 'inicio' | 'grupos' | 'jugar' | 'torneos' | 'perfil' }) {
  const insets = useSafeAreaInsets();
  return (
    <Bar
      height={tabBarSpace(insets.bottom)}
      inset={insets.bottom}
      active={active}
      onPress={(name) => {
        if (name === active) return;
        navigate(`/${name}` as Href);
      }}
    />
  );
}

const styles = StyleSheet.create({
  bar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: colors.bgDeep,
    borderTopWidth: 1,
    borderTopColor: colors.line,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'flex-end',
    paddingTop: 10,
    zIndex: 40,
  },
  tab: { width: 68, alignItems: 'center', gap: space.xs, paddingBottom: 2, position: 'relative' },
  caption: { fontSize: 10, fontFamily: font.label, letterSpacing: 0.4, textTransform: 'none' },
  mark: {
    position: 'absolute',
    top: -8,
    width: 24,
    height: 4,
    borderRadius: 999,
    backgroundColor: colors.yellow,
  },
  markOff: { height: 4 },
  plus: {
    width: 48,
    height: 48,
    borderRadius: 999,
    backgroundColor: colors.yellow,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -18,
    borderWidth: 4,
    borderColor: colors.bgDeep,
  },
});
