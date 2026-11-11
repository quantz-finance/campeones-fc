import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { track } from '../../../lib/analytics';
import { useApp } from '../../../state/app-provider';
import { useQuery } from '../../../state/use-query';
import { Banner, Button, Gate } from '../../../ui/controls';
import { humanError } from '../../../ui/errors';
import { Panel, Screen, Top } from '../../../ui/screen';
import { colors, layout, radius, space } from '../../../ui/theme';
import { T } from '../../../ui/text';
import { push } from '../../../ui/nav';
import { PersonPick } from '../../../ui/person-pick';
import { ListLabel, SearchEmpty, SearchField } from '../../../ui/search-field';
import { filterPeople, matchesText, mostFrequent, SEARCH_MIN_ITEMS } from '../../../domain/search';
import { firstName, recordLine } from '../../../ui/format';

export default function Play() {
  const { repo, userId, version } = useApp();
  const friends = useQuery(() => repo.friendsSnapshot(userId!), [repo, userId, version]);
  const groups = useQuery(() => repo.groupsSnapshot(userId!), [repo, userId, version]);
  const [opponentId, setOpponentId] = useState<string | null>(null);
  const [groupId, setGroupId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [search, setSearch] = useState('');
  const [groupSearch, setGroupSearch] = useState('');

  const rival = friends.data?.friends.find((f) => f.profile.id === opponentId)?.profile ?? null;
  const group = groups.data?.find((g) => g.group.id === groupId)?.group ?? null;

  return (
    <Screen tab>
      <Top title="Registrar" kicker="Nuevo partido" icon="matches" />
      <T color={colors.muted}>
        Tú lo propones y tu rival lo acepta. Al terminar, cada uno marca quién ganó. Si coinciden, el resultado cuenta.
      </T>
      <Gate query={friends}>
        {(data) => {
          const many = data.friends.length >= SEARCH_MIN_ITEMS;
          const shown = filterPeople(data.friends, search, (f) => f.profile);
          const frequent = many && !search ? mostFrequent(data.friends, (f) => f.record.played) : [];
          const frequentIds = new Set(frequent.map((f) => f.profile.id));
          const rest = frequent.length ? shown.filter((f) => !frequentIds.has(f.profile.id)) : shown;
          const pick = (id: string) => setOpponentId((current) => (current === id ? null : id));
          return (
            <Panel>
              <T variant="strong">1. ¿Contra quién?</T>
              {data.friends.length === 0 ? (
                <>
                  <T color={colors.muted}>Primero invita a un amigo. Cuando acepte, aparece aquí para retarlo.</T>
                  <Button label="Ir a amigos" tone="ghost" onPress={() => push('/amigos')} />
                </>
              ) : (
                <>
                  {many ? <SearchField value={search} onChange={setSearch} placeholder="Busca a tu rival" /> : null}
                  {frequent.length > 0 ? <ListLabel>Frecuentes</ListLabel> : null}
                  {frequent.map((friend) => (
                    <PersonPick
                      key={`f-${friend.profile.id}`}
                      profile={friend.profile}
                      detail={recordLine(friend.record)}
                      on={opponentId === friend.profile.id}
                      onPress={() => pick(friend.profile.id)}
                    />
                  ))}
                  {frequent.length > 0 ? <ListLabel>Todos</ListLabel> : null}
                  {rest.map((friend) => (
                    <PersonPick
                      key={friend.profile.id}
                      profile={friend.profile}
                      detail={recordLine(friend.record)}
                      on={opponentId === friend.profile.id}
                      onPress={() => pick(friend.profile.id)}
                    />
                  ))}
                  {search && shown.length === 0 ? <SearchEmpty query={search} hint="Solo puedes retar a tus amigos. Si no está, invítalo desde Amigos." /> : null}
                </>
              )}
            </Panel>
          );
        }}
      </Gate>
      <Gate query={groups}>
        {(list) => {
          const shown = list.filter((g) => matchesText(groupSearch, g.group.name));
          return list.length === 0 ? (
            <T color={colors.faint}>Si el partido es de un grupo, créalo primero para que sume en su tabla.</T>
          ) : (
            <Panel>
              <T variant="strong">2. ¿Cuenta para un grupo?</T>
              {list.length >= SEARCH_MIN_ITEMS ? <SearchField value={groupSearch} onChange={setGroupSearch} placeholder="Busca un grupo" /> : null}
              <Choice label="Solo entre ustedes" on={groupId == null} onPress={() => setGroupId(null)} />
              {shown.map((item) => (
                <Choice key={item.group.id} label={item.group.name} strong on={groupId === item.group.id} onPress={() => setGroupId(item.group.id)} />
              ))}
              {groupSearch && shown.length === 0 ? <SearchEmpty query={groupSearch} hint="Revisa el nombre del grupo." /> : null}
            </Panel>
          );
        }}
      </Gate>
      {error ? <Banner tone="danger" title="No se armó el partido" body={error} /> : null}
      <View style={styles.summary}>
        {rival ? (
          <T color={colors.text}>{group ? `Contra ${firstName(rival.displayName)} · ${group.name}` : `Contra ${firstName(rival.displayName)}`}</T>
        ) : (
          <T color={colors.muted}>Elige a tu rival para seguir.</T>
        )}
      </View>
      <Button
        label={busy ? 'Proponiendo…' : 'Proponer partido'}
        pending={busy}
        disabled={!opponentId}
        onPress={() => {
          if (!opponentId) return;
          setBusy(true);
          setError(null);
          void repo
            .createMatch({ me: userId!, opponentId, groupId })
            .then((match) => {
              track('match_created', { grouped: Boolean(groupId) });
              push(`/partido/${match.id}`);
            })
            .catch((cause: unknown) => setError(humanError(cause)))
            .finally(() => setBusy(false));
        }}
      />
    </Screen>
  );
}

function Choice({ label, on, onPress, strong = false }: { label: string; on: boolean; onPress: () => void; strong?: boolean }) {
  return (
    <Pressable onPress={onPress} style={[styles.choice, on && styles.on]} accessibilityRole="radio" accessibilityState={{ checked: on }}>
      <T variant={strong ? 'strong' : 'body'} style={styles.flex} numberOfLines={1}>
        {label}
      </T>
      <Ionicons name={on ? 'radio-button-on' : 'radio-button-off'} size={20} color={on ? colors.accentText : colors.faint} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  choice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    minHeight: 48,
    paddingHorizontal: space.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  on: { borderColor: colors.accent, backgroundColor: colors.bg },
  flex: { flex: 1 },
  summary: { marginTop: layout.inline },
});
