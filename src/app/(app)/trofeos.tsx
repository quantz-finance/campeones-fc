import { useApp } from '../../state/app-provider';
import { useQuery } from '../../state/use-query';
import { Gate } from '../../ui/controls';
import { Screen, Top } from '../../ui/screen';
import { TrofeosTabla } from '../../ui/trofeos-tabla';

export default function Trophies() {
  const { repo, userId, version } = useApp();
  const query = useQuery(() => repo.trophies(userId!), [repo, userId, version]);
  return (
    <Screen>
      <Top title="Trofeos" kicker="Vitrina" back />
      <Gate query={query}>{(trophies) => <TrofeosTabla trophies={trophies} />}</Gate>
    </Screen>
  );
}
