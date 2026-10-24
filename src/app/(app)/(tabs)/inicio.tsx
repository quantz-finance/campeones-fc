import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';
import { branding } from '../../../../config/branding';
import { useApp } from '../../../state/app-provider';
import { useQuery } from '../../../state/use-query';
import { Avatar } from '../../../ui/avatar';
import { EloBadge, MatchRow, RecordStrip, StreakLine } from '../../../ui/bits';
import { Chip, Gate } from '../../../ui/controls';
import { firstName } from '../../../ui/format';
import { Panel, Screen } from '../../../ui/screen';
import { colors, space } from '../../../ui/theme';
import { T } from '../../../ui/text';

export default function Home() {
  const { repo, userId, version, mode, profile } = useApp();
  const query = useQuery(() => repo.homeSnapshot(userId!), [repo, userId, version]);

  return (
    <Screen>
      <Gate query={query}>
        {(home) => (
          <>
            <View style={styles.hero}>
              <Pressable style={styles.who} onPress={() => router.push('/perfil')}>
                <Avatar avatarKey={home.profile.avatarKey} size={52} />
                <View style={styles.flex}>
                  <T variant="label" color={colors.accent}>
                    {branding.name}
                  </T>
                  <T variant="display" style={styles.tight}>
                    {firstName(home.profile.displayName)}
                  </T>
                </View>
              </Pressable>
              <EloBadge value={home.rating} />
            </View>
            {mode === 'demo' ? (
              <T variant="tiny" color={colors.faint}>
                Modo demostración · los datos viven en este navegador
                {profile ? '' : ''}
              </T>
            ) : null}
            <Panel>
              <RecordStrip record={home.record} />
              <StreakLine record={home.record} />
              <View style={styles.chips}>
                <Chip label="Estadísticas" onPress={() => router.push('/estadisticas')} />
                <Chip label="Ranking" onPress={() => router.push('/ranking')} />
                <Chip label="Trofeos" onPress={() => router.push('/trofeos')} />
              </View>
            </Panel>
            <Panel>
              <T variant="title">Te toca</T>
              {home.actionMatches.length === 0 ? (
                <T color={colors.muted}>No tienes nada pendiente. Cuando alguien te rete, aparece aquí.</T>
              ) : (
                home.actionMatches.map((match) => (
                  <MatchRow key={match.id} match={match} me={userId!} people={home.people} />
                ))
              )}
              <Chip label="Proponer partido" onPress={() => router.push('/jugar')} />
            </Panel>
            {home.waitingMatches.length > 0 ? (
              <Panel>
                <T variant="title">En espera</T>
                <T color={colors.muted}>Tu rival todavía no cierra su parte.</T>
                {home.waitingMatches.map((match) => (
                  <MatchRow key={match.id} match={match} me={userId!} people={home.people} />
                ))}
              </Panel>
            ) : null}
            <Panel>
              <T variant="title">Recientes</T>
              {home.recent.length === 0 ? (
                <T color={colors.muted}>Cuando confirmen un resultado, el marcador queda aquí.</T>
              ) : (
                home.recent.map((match) => <MatchRow key={match.id} match={match} me={userId!} people={home.people} />)
              )}
            </Panel>
          </>
        )}
      </Gate>
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space.md },
  who: { flexDirection: 'row', alignItems: 'center', gap: space.md, flex: 1 },
  flex: { flex: 1 },
  tight: { lineHeight: 38 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
});
