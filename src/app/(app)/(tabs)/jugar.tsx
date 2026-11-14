import { useState } from 'react';
import { StyleSheet } from 'react-native';
import { track } from '../../../lib/analytics';
import { useApp } from '../../../state/app-provider';
import { useQuery } from '../../../state/use-query';
import { Banner, Button, Gate } from '../../../ui/controls';
import { humanError } from '../../../ui/errors';
import { Panel, Screen, Top } from '../../../ui/screen';
import { colors } from '../../../ui/theme';
import { T } from '../../../ui/text';
import { push } from '../../../ui/nav';
import { Picker } from '../../../ui/picker';
import { friendItem, groupItem } from '../../../ui/pick-items';
import { rememberPick, useRecentPicks } from '../../../ui/recent-picks';
import { mostFrequent, quickIds } from '../../../domain/search';
import { firstName } from '../../../ui/format';

export default function Play() {
  const { repo, userId, version } = useApp();
  const friends = useQuery(() => repo.friendsSnapshot(userId!), [repo, userId, version], `friends:${userId}`);
  const groups = useQuery(() => repo.groupsSnapshot(userId!), [repo, userId, version], `groups:${userId}`);
  const recentRivals = useRecentPicks('rivals');
  const recentGroups = useRecentPicks('groups');
  const [opponentId, setOpponentId] = useState<string | null>(null);
  const [groupId, setGroupId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const rival = friends.data?.friends.find((f) => f.profile.id === opponentId)?.profile ?? null;
  const group = groups.data?.find((g) => g.group.id === groupId)?.group ?? null;
  const noFriends = friends.data?.friends.length === 0;

  return (
    <Screen
      tab
      action={
        noFriends ? undefined : (
          <>
            <T color={rival ? colors.text : colors.muted} numberOfLines={1} style={styles.summary}>
              {rival ? (group ? `Contra ${firstName(rival.displayName)} · ${group.name}` : `Contra ${firstName(rival.displayName)}`) : 'Elige a tu rival para seguir.'}
            </T>
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
                    rememberPick('rivals', opponentId);
                    if (groupId) rememberPick('groups', groupId);
                    push(`/partido/${match.id}`);
                  })
                  .catch((cause: unknown) => setError(humanError(cause)))
                  .finally(() => setBusy(false));
              }}
            />
          </>
        )
      }
    >
      <Top title="Registrar" kicker="Nuevo partido" />
      <T color={colors.muted}>Tú lo propones y tu rival lo acepta. Al terminar, cada uno marca quién ganó. Si coinciden, el resultado cuenta.</T>
      <Gate query={friends}>
        {(data) => {
          const frequent = mostFrequent(data.friends, (f) => f.record.played, 8).map((f) => f.profile.id);
          const ids = new Set(data.friends.map((f) => f.profile.id));
          return (
            <Panel>
              <T variant="strong">1. ¿Contra quién?</T>
              {data.friends.length === 0 ? (
                <>
                  <T color={colors.muted}>Todavía no tienes amigos en la app. Invita a uno y, cuando acepte, aparece aquí para retarlo.</T>
                  <Button label="Invitar amigos" onPress={() => push('/amigos')} />
                </>
              ) : (
                <Picker
                  testID="rival-picker"
                  items={data.friends.map(friendItem)}
                  selected={opponentId ? [opponentId] : []}
                  onChange={(next) => setOpponentId(next[0] ?? null)}
                  quick={quickIds(recentRivals, frequent, (id) => ids.has(id))}
                  quickLabel={recentRivals.length ? 'Recientes y frecuentes' : 'Frecuentes'}
                  searchPlaceholder="Busca a tu rival"
                  noMatchHint="Solo puedes retar a tus amigos. Si no está, invítalo desde Amigos."
                />
              )}
            </Panel>
          );
        }}
      </Gate>
      <Gate query={groups}>
        {(list) => {
          const ids = new Set(list.map((g) => g.group.id));
          return list.length === 0 ? (
            <T color={colors.faint}>Si el partido es de un grupo, créalo primero para que sume en su tabla.</T>
          ) : (
            <Panel>
              <T variant="strong">2. ¿Cuenta para un grupo?</T>
              <Picker
                testID="group-picker"
                items={list.map(groupItem)}
                selected={groupId ? [groupId] : []}
                onChange={(next) => setGroupId(next[0] ?? null)}
                none={{ title: 'Solo entre ustedes', detail: 'No suma en ningún grupo' }}
                quick={quickIds(recentGroups, [], (id) => ids.has(id))}
                searchPlaceholder="Busca un grupo"
                noMatchHint="Revisa el nombre del grupo."
              />
            </Panel>
          );
        }}
      </Gate>
      {error ? <Banner tone="danger" title="No se armó el partido" body={error} /> : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  summary: { fontSize: 14, lineHeight: 18, textAlign: 'center' },
});
