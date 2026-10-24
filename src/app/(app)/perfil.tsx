import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { avatars } from '../../../config/branding';
import { useApp } from '../../state/app-provider';
import { Avatar } from '../../ui/avatar';
import { Banner, Button, Chip, Field } from '../../ui/controls';
import { Panel, Screen, Top } from '../../ui/screen';
import { colors, space } from '../../ui/theme';
import { T } from '../../ui/text';
import { Ionicons } from '@expo/vector-icons';

export default function Profile() {
  const app = useApp();
  const profile = app.profile;
  const [displayName, setDisplayName] = useState(profile?.displayName ?? '');
  const [username, setUsername] = useState(profile?.username ?? '');
  const [avatarKey, setAvatarKey] = useState(profile?.avatarKey ?? 'rayo');
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!profile) return;
    setDisplayName(profile.displayName);
    setUsername(profile.username);
    setAvatarKey(profile.avatarKey);
  }, [profile]);

  if (!profile) {
    return (
      <Screen>
        <Top title="Perfil" />
      </Screen>
    );
  }

  return (
    <Screen>
      <Top title="Tu perfil" kicker="Jugador" />
      <Panel>
        <View style={styles.center}>
          <Avatar avatarKey={avatarKey} size={72} />
          <T variant="title">{profile.displayName}</T>
          <T color={colors.muted}>@{profile.username}</T>
        </View>
        <Field label="Nombre" value={displayName} onChangeText={setDisplayName} autoCapitalize="words" />
        <Field label="Usuario" value={username} onChangeText={setUsername} placeholder="sin espacios" />
        <T variant="label" color={colors.muted}>
          Avatar
        </T>
        <View style={styles.grid}>
          {avatars.map((avatar) => (
            <Pressable
              key={avatar.key}
              onPress={() => setAvatarKey(avatar.key)}
              style={[styles.avatar, avatarKey === avatar.key && styles.on]}
            >
              <Ionicons name={avatar.icon as keyof typeof Ionicons.glyphMap} size={22} color={avatar.foreground} />
              <T variant="tiny">{avatar.label}</T>
            </Pressable>
          ))}
        </View>
        {error ? <Banner tone="danger" title="No se guardó" body={error} /> : null}
        {saved ? <Banner tone="accent" title="Perfil actualizado" /> : null}
        <Button
          label={busy ? 'Guardando…' : 'Guardar'}
          disabled={busy}
          onPress={() => {
            setBusy(true);
            setError(null);
            setSaved(false);
            void app.repo
              .updateProfile(app.userId!, { displayName, username, avatarKey })
              .then(() => setSaved(true))
              .catch((cause: unknown) => setError(cause instanceof Error ? cause.message : 'No se pudo guardar.'))
              .finally(() => setBusy(false));
          }}
        />
      </Panel>
      <View style={styles.chips}>
        <Chip label="Estadísticas" onPress={() => router.push('/estadisticas')} />
        <Chip label="Ranking" onPress={() => router.push('/ranking')} />
        <Chip label="Trofeos" onPress={() => router.push('/trofeos')} />
      </View>
      {app.mode === 'demo' ? (
        <Button
          label="Restablecer datos de demostración"
          tone="ghost"
          onPress={() => void app.repo.resetDemo()}
        />
      ) : null}
      <Button label="Cerrar sesión" tone="danger" onPress={() => void app.signOut()} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: 'center', gap: space.sm },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  avatar: {
    width: 76,
    height: 72,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.line,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.bg,
    gap: 4,
  },
  on: { borderColor: colors.accent },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
});
