import { Ionicons } from '@expo/vector-icons';
import { router, type Href } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, font } from './theme';
import { T } from './text';
import { tabBarSpace } from './broadcast';

const items: { name: string; label: string; icon: keyof typeof Ionicons.glyphMap; plus?: boolean }[] = [
  { name: 'inicio', label: 'Inicio', icon: 'home' },
  { name: 'grupos', label: 'Grupos', icon: 'shield' },
  { name: 'jugar', label: 'Registrar', icon: 'add', plus: true },
  { name: 'torneos', label: 'Torneos', icon: 'trophy' },
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
      <View style={styles.stripe} pointerEvents="none">
        <View style={[styles.stripeBit, { backgroundColor: colors.red }]} />
        <View style={[styles.stripeBit, { backgroundColor: colors.yellow }]} />
        <View style={[styles.stripeBit, { backgroundColor: colors.blue }]} />
      </View>
      {items.map((item) => {
        const on = active === item.name;
        if (item.plus) {
          return (
            <Pressable
              key={item.name}
             
              accessibilityLabel={item.label}
              accessibilityState={{ selected: on }}
              onPress={() => onPress(item.name)}
              style={styles.tab}
            >
              <View style={styles.plusShadow} />
              <View style={styles.plus}>
                <Ionicons name="add" size={26} color={colors.ink} style={{ transform: [{ skewX: '12deg' }] }} />
              </View>
              <T variant="label" color="#fff" style={styles.caption}>
                {item.label}
              </T>
            </Pressable>
          );
        }
        return (
          <Pressable
            key={item.name}
           
            accessibilityLabel={item.label}
            accessibilityState={{ selected: on }}
            onPress={() => onPress(item.name)}
            style={styles.tab}
          >
            {on ? <View style={styles.mark} /> : <View style={styles.markOff} />}
            <Ionicons name={item.icon} size={22} color={on ? colors.yellow : '#6b72a3'} />
            <T variant="label" color={on ? '#fff' : '#6b72a3'} style={styles.caption}>
              {item.label}
            </T>
          </Pressable>
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
      onPress={(name) => router.navigate(`/${name}` as Href)}
    />
  );
}

const styles = StyleSheet.create({
  bar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#03040f',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.08)',
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'flex-end',
    paddingTop: 10,
    zIndex: 40,
  },
  stripe: { position: 'absolute', left: 0, right: 0, top: -3, height: 3, flexDirection: 'row' },
  stripeBit: { flex: 1 },
  tab: { width: 68, alignItems: 'center', gap: 3, paddingBottom: 2, position: 'relative' },
  caption: { fontSize: 10, fontFamily: font.label, letterSpacing: 0.6 },
  mark: {
    position: 'absolute',
    top: -8,
    width: 28,
    height: 4,
    backgroundColor: colors.yellow,
    transform: [{ skewX: '-20deg' }],
  },
  markOff: { height: 4 },
  plus: {
    width: 56,
    height: 36,
    backgroundColor: colors.yellow,
    alignItems: 'center',
    justifyContent: 'center',
    transform: [{ skewX: '-12deg' }],
    marginTop: -8,
  },
  plusShadow: {
    position: 'absolute',
    top: -2,
    width: 56,
    height: 36,
    backgroundColor: colors.red,
    transform: [{ skewX: '-12deg' }, { translateX: 4 }, { translateY: 4 }],
  },
});
