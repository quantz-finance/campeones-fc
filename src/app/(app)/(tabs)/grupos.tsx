import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useApp } from '../../../state/app-provider';
import { useQuery } from '../../../state/use-query';
import { tabQueries } from '../../../state/queries';
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
import { AdCarousel } from '../../../ui/ad-carousel';
import { humanError } from '../../../ui/errors';
import { visibilityOf } from '../../../data/types';

export default function Groups() {
  const { repo, userId, version, showFlash } = useApp();
  const tab = tabQueries(repo, userId!).groupsTab;
  const query = useQuery(tab.load, [repo, userId, version], tab.key);
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
          const mineIds = new Set(data.mine.map((item) => item.group.id));
          const pub = data.pub.filter((item) => !mineIds.has(item.group.id) && matchesText(search, item.group.name));
          const mineTitle = data.mine.some((item) => visibilityOf(item.group) === 'public') ? 'Mis grupos' : 'Mis grupos · privados';
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
                  <SectionHead title={mineTitle} action={String(data.mine.length)} />
                  <ClubCromo
                    group={featured.group}
                    memberCount={featured.memberCount}
                    leaderName={featured.leader?.displayName}
                    yourPlace={featured.yourPlace}
                    sponsor={cromoSponsor}
                    onPress={() => open(featured.group.id)}
                  />
                  <CrestRow groups={others} lead={featured.group} onOpen={open} />
                </>
              ) : data.mine.length && search ? (
                <T variant="tiny">Ninguno de tus grupos coincide.</T>
              ) : null}
              <SectionHead title="Grupos públicos" action={pub.length ? String(pub.length) : undefined} />
              {pub.length === 0 ? (
                <T variant="tiny">{search ? 'No hay grupos públicos con ese nombre.' : 'Todavía no hay grupos públicos para explorar.'}</T>
              ) : null}
              <View style={styles.grid}>
                {pub.flatMap((item, index) => {
                  const cell = (
                    <MiniCromo
                      key={item.group.id}
                      group={item.group}
                      memberCount={item.memberCount}
                      joinPolicy={item.joinPolicy}
                      requested={item.requested}
                      member={mineIds.has(item.group.id)}
                      busy={busyId === item.group.id}
                      onOpen={() => open(item.group.id)}
                      onJoin={() => act(item.group.id, item.joinPolicy)}
                    />
                  );
                  // El anuncio ocupa una celda de la cuadrícula: la tercera (o la última si hay menos).
                  return index === Math.min(2, pub.length) - 1 ? [cell, <AdCarousel key="anuncio" section="grupos-publicos" fill style={styles.adCell} />] : [cell];
                })}
                {pub.length === 0 ? <AdCarousel section="grupos-publicos" fill style={styles.adCell} /> : null}
              </View>
            </>
          );
        }}
      </Gate>
    </Screen>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: space.md },
  adCell: { width: '48.5%' },
});
