import { router } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';
import { track } from '../../lib/analytics';
import { useApp } from '../../state/app-provider';
import { useQuery } from '../../state/use-query';
import { PlayerLine } from '../../ui/bits';
import { SectionHead } from '../../ui/broadcast';
import { Banner, Button, Field, Gate } from '../../ui/controls';
import { recordLine } from '../../ui/format';
import { copyText, inviteUrl, openWhatsApp, shareInvite } from '../../ui/share';
import { Screen, Top } from '../../ui/screen';
import { colors } from '../../ui/theme';
import { T } from '../../ui/text';
import { ListSkeleton } from '../../ui/skeleton';

export default function Friends() {
  const { repo, userId, version } = useApp();
  const query = useQuery(() => repo.friendsSnapshot(userId!), [repo, userId, version]);
  const [username, setUsername] = useState('');
  const [hits, setHits] = useState<{ id: string; username: string; displayName: string }[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function run(task: () => Promise<void>) {
    setBusy(true);
    setError(null);
    try {
      await task();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No se pudo completar.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen>
      <Top title="Amigos" kicker="Tu círculo" back />
      <Gate query={query} skeleton={<ListSkeleton />}>
        {(data) => (
          <>
            <SectionHead title="Invita con un enlace" />
            <T color={colors.muted}>Sirve para WhatsApp o donde se hablen. Quien lo abra queda como tu amigo, y te avisamos aquí apenas entre.</T>
            <Button
              label="Copiar enlace"
              tone="ghost"
              disabled={busy}
              onPress={() =>
                void run(async () => {
                  const invite = await repo.createInvite(userId!);
                  const copied = await copyText(inviteUrl(invite.code));
                  setNote(copied ? 'Enlace copiado.' : inviteUrl(invite.code));
                  track('invite_created');
                })
              }
            />
            <Button
              label="Compartir"
              tone="ghost"
              disabled={busy}
              onPress={() =>
                void run(async () => {
                  const invite = await repo.createInvite(userId!);
                  await shareInvite(invite.code);
                })
              }
            />
            <Button
              label="Abrir WhatsApp"
              disabled={busy}
              onPress={() =>
                void run(async () => {
                  const invite = await repo.createInvite(userId!);
                  openWhatsApp(invite.code);
                })
              }
            />
            {note ? (
              <T color={colors.yellow} style={{ textTransform: 'none' }}>
                {note}
              </T>
            ) : null}
            <SectionHead title="Buscar por usuario" />
            <Field
              label="Usuario"
              value={username}
              onChangeText={async (value) => {
                setUsername(value);
                if (value.trim().length < 2) {
                  setHits([]);
                  return;
                }
                const found = await repo.searchProfiles(value, userId!);
                setHits(found);
              }}
              placeholder="@usuario"
            />
            {hits.map((hit) => (
              <View key={hit.id} style={{ gap: 6 }}>
                <T variant="strong">{hit.displayName}</T>
                <T variant="tiny" color={colors.muted} style={{ textTransform: 'none' }}>
                  @{hit.username}
                </T>
                <Button
                  label="Invitar"
                  tone="ghost"
                  disabled={busy}
                  onPress={() =>
                    void run(async () => {
                      await repo.sendFriendRequest(userId!, hit.username);
                      setUsername('');
                      setHits([]);
                      setNote(`Invitación enviada a @${hit.username}.`);
                      track('friend_request');
                    })
                  }
                />
              </View>
            ))}
            {error ? <Banner tone="danger" title="Revisa eso" body={error} /> : null}
            {data.incoming.length > 0 ? (
              <View style={{ gap: 10 }}>
                <SectionHead title="Te invitaron" />
                {data.incoming.map((item) => (
                  <View key={item.friendship.id} style={{ gap: 8 }}>
                    <PlayerLine profile={item.profile} detail="Quiere entrar a tu círculo" />
                    <Button label="Aceptar" disabled={busy} onPress={() => void run(() => repo.respondFriendRequest(userId!, item.friendship.id, true))} />
                    <Button
                      label="Rechazar"
                      tone="danger"
                      disabled={busy}
                      onPress={() => void run(() => repo.respondFriendRequest(userId!, item.friendship.id, false))}
                    />
                  </View>
                ))}
              </View>
            ) : null}
            {data.outgoing.length > 0 ? (
              <View style={{ gap: 10 }}>
                <SectionHead title="Esperando respuesta" />
                {data.outgoing.map((item) => (
                  <PlayerLine key={item.friendship.id} profile={item.profile} detail="Invitación enviada" />
                ))}
              </View>
            ) : null}
            <SectionHead title="Tus amigos" />
            {data.friends.length === 0 ? (
              <T color={colors.muted}>Todavía no tienes amigos en la junta. Mándale el enlace a alguien.</T>
            ) : (
              data.friends.map((friend) => (
                <PlayerLine
                  key={friend.profile.id}
                  profile={friend.profile}
                  detail={recordLine(friend.record)}
                  onPress={() => router.push(`/versus/${friend.profile.id}`)}
                />
              ))
            )}
          </>
        )}
      </Gate>
    </Screen>
  );
}
