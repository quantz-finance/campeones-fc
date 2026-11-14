// Cromo de club (opción 4): el grupo principal en oro, los demás en cresta, los públicos en mini-cromo.
// Un patrocinio solo se pinta si hay un registro real. Nunca un monograma inventado.
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import type { Group } from '../data/types';
import type { Sponsor } from '../data/types';
import { Shield } from './broadcast';
import { monogram } from './format';
import { colors, space } from './theme';
import { T } from './text';

const FOIL = '#D4AF37';
const FOIL_LIGHT = '#F1D27A';
const LILAC = 'rgba(201,162,255,0.55)';

export function FoilFrame({
  children,
  tone = 'gold',
  radius = 18,
}: {
  children: ReactNode;
  tone?: 'gold' | 'lilac';
  radius?: number;
}) {
  return (
    <View style={[styles.foil, { borderRadius: radius, backgroundColor: tone === 'gold' ? FOIL : LILAC }]}>
      <View style={[styles.foilInner, { borderRadius: Math.max(radius - 1.5, 0) }]}>{children}</View>
    </View>
  );
}

export function ClubCromo({
  group,
  memberCount,
  leaderName,
  yourPlace,
  sponsor,
  onPress,
}: {
  group: Group;
  memberCount: number;
  leaderName?: string | null;
  yourPlace?: number | null;
  sponsor?: Sponsor | null;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={group.name}>
      <FoilFrame>
        <View style={styles.cromo}>
          <View style={styles.cromoRow}>
            <Shield letters={monogram(group.name)} photoUrl={group.photoUrl} kind="groups" id={group.id} logo={group.logo} size={72} />
            <View style={styles.flex}>
              <T variant="title" style={styles.cromoName} numberOfLines={2}>
                {group.name}
              </T>
              <T variant="tiny" color={colors.muted}>
                {memberCount === 1 ? '1 jugador' : `${memberCount} jugadores`}
                {yourPlace ? ` · vas ${yourPlace}º` : ''}
              </T>
              {leaderName ? (
                <T variant="strong" color={colors.accentText} numberOfLines={1}>
                  Manda {leaderName}
                </T>
              ) : (
                <T variant="tiny" color={colors.faint}>
                  Nadie manda todavía
                </T>
              )}
            </View>
          </View>
          {sponsor?.name ? (
            <View style={styles.sponsorBar}>
              <T variant="tiny" color="#2A1800" style={styles.sponsorKicker}>
                Patrocinado por
              </T>
              <T variant="strong" color="#2A1800" numberOfLines={1}>
                {sponsor.name}
              </T>
            </View>
          ) : null}
        </View>
      </FoilFrame>
    </Pressable>
  );
}

export function CrestRow({
  groups,
  extra,
  onOpen,
}: {
  groups: Group[];
  extra: number;
  onOpen: (id: string) => void;
}) {
  if (!groups.length && extra <= 0) return null;
  return (
    <View style={styles.crestRow}>
      {groups.map((group) => (
        <Pressable key={group.id} onPress={() => onOpen(group.id)} accessibilityRole="button" accessibilityLabel={group.name} style={styles.crest}>
          <Shield letters={monogram(group.name)} photoUrl={group.photoUrl} kind="groups" id={group.id} logo={group.logo} size={40} />
        </Pressable>
      ))}
      {extra > 0 ? (
        <T variant="strong" color={colors.accentText} style={styles.more}>
          +{extra} más
        </T>
      ) : null}
    </View>
  );
}

export function MiniCromo({
  group,
  memberCount,
  joinPolicy,
  requested,
  busy,
  onOpen,
  onJoin,
}: {
  group: Group;
  memberCount: number;
  joinPolicy: 'open' | 'invite';
  requested: boolean;
  busy?: boolean;
  onOpen: () => void;
  onJoin: () => void;
}) {
  const open = joinPolicy === 'open';
  const label = requested ? 'Pendiente' : open ? 'Unirme' : 'Pedir invitación';
  return (
    <View style={styles.miniWrap}>
      <FoilFrame tone="lilac" radius={14}>
        <Pressable onPress={onOpen} accessibilityRole="button" accessibilityLabel={group.name} style={styles.mini}>
          <Shield letters={monogram(group.name)} photoUrl={group.photoUrl} kind="groups" id={group.id} logo={group.logo} size={52} />
          <T variant="strong" style={styles.miniName} numberOfLines={2}>
            {group.name}
          </T>
          <T variant="tiny" color={colors.muted}>
            {memberCount === 1 ? '1 jugador' : `${memberCount} jugadores`}
          </T>
          <T variant="tiny" color={open ? colors.accentText : colors.violet}>
            {open ? 'Abierto' : 'Con invitación'}
          </T>
          <Pressable
            onPress={onJoin}
            disabled={requested || busy}
            accessibilityRole="button"
            accessibilityLabel={label}
            style={[styles.cta, requested || busy ? styles.ctaWait : open ? styles.ctaOpen : styles.ctaInvite]}
          >
            <T variant="label" color={requested || !open ? colors.text : colors.ink} style={styles.ctaText}>
              {busy ? 'Un momento…' : label}
            </T>
          </Pressable>
        </Pressable>
      </FoilFrame>
    </View>
  );
}

const styles = StyleSheet.create({
  foil: { padding: 1.5 },
  foilInner: { backgroundColor: '#2A0030', overflow: 'hidden' },
  cromo: { padding: 14, gap: space.md },
  cromoRow: { flexDirection: 'row', gap: space.md, alignItems: 'center' },
  cromoName: { fontStyle: 'normal', fontSize: 22 },
  flex: { flex: 1, gap: 2, minWidth: 0 },
  sponsorBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 30,
    borderRadius: 8,
    backgroundColor: FOIL_LIGHT,
    paddingHorizontal: 10,
  },
  sponsorKicker: { letterSpacing: 1.1, textTransform: 'uppercase' },
  crestRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(255,255,255,0.045)',
    borderWidth: 1,
    borderColor: 'rgba(201,162,255,0.2)',
    borderRadius: 14,
    paddingVertical: 9,
    paddingHorizontal: 12,
  },
  crest: {
    width: 40,
    height: 40,
    borderRadius: 9,
    borderWidth: 1,
    borderColor: 'rgba(241,210,122,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  more: { marginLeft: 'auto' },
  miniWrap: { flex: 1, minWidth: 0 },
  mini: { padding: 11, alignItems: 'center', gap: 6, minHeight: 188 },
  miniName: { textAlign: 'center', fontSize: 15 },
  cta: {
    alignSelf: 'stretch',
    height: 30,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  ctaOpen: { backgroundColor: colors.accent },
  ctaInvite: { backgroundColor: 'transparent', borderWidth: 1, borderColor: colors.lineStrong },
  ctaWait: { backgroundColor: 'rgba(255,255,255,0.08)' },
  ctaText: { fontSize: 12 },
});
