import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useApp } from '../../../state/app-provider';
import { useQuery } from '../../../state/use-query';
import { SectionHead } from '../../../ui/broadcast';
import { Button, Empty, Gate } from '../../../ui/controls';
import { Screen, Top } from '../../../ui/screen';
import { colors } from '../../../ui/theme';
import { T } from '../../../ui/text';
import { push } from '../../../ui/nav';
import { SearchEmpty, SearchField } from '../../../ui/search-field';
import { EventPoster, MiniPoster, PublicTournamentRow } from '../../../ui/event-poster';
import { matchesText } from '../../../domain/search';
import { humanError } from '../../../ui/errors';
import { joinPolicyOf } from '../../../data/types';

export default function TournamentsTab() {
  const { repo, userId, version, showFlash } = useApp();
  const query = useQuery(async () => {
    const [mine, pub, sponsor] = await Promise.all([
      repo.myTournaments(userId!),
      repo.searchPublicTournaments(userId!, ''),
      repo.visibleSponsor(userId!, 'tournaments-list'),
    ]);
    return { mine, pub, sponsor };
  }, [repo, userId, version]);
  const [search, setSearch] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);
  const open = (id: string) => push(`/torneo/${id}`);
  const act = (id: string, policy: 'open' | 'invite') => {
    setBusyId(id);
    const run = policy === 'open' ? repo.registerForTournament(userId!, id) : repo.requestTournamentJoin(userId!, id);
    void run
      .then(() => {
        if (policy === 'open') {
          showFlash({ id: `reg-${id}`, title: 'Quedaste inscrito', body: 'Te avisamos cuando arranque el torneo.', tone: 'accent' });
        } else {
          showFlash({ id: `req-${id}`, title: 'Solicitud enviada', body: 'El organizador tiene que aceptarte.', tone: 'accent' });
        }
      })
      .catch((cause: unknown) => {
        showFlash({ id: `reg-error-${id}`, title: 'No se pudo inscribir', body: humanError(cause), tone: 'danger' });
      })
      .finally(() => setBusyId(null));
  };

  return (
    <Screen tab>
      <Top title="Torneos" kicker="Cuadros y copas" right={<Button label="+" onPress={() => push('/torneo/nuevo')} />} />
      <SearchField value={search} onChange={setSearch} placeholder="Busca un torneo" />
      <Gate query={query}>
        {(data) => {
          const mine = data.mine.filter((item) => matchesText(search, item.tournament.name, item.groupName ?? ''));
          const pub = data.pub.filter((item) => matchesText(search, item.tournament.name, item.groupName ?? ''));
          const featuredId = data.sponsor?.tournamentId;
          const featured = featuredId ? [...data.mine, ...data.pub.map((row) => ({ ...row, yourLabel: null, phase: null }))].find((row) => row.tournament.id === featuredId) : null;
          const heroSponsor = featured && data.sponsor?.tournamentId === featured.tournament.id ? data.sponsor : null;
          if (!data.mine.length && !data.pub.length && !search) {
            return (
              <Empty
                title="Todavía no hay copas"
                body="Ármala aquí o dentro de un grupo: puedes abrir inscripciones o empezar ya con tus compañeros."
                action={<Button label="Crear torneo" onPress={() => push('/torneo/nuevo')} />}
              />
            );
          }
          return (
            <>
              {search && !mine.length && !pub.length ? <SearchEmpty query={search} hint="Busca por el nombre del torneo o de su grupo." /> : null}
              {heroSponsor && featured ? (
                <EventPoster
                  tournament={featured.tournament}
                  groupName={featured.groupName}
                  registeredCount={featured.registeredCount}
                  sponsor={heroSponsor}
                  onPress={() => open(featured.tournament.id)}
                  onJoin={
                    featured.tournament.status === 'registration' && !('registered' in featured && featured.registered)
                      ? () => act(featured.tournament.id, joinPolicyOf(featured.tournament))
                      : undefined
                  }
                  joinLabel={
                    'registered' in featured && featured.registered
                      ? 'Inscrito'
                      : 'requested' in featured && featured.requested
                        ? 'Pendiente'
                        : joinPolicyOf(featured.tournament) === 'open'
                          ? 'Inscribirme'
                          : 'Pedir invitación'
                  }
                />
              ) : null}
              <SectionHead title="Mis torneos" action={mine.length ? `Ver los ${mine.length}` : undefined} />
              {mine.length === 0 ? (
                <T variant="tiny" color={colors.muted}>
                  Aún no estás en un torneo.
                </T>
              ) : (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.carousel}>
                  {mine.map((item) => (
                    <MiniPoster
                      key={item.tournament.id}
                      id={item.tournament.id}
                      name={item.tournament.name}
                      photoUrl={item.tournament.photoUrl}
                      logo={item.tournament.logo}
                      status={item.tournament.status}
                      phase={item.phase}
                      yourLabel={item.yourLabel}
                      onPress={() => open(item.tournament.id)}
                    />
                  ))}
                </ScrollView>
              )}
              <SectionHead title="Torneos públicos" action={pub.length ? String(pub.length) : undefined} />
              {pub.length === 0 ? (
                <T variant="tiny" color={colors.muted}>
                  {search ? 'No hay torneos públicos con ese nombre.' : 'Todavía no hay torneos públicos para explorar.'}
                </T>
              ) : (
                <View>
                  {pub.map((item) => (
                    <PublicTournamentRow
                      key={item.tournament.id}
                      tournament={item.tournament}
                      groupName={item.groupName}
                      registeredCount={item.registeredCount}
                      requested={item.requested}
                      registered={item.registered}
                      busy={busyId === item.tournament.id}
                      onOpen={() => open(item.tournament.id)}
                      onJoin={() => act(item.tournament.id, item.tournament.joinPolicy === 'invite' ? 'invite' : 'open')}
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
  carousel: { gap: 10, paddingRight: 16 },
});
