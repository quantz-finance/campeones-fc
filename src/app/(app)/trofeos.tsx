import { useEffect, useRef, useState } from 'react';
import { useIsFocused, useLocalSearchParams } from 'expo-router';
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
  const { logro } = useLocalSearchParams<{ logro?: string | string[] }>();
  const wanted = Array.isArray(logro) ? logro[0] : logro;
  const [open, setOpen] = useState<TrophyView | null>(null);
  // El enlace ?logro= abre el escenario una sola vez: al refrescarse los datos (cada 30 s o por
  // Realtime) no se vuelve a abrir solo después de que lo cierras.
  const handled = useRef<string | null>(null);
  useEffect(() => {
    if (!query.data || !wanted || handled.current === wanted) return;
    const hit = query.data.find((item) => item.code === wanted);
    if (hit) {
      handled.current = wanted;
      setOpen(hit);
    }
  }, [query.data, wanted]);
  // Si otra pantalla toma el foco (un enlace, una notificación), el escenario se cierra: es un Modal
  // y si no se quedaba tapando la pantalla nueva.
  const focused = useIsFocused();
  useEffect(() => {
    if (!focused) setOpen(null);
  }, [focused]);
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
