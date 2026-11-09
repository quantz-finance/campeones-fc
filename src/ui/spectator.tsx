// Modo espectador en pantalla: botón de entrada, invitación a crear perfil y la portada "Así va la cancha".
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { SpectatorFeed } from '../data/spectator';
import { AI_PHOTO_NOTE } from '../lib/app-mode';
import { useApp } from '../state/app-provider';
import { InitialsMark, ScoreBar, SectionHead, Shield, Toro, Wordmark } from './broadcast';
import { Banner, Button } from './controls';
import { firstName, formatWhen, monogram, scoreText, tagOf } from './format';
import { CountRoll, Rise } from './motion';
import { push, transit } from './nav';
import { colors } from './theme';
import { T } from './text';

/** "Solo quiero mirar": entra sin cuenta, en solo lectura. Reemplaza al antiguo botón del usuario de prueba. */
export function SpectatorButton({ tone = 'ghost' }: { tone?: 'accent' | 'ghost' }) {
  const app = useApp();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  return (
    <View style={styles.wrap} testID="spectator-entry">
      <Button
        label="Solo quiero mirar"
        tone={tone}
        pending={busy}
        disabled={busy}
        icon={<Ionicons name="eye-outline" size={18} color={tone === 'accent' ? colors.accentInk : colors.text} />}
        onPress={() => {
          setError(null);
          setBusy(true);
          // Al abrirse, la portada y /entrar redirigen solas a /inicio (igual que al entrar con una cuenta).
          app
            .enterSpectator()
            .catch((e: unknown) => setError(e instanceof Error ? e.message : 'No pudimos abrir el modo espectador. Intenta de nuevo en un momento.'))
            .finally(() => setBusy(false));
        }}
      />
      <T variant="tiny" color={colors.faint} style={styles.plain}>
        Mira cómo van las copas, los grupos y los partidos sin crear cuenta. Son datos de ejemplo y no puedes jugar ni registrar resultados.
      </T>
      {error ? <Banner tone="danger" title="No se pudo abrir" body={error} /> : null}
    </View>
  );
}

/** Invitación a crear su perfil (pestaña Perfil, Registrar y cualquier acción bloqueada). */
export function SpectatorInvite({
  title = 'Crea tu perfil y entra a la cancha',
  body = 'Como espectador solo puedes mirar. Con tu perfil retas a tus amigos, registran resultados, armas tu grupo y juegas las copas.',
  back = false,
}: {
  title?: string;
  body?: string;
  back?: boolean;
}) {
  const app = useApp();
  return (
    <View style={styles.invite} testID="spectator-invite">
      <Rise index={0} style={styles.inviteCard}>
        <View style={styles.inviteMark}>
          <Toro size={64} />
        </View>
        <T variant="label" color={colors.accentText}>
          Modo espectador
        </T>
        <T variant="display" style={styles.inviteTitle}>
          {title}
        </T>
        <T color={colors.muted}>{body}</T>
        <View style={styles.perks}>
          {[
            ['flash-outline', 'Reta a tus amigos y confirmen el resultado entre los dos'],
            ['trophy-outline', 'Arma copas de eliminación o liga en tu grupo'],
            ['stats-chart-outline', 'Tu Elo, tus rachas y tu historial con cada rival'],
          ].map(([icon, text]) => (
            <View key={text} style={styles.perk}>
              <Ionicons name={icon as keyof typeof Ionicons.glyphMap} size={18} color={colors.accentText} />
              <T style={styles.flex}>{text}</T>
            </View>
          ))}
        </View>
      </Rise>
      <Rise index={1} style={styles.inviteActions}>
        <Button
          label="Crear mi perfil"
          // Sin espectador ni sesión, la app manda a /entrar sola.
          onPress={() => transit(() => app.leaveSpectator())}
        />
        {back ? <Button label="Seguir mirando" tone="ghost" onPress={() => push('/inicio')} /> : null}
      </Rise>
    </View>
  );
}

/** Portada del espectador: grupos más reñidos, copas en juego y últimos resultados confirmados. */
export function SpectatorHome() {
  const app = useApp();
  const repo = app.repo as { feed?: () => SpectatorFeed };
  const feed = repo.feed?.();
  if (!feed) return null;
  const name = (id: string | null | undefined) => (id ? (feed.people[id]?.displayName ?? '') : '');
  return (
    <>
      <View style={styles.brandRow}>
        <Wordmark size={20} />
        <View style={styles.chip}>
          <Ionicons name="eye-outline" size={12} color={colors.ink} />
          <T variant="tiny" color={colors.ink} style={{ fontSize: 10 }}>
            ESPECTADOR
          </T>
        </View>
      </View>
      <T variant="tiny" color={colors.faint} style={[styles.plain, { fontSize: 10 }]}>
        {`Datos de ejemplo · ${AI_PHOTO_NOTE}`}
      </T>

      <Rise index={0}>
        <View style={styles.hero}>
          <T variant="label" color={colors.accentText}>
            Así va la cancha
          </T>
          <T variant="display" style={styles.heroTitle}>
            Mira los grupos, las copas y los partidos
          </T>
          <T color={colors.muted}>Cuando quieras jugar, crea tu perfil en un paso.</T>
          <View style={styles.heroCta}>
            <Button label="Crear mi perfil" onPress={() => push('/perfil')} />
          </View>
        </View>
      </Rise>

      <SectionHead title="Los más reñidos" action="Grupos" onAction={() => push('/grupos')} />
      {feed.contested.length === 0 ? (
        <T color={colors.muted}>Todavía no hay grupos con partidos confirmados.</T>
      ) : (
        feed.contested.map((item, index) => (
          <Rise key={item.group.id} index={index + 1}>
            <Pressable style={styles.raceCard} onPress={() => push(`/grupo/${item.group.id}`)} accessibilityRole="button">
              <View style={styles.raceTop}>
                <Shield letters={monogram(item.group.name)} photoUrl={item.group.photoUrl} size={48} />
                <View style={styles.flex}>
                  <T variant="title" style={styles.cardTitle} numberOfLines={1}>
                    {item.group.name}
                  </T>
                  <T variant="tiny" color={colors.muted}>
                    {`${item.memberCount} jugadores · ${item.played} partidos`}
                  </T>
                </View>
                <View style={[styles.gap, item.gap === 0 && styles.gapTie]}>
                  <CountRoll value={item.gap} format={(n) => String(Math.round(n))}>
                    {(shown) => (
                      <T variant="display" style={styles.gapNum} color={colors.ink}>
                        {shown}
                      </T>
                    )}
                  </CountRoll>
                  <T variant="tiny" color={colors.ink} style={styles.gapLabel}>
                    {item.gap === 0 ? 'empatados' : item.gap === 1 ? 'punto arriba' : 'puntos arriba'}
                  </T>
                </View>
              </View>
              <View style={styles.duel}>
                <View style={styles.side}>
                  <InitialsMark name={item.leader.displayName} avatarKey={item.leader.avatarKey} photoUrl={item.leader.photoUrl} size={28} fontSize={11} />
                  <T variant="strong" numberOfLines={1} style={styles.flexShrink}>
                    {firstName(item.leader.displayName)}
                  </T>
                  <T variant="strong" color={colors.accentText}>
                    {String(item.leaderPoints)}
                  </T>
                </View>
                <T variant="tiny" color={colors.muted}>
                  vs
                </T>
                <View style={[styles.side, styles.sideRight]}>
                  <T variant="strong" color={colors.accentText}>
                    {String(item.chaserPoints)}
                  </T>
                  <T variant="strong" numberOfLines={1} style={styles.flexShrink}>
                    {firstName(item.chaser.displayName)}
                  </T>
                  <InitialsMark name={item.chaser.displayName} avatarKey={item.chaser.avatarKey} photoUrl={item.chaser.photoUrl} size={28} fontSize={11} />
                </View>
              </View>
            </Pressable>
          </Rise>
        ))
      )}

      <SectionHead title="Copas" action="Torneos" onAction={() => push('/torneos')} />
      {feed.cups.length === 0 ? (
        <T color={colors.muted}>Todavía no hay copas.</T>
      ) : (
        feed.cups.map((cup, index) => (
          <Rise key={cup.tournament.id} index={index + 4}>
            <Pressable style={styles.card} onPress={() => push(`/torneo/${cup.tournament.id}`)} accessibilityRole="button">
              <Shield letters={monogram(cup.tournament.name)} photoUrl={cup.tournament.photoUrl} size={44} />
              <View style={styles.flex}>
                <T variant="title" style={styles.cardTitle} numberOfLines={1}>
                  {cup.tournament.name}
                </T>
                <T variant="tiny" color={colors.muted}>
                  {cup.groupName}
                </T>
                {cup.winner ? (
                  <T variant="strong" color={colors.accentText}>
                    {`Campeón: ${cup.winner.displayName}`}
                  </T>
                ) : cup.total > 0 ? (
                  <View style={styles.progressRow}>
                    <View style={styles.track}>
                      <View style={[styles.fill, { width: `${Math.round((cup.decided / cup.total) * 100)}%` }]} />
                    </View>
                    <T variant="tiny" color={colors.muted}>
                      {`${cup.decided}/${cup.total} cruces`}
                    </T>
                  </View>
                ) : null}
              </View>
              <T variant="tiny" color={cup.tournament.status === 'completed' ? colors.up : colors.accentText}>
                {cup.tournament.status === 'completed' ? 'Finalizado' : 'En juego'}
              </T>
            </Pressable>
          </Rise>
        ))
      )}

      <SectionHead title="Últimos resultados" />
      {feed.recent.length === 0 ? (
        <T color={colors.muted}>Todavía no hay partidos confirmados.</T>
      ) : (
        feed.recent.map((match, index) => {
          const a = feed.people[match.playerAId];
          const b = feed.people[match.playerBId];
          const where = match.groupId ? feed.groupNames[match.groupId] : null;
          const result = match.isDraw ? 'Empate' : `Ganó ${firstName(name(match.winnerId))}`;
          return (
            <Rise key={match.id} index={Math.min(index + 8, 12)}>
              <ScoreBar
                leftTag={tagOf(a?.displayName ?? '')}
                rightTag={tagOf(b?.displayName ?? '')}
                leftPhoto={a?.photoUrl}
                rightPhoto={b?.photoUrl}
                score={scoreText(match.goalsA, match.goalsB) ?? (match.isDraw ? 'E' : 'V')}
                onPress={() => push(`/partido/${match.id}`)}
                note={[result, where, formatWhen(match.confirmedAt ?? match.createdAt)].filter(Boolean).join(' · ')}
              />
            </Rise>
          );
        })
      )}
    </>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 8, alignSelf: 'stretch' },
  plain: { textTransform: 'none', letterSpacing: 0, lineHeight: 16 },
  flex: { flex: 1, gap: 3 },
  flexShrink: { flexShrink: 1 },
  invite: { gap: 16, paddingTop: 8 },
  inviteCard: {
    gap: 10,
    padding: 18,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.card,
    overflow: 'hidden',
  },
  inviteMark: { alignSelf: 'flex-start', padding: 6, borderRadius: 999, backgroundColor: colors.wash },
  inviteTitle: { fontSize: 30, lineHeight: 33, fontStyle: 'normal' },
  inviteActions: { gap: 10 },
  perks: { gap: 10, marginTop: 4 },
  perk: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 14,
    backgroundColor: colors.yellow,
  },
  hero: {
    gap: 8,
    padding: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.navy,
  },
  heroTitle: { fontSize: 28, lineHeight: 31, fontStyle: 'normal' },
  heroCta: { marginTop: 4 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 14,
  },
  cardTitle: { fontStyle: 'normal', fontSize: 18 },
  raceCard: {
    gap: 10,
    padding: 12,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 14,
  },
  raceTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  duel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: colors.line,
  },
  side: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6 },
  sideRight: { justifyContent: 'flex-end' },
  gapLabel: { fontSize: 9, textAlign: 'center' },
  gap: {
    minWidth: 64,
    maxWidth: 76,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    paddingHorizontal: 6,
    borderRadius: 14,
    backgroundColor: colors.yellow,
  },
  gapTie: { backgroundColor: colors.up },
  gapNum: { fontSize: 26, lineHeight: 28, fontStyle: 'normal' },
  progressRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  track: { flex: 1, height: 6, borderRadius: 14, backgroundColor: colors.line, overflow: 'hidden' },
  fill: { height: 6, borderRadius: 14, backgroundColor: colors.yellow },
});
