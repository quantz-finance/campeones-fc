import { Ionicons } from '@expo/vector-icons';
import { type Href } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, font } from './theme';
import { T } from './text';
import { BrandIcon, tabBarSpace, type BrandIconName } from './broadcast';
import { navigate } from './nav';
import { SportPress } from './press';

const items: { name: string; label: string; icon: BrandIconName; plus?: boolean }[] = [
  { name: 'inicio', label: 'Inicio', icon: 'home' },
  { name: 'grupos', label: 'Grupos', icon: 'friends' },
  { name: 'jugar', label: 'Registrar', icon: 'add', plus: true },
  { name: 'torneos', label: 'Torneos', icon: 'tournaments' },
  { name: 'perfil', label: 'Perfil', icon: 'person' },
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
                <Ionicons name="add" size={28} color={colors.accentInk} />
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
            <BrandIcon name={item.icon} size={22} color={on ? colors.accentText : colors.faint} />
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
  tab: { width: 68, alignItems: 'center', gap: 3, paddingBottom: 2, position: 'relative' },
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
