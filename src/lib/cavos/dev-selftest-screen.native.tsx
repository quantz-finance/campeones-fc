// Solo desarrollo: pinta el resultado de runCavosSelfTest (ver dev-selftest-native.ts).
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { runCavosSelfTest, type SelfTestLine } from './dev-selftest-native';

export default function CavosSelfTestScreen() {
  const [lines, setLines] = useState<SelfTestLine[]>([]);
  const [summary, setSummary] = useState<string>('Corriendo…');
  const [run, setRun] = useState(0);

  useEffect(() => {
    let alive = true;
    setLines([]);
    setSummary('Corriendo…');
    runCavosSelfTest((l) => alive && setLines((xs) => [...xs, l]))
      .then((r) => alive && setSummary(r.fail ? `FALLA: ${r.fail} de ${r.pass + r.fail}` : `TODO OK: ${r.pass} de ${r.pass}`))
      .catch((e) => alive && setSummary(`Error: ${e instanceof Error ? e.message : String(e)}`));
    return () => {
      alive = false;
    };
  }, [run]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }}>
      <View style={{ padding: 16, backgroundColor: '#37003C' }}>
        <Text style={{ color: '#fff', fontSize: 18, fontWeight: '700' }}>Autoprueba Cavos (dev)</Text>
        <Text testID="selftest-summary" style={{ color: '#fff', fontSize: 15, marginTop: 4 }}>
          {summary}
        </Text>
      </View>
      <ScrollView contentContainerStyle={{ padding: 12 }}>
        {lines.map((l, i) => (
          <Text key={i} style={{ fontSize: 12, marginBottom: 6, color: l.ok ? '#0a7a32' : '#b00020' }}>
            {l.ok ? 'PASS' : 'FAIL'} {l.name}
            {l.detail ? ` — ${l.detail}` : ''}
          </Text>
        ))}
        <Pressable onPress={() => setRun((n) => n + 1)} style={{ marginTop: 12, padding: 12, backgroundColor: '#37003C', borderRadius: 8 }}>
          <Text style={{ color: '#fff', textAlign: 'center' }}>Repetir</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}
