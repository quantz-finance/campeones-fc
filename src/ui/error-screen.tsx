// Pantalla de error de toda la app (ErrorBoundary de expo-router). No depende del AppProvider:
// si algo se rompe al pintar, se muestra esto en vez de una pantalla en blanco y se reporta el error.
import { useEffect } from 'react';
import { Pressable, Text, View } from 'react-native';
import { reportError } from '../lib/analytics';
import { translate, useLang } from '../i18n/lang';
import { colors, layout, space } from './theme';

export function ErrorScreen({ error, retry }: { error: Error; retry: () => Promise<void> }) {
  const lang = useLang();
  const t = (s: string) => translate(s, lang);
  useEffect(() => {
    reportError(error, { where: 'error_boundary' });
  }, [error]);
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: layout.stack, backgroundColor: colors.bg }}>
      <Text style={{ color: colors.text, fontSize: 22, fontWeight: '800', textAlign: 'center' }}>{t('Algo se rompió')}</Text>
      <Text style={{ color: colors.muted, fontSize: 16, textAlign: 'center', maxWidth: 360 }}>
        {t('Ya nos llegó el aviso. Vuelve a intentarlo; si sigue pasando, recarga la página.')}
      </Text>
      <Pressable
        accessibilityRole="button"
        onPress={() => void retry()}
        style={{ backgroundColor: colors.lima, paddingHorizontal: 22, paddingVertical: 12, borderRadius: 999 }}
      >
        <Text style={{ color: colors.ink, fontSize: 16, fontWeight: '700' }}>{t('Reintentar')}</Text>
      </Pressable>
      <Pressable
        accessibilityRole="button"
        onPress={() => {
          if (typeof window !== 'undefined') window.location.assign('/');
        }}
      >
        <Text style={{ color: colors.muted, fontSize: 14, textDecorationLine: 'underline' }}>{t('Volver al inicio')}</Text>
      </Pressable>
    </View>
  );
}
