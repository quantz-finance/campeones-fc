// Aviso flotante (arriba) cuando llega algo nuevo: amigo que entró por tu enlace, reto, resultado por confirmar…
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { noticeCopy } from '../data/notices';
import { useApp } from '../state/app-provider';
import { Rise } from './motion';
import { T } from './text';
import { colors } from './theme';

type Toast = { id: string; noticeId?: string; title: string; body?: string; href?: string; tone?: 'accent' | 'danger'; more: number };

const FRESH_MS = 10 * 60_000;
const SHOW_MS = 6500;

export function NoticeToast() {
  const { notices, flash, showFlash, markNoticesRead } = useApp();
  const seen = useRef<Set<string> | null>(null);
  const [toast, setToast] = useState<Toast | null>(null);

  useEffect(() => {
    const unread = notices.filter((n) => !n.readAt);
    if (!seen.current) {
      if (!notices.length) return;
      // Primera carga: solo lo reciente (p. ej. tu amigo entró mientras tenías la app cerrada).
      seen.current = new Set(notices.map((n) => n.id));
      const fresh = unread.filter((n) => Date.now() - Date.parse(n.createdAt) < FRESH_MS);
      if (fresh[0]) setToast({ id: fresh[0].id, noticeId: fresh[0].id, ...noticeCopy(fresh[0]), more: fresh.length - 1 });
      return;
    }
    const known = seen.current;
    const added = unread.filter((n) => !known.has(n.id));
    for (const n of notices) known.add(n.id);
    if (added[0]) setToast({ id: added[0].id, noticeId: added[0].id, ...noticeCopy(added[0]), more: added.length - 1 });
  }, [notices]);

  useEffect(() => {
    if (!flash) return;
    setToast({ ...flash, more: 0 });
    showFlash(null);
  }, [flash, showFlash]);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), SHOW_MS);
    return () => clearTimeout(timer);
  }, [toast]);

  if (!toast) return null;
  const danger = toast.tone === 'danger';
  return (
    <View style={styles.wrap} pointerEvents="box-none">
      <Rise key={toast.id}>
        <Pressable
          accessibilityRole="alert"
          style={[styles.card, { borderLeftColor: danger ? colors.danger : colors.accent }]}
          onPress={() => {
            if (toast.noticeId) markNoticesRead([toast.noticeId]);
            setToast(null);
            if (toast.href) router.push(toast.href as never);
          }}
        >
          <Ionicons name={danger ? 'alert-circle' : 'notifications'} size={20} color={danger ? colors.danger : colors.accent} />
          <View style={styles.copy}>
            <T variant="strong" numberOfLines={2}>
              {toast.title}
            </T>
            {toast.body ? (
              <T color={colors.muted} numberOfLines={2}>
                {toast.body}
              </T>
            ) : null}
            {toast.more > 0 ? (
              <T variant="tiny" color={colors.faint}>
                +{toast.more} {toast.more === 1 ? 'aviso más' : 'avisos más'} en la campana
              </T>
            ) : null}
          </View>
          <Pressable accessibilityLabel="Cerrar aviso" hitSlop={10} onPress={() => setToast(null)}>
            <Ionicons name="close" size={18} color={colors.muted} />
          </Pressable>
        </Pressable>
      </Rise>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', top: 12, left: 12, right: 12, zIndex: 50, alignItems: 'center' },
  card: {
    width: '100%',
    maxWidth: 480,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    padding: 14,
    backgroundColor: colors.surface,
    borderColor: colors.line,
    borderWidth: 1,
    borderLeftWidth: 4,
    borderRadius: 6,
    shadowColor: '#000',
    shadowOpacity: 0.4,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
  copy: { flex: 1, gap: 2 },
});
