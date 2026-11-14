// Historial completo de una serie 1 vs 1 (desde «Historial ›» en Cara a cara). Sale de la serie que ya
// está en el teléfono (todos los partidos visibles vienen en el mundo cacheado) y se pagina de a 20.
import { useLocalSearchParams, type Href } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useApp } from '../../../state/app-provider';
import { useQuery } from '../../../state/use-query';
import { Button, Gate } from '../../../ui/controls';
import { firstName, formatDay, signed } from '../../../ui/format';
import { push } from '../../../ui/nav';
import { SportPress } from '../../../ui/press';
import { Screen, Top } from '../../../ui/screen';
import { DetailSkeleton } from '../../../ui/skeleton';
import { T } from '../../../ui/text';
import { font } from '../../../ui/theme';
import { HISTORY_PAGE, VERSUS as C, historyPage, registerHref, resultView } from '../../../ui/versus-data';

export default function Historial() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { repo, userId, version } = useApp();
  const query = useQuery(() => repo.h2hSnapshot(userId!, String(id)), [repo, userId, version, id], `h2h:${userId}:${id}`);
  const [pages, setPages] = useState(1);
  return (
    <Screen>
      <Gate query={query} skeleton={<DetailSkeleton />}>
        {(data) => {
          const themName = firstName(data.opponent.displayName);
          const rows = data.history.map((match) => resultView(match, userId!, data.you.displayName, data.opponent.displayName));
          const { shown, more } = historyPage(rows, pages);
          const total = rows.length;
          return (
            <>
              <Top back kicker={`Tú vs ${themName} · ${total === 1 ? '1 partido' : `${total} partidos`}`} title="Historial" />
              {total === 0 ? (
                <View style={styles.empty}>
                  <T color={C.muted}>Todavía no juegan entre ustedes.</T>
                  <Button label={`Registrar partido contra ${themName}`} onPress={() => push(registerHref(String(id)) as Href)} />
                </View>
              ) : (
                <View style={styles.list}>
                  {shown.map((r, i) => {
                    const bg = r.outcome === 'you' ? C.you : r.outcome === 'them' ? C.them : C.draw;
                    const ink = r.outcome === 'you' ? C.youInk : r.outcome === 'them' ? C.themInk : C.youInk;
                    return (
                      <SportPress
                        key={r.id}
                        onPress={() => push(`/partido/${r.id}` as Href)}
                        style={[styles.row, i > 0 && styles.rowLine]}
                        accessibilityRole="button"
                        accessibilityLabel={`${r.score}, ${r.label}${r.at ? `, ${formatDay(r.at)}` : ''}${r.delta != null ? `, ${signed(r.delta)} Elo` : ''}`}
                      >
                        <View style={[styles.score, { backgroundColor: bg }]}>
                          <T variant="display" style={[styles.scoreText, { color: ink }]}>
                            {r.score}
                          </T>
                        </View>
                        <View style={styles.flex}>
                          <T variant="strong" style={[styles.label, { color: bg }]}>
                            {r.label}
                          </T>
                          <T variant="medium" style={styles.date}>
                            {r.at ? formatDay(r.at) : ''}
                          </T>
                        </View>
                        {r.delta != null ? (
                          <T variant="display" style={[styles.delta, { color: r.delta >= 0 ? C.you : C.them }]}>
                            {signed(r.delta)}
                          </T>
                        ) : null}
                      </SportPress>
                    );
                  })}
                </View>
              )}
              {more > 0 ? (
                <Button tone="ghost" label={`Ver ${Math.min(more, HISTORY_PAGE)} más`} onPress={() => setPages((p) => p + 1)} />
              ) : null}
            </>
          );
        }}
      </Gate>
    </Screen>
  );
}

const plain = { textTransform: 'none' as const, fontStyle: 'normal' as const };

const styles = StyleSheet.create({
  flex: { flex: 1, minWidth: 0 },
  empty: { gap: 12 },
  list: { backgroundColor: 'rgba(255,255,255,0.045)', borderWidth: 1, borderColor: 'rgba(201,162,255,0.2)', borderRadius: 16, paddingHorizontal: 12 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 60, paddingVertical: 8 },
  rowLine: { borderTopWidth: 1, borderTopColor: 'rgba(201,162,255,0.12)' },
  score: { width: 58, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  scoreText: { ...plain, fontSize: 18, lineHeight: 21, letterSpacing: -0.3 },
  label: { ...plain, fontFamily: font.bold, fontSize: 12, lineHeight: 15, letterSpacing: 0.6, textTransform: 'uppercase' },
  date: { ...plain, fontSize: 12.5, lineHeight: 16, color: C.muted },
  delta: { ...plain, fontSize: 15, lineHeight: 18 },
});
