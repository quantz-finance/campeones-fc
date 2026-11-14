// Cromo de club (opción 4): el grupo principal en oro, los demás en cresta, los públicos en mini-cromo.
// Un patrocinio solo se pinta si hay un registro real. Nunca un monograma inventado.
import { useState, type ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import type { Group } from '../data/types';
import type { Sponsor } from '../data/types';
import { Shield } from './broadcast';
import { groupJoinLabel, monogram } from './format';
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

/**
 * Fila de crestas de tus otros grupos. Muestra las primeras `limit`; «+N más» (o tocar el espacio libre
 * de la fila) la abre aquí mismo con TODOS tus grupos (cresta + nombre), y «Ver menos» la cierra.
 * Cada cresta o renglón abre su grupo.
 */
export function CrestRow({
  groups,
  lead,
  limit = 5,
  onOpen,
}: {
  groups: Group[];
  /** El grupo del cromo grande: al abrir la lista va primero, para ver TODOS tus grupos juntos. */
  lead?: Group | null;
  limit?: number;
  onOpen: (id: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  if (!groups.length) return null;
  const extra = Math.max(0, groups.length - limit);
  const toggle = () => setExpanded((v) => !v);
  if (expanded && extra > 0) {
    return (
      <View style={[styles.crestRow, styles.crestOpen]}>
        <View style={styles.crestList}>
          {(lead ? [lead, ...groups] : groups).map((group) => (
            <Pressable
              key={group.id}
              onPress={() => onOpen(group.id)}
              accessibilityRole="button"
              accessibilityLabel={`Abrir ${group.name}`}
              style={({ pressed }) => [styles.crestItem, pressed ? styles.pressed : null]}
            >
              <View style={styles.crestSmall}>
                <Shield letters={monogram(group.name)} photoUrl={group.photoUrl} kind="groups" id={group.id} logo={group.logo} size={32} />
              </View>
              <T variant="strong" numberOfLines={2} style={styles.crestName}>
                {group.name}
              </T>
            </Pressable>
          ))}
        </View>
        <Pressable onPress={toggle} accessibilityRole="button" accessibilityLabel="Ver menos grupos" hitSlop={8} style={styles.lessBtn}>
          <T variant="strong" color={colors.accentText}>
            Ver menos
          </T>
        </Pressable>
      </View>
    );
  }
  return (
    // El espacio libre de la fila también abre la lista; para VoiceOver el botón es «+N más».
    <Pressable onPress={extra > 0 ? toggle : undefined} disabled={extra <= 0} accessible={false} style={styles.crestRow}>
      {groups.slice(0, limit).map((group) => (
        <Pressable key={group.id} onPress={() => onOpen(group.id)} accessibilityRole="button" accessibilityLabel={`Abrir ${group.name}`} style={styles.crest}>
          <Shield letters={monogram(group.name)} photoUrl={group.photoUrl} kind="groups" id={group.id} logo={group.logo} size={40} />
        </Pressable>
      ))}
      {extra > 0 ? (
        <Pressable
          onPress={toggle}
          accessibilityRole="button"
          accessibilityLabel={`Ver ${extra === 1 ? 'el otro grupo' : `los otros ${extra} grupos`}`}
          accessibilityHint="Muestra todos tus grupos aquí mismo."
          accessibilityState={{ expanded: false }}
          hitSlop={8}
          style={styles.more}
        >
          <T variant="strong" color={colors.accentText}>
            +{extra} más
          </T>
        </Pressable>
      ) : null}
    </Pressable>
  );
}

export function MiniCromo({
  group,
  memberCount,
  joinPolicy,
  requested,
  member,
  busy,
  onOpen,
  onJoin,
}: {
  group: Group;
  memberCount: number;
  joinPolicy: 'open' | 'invite';
  requested: boolean;
  member?: boolean;
  busy?: boolean;
  onOpen: () => void;
  onJoin: () => void;
}) {
  const open = joinPolicy === 'open';
  const label = groupJoinLabel(Boolean(member), requested, open);
  const locked = Boolean(member) || requested || busy;
  return (
    <View style={styles.miniWrap}>
      <FoilFrame tone="lilac" radius={14}>
        {/* El botón de unirse va al lado (no dentro) del que abre el grupo: un botón dentro de otro
            queda invisible para VoiceOver. */}
        <View style={styles.mini}>
          <Pressable onPress={onOpen} accessibilityRole="button" accessibilityLabel={group.name} style={styles.miniOpen}>
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
          </Pressable>
          <Pressable
            onPress={onJoin}
            disabled={locked}
            accessibilityRole="button"
            accessibilityLabel={label}
            style={[styles.cta, locked ? styles.ctaWait : open ? styles.ctaOpen : styles.ctaInvite]}
          >
            <T variant="strong" color={locked || !open ? colors.text : colors.ink} style={styles.ctaText} numberOfLines={2}>
              {busy ? 'Un momento…' : label}
            </T>
          </Pressable>
        </View>
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
  more: { marginLeft: 'auto', paddingVertical: 8, paddingLeft: 6 },
  crestOpen: { flexDirection: 'column', alignItems: 'stretch', gap: 8 },
  crestList: { flexDirection: 'row', flexWrap: 'wrap', rowGap: 8, columnGap: 8 },
  crestItem: { width: '48%', flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 44, paddingVertical: 2 },
  crestSmall: {
    width: 34,
    height: 34,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(241,210,122,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  crestName: { flex: 1, fontSize: 13, lineHeight: 16 },
  lessBtn: { alignSelf: 'flex-end', paddingVertical: 4 },
  pressed: { opacity: 0.6 },
  miniWrap: { width: '48.5%' },
  mini: { padding: 11, alignItems: 'center', gap: 6, minHeight: 196 },
  miniOpen: { alignItems: 'center', gap: 6, alignSelf: 'stretch' },
  miniName: { textAlign: 'center', fontSize: 15 },
  cta: {
    alignSelf: 'stretch',
    minHeight: 36,
    paddingHorizontal: 6,
    paddingVertical: 6,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  ctaOpen: { backgroundColor: colors.accent },
  ctaInvite: { backgroundColor: 'transparent', borderWidth: 1, borderColor: colors.lineStrong },
  ctaWait: { backgroundColor: 'rgba(255,255,255,0.08)' },
  ctaText: { fontSize: 12, lineHeight: 15, textAlign: 'center', textTransform: 'none', letterSpacing: 0 },
});
