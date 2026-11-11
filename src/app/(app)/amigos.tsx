import { useEffect, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { track } from '../../lib/analytics';
import { useApp } from '../../state/app-provider';
import { useQuery } from '../../state/use-query';
import { PlayerLine } from '../../ui/bits';
import { SectionHead } from '../../ui/broadcast';
import { Banner, Button, Gate, MiniButton } from '../../ui/controls';
import { humanError } from '../../ui/errors';
import { recordLine } from '../../ui/format';
import { copyText, inviteUrl, openWhatsApp, shareInvite } from '../../ui/share';
import { Screen, Top } from '../../ui/screen';
import { colors, layout, space } from '../../ui/theme';
import { T } from '../../ui/text';
import { ListSkeleton } from '../../ui/skeleton';
import { push } from '../../ui/nav';
import { ListLabel, SearchEmpty, SearchField } from '../../ui/search-field';
import { filterPeople, mostFrequent, normalizeSearch, SEARCH_MIN_ITEMS } from '../../domain/search';
import type { Profile } from '../../data/types';

export default function Friends() {
  const { repo, userId, version } = useApp();
  const query = useQuery(() => repo.friendsSnapshot(userId!), [repo, userId, version]);
  const [search, setSearch] = useState('');
  const [hits, setHits] = useState<Profile[]>([]);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Fuera de tus amigos: busca jugadores por @usuario o nombre (con pausa corta al escribir).
  const remote = normalizeSearch(search).replace(/^@+/, '');
  useEffect(() => {
    if (remote.length < 2) {
      setHits([]);
      setSearching(false);
      return;
    }
    let alive = true;
    setSearching(true);
    const timer = setTimeout(() => {
      repo
        .searchProfiles(search.trim().replace(/^@+/, ''), userId!)
        .then((found) => alive && setHits(found))
        .catch(() => alive && setHits([]))
        .finally(() => alive && setSearching(false));
    }, 250);
    return () => {
      alive = false;
      clearTimeout(timer);
    };
  }, [remote, repo, userId]);

  async function run(task: () => Promise<void>) {
    setBusy(true);
    setError(null);
    try {
      await task();
    } catch (cause) {
      setError(humanError(cause));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen>
      <Top title="Amigos" kicker="Tu círculo" back icon="friends" />
      <Gate query={query} skeleton={<ListSkeleton />}>
        {(data) => {
          const known = new Set([...data.friends.map((f) => f.profile.id), ...data.incoming.map((f) => f.profile.id), ...data.outgoing.map((f) => f.profile.id)]);
          const strangers = hits.filter((hit) => !known.has(hit.id));
          const shown = filterPeople(data.friends, search, (f) => f.profile);
          const frequent = search || data.friends.length < SEARCH_MIN_ITEMS ? [] : mostFrequent(data.friends, (f) => f.record.played);
          const frequentIds = new Set(frequent.map((f) => f.profile.id));
          const rest = frequent.length ? shown.filter((f) => !frequentIds.has(f.profile.id)) : shown;
          const invite = (
            <View style={styles.block}>
              <SectionHead title="Invita con un enlace" />
              <T color={colors.muted}>Sirve para WhatsApp o donde se hablen. Quien lo abra queda como tu amigo, y te avisamos aquí apenas entre.</T>
              <Button
                label="Abrir WhatsApp"
                disabled={busy}
                onPress={() =>
                  void run(async () => {
                    const code = await repo.createInvite(userId!);
                    openWhatsApp(code.code);
                  })
                }
              />
              <View style={styles.pair}>
                <View style={styles.half}>
                  <Button
                    label="Copiar enlace"
                    tone="ghost"
                    disabled={busy}
                    onPress={() =>
                      void run(async () => {
                        const code = await repo.createInvite(userId!);
                        const copied = await copyText(inviteUrl(code.code));
                        setNote(copied ? 'Enlace copiado.' : inviteUrl(code.code));
                        track('invite_created');
                      })
                    }
                  />
                </View>
                <View style={styles.half}>
                  <Button
                    label="Compartir"
                    tone="ghost"
                    disabled={busy}
                    onPress={() =>
                      void run(async () => {
                        const code = await repo.createInvite(userId!);
                        await shareInvite(code.code);
                      })
                    }
                  />
                </View>
              </View>
              {note ? (
                <T color={colors.accentText} style={{ textTransform: 'none' }}>
                  {note}
                </T>
              ) : null}
            </View>
          );
          return (
            <>
              {error ? <Banner tone="danger" title="Revisa eso" body={error} /> : null}
              {data.incoming.length > 0 ? (
                <View style={styles.block}>
                  <SectionHead title="Te invitaron" />
                  {data.incoming.map((item) => (
                    <View key={item.friendship.id} style={styles.request}>
                      <PlayerLine profile={item.profile} detail="Quiere entrar a tu círculo" />
                      <View style={styles.pair}>
                        <View style={styles.half}>
                          <Button label="Aceptar" disabled={busy} onPress={() => void run(() => repo.respondFriendRequest(userId!, item.friendship.id, true))} />
                        </View>
                        <View style={styles.half}>
                          <Button
                            label="Rechazar"
                            tone="danger"
                            disabled={busy}
                            onPress={() => void run(() => repo.respondFriendRequest(userId!, item.friendship.id, false))}
                          />
                        </View>
                      </View>
                    </View>
                  ))}
                </View>
              ) : null}
              {data.friends.length === 0 ? invite : null}
              <View style={styles.block}>
                <SectionHead title={data.friends.length ? `Tus amigos · ${data.friends.length}` : 'Busca jugadores'} />
                <SearchField
                  value={search}
                  onChange={setSearch}
                  placeholder={data.friends.length ? 'Busca por nombre o @usuario' : 'Escribe su @usuario o nombre'}
                />
                {note && search === '' && /^Invitación/.test(note) ? (
                  <T color={colors.accentText} style={{ textTransform: 'none' }}>
                    {note}
                  </T>
                ) : null}
                {frequent.length > 0 ? (
                  <>
                    <ListLabel>Frecuentes</ListLabel>
                    {frequent.map((friend) => (
                      <PlayerLine
                        key={`f-${friend.profile.id}`}
                        profile={friend.profile}
                        detail={recordLine(friend.record)}
                        onPress={() => push(`/jugador/${friend.profile.id}`)}
                      />
                    ))}
                    <ListLabel>Todos</ListLabel>
                  </>
                ) : null}
                {data.friends.length === 0 && !search ? (
                  <T color={colors.muted}>Todavía no tienes amigos en la junta. Mándale el enlace a alguien o búscalo por su @usuario.</T>
                ) : null}
                {rest.map((friend) => (
                  <PlayerLine
                    key={friend.profile.id}
                    profile={friend.profile}
                    detail={recordLine(friend.record)}
                    onPress={() => push(`/jugador/${friend.profile.id}`)}
                  />
                ))}
                {search && shown.length === 0 && strangers.length === 0 && !searching ? (
                  <SearchEmpty
                    query={search}
                    hint={remote.length < 2 ? 'Escribe al menos 2 letras para buscar fuera de tus amigos.' : 'No está entre tus amigos ni en la app con ese nombre. Mándale el enlace de invitación.'}
                  />
                ) : null}
                {strangers.length > 0 ? (
                  <>
                    <ListLabel>Otros jugadores en la app</ListLabel>
                    {strangers.map((hit) => (
                      <PlayerLine
                        key={`s-${hit.id}`}
                        profile={hit}
                        detail=""
                        right={
                          <MiniButton
                            label="Invitar"
                            disabled={busy}
                            onPress={() =>
                              void run(async () => {
                                await repo.sendFriendRequest(userId!, hit.username);
                                setSearch('');
                                setNote(`Invitación enviada a @${hit.username}.`);
                                track('friend_request');
                              })
                            }
                          />
                        }
                      />
                    ))}
                  </>
                ) : null}
                {searching && search ? (
                  <T variant="tiny" color={colors.faint}>
                    Buscando…
                  </T>
                ) : null}
              </View>
              {data.outgoing.length > 0 ? (
                <View style={styles.block}>
                  <SectionHead title="Esperando respuesta" />
                  {data.outgoing.map((item) => (
                    <PlayerLine key={item.friendship.id} profile={item.profile} detail="Invitación enviada" />
                  ))}
                </View>
              ) : null}
              {data.friends.length > 0 ? invite : null}
            </>
          );
        }}
      </Gate>
    </Screen>
  );
}

const styles = StyleSheet.create({
  block: { gap: layout.card },
  request: { gap: layout.button },
  pair: { flexDirection: 'row', gap: layout.button },
  half: { flex: 1 },
});
