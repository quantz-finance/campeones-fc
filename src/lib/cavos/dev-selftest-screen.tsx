// Web: la autoprueba de la llave nativa de Cavos no aplica (ver dev-selftest-screen.native.tsx).
import { Text, View } from 'react-native';

export default function CavosSelfTestScreen() {
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
      <Text>Autoprueba solo en iOS.</Text>
    </View>
  );
}
