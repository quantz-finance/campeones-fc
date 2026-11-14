// Póster de evento (opción 4). El póster de patrocinio y cualquier anuncio
// solo se pintan si hay un registro real. El premio, si aparece, es en especie.
import { Pressable, StyleSheet, View } from 'react-native';
import type { Sponsor, Tournament } from '../data/types';
import { Shield } from './broadcast';
import { formatEventWhen, monogram, slotsLine, tournamentStatusLabel } from './format';
import { colors, space } from './theme';
import { T } from './text';

const FOIL = '#D4AF37';

export function EventPoster({
  tournament,
  groupName,
  registeredCount,
  sponsor,
  onPress,
  onJoin,
  joinLabel,
  joinDisabled,
}: {
  tournament: Tournament;
  groupName?: string | null;
  registeredCount: number;
  sponsor: Sponsor;
  onPress: () => void;
  onJoin?: () => void;
  joinLabel?: string;
  joinDisabled?: boolean;
}) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={tournament.name}>
      <View style={styles.hero}>
        <T variant="tiny" color={FOIL} style={styles.kicker}>
          {formatEventWhen(tournament.startsAt) || tournamentStatusLabel(tournament.status === 'registration' ? 'registration' : tournament.status)}
        </T>
        <T variant="display" style={styles.heroName} numberOfLines={2}>
          {tournament.name}
        </T>
        {groupName ? (
          <T variant="tiny" color={colors.muted} numberOfLines={1}>
            {groupName}
          </T>
        ) : null}
        <View style={styles.heroMid}>
          <Shield letters={monogram(tournament.name)} photoUrl={tournament.photoUrl} kind="tournaments" id={tournament.id} logo={tournament.logo} size={72} />
          {sponsor.prize ? (
            <View style={styles.flex}>
              <T variant="tiny" color={colors.faint}>
                Premio
              </T>
              <T variant="strong" color={FOIL} numberOfLines={2}>
                {sponsor.prize}
              </T>
              <T variant="tiny" color={colors.muted} numberOfLines={1}>
                {sponsor.name}
              </T>
            </View>
          ) : (
            <T variant="strong" color={FOIL} style={styles.flex} numberOfLines={2}>
              {sponsor.name}
            </T>
          )}
        </View>
        <View style={styles.heroFoot}>
          <T variant="tiny" color={colors.muted}>
            {slotsLine(registeredCount, tournament.maxPlayers)}
          </T>
          {onJoin && joinLabel ? (
            <Pressable
              onPress={onJoin}
              disabled={joinDisabled}
              accessibilityRole="button"
              accessibilityLabel={joinLabel}
              style={[styles.join, joinDisabled ? styles.joinWait : styles.joinGo]}
            >
              <T variant="label" color={joinDisabled ? colors.text : colors.ink}>
                {joinLabel}
              </T>
            </Pressable>
          ) : null}
        </View>
      </View>
    </Pressable>
  );
}

export function MiniPoster({
  name,
  photoUrl,
  logo,
  id,
  status,
  phase,
  yourLabel,
  onPress,
}: {
  name: string;
  photoUrl?: string | null;
  logo?: string | null;
  id: string;
  status: Tournament['status'];
  phase?: string | null;
  yourLabel?: string | null;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={name} style={styles.mini}>
      <Shield letters={monogram(name)} photoUrl={photoUrl} kind="tournaments" id={id} logo={logo} size={40} />
      <T variant="strong" style={styles.miniName} numberOfLines={2}>
        {name}
      </T>
      <T variant="tiny" color={status === 'completed' ? colors.up : status === 'registration' ? colors.violet : colors.accentText}>
        {tournamentStatusLabel(status)}
      </T>
      {phase ? (
        <T variant="tiny" color={colors.muted} numberOfLines={1}>
          {phase}
        </T>
      ) : null}
      {yourLabel ? (
        <T variant="strong" color={colors.accentText} numberOfLines={1}>
          {yourLabel}
        </T>
      ) : null}
    </Pressable>
  );
}

export function PublicTournamentRow({
  tournament,
  groupName,
  registeredCount,
  requested,
  registered,
  busy,
  onOpen,
  onJoin,
}: {
  tournament: Tournament;
  groupName?: string | null;
  registeredCount: number;
  requested: boolean;
  registered: boolean;
  busy?: boolean;
  onOpen: () => void;
  onJoin: () => void;
}) {
  const open = tournament.joinPolicy !== 'invite';
  const canJoin = tournament.status === 'registration' && !registered;
  const label = registered ? 'Inscrito' : requested ? 'Pendiente' : open ? 'Inscribirme' : 'Pedir invitación';
  return (
    <View style={styles.row}>
      <Pressable onPress={onOpen} style={styles.rowMain} accessibilityRole="button" accessibilityLabel={tournament.name}>
        <Shield letters={monogram(tournament.name)} photoUrl={tournament.photoUrl} kind="tournaments" id={tournament.id} logo={tournament.logo} size={40} />
        <View style={styles.flex}>
          <T variant="strong" numberOfLines={1}>
            {tournament.name}
          </T>
          <T variant="tiny" color={colors.muted} numberOfLines={1}>
            {open ? 'Abierto' : 'Con invitación'}
            {tournament.startsAt ? ` · ${formatEventWhen(tournament.startsAt)}` : ''}
            {groupName ? ` · ${groupName}` : ''}
          </T>
          <T variant="tiny" color={colors.faint}>
            {slotsLine(registeredCount, tournament.maxPlayers)}
          </T>
        </View>
      </Pressable>
      {canJoin || registered || requested ? (
        <Pressable
          onPress={onJoin}
          disabled={!canJoin || requested || busy}
          accessibilityRole="button"
          accessibilityLabel={label}
          style={[styles.join, !canJoin || requested || busy ? styles.joinWait : open ? styles.joinGo : styles.joinGhost]}
        >
          <T variant="label" color={!canJoin || requested || !open ? colors.text : colors.ink} style={{ fontSize: 12 }}>
            {busy ? 'Un momento…' : label}
          </T>
        </Pressable>
      ) : null}
    </View>
  );
}

/** Anuncio o franja de patrocinio: solo con datos reales, uno por pantalla. */
export function SponsorStrip({ sponsor }: { sponsor: Sponsor }) {
  if (!sponsor.name) return null;
  return (
    <View style={styles.strip}>
      <View style={styles.flex}>
        <T variant="tiny" color={colors.faint}>
          {sponsor.kicker || 'Patrocinio'}
        </T>
        <T variant="strong" numberOfLines={2}>
          {sponsor.body || sponsor.name}
        </T>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  hero: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(241,210,122,0.4)',
    backgroundColor: '#2A0030',
    padding: 14,
    gap: 8,
  },
  kicker: { letterSpacing: 0.4, textTransform: 'uppercase' },
  heroName: { fontStyle: 'normal', fontSize: 28, lineHeight: 32 },
  heroMid: { flexDirection: 'row', gap: space.md, alignItems: 'center', marginTop: 4 },
  heroFoot: { flexDirection: 'row', alignItems: 'center', gap: space.md, marginTop: 4 },
  flex: { flex: 1, minWidth: 0, gap: 2 },
  join: { height: 30, paddingHorizontal: 12, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  joinGo: { backgroundColor: colors.accent },
  joinGhost: { backgroundColor: 'transparent', borderWidth: 1, borderColor: colors.lineStrong },
  joinWait: { backgroundColor: 'rgba(255,255,255,0.08)' },
  mini: {
    width: 150,
    height: 150,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(241,210,122,0.3)',
    backgroundColor: '#2A0030',
    padding: 10,
    gap: 4,
  },
  miniName: { fontSize: 14 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(201,162,255,0.12)',
  },
  rowMain: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10, minWidth: 0 },
  strip: {
    flexDirection: 'row',
    gap: 10,
    padding: 12,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(233,227,238,0.22)',
  },
});
