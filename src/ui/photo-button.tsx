// "Cambiar foto": elige, comprime en el cliente y sube. Estado en curso inline, sin loader de pantalla.
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Icon } from './icon';
import { pickPhoto, type PhotoKind } from '../lib/photos';
import { useApp } from '../state/app-provider';
import { colors, space } from './theme';
import { T } from './text';
import { humanError } from './errors';

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
            .catch((cause: unknown) => setError(humanError(cause)))
            .finally(() => setBusy(false));
        }}
      >
        <Icon name="camara" size={14} color={colors.ink} />
        <T variant="tiny" color={colors.ink}>
          {busy ? 'Subiendo…' : label}
        </T>
      </Pressable>
      {error ? (
        <T variant="tiny" color={colors.danger} style={styles.plain}>
          {error}
        </T>
      ) : kind === 'users' ? (
        // La foto se recorta cuadrada al elegirla (1:1); así se ve bien en todas las pantallas.
        <T variant="tiny" color={colors.muted} style={[styles.plain, styles.hint]}>
          Usa una foto cuadrada, con tu cara al centro.
        </T>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: space.xs, alignItems: 'flex-start' },
  btn: { flexDirection: 'row', alignItems: 'center', gap: space.sm, backgroundColor: colors.yellow, paddingHorizontal: 10, paddingVertical: 6, transform: [{ skewX: '0deg' }], borderRadius: 14 },
  busy: { opacity: 0.7 },
  plain: { textTransform: 'none', letterSpacing: 0 },
  hint: { maxWidth: 190 },
});
