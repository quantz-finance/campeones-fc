import { Pressable, StyleSheet, View } from 'react-native';
import { useApp } from '../../../state/app-provider';
import { useQuery } from '../../../state/use-query';
import { Shield } from '../../../ui/broadcast';
import { Button, Empty, Gate } from '../../../ui/controls';
import { monogram } from '../../../ui/format';
import { Screen, Top } from '../../../ui/screen';
import { colors } from '../../../ui/theme';
import { T } from '../../../ui/text';
import { Rise } from '../../../ui/motion';
import { push } from '../../../ui/nav';

export default function Groups() {
  const { repo, userId, version, spectator } = useApp();
  const query = useQuery(() => repo.groupsSnapshot(userId!), [repo, userId, version]);

  return (
    <Screen tab>
      <Top title="Grupos" kicker="La junta" icon="friends" right={spectator ? undefined : <Button label="Crear" onPress={() => push('/grupo/nuevo')} />} />
      <Gate query={query}>
        {(groups) =>
          groups.length === 0 ? (
            <Empty
              title={spectator ? 'Todavía no hay grupos' : 'Arma tu junta'}
              body={spectator ? 'Cuando haya grupos con partidos, aparecen aquí.' : 'Un grupo tiene tabla, ranking y torneos. Solo entran tus amigos.'}
              action={spectator ? undefined : <Button label="Crear grupo" onPress={() => push('/grupo/nuevo')} />}
            />
          ) : (
            groups.map((item, index) => (
              <Rise key={item.group.id} index={index}>
              <Pressable style={styles.card} onPress={() => push(`/grupo/${item.group.id}`)}>
                <Shield letters={monogram(item.group.name)} photoUrl={item.group.photoUrl} />
                <View style={styles.flex}>
                  <T variant="title" style={{ fontStyle: 'normal' }} numberOfLines={1}>
                    {item.group.name}
                  </T>
                  <T variant="tiny" color={colors.muted}>
                    {spectator
                      ? `${item.memberCount} jugadores`
                      : `${item.memberCount} jugadores · ${item.yourPlace ? `vas ${item.yourPlace}º` : 'aún fuera del ranking'}`}
                  </T>
                  <T variant="strong" color={colors.accentText}>
                    {item.leader ? `Manda ${item.leader.displayName}` : 'Nadie manda todavía'}
                  </T>
                </View>
              </Pressable>
              </Rise>
            ))
          )
        }
      </Gate>
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
    padding: 12,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 14,
  },
  flex: { flex: 1, gap: 4 },
});
