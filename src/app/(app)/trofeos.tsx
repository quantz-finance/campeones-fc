import { useState } from 'react';
import { useApp } from '../../state/app-provider';
import { useQuery } from '../../state/use-query';
import type { TrophyView } from '../../data/snapshots';
import { Gate } from '../../ui/controls';
import { LogroEscenario } from '../../ui/logro-escenario';
import { push } from '../../ui/nav';
import { Screen, Top } from '../../ui/screen';
import { TrofeosTabla } from '../../ui/trofeos-tabla';

export default function Trophies() {
  const { repo, userId, version } = useApp();
  const query = useQuery(() => repo.trophies(userId!), [repo, userId, version]);
  const personal = useQuery(() => repo.personalSnapshot(userId!), [repo, userId, version]);
  const [open, setOpen] = useState<TrophyView | null>(null);
  const record = personal.data?.record;
  const currentWinStreak = record?.currentStreak.type === 'win' ? record.currentStreak.count : 0;
  const currentUnbeaten = record && record.currentStreak.type !== 'loss' && record.currentStreak.type !== 'none' ? record.currentStreak.count : 0;
  const streaks = {
    currentWinStreak,
    bestWinStreak: record?.bestWinStreak ?? 0,
    currentUnbeaten,
  };
  const selected = open && query.data ? (query.data.find((item) => item.code === open.code) ?? open) : open;

  return (
    <Screen>
      <Top title="Trofeos" kicker="Vitrina" back />
      <Gate query={query}>
        {(trophies) => (
          <>
            <TrofeosTabla trophies={trophies} onOpen={setOpen} />
            {selected ? (
              <LogroEscenario
                trophy={selected}
                trophies={trophies}
                streaks={streaks}
                onClose={() => setOpen(null)}
                onOpen={(code) => {
                  const next = trophies.find((item) => item.code === code);
                  if (next) setOpen(next);
                }}
                onRegister={() => {
                  setOpen(null);
                  push('/jugar');
                }}
              />
            ) : null}
          </>
        )}
      </Gate>
    </Screen>
  );
}
