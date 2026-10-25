import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { track } from '../../../lib/analytics';
import { useApp } from '../../../state/app-provider';
import { useQuery } from '../../../state/use-query';
import { Avatar } from '../../../ui/avatar';
import { Banner, Button, Gate } from '../../../ui/controls';
import { Panel, Screen, Top } from '../../../ui/screen';
import { colors, radius, space } from '../../../ui/theme';
import { T } from '../../../ui/text';
import { DEFAULT_STAKE, netPot, proposeStake, STAKE_OPTIONS, stakesEnabled } from '../../../lib/payments/stake';

export default function Play() {
  const { repo, userId, version, mode, profile } = useApp();
  const friends = useQuery(() => repo.friendsSnapshot(userId!), [repo, userId, version]);
  const groups = useQuery(() => repo.groupsSnapshot(userId!), [repo, userId, version]);
  const [opponentId, setOpponentId] = useState<string | null>(null);
  const [groupId, setGroupId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [stake, setStake] = useState<number>(stakesEnabled() ? DEFAULT_STAKE : 0);
  const stakesOn = stakesEnabled() && mode === 'supabase' && profile?.showDemo !== true;

  return (
    <Screen tab>
      <Top title="Registrar" kicker="Nuevo partido" />
      <T color={colors.muted}>
        Tú lo propones y tu rival lo acepta. Al terminar, cada uno marca quién ganó. Si coinciden, el resultado cuenta.
      </T>
      <Gate query={friends}>
        {(data) => (
          <Panel>
            <T variant="strong">¿Contra quién?</T>
            {data.friends.length === 0 ? (
              <>
                <T color={colors.muted}>Primero invita a un amigo.</T>
                <Button label="Ir a amigos" tone="ghost" onPress={() => router.push('/amigos')} />
              </>
            ) : (
              data.friends.map((friend) => {
                const active = opponentId === friend.profile.id;
                return (
                  <Pressable
                    key={friend.profile.id}
                    onPress={() => setOpponentId(friend.profile.id)}
                    style={[styles.choice, active && styles.on]}
                  >
                    <Avatar avatarKey={friend.profile.avatarKey} size={40} />
                    <View style={styles.flex}>
                      <T variant="strong">{friend.profile.displayName}</T>
                      <T variant="tiny" color={colors.muted}>
                        @{friend.profile.username}
                      </T>
                    </View>
                  </Pressable>
                );
              })
            )}
          </Panel>
        )}
      </Gate>
      <Gate query={groups}>
        {(list) =>
          list.length === 0 ? (
            <T color={colors.faint}>Si el partido es de un grupo, créalo primero para que sume en su tabla.</T>
          ) : (
            <Panel>
              <T variant="strong">¿Cuenta para un grupo?</T>
              <Pressable onPress={() => setGroupId(null)} style={[styles.choice, groupId == null && styles.on]}>
                <T>Solo entre ustedes</T>
              </Pressable>
              {list.map((group) => (
                <Pressable
                  key={group.group.id}
                  onPress={() => setGroupId(group.group.id)}
                  style={[styles.choice, groupId === group.group.id && styles.on]}
                >
                  <T variant="strong">{group.group.name}</T>
                </Pressable>
              ))}
            </Panel>
          )
        }
      </Gate>
      {stakesOn ? (
        <Panel>
          <T variant="label" color={colors.yellow}>
            Apuesta · USDC de prueba
          </T>
          <View style={styles.stakes}>
            {[0, ...STAKE_OPTIONS].map((v) => (
              <Pressable key={v} onPress={() => setStake(v)} style={[styles.stake, stake === v && styles.stakeOn]} accessibilityRole="button">
                <T variant="strong" color={stake === v ? colors.ink : colors.text}>
                  {v === 0 ? 'Sin apuesta' : `${v}`}
                </T>
              </Pressable>
            ))}
          </View>
          <T variant="tiny" color={colors.muted} style={{ textTransform: 'none', letterSpacing: 0 }}>
            {stake
              ? `Cada uno bloquea ${stake} USDC en custodia de Trustless Work (Stellar, red de prueba). El ganador se lleva ${netPot(stake)} USDC.`
              : 'Solo cuenta para el ranking.'}
          </T>
        </Panel>
      ) : null}
      {error ? <Banner tone="danger" title="No se armó el partido" body={error} /> : null}
      <Button
        label={busy ? 'Proponiendo…' : 'Proponer partido'}
        disabled={!opponentId || busy}
        onPress={() => {
          if (!opponentId) return;
          setBusy(true);
          setError(null);
          void repo
            .createMatch({ me: userId!, opponentId, groupId })
            .then((match) => {
              track('match_created', { grouped: Boolean(groupId) });
              // La apuesta no bloquea el partido: si falla, se juega sin apuesta y se avisa en la pantalla del partido.
              const proposed = stakesOn && stake > 0 ? proposeStake(match.id, stake).catch(() => undefined) : Promise.resolve();
              return proposed.then(() => router.push(`/partido/${match.id}`));
            })
            .catch((cause: unknown) => setError(cause instanceof Error ? cause.message : 'No se pudo crear.'))
            .finally(() => setBusy(false));
        }}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  choice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    padding: space.sm,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  on: { borderColor: colors.accent, backgroundColor: colors.bg },
  flex: { flex: 1 },
  stakes: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  stake: { paddingHorizontal: space.md, paddingVertical: space.sm, borderWidth: 1, borderColor: 'rgba(255,255,255,0.35)', transform: [{ skewX: '-8deg' }] },
  stakeOn: { backgroundColor: colors.yellow, borderColor: colors.yellow },
});
