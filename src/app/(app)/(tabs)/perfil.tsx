import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { APP_MODES, appModeOf } from '../../../lib/app-mode';
import { Ionicons } from '@expo/vector-icons';
import { avatars, branding } from '../../../../config/branding';
import { useApp } from '../../../state/app-provider';
import { useQuery } from '../../../state/use-query';
import { Affiliation, InitialsMark, SectionHead, StatCell, Sticker } from '../../../ui/broadcast';
import { Banner, Button, Field, Gate } from '../../../ui/controls';
import { elo, firstName, goalsPerMatch, pct, recordLine } from '../../../ui/format';
import { Screen } from '../../../ui/screen';
import { colors } from '../../../ui/theme';
import { T } from '../../../ui/text';
import { useDelayed } from '../../../ui/motion';
import { CardsSkeleton } from '../../../ui/skeleton';

const stickerMeta = {
  first_win: { title: 'Primera', icon: 'flash' as const, color: colors.yellow, tilt: '-6deg' },
  streak_5: { title: 'En fuego', icon: 'flame' as const, color: colors.red, tilt: '4deg' },
  tournament_champion: { title: 'Campeón', icon: 'ribbon' as const, color: colors.blue, tilt: '-3deg' },
};

export default function Profile() {
  const app = useApp();
  const profile = app.profile;
  const personal = useQuery(() => app.repo.personalSnapshot(app.userId!), [app.repo, app.userId, app.version]);
  const trophies = useQuery(() => app.repo.trophies(app.userId!), [app.repo, app.userId, app.version]);
  const groups = useQuery(() => app.repo.groupsSnapshot(app.userId!), [app.repo, app.userId, app.version]);
  const [displayName, setDisplayName] = useState(profile?.displayName ?? '');
  const [username, setUsername] = useState(profile?.username ?? '');
  const [avatarKey, setAvatarKey] = useState(profile?.avatarKey ?? 'rayo');
  const [showDemo, setShowDemo] = useState(profile?.showDemo === true);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    if (!profile) return;
    setDisplayName(profile.displayName);
    setUsername(profile.username);
    setAvatarKey(profile.avatarKey);
    setShowDemo(profile.showDemo === true);
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
        <View style={styles.flex}>
          <T variant="label" color={colors.muted}>
            Ficha del jugador
          </T>
        </View>
        <Pressable accessibilityLabel="Compartir ficha" style={styles.iconBtn} onPress={() => router.push('/estadisticas')}>
          <Ionicons name="share-outline" size={18} color="#fff" />
        </Pressable>
        <Pressable accessibilityLabel="Editar ficha" style={styles.iconBtn} onPress={() => setEditing((value) => !value)}>
          <Ionicons name={editing ? 'close' : 'sunny-outline'} size={18} color="#fff" />
        </Pressable>
      </View>
      <View style={styles.card}>
        <View style={styles.photo}>
          <InitialsMark name={displayName || profile.displayName} avatarKey={avatarKey} size={132} fontSize={48} />
        </View>
        <View style={styles.cardBody}>
          <T variant="tiny" color={colors.yellow}>
            Tu ficha
          </T>
          <T variant="display" style={styles.name} numberOfLines={2}>
            {profile.displayName}
          </T>
          <T variant="tiny" color={colors.muted} style={styles.plain}>
            @{profile.username} · {branding.country}
          </T>
          <View style={styles.tags}>
            {groups.data?.[0]?.yourPlace ? (
              <View style={styles.tagY}>
                <T variant="tiny" color={colors.ink}>
                  #{groups.data[0].yourPlace} {groups.data[0].group.name}
                </T>
              </View>
            ) : null}
            {personal.data && personal.data.record.currentStreak.type === 'win' && personal.data.record.currentStreak.count > 0 ? (
              <View style={styles.tagR}>
                <T variant="tiny" color={colors.redInk}>
                  Racha {personal.data.record.currentStreak.count}
                </T>
              </View>
            ) : null}
          </View>
        </View>
      </View>
      <Gate query={personal}>
        {(data) => {
          const maxElo = data.evolution.reduce((max, point) => Math.max(max, point.rating), data.rating);
          return (
            <>
              <View style={styles.level}>
                <T variant="tiny" color={colors.muted}>
                  {pct(data.record.winRate)} de victorias
                </T>
                <T variant="tiny" color={colors.yellow}>
                  {data.record.wins} ganados
                </T>
              </View>
              <View style={styles.track}>
                <View style={{ width: `${Math.round(data.record.winRate * 100)}%`, backgroundColor: colors.yellow, height: 8 }} />
              </View>
              <SectionHead title="Estadísticas" action="Todas" onAction={() => router.push('/estadisticas')} />
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
                {(trophies.data ?? []).map((trophy) => {
                  const meta = stickerMeta[trophy.code];
                  return (
                    <Sticker
                      key={trophy.code}
                      title={meta.title}
                      detail={trophy.earned ? trophy.title : trophy.description}
                      icon={meta.icon}
                      color={meta.color}
                      earned={trophy.earned}
                      tilt={meta.tilt}
                    />
                  );
                })}
              </View>
              <View style={styles.rivals}>
                {data.bestRival ? (
                  <Pressable style={[styles.rival, { borderLeftColor: colors.blue }]} onPress={() => router.push(`/versus/${data.bestRival!.profile.id}`)}>
                    <T variant="tiny" color={colors.blue}>
                      Tu cliente
                    </T>
                    <T variant="strong">
                      {firstName(data.bestRival.profile.displayName)} · {data.bestRival.record.wins}-{data.bestRival.record.losses}
                    </T>
                  </Pressable>
                ) : null}
                {data.worstRival && data.worstRival.profile.id !== data.bestRival?.profile.id ? (
                  <Pressable style={[styles.rival, { borderLeftColor: colors.red }]} onPress={() => router.push(`/versus/${data.worstRival!.profile.id}`)}>
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
          <T variant="label" color={colors.yellow}>
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
                .catch((cause: unknown) => setError(cause instanceof Error ? cause.message : 'No se pudo guardar.'))
                .finally(() => setBusy(false));
            }}
          />
        </View>
      ) : null}
      <View style={styles.modeBox}>
        <T variant="label" color={colors.yellow}>
          Modo
        </T>
        <View style={styles.segment} accessibilityRole="radiogroup">
          {APP_MODES.map((m) => {
            const current = appModeOf({ showDemo }, app.mode !== 'supabase');
            const on = current === m.key;
            const locked = m.disabled || app.mode !== 'supabase';
            return (
              <Pressable
                key={m.key}
                disabled={locked || on}
                accessibilityRole="radio"
                accessibilityState={{ selected: on, disabled: locked }}
                accessibilityLabel={m.label}
                onPress={() => {
                  const next = m.key === 'fake';
                  setShowDemo(next);
                  void app.repo
                    .updateProfile(app.userId!, { showDemo: next })
                    .then(() => app.refresh())
                    .catch(() => setShowDemo(!next));
                }}
                style={[styles.segItem, on && styles.segOn, m.disabled && styles.segOff]}
              >
                <T variant="strong" color={on ? colors.ink : colors.text} style={{ fontSize: 13 }}>
                  {m.label}
                </T>
                {m.disabled ? (
                  <T variant="tiny" color={colors.muted} style={{ fontSize: 9 }}>
                    Próximamente
                  </T>
                ) : null}
              </Pressable>
            );
          })}
        </View>
        <T variant="tiny" color={colors.muted} style={{ textTransform: 'none', letterSpacing: 0 }}>
          {showDemo || app.mode !== 'supabase'
            ? 'Datos falsos: ves el mundo de demostración (jugadores, partidos, grupos). Sin apuestas: nada va a la blockchain.'
            : 'Testnet: solo jugadores y partidos reales. Apuestas y verificación en Stellar (red de prueba, sin dinero real).'}
        </T>
      </View>
      <View style={styles.links}>
        <Button label="Amigos" tone="ghost" onPress={() => router.push('/amigos')} />
        <Button label="Ranking" tone="ghost" onPress={() => router.push('/ranking')} />
        <Button label="Trofeos" tone="ghost" onPress={() => router.push('/trofeos')} />
      </View>
      {app.mode === 'demo' ? <Button label="Restablecer datos de demostración" tone="ghost" onPress={() => void app.repo.resetDemo()} /> : null}
      <Button label="Cerrar sesión" tone="danger" onPress={() => void app.signOut()} />
      <Affiliation />
    </Screen>
  );
}

const styles = StyleSheet.create({
  modeBox: { gap: 8, padding: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)' },
  segment: { flexDirection: 'row', transform: [{ skewX: '-8deg' }], borderWidth: 1, borderColor: 'rgba(255,255,255,0.25)' },
  segItem: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 10, minHeight: 48 },
  segOn: { backgroundColor: colors.yellow },
  segOff: { opacity: 0.5 },
  top: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  flex: { flex: 1 },
  iconBtn: {
    width: 40,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.16)',
    transform: [{ skewX: '-12deg' }],
  },
  card: { flexDirection: 'row', gap: 12, alignItems: 'center' },
  photo: { width: 132, height: 150, backgroundColor: colors.red, alignItems: 'center', justifyContent: 'flex-end', overflow: 'hidden' },
  cardBody: { flex: 1, gap: 4 },
  name: { fontSize: 30, fontStyle: 'italic', lineHeight: 30 },
  plain: { textTransform: 'none', letterSpacing: 0 },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 4 },
  tagY: { backgroundColor: colors.yellow, paddingHorizontal: 6, paddingVertical: 3 },
  tagR: { backgroundColor: colors.red, paddingHorizontal: 6, paddingVertical: 3 },
  level: { flexDirection: 'row', justifyContent: 'space-between' },
  track: { height: 8, backgroundColor: 'rgba(255,255,255,0.08)' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  album: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  rivals: { flexDirection: 'row', gap: 8 },
  rival: { flex: 1, backgroundColor: 'rgba(19,26,42,0.8)', borderLeftWidth: 4, padding: 10, gap: 4 },
  edit: { gap: 12 },
  avatars: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  avatar: {
    width: 74,
    height: 64,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    backgroundColor: 'rgba(19,26,42,0.8)',
  },
  avatarOn: { borderColor: colors.yellow },
  links: { gap: 8 },
});

function ProfileSkeleton() {
  return useDelayed(true) ? <CardsSkeleton cards={3} /> : null;
}
