// Ficha pública de un jugador: se abre sin cuenta y se comparte como partido.campeonesfc.app/jugador/<id>.
// Marcador grande arriba (estilo transmisión), luego redes, títulos, logros, grupos y últimos partidos.
import { Icon } from '../../ui/icon';
import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Platform, Share, StyleSheet, View } from 'react-native';
import { branding } from '../../../config/branding';
import { trophyCatalog } from '../../content/trophies';
import { AchievementsBoard } from '../../ui/achievements-board';
import type { PublicPlayer } from '../../data/public-player';
import { DEFAULT_NATIVE_API_BASE } from '../../lib/api';
import { useApp } from '../../state/app-provider';
import { useQuery } from '../../state/use-query';
import { InitialsMark, SectionHead, Shield } from '../../ui/broadcast';
import { Button, Gate } from '../../ui/controls';
import { formatDay, monogram, signed } from '../../ui/format';
import { Rise } from '../../ui/motion';
import { push } from '../../ui/nav';
import { SportPress } from '../../ui/press';
import { Screen, Top } from '../../ui/screen';
import { copyText } from '../../ui/share';
import { DetailSkeleton } from '../../ui/skeleton';
import { PlayerCard, cardFromPublic } from '../../ui/player-card';
import { SocialButtons } from '../../ui/social-icons';
import { T } from '../../ui/text';
import { colors, layout, space } from '../../ui/theme';

export function playerShareUrl(id: string): string {
  if (Platform.OS === 'web' && typeof window !== 'undefined' && window.location?.origin) return `${window.location.origin}/jugador/${id}`;
  return `${DEFAULT_NATIVE_API_BASE}/jugador/${id}`;
}

export default function PlayerPage() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const playerId = String(id ?? '');
  const { repo, userId, ready, version } = useApp();
  const query = useQuery(
    () => (ready ? repo.publicPlayer(playerId, userId) : new Promise<PublicPlayer>(() => undefined)),
    [repo, userId, ready, version, playerId],
    ready ? `player:${playerId}:${userId ?? ''}` : undefined,
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
          return (
            <>
              <Top back />
              <Rise index={0}>
                <PlayerCard data={cardFromPublic(data)} kicker={data.place === 1 ? 'Número 1 del ranking' : 'Jugador'} />
              </Rise>
              <Rise index={1}>
                <View style={styles.actions}>
                  <View style={styles.flex}>
                    {mine ? (
                      <Button label="Editar mi perfil" tone="ghost" onPress={() => push('/perfil')} />
                    ) : userId ? (
                      <Button label="Cara a cara" onPress={() => push(`/versus/${data.profile.id}`)} icon={<Icon name="vs" size={16} color={colors.accentInk} />} />
                    ) : (
                      <Button label="Entra para retarlo" onPress={() => push('/entrar')} />
                    )}
                  </View>
                  <View style={styles.flex}>
                    <Button
                      label={copied ? 'Enlace copiado' : 'Compartir'}
                      tone="ghost"
                      onPress={() => void share(data)}
                      icon={<Icon name={copied ? 'check' : 'compartir'} size={16} color={colors.text} />}
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
                        <Shield letters="" photoUrl={cup.photoUrl} kind="tournaments" id={cup.id} logo={cup.logo} size={28} />
                        <T variant="strong" color={colors.text} style={{ fontSize: 13 }} numberOfLines={1}>
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
                <SectionHead title="Logros" action={`${data.achievements.length} / 24`} />
                <AchievementsBoard
                  items={trophyCatalog.map((trophy) => ({
                    ...trophy,
                    earned: data.achievements.some((item) => item.code === trophy.code),
                    earnedAt: data.achievements.find((item) => item.code === trophy.code)?.earnedAt,
                  }))}
                  size={72}
                />
              </Rise>
              {data.groups.length ? (
                <Rise index={5} style={styles.section}>
                  <SectionHead title="Grupos en común" />
                  <View style={styles.list}>
                    {data.groups.map((group) => (
                      <SportPress key={group.id} style={styles.row} onPress={() => push(`/grupo/${group.id}`)} accessibilityRole="link" accessibilityLabel={group.name}>
                        <Shield letters={monogram(group.name)} photoUrl={group.photoUrl} kind="groups" id={group.id} logo={group.logo} size={32} />
                        <T variant="strong" style={styles.flex} numberOfLines={1}>
                          {group.name}
                        </T>
                        <Icon name="adelante" size={16} color={colors.faint} />
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
  actions: { flexDirection: 'row', gap: layout.button },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: layout.card },
  trophy: { flexDirection: 'row', alignItems: 'center', gap: space.sm, backgroundColor: colors.card, borderWidth: 1, borderColor: 'rgba(212,175,55,0.55)', paddingLeft: space.xs, paddingRight: space.md, paddingVertical: space.xs, borderRadius: 999, maxWidth: '100%' },
  badge: { flexDirection: 'row', alignItems: 'center', gap: layout.inline, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999 },
  list: { gap: layout.card },
  album: { flexDirection: 'row', justifyContent: 'space-around', gap: layout.card },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.md, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, borderRadius: 14, padding: 10 },
  result: { minWidth: 46, paddingHorizontal: 6, paddingVertical: 4, borderRadius: 10, alignItems: 'center' },
  cta: { gap: layout.inCard, padding: 16, borderRadius: 18, borderWidth: 1, borderColor: colors.lineStrong, backgroundColor: colors.cardSoft, marginTop: layout.section - layout.stack },
});
