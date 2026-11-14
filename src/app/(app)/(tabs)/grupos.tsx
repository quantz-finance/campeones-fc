import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useApp } from '../../../state/app-provider';
import { useQuery } from '../../../state/use-query';
import { SectionHead } from '../../../ui/broadcast';
import { Button, Empty, Gate } from '../../../ui/controls';
import { Screen, Top } from '../../../ui/screen';
import { space } from '../../../ui/theme';
import { T } from '../../../ui/text';
import { push } from '../../../ui/nav';
import { SearchCreateRow, SearchEmpty } from '../../../ui/search-field';
import { rememberPick, useRecentPicks } from '../../../ui/recent-picks';
import { matchesText } from '../../../domain/search';
import { ClubCromo, CrestRow, MiniCromo } from '../../../ui/club-cromo';
import { humanError } from '../../../ui/errors';

export default function Groups() {
  const { repo, userId, version, showFlash } = useApp();
  const query = useQuery(async () => {
    const [mine, pub, sponsor] = await Promise.all([
      repo.groupsSnapshot(userId!),
      repo.searchPublicGroups(userId!, ''),
      repo.visibleSponsor(userId!, 'groups-list'),
    ]);
    return { mine, pub, sponsor };
  }, [repo, userId, version]);
  const [search, setSearch] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);
  const recent = useRecentPicks('groups');
  const open = (id: string) => {
    rememberPick('groups', id);
    push(`/grupo/${id}`);
  };
  const act = (id: string, policy: 'open' | 'invite') => {
    setBusyId(id);
    const run = policy === 'open' ? repo.joinPublicGroup(userId!, id) : repo.requestGroupJoin(userId!, id);
    void run
      .then(() => {
        if (policy === 'open') open(id);
        else showFlash({ id: `join-${id}`, title: 'Solicitud enviada', body: 'Quien manda el grupo tiene que aceptarte.', tone: 'accent' });
      })
      .catch((cause: unknown) => {
        showFlash({ id: `join-error-${id}`, title: 'No se pudo entrar', body: humanError(cause), tone: 'danger' });
      })
      .finally(() => setBusyId(null));
  };

  return (
    <Screen tab>
      <Top title="Grupos" kicker="La junta" />
      <SearchCreateRow value={search} onChange={setSearch} placeholder="Busca un grupo" onCreate={() => push('/grupo/nuevo')} createLabel="Crear grupo" />
      <Gate query={query}>
        {(data) => {
          const mine = data.mine.filter((item) => matchesText(search, item.group.name));
          const featuredId = mine.find((item) => recent.includes(item.group.id))?.group.id ?? mine[0]?.group.id;
          const featured = mine.find((item) => item.group.id === featuredId) ?? null;
          const others = mine.filter((item) => item.group.id !== featuredId).map((item) => item.group);
          const shown = others.slice(0, 5);
          const extra = Math.max(0, others.length - shown.length);
          const pub = data.pub.filter((item) => matchesText(search, item.group.name));
          const cromoSponsor = data.sponsor?.groupId && featured?.group.id === data.sponsor.groupId ? data.sponsor : null;
          if (!mine.length && !data.pub.length && !search) {
            return (
              <Empty
                title="Arma tu junta"
                body="Un grupo tiene tabla, ranking y torneos. Puedes dejarlo privado o abrirlo para que otros pidan entrar."
                action={<Button label="Crear grupo" onPress={() => push('/grupo/nuevo')} />}
              />
            );
          }
          return (
            <>
              {search && !mine.length && !pub.length ? <SearchEmpty query={search} hint="Revisa el nombre del grupo." /> : null}
              {featured ? (
                <>
                  <SectionHead title="Mis grupos · privados" action={String(data.mine.length)} />
                  <ClubCromo
                    group={featured.group}
                    memberCount={featured.memberCount}
                    leaderName={featured.leader?.displayName}
                    yourPlace={featured.yourPlace}
                    sponsor={cromoSponsor}
                    onPress={() => open(featured.group.id)}
                  />
                  <CrestRow groups={shown} extra={extra} onOpen={open} />
                </>
              ) : data.mine.length && search ? (
                <T variant="tiny">Ninguno de tus grupos coincide.</T>
              ) : null}
              <SectionHead title="Grupos públicos" action={pub.length ? String(pub.length) : undefined} />
              {pub.length === 0 ? (
                <T variant="tiny">{search ? 'No hay grupos públicos con ese nombre.' : 'Todavía no hay grupos públicos para explorar.'}</T>
              ) : (
                <View style={styles.grid}>
                  {pub.map((item) => (
                    <MiniCromo
                      key={item.group.id}
                      group={item.group}
                      memberCount={item.memberCount}
                      joinPolicy={item.joinPolicy}
                      requested={item.requested}
                      busy={busyId === item.group.id}
                      onOpen={() => {}}
                      onJoin={() => act(item.group.id, item.joinPolicy)}
                    />
                  ))}
                </View>
              )}
            </>
          );
        }}
      </Gate>
    </Screen>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: space.md },
});
