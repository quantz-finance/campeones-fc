import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useEffect, useRef } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { noticeCopy } from '../../data/notices';
import { useApp } from '../../state/app-provider';
import { useQuery } from '../../state/use-query';
import { SectionHead } from '../../ui/broadcast';
import { Empty, Gate } from '../../ui/controls';
import { firstName, formatWhen } from '../../ui/format';
import { Rise } from '../../ui/motion';
import { Screen, Top } from '../../ui/screen';
import { ListSkeleton } from '../../ui/skeleton';
import { T } from '../../ui/text';
import { colors } from '../../ui/theme';

export default function Notices() {
  const { repo, userId, version, notices, markNoticesRead } = useApp();
  const home = useQuery(() => repo.homeSnapshot(userId!), [repo, userId, version]);
  // Lo que estaba sin leer al abrir sigue marcado en esta visita; en la base queda leído.
  const unreadAtOpen = useRef<Set<string> | null>(null);
  if (!unreadAtOpen.current && notices.length) unreadAtOpen.current = new Set(notices.filter((n) => !n.readAt).map((n) => n.id));
  useEffect(() => {
    if (notices.some((n) => !n.readAt)) markNoticesRead();
  }, [notices, markNoticesRead]);

  return (
    <Screen>
      <Top title="Avisos" kicker="Qué está pasando" back />
      <Gate query={home} skeleton={<ListSkeleton />}>
        {(snap) => {
          const open = [...snap.actionMatches, ...snap.waitingMatches];
          return (
            <>
              {open.length ? <SectionHead title="Partidos abiertos" /> : null}
              {open.map((match, index) => {
                const yours = snap.actionMatches.some((m) => m.id === match.id);
                const otherId = match.playerAId === userId ? match.playerBId : match.playerAId;
                const name = firstName(snap.people[otherId]?.displayName ?? 'tu rival');
                const status =
                  match.status === 'pending_accept'
                    ? yours
                      ? `${name} te retó · te toca aceptar`
                      : `Esperando que ${name} acepte`
                    : match.status === 'disputed'
                      ? `En disputa con ${name} · revisa tu voto`
                      : yours
                        ? `Te toca registrar o confirmar el resultado con ${name}`
                        : `Esperando que ${name} confirme el resultado`;
                return (
                  <Rise key={match.id} index={index}>
                    <Row
                      icon={yours ? 'flash' : 'time-outline'}
                      tint={yours ? colors.accent : colors.muted}
                      title={status}
                      body={formatWhen(match.createdAt)}
                      strong={yours}
                      onPress={() => router.push(`/partido/${match.id}`)}
                    />
                  </Rise>
                );
              })}
              <SectionHead title="Novedades" />
              {notices.length === 0 ? (
                <Empty title="Sin avisos todavía" body="Aquí te avisamos cuando un amigo entre por tu enlace, te reten o haya un resultado por confirmar." />
              ) : (
                notices.map((notice, index) => {
                  const copy = noticeCopy(notice);
                  const fresh = unreadAtOpen.current?.has(notice.id) ?? false;
                  return (
                    <Rise key={notice.id} index={index + open.length}>
                      <Row
                        icon={notice.kind.startsWith('friend') ? 'people' : 'football'}
                        tint={fresh ? colors.accent : colors.faint}
                        title={copy.title}
                        body={`${copy.body} · ${formatWhen(notice.createdAt)}`}
                        strong={fresh}
                        onPress={() => router.push(copy.href as never)}
                      />
                    </Rise>
                  );
                })
              )}
            </>
          );
        }}
      </Gate>
    </Screen>
  );
}

function Row({
  icon,
  tint,
  title,
  body,
  strong,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  tint: string;
  title: string;
  body: string;
  strong: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={[styles.row, strong && styles.rowStrong]}>
      <Ionicons name={icon} size={18} color={tint} />
      <View style={styles.copy}>
        <T variant="strong">{title}</T>
        <T variant="tiny" color={colors.muted} style={{ textTransform: 'none' }}>
          {body}
        </T>
      </View>
      <Ionicons name="chevron-forward" size={16} color={colors.faint} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    backgroundColor: colors.surface,
    borderColor: colors.line,
    borderWidth: 1,
    borderRadius: 6,
  },
  rowStrong: { borderLeftWidth: 4, borderLeftColor: colors.accent },
  copy: { flex: 1, gap: 2 },
});
