// Ficha pública de un jugador: se abre sin cuenta y se comparte como partido.campeonesfc.app/jugador/<id>.
// Marcador grande arriba (estilo transmisión), luego redes, títulos, logros, grupos y últimos partidos.
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Platform, Share, StyleSheet, View } from 'react-native';
import { branding } from '../../../config/branding';
import { trophyCatalog } from '../../content/trophies';
import type { PublicPlayer } from '../../data/public-player';
import { DEFAULT_NATIVE_API_BASE } from '../../lib/api';
import { useApp } from '../../state/app-provider';
import { useQuery } from '../../state/use-query';
import { FormDots } from '../../ui/billboard';
import { InitialsMark, SectionHead, Shield } from '../../ui/broadcast';
import { Button, Gate } from '../../ui/controls';
import { elo, formatDay, monogram, pct, signed } from '../../ui/format';
import { CountRoll, Pop, Rise } from '../../ui/motion';
import { push } from '../../ui/nav';
import { SportPress } from '../../ui/press';
import { Screen, Top } from '../../ui/screen';
import { copyText } from '../../ui/share';
import { DetailSkeleton } from '../../ui/skeleton';
import { SocialButtons } from '../../ui/social-icons';
import { T } from '../../ui/text';
import { colors, layout, space } from '../../ui/theme';

export function playerShareUrl(id: string): string {
  if (Platform.OS === 'web' && typeof window !== 'undefined' && window.location?.origin) return `${window.location.origin}/jugador/${id}`;
  return `${DEFAULT_NATIVE_API_BASE}/jugador/${id}`;
}

function streakText(streak: PublicPlayer['streak']): string {
  if (streak.type === 'none' || streak.count === 0) return '–';
  return `${streak.count}${streak.type === 'win' ? 'V' : streak.type === 'draw' ? 'E' : 'D'}`;
}

function Cell({ value, label, accent }: { value: string; label: string; accent?: boolean }) {
  return (
    <View style={styles.cell}>
      <T variant="display" style={[styles.cellNum, accent && { color: colors.accentText }]} numberOfLines={1} adjustsFontSizeToFit>
        {value}
      </T>
      <T variant="tiny" color={colors.muted} numberOfLines={1}>
        {label}
      </T>
    </View>
  );
}

function Scorecard({ data }: { data: PublicPlayer }) {
  const p = data.profile;
  const total = Math.max(data.wins + data.draws + data.losses, 1);
  return (
    <View style={styles.hero}>
      <View style={styles.heroTop}>
        <View style={styles.heroLeft}>
          <T variant="tiny" color={colors.redInk}>
            Ranking
          </T>
          <T variant="display" style={styles.place}>
            {data.place ? `#${data.place}` : '—'}
          </T>
          <T variant="tiny" color={colors.redInk} style={styles.plain} numberOfLines={2}>
            {data.place ? `de ${data.rankedPlayers} jugadores` : `Faltan partidos para entrar`}
          </T>
          <View style={styles.heroMark} pointerEvents="none">
            <InitialsMark name={p.displayName} avatarKey={p.avatarKey} photoUrl={p.photoUrl} size={118} fontSize={42} />
          </View>
        </View>
        <View style={styles.heroRight}>
          <T variant="display" style={styles.name} numberOfLines={2} adjustsFontSizeToFit>
            {p.displayName}
          </T>
          <T variant="strong" color={colors.muted} numberOfLines={1}>
            @{p.username}
          </T>
          <View style={styles.eloRow}>
            <View style={styles.eloTag}>
              <T variant="tiny" color={colors.ink}>
                ELO
              </T>
            </View>
            <View style={styles.eloNum}>
              <Pop value={data.rating}>
                <CountRoll value={data.rating} format={(n) => elo(Math.round(n))}>
                  {(shown) => (
                    <T variant="display" style={{ fontSize: 30, color: colors.ink, fontStyle: 'normal' }}>
                      {shown}
                    </T>
                  )}
                </CountRoll>
              </Pop>
            </View>
          </View>
          <FormDots form={data.form} size={18} />
        </View>
      </View>
      <View style={styles.bar}>
        <View style={{ flex: data.wins / total, backgroundColor: colors.yellow }} />
        <View style={{ flex: data.draws / total, backgroundColor: colors.draw }} />
        <View style={{ flex: data.losses / total, backgroundColor: colors.loss }} />
      </View>
      <View style={styles.grid}>
        <Cell value={String(data.played)} label="Partidos" />
        <Cell value={`${data.wins}-${data.draws}-${data.losses}`} label="V-E-D" />
        <Cell value={pct(data.winRate)} label="Victorias" accent />
        <Cell value={String(data.goalsFor)} label="Goles" />
        <Cell value={streakText(data.streak)} label="Racha" />
        <Cell value={String(data.bestWinStreak)} label="Mejor racha" />
        <Cell value={elo(data.peak)} label="Elo máx." />
        <Cell value={String(data.titles.length)} label="Títulos" accent={data.titles.length > 0} />
      </View>
    </View>
  );
}

export default function PlayerPage() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const playerId = String(id ?? '');
  const { repo, userId, ready, version } = useApp();
  const query = useQuery(
    () => (ready ? repo.publicPlayer(playerId, userId) : new Promise<PublicPlayer>(() => undefined)),
    [repo, userId, ready, version, playerId],
  );
  const [copied, setCopied] = useState(false);

  async function share(data: PublicPlayer) {
    const url = playerShareUrl(playerId);
    const message = `Mira la ficha de ${data.profile.displayName} en ${branding.name}: ${url}`;
    if (Platform.OS === 'web') {
      if (typeof navigator !== 'undefined' && navigator.share) {
        try {
          await navigator.share({ title: data.profile.displayName, text: message, url });
          return;
        } catch {
          // Cancelado: copiamos el enlace.
        }
      }
      if (await copyText(url).catch(() => false)) {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
      return;
    }
    await Share.share({ message, url });
  }

  return (
    <Screen>
      <Gate query={query} skeleton={<DetailSkeleton />}>
        {(data) => {
          const mine = data.profile.id === userId;
          const titles = new Map(trophyCatalog.map((t) => [t.code, t.title]));
          return (
            <>
              <Top title="Ficha del jugador" kicker={branding.name} back />
              <Rise index={0}>
                <Scorecard data={data} />
              </Rise>
              <Rise index={1}>
                <View style={styles.actions}>
                  <View style={styles.flex}>
                    {mine ? (
                      <Button label="Editar mi perfil" tone="ghost" onPress={() => push('/perfil')} />
                    ) : userId ? (
                      <Button label="Cara a cara" onPress={() => push(`/versus/${data.profile.id}`)} icon={<Ionicons name="git-compare" size={16} color={colors.accentInk} />} />
                    ) : (
                      <Button label="Entra para retarlo" onPress={() => push('/entrar')} />
                    )}
                  </View>
                  <View style={styles.flex}>
                    <Button
                      label={copied ? 'Enlace copiado' : 'Compartir'}
                      tone="ghost"
                      onPress={() => void share(data)}
                      icon={<Ionicons name={copied ? 'checkmark' : 'share-outline'} size={16} color={colors.text} />}
                    />
                  </View>
                </View>
              </Rise>
              {Object.keys(data.profile.socialLinks).length ? (
                <Rise index={2} style={styles.section}>
                  <SectionHead title="Redes" />
                  <SocialButtons links={data.profile.socialLinks} />
                </Rise>
              ) : null}
              <Rise index={3} style={styles.section}>
                <SectionHead title="Torneos ganados" />
                {data.titles.length ? (
                  <View style={styles.wrap}>
                    {data.titles.map((cup) => (
                      <View key={cup.id} style={styles.trophy}>
                        <Ionicons name="trophy" size={14} color={colors.ink} />
                        <T variant="strong" color={colors.ink} style={{ fontSize: 13 }} numberOfLines={1}>
                          {cup.name}
                        </T>
                      </View>
                    ))}
                  </View>
                ) : (
                  <T color={colors.muted}>Todavía no gana un torneo.</T>
                )}
              </Rise>
              <Rise index={4} style={styles.section}>
                <SectionHead title="Logros" />
                {data.achievements.length ? (
                  <View style={styles.wrap}>
                    {data.achievements.map((item) => (
                      <View key={item.code} style={styles.badge}>
                        <Ionicons name="medal" size={14} color={colors.gold} />
                        <T variant="strong" style={{ fontSize: 13 }}>
                          {titles.get(item.code) ?? item.title}
                        </T>
                      </View>
                    ))}
                  </View>
                ) : (
                  <T color={colors.muted}>Todavía no tiene logros.</T>
                )}
              </Rise>
              {data.groups.length ? (
                <Rise index={5} style={styles.section}>
                  <SectionHead title="Grupos en común" />
                  <View style={styles.list}>
                    {data.groups.map((group) => (
                      <SportPress key={group.id} style={styles.row} onPress={() => push(`/grupo/${group.id}`)} accessibilityRole="link" accessibilityLabel={group.name}>
                        <Shield letters={monogram(group.name)} photoUrl={group.photoUrl} size={28} />
                        <T variant="strong" style={styles.flex} numberOfLines={1}>
                          {group.name}
                        </T>
                        <Ionicons name="chevron-forward" size={16} color={colors.faint} />
                      </SportPress>
                    ))}
                  </View>
                </Rise>
              ) : null}
              <Rise index={6} style={styles.section}>
                <SectionHead title="Últimos partidos" />
                {data.recent.length ? (
                  <View style={styles.list}>
                    {data.recent.map((match) => {
                      const tone = match.outcome === 'win' ? colors.yellow : match.outcome === 'draw' ? colors.draw : colors.loss;
                      const score = match.goalsFor != null && match.goalsAgainst != null ? `${match.goalsFor}–${match.goalsAgainst}` : match.outcome === 'win' ? 'V' : match.outcome === 'draw' ? 'E' : 'D';
                      return (
                        <SportPress
                          key={match.id}
                          style={styles.row}
                          onPress={match.opponent ? () => push(`/jugador/${match.opponent!.id}`) : undefined}
                          disabled={!match.opponent}
                          accessibilityLabel={match.opponent?.displayName ?? 'Rival'}
                        >
                          <View style={[styles.result, { backgroundColor: tone }]}>
                            <T variant="strong" color={colors.ink} style={{ fontSize: 14 }}>
                              {score}
                            </T>
                          </View>
                          <InitialsMark
                            name={match.opponent?.displayName ?? '?'}
                            avatarKey={match.opponent?.avatarKey ?? 'rayo'}
                            photoUrl={match.opponent?.photoUrl}
                            size={28}
                            fontSize={11}
                          />
                          <View style={styles.flex}>
                            <T variant="strong" numberOfLines={1}>
                              vs {match.opponent?.displayName ?? 'Rival'}
                            </T>
                            <T variant="tiny" color={colors.muted}>
                              {formatDay(match.at)}
                            </T>
                          </View>
                          {match.delta != null ? (
                            <T variant="strong" color={match.delta >= 0 ? colors.accentText : colors.loss}>
                              {signed(Math.round(match.delta))}
                            </T>
                          ) : null}
                        </SportPress>
                      );
                    })}
                  </View>
                ) : (
                  <T color={colors.muted}>Todavía no cierra partidos.</T>
                )}
              </Rise>
              {!userId ? (
                <Rise index={7}>
                  <View style={styles.cta}>
                    <T variant="title">¿Juegas con tus amigos?</T>
                    <T color={colors.muted}>Crea tu ficha, registra tus partidos y sube en el ranking.</T>
                    <Button label="Crear mi ficha" onPress={() => push('/entrar')} />
                  </View>
                </Rise>
              ) : null}
            </>
          );
        }}
      </Gate>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  section: { gap: layout.title },
  plain: { textTransform: 'none', letterSpacing: 0 },
  hero: { backgroundColor: colors.navy, borderRadius: 20, borderWidth: 1, borderColor: colors.line, overflow: 'hidden' },
  heroTop: { flexDirection: 'row', minHeight: 210 },
  heroLeft: { width: '36%', backgroundColor: colors.red, padding: 12, overflow: 'hidden' },
  place: { fontSize: 58, lineHeight: 62, fontStyle: 'normal', color: colors.redInk },
  heroMark: { position: 'absolute', right: -22, bottom: -10, opacity: 0.95 },
  heroRight: { flex: 1, padding: 12, gap: space.sm, justifyContent: 'center' },
  name: { fontSize: 32, lineHeight: 34, fontStyle: 'normal' },
  eloRow: { flexDirection: 'row', alignItems: 'stretch', alignSelf: 'flex-start' },
  eloTag: { backgroundColor: colors.yellow, paddingHorizontal: 6, justifyContent: 'center', borderRadius: 14 },
  eloNum: { backgroundColor: '#fff', paddingHorizontal: 8, justifyContent: 'center', borderRadius: 14 },
  bar: { flexDirection: 'row', height: 6, backgroundColor: colors.line },
  grid: { flexDirection: 'row', flexWrap: 'wrap', padding: space.sm, rowGap: space.sm },
  cell: { width: '25%', alignItems: 'center', paddingHorizontal: space.xxs, gap: space.xxs },
  cellNum: { fontSize: 22, lineHeight: 26, fontStyle: 'normal' },
  actions: { flexDirection: 'row', gap: layout.button },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  trophy: { flexDirection: 'row', alignItems: 'center', gap: layout.inline, backgroundColor: colors.gold, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999, maxWidth: '100%' },
  badge: { flexDirection: 'row', alignItems: 'center', gap: layout.inline, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999 },
  list: { gap: layout.card },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.md, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, borderRadius: 14, padding: 10 },
  result: { minWidth: 46, paddingHorizontal: 6, paddingVertical: 4, borderRadius: 10, alignItems: 'center' },
  cta: { gap: space.sm, padding: 16, borderRadius: 18, borderWidth: 1, borderColor: colors.lineStrong, backgroundColor: colors.cardSoft, marginTop: layout.section - layout.stack },
});
