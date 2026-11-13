import { useEffect, useState } from 'react';
import { useLocalSearchParams } from 'expo-router';
import { SocialEditor } from '../../../ui/social-editor';
import { AchievementBadge } from '../../../ui/achievement-badge';
import { Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Icon } from '../../../ui/icon';
import { avatars, branding } from '../../../../config/branding';
import { useApp } from '../../../state/app-provider';
import { useQuery } from '../../../state/use-query';
import { Affiliation, SectionHead, StatCell } from '../../../ui/broadcast';
import { Banner, Button, Field, Gate } from '../../../ui/controls';
import { elo, firstName, goalsPerMatch, pct, recordLine } from '../../../ui/format';
import { Screen } from '../../../ui/screen';
import { colors, layout, space } from '../../../ui/theme';
import { T } from '../../../ui/text';
import { Rise, useDelayed } from '../../../ui/motion';
import { PlayerCard, cardFromPublic } from '../../../ui/player-card';
import { CardsSkeleton } from '../../../ui/skeleton';
import { PhotoButton } from '../../../ui/photo-button';
import { push } from '../../../ui/nav';
import { humanError } from '../../../ui/errors';

const stickerMeta = {
  first_win: { title: 'Primera', icon: 'rayo' as const, color: colors.accentText, tilt: '0deg' },
  streak_5: { title: 'En fuego', icon: 'racha' as const, color: colors.red, tilt: '0deg' },
  tournament_champion: { title: 'Campeón', icon: 'medalla' as const, color: colors.blue, tilt: '0deg' },
};

export default function Profile() {
  const app = useApp();
  const profile = app.profile;
  const personal = useQuery(() => app.repo.personalSnapshot(app.userId!), [app.repo, app.userId, app.version]);
  const trophies = useQuery(() => app.repo.trophies(app.userId!), [app.repo, app.userId, app.version]);
  const groups = useQuery(() => app.repo.groupsSnapshot(app.userId!), [app.repo, app.userId, app.version]);
  // La misma carta que la ficha pública (puesto global, Elo máx., títulos, logros y redes).
  const card = useQuery(() => app.repo.publicPlayer(app.userId!, app.userId!), [app.repo, app.userId, app.version]);
  const [displayName, setDisplayName] = useState(profile?.displayName ?? '');
  const [username, setUsername] = useState(profile?.username ?? '');
  const [avatarKey, setAvatarKey] = useState(profile?.avatarKey ?? 'rayo');
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState(false);
  // ?redes=1 abre directo el editor de redes (enlace desde la ficha pública).
  const startSocial = useLocalSearchParams<{ redes?: string }>().redes === '1';

  useEffect(() => {
    if (!profile) return;
    setDisplayName(profile.displayName);
    setUsername(profile.username);
    setAvatarKey(profile.avatarKey);
  }, [profile]);

  if (!profile) {
    return (
      <Screen tab>
        <ProfileSkeleton />
      </Screen>
    );
  }

  const earned = trophies.data?.filter((trophy) => trophy.earned).length ?? 0;

  return (
    <Screen tab>
      <View style={styles.top}>
        {/* Una sola línea, con compartir y editar al lado. */}
        <View style={styles.topLabel}>
          <T variant="label" color={colors.muted} numberOfLines={1}>
            Mi ficha
          </T>
        </View>
        <Pressable accessibilityLabel="Configuración" style={styles.iconBtn} onPress={() => push('/configuracion')}>
          <Icon name="ajustes" size={18} color={colors.text} />
        </Pressable>
        <Pressable accessibilityLabel="Compartir ficha" style={styles.iconBtn} onPress={() => push('/estadisticas')}>
          <Icon name="compartir" size={18} color={colors.text} />
        </Pressable>
        <Pressable accessibilityLabel="Editar ficha" style={styles.iconBtn} onPress={() => setEditing((value) => !value)}>
          <Icon name={editing ? 'cerrar' : 'editar'} size={18} color={colors.text} />
        </Pressable>
      </View>
      <Gate query={personal}>
        {(data) => {
          const maxElo = data.evolution.reduce((max, point) => Math.max(max, point.rating), data.rating);
          const firstGroup = groups.data?.[0];
          return (
            <>
              <Rise index={0}>
                {card.data ? (
                  <PlayerCard
                    data={{ ...cardFromPublic(card.data, displayName), profile: { ...cardFromPublic(card.data, displayName).profile, photoUrl: profile.photoUrl } }}
                    kicker={firstGroup?.yourPlace ? `#${firstGroup.yourPlace} ${firstGroup.group.name}` : 'Tu ficha'}
                    onPress={() => push('/estadisticas')}
                  />
                ) : null}
              </Rise>
              <View style={styles.idRow}>
                <View style={styles.flex}>
                  {/* Nombre y @usuario ya van en la carta; aquí solo el país y el botón de foto. */}
                  <T variant="tiny" color={colors.muted} style={styles.plain}>
                    {branding.country}
                  </T>
                </View>
                <PhotoButton kind="users" targetId={profile.id} label={profile.photoUrl ? 'Cambiar foto' : 'Subir foto'} />
              </View>
              <SocialEditor profile={profile} repo={app.repo} startOpen={startSocial} />
              <SectionHead title="Estadísticas" action="Todas" onAction={() => push('/estadisticas')} />
              <View style={styles.grid}>
                <StatCell value={String(data.record.played)} label="Partidos" />
                <StatCell value={pct(data.record.winRate)} label="Victorias" accent />
                <StatCell value={String(data.record.goalsFor)} label="Goles" />
                <StatCell value={goalsPerMatch(data.record.goalsFor, data.record.played)} label="Gol / partido" />
                <StatCell value={String(data.record.bestWinStreak)} label="Mejor racha" />
                <StatCell value={elo(maxElo)} label="Elo máximo" />
              </View>
              <SectionHead title="Álbum de logros" action={`${earned} / 3`} />
              <View style={styles.album}>
                {(trophies.data ?? []).map((trophy, index) => (
                  <AchievementBadge
                    key={trophy.code}
                    code={trophy.code}
                    unlocked={trophy.earned}
                    index={index}
                    title={stickerMeta[trophy.code].title}
                    detail={trophy.earned ? trophy.title : trophy.description}
                  />
                ))}
              </View>
              <View style={styles.rivals}>
                {data.bestRival ? (
                  <Pressable style={[styles.rival, { borderLeftColor: colors.blue }]} onPress={() => push(`/versus/${data.bestRival!.profile.id}`)}>
                    <T variant="tiny" color={colors.blue}>
                      Tu cliente
                    </T>
                    <T variant="strong">
                      {firstName(data.bestRival.profile.displayName)} · {data.bestRival.record.wins}-{data.bestRival.record.losses}
                    </T>
                  </Pressable>
                ) : null}
                {data.worstRival && data.worstRival.profile.id !== data.bestRival?.profile.id ? (
                  <Pressable style={[styles.rival, { borderLeftColor: colors.red }]} onPress={() => push(`/versus/${data.worstRival!.profile.id}`)}>
                    <T variant="tiny" color={colors.red}>
                      Bestia negra
                    </T>
                    <T variant="strong">
                      {firstName(data.worstRival.profile.displayName)} · {data.worstRival.record.wins}-{data.worstRival.record.losses}
                    </T>
                  </Pressable>
                ) : null}
              </View>
              {data.rivalsProvisional ? (
                <T variant="tiny" color={colors.faint} style={styles.plain}>
                  Con menos de 2 partidos, el cliente y la bestia negra son provisionales.
                </T>
              ) : null}
              <T variant="tiny" color={colors.muted} style={styles.plain}>
                Serie {recordLine(data.record)}
              </T>
            </>
          );
        }}
      </Gate>
      {editing ? (
        <View style={styles.edit}>
          <SectionHead title="Editar ficha" />
          <Field label="Nombre" value={displayName} onChangeText={setDisplayName} autoCapitalize="words" />
          <Field label="Usuario" value={username} onChangeText={setUsername} placeholder="sin espacios" />
          <T variant="label" color={colors.accentText}>
            Avatar
          </T>
          <View style={styles.avatars}>
            {avatars.map((avatar) => (
              <Pressable key={avatar.key} onPress={() => setAvatarKey(avatar.key)} style={[styles.avatar, avatarKey === avatar.key && styles.avatarOn]}>
                <Ionicons name={avatar.icon as keyof typeof Ionicons.glyphMap} size={18} color={avatar.foreground} />
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
                .catch((cause: unknown) => setError(humanError(cause)))
                .finally(() => setBusy(false));
            }}
          />
        </View>
      ) : null}
      <View style={styles.links}>
        <Button label="Amigos" tone="ghost" onPress={() => push('/amigos')} />
        <Button label="Ranking" tone="ghost" onPress={() => push('/ranking')} />
        <Button label="Trofeos" tone="ghost" onPress={() => push('/trofeos')} />
        <Button
          label="Configuración"
          tone="ghost"
          icon={<Icon name="ajustes" size={18} color={colors.text} />}
          onPress={() => push('/configuracion')}
        />
      </View>
      <Affiliation />
    </Screen>
  );
}

const styles = StyleSheet.create({
  top: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  flex: { flex: 1 },
  topLabel: { flex: 1, minWidth: 0 },
  iconBtn: {
    width: 40,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.line,
    transform: [{ skewX: '0deg' }],
  },
  idRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  plain: { textTransform: 'none', letterSpacing: 0 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: layout.card },
  album: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-around', gap: layout.card },
  rivals: { flexDirection: 'row', gap: layout.card },
  rival: { flex: 1, backgroundColor: colors.card, borderLeftWidth: 4, padding: space.md, gap: space.sm, borderRadius: 14 },
  edit: { gap: layout.field },
  avatars: { flexDirection: 'row', flexWrap: 'wrap', gap: layout.card },
  avatar: {
    width: 74,
    height: 64,
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.xs,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.card,
    borderRadius: 14,
  },
  avatarOn: { borderColor: colors.yellow },
  links: { gap: layout.stack },
});

function ProfileSkeleton() {
  return useDelayed(true) ? <CardsSkeleton cards={3} /> : null;
}
