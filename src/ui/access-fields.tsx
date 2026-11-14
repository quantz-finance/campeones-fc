import { StyleSheet, View } from 'react-native';
import type { JoinPolicy, Visibility } from '../data/types';
import { Chip } from './controls';
import { space } from './theme';
import { T } from './text';

export function AccessFields({
  visibility,
  joinPolicy,
  onVisibility,
  onPolicy,
  kind,
}: {
  visibility: Visibility;
  joinPolicy: JoinPolicy;
  onVisibility: (value: Visibility) => void;
  onPolicy: (value: JoinPolicy) => void;
  kind: 'group' | 'tournament';
}) {
  return (
    <View style={styles.wrap}>
      <T variant="tiny">{kind === 'group' ? 'Quién lo ve' : 'Quién lo ve'}</T>
      <View style={styles.row}>
        <Chip label="Privado" active={visibility === 'private'} onPress={() => onVisibility('private')} />
        <Chip label="Público" active={visibility === 'public'} onPress={() => onVisibility('public')} />
      </View>
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
