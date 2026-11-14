import { StyleSheet, View } from 'react-native';
import type { JoinPolicy, Visibility } from '../data/types';
import { Chip } from './controls';
import { colors, space } from './theme';
import { T } from './text';

export function AccessFields({
  visibility,
  joinPolicy,
  onVisibility,
  onPolicy,
  kind,
  groupOnly = false,
}: {
  visibility: Visibility;
  joinPolicy: JoinPolicy;
  onVisibility: (value: Visibility) => void;
  onPolicy: (value: JoinPolicy) => void;
  kind: 'group' | 'tournament';
  /** Torneo dentro de un grupo: siempre privado (los públicos no pertenecen a ningún grupo). */
  groupOnly?: boolean;
}) {
  return (
    <View style={styles.wrap}>
      <T variant="tiny">{kind === 'group' ? 'Quién lo ve' : 'Quién lo ve'}</T>
      {groupOnly ? (
        <T color={colors.muted}>Privado: solo lo ven y se inscriben los miembros del grupo. Para un torneo público, créalo desde Torneos, fuera del grupo.</T>
      ) : (
        <View style={styles.row}>
          <Chip label="Privado" active={visibility === 'private'} onPress={() => onVisibility('private')} />
          <Chip label="Público" active={visibility === 'public'} onPress={() => onVisibility('public')} />
        </View>
      )}
      <T variant="tiny">{kind === 'group' ? 'Cómo se entra' : 'Cómo se inscriben'}</T>
      <View style={styles.row}>
        <Chip label="Abierto" active={joinPolicy === 'open'} onPress={() => onPolicy('open')} />
        <Chip label="Con invitación" active={joinPolicy === 'invite'} onPress={() => onPolicy('invite')} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: space.sm },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
});
