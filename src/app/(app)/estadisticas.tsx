import { useApp } from '../../state/app-provider';
import { useQuery } from '../../state/use-query';
import { PlayerLine, RecordStrip, Spark, StreakLine } from '../../ui/bits';
import { Gate } from '../../ui/controls';
import { elo, formatDay, recordLine, signed } from '../../ui/format';
import { Panel, Screen, Top } from '../../ui/screen';
import { colors } from '../../ui/theme';
import { T } from '../../ui/text';
import { ListSkeleton } from '../../ui/skeleton';
import { push } from '../../ui/nav';

export default function Stats() {
  const { repo, userId, version } = useApp();
  const query = useQuery(() => repo.personalSnapshot(userId!), [repo, userId, version]);
  return (
    <Screen>
      <Top title="Tus números" kicker="Estadísticas" back />
      <Gate query={query} skeleton={<ListSkeleton />}>
        {(data) => (
          <>
            <Panel>
              <T variant="label" color={colors.accent}>
                ELO DEL CÍRCULO {elo(data.rating)}
              </T>
              <RecordStrip record={data.record} />
              <StreakLine record={data.record} />
              <T color={colors.muted}>
                Diferencia de gol {signed(data.record.goalDiff)} en {data.record.scoredMatches} partidos con marcador.
              </T>
              {data.record.biggestWin ? (
                <T>
                  Mayor goleada: {data.record.biggestWin.goalsFor}–{data.record.biggestWin.goalsAgainst} contra{' '}
                  {data.people[data.record.biggestWin.opponentId]?.displayName ?? 'tu rival'}.
                </T>
              ) : (
                <T color={colors.muted}>Cuando anoten goles, aquí sale tu mayor goleada.</T>
              )}
            </Panel>
            <Panel>
              <T variant="title">Evolución</T>
              {data.evolution.length < 2 ? (
                <T color={colors.muted}>Hacen falta más partidos para ver la curva.</T>
              ) : (
                <>
                  <T variant="tiny" color={colors.muted}>
                    Puntos acumulados, del {formatDay(data.evolution[0].at)} al{' '}
                    {formatDay(data.evolution.at(-1)!.at)}
                  </T>
                  <Spark values={data.evolution.map((point) => point.points)} />
                  <T variant="tiny" color={colors.muted}>
                    Elo
                  </T>
                  <Spark values={data.evolution.map((point) => point.rating)} color={colors.gold} />
                </>
              )}
            </Panel>
            <Panel>
              <T variant="title">Rivales</T>
              {data.rivalsProvisional ? (
                <T color={colors.muted}>Con menos de 2 partidos el mejor y el peor rival son provisionales.</T>
              ) : null}
              {data.bestRival ? (
                <PlayerLine
                  profile={data.bestRival.profile}
                  detail={`Mejor rival · ${recordLine(data.bestRival.record)}`}
                  onPress={() => push(`/versus/${data.bestRival!.profile.id}`)}
                />
              ) : (
                <T color={colors.muted}>Juega con alguien para saber contra quién te va mejor.</T>
              )}
              {data.worstRival ? (
                <PlayerLine
                  profile={data.worstRival.profile}
                  detail={`Peor rival · ${recordLine(data.worstRival.record)}`}
                  onPress={() => push(`/versus/${data.worstRival!.profile.id}`)}
                />
              ) : null}
            </Panel>
            <Panel>
              <T variant="title">Contra cada amigo</T>
              {data.byOpponent.length === 0 ? (
                <T color={colors.muted}>Todavía no hay partidos confirmados.</T>
              ) : (
                data.byOpponent.map((row) => (
                  <PlayerLine
                    key={row.profile.id}
                    profile={row.profile}
                    detail={`${recordLine(row.record)} · DG ${signed(row.record.goalDiff)}`}
                    onPress={() => push(`/versus/${row.profile.id}`)}
                  />
                ))
              )}
            </Panel>
          </>
        )}
      </Gate>
    </Screen>
  );
}
