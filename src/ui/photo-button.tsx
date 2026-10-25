// "Cambiar foto": elige, comprime en el cliente y sube. Estado en curso inline, sin loader de pantalla.
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { pickPhoto, type PhotoKind } from '../lib/photos';
import { useApp } from '../state/app-provider';
import { colors } from './theme';
import { T } from './text';

export function PhotoButton({ kind, targetId, label = 'Cambiar foto' }: { kind: PhotoKind; targetId: string; label?: string }) {
  const { repo, mode } = useApp();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  if (mode !== 'supabase') return null;
  return (
    <View style={styles.wrap}>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ busy }}
        disabled={busy}
        style={[styles.btn, busy && styles.busy]}
        onPress={() => {
          setError(null);
          void pickPhoto()
            .then(async (photo) => {
              if (!photo) return;
              setBusy(true);
              await repo.uploadPhoto(kind, targetId, photo);
            })
            .catch((cause: unknown) => setError(cause instanceof Error ? cause.message : 'No se pudo subir la foto.'))
            .finally(() => setBusy(false));
        }}
      >
        <Ionicons name="camera" size={14} color={colors.ink} />
        <T variant="tiny" color={colors.ink}>
          {busy ? 'Subiendo…' : label}
        </T>
      </Pressable>
      {error ? (
        <T variant="tiny" color={colors.danger} style={styles.plain}>
          {error}
        </T>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 4, alignItems: 'flex-start' },
  btn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.yellow, paddingHorizontal: 10, paddingVertical: 6, transform: [{ skewX: '-8deg' }] },
  busy: { opacity: 0.7 },
  plain: { textTransform: 'none', letterSpacing: 0 },
});
