import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { AppState, Platform, StyleSheet, View } from 'react-native';
import { T } from '../ui/text';
import { colors } from '../ui/theme';
import { createRepository, type Repository } from '../data';
import { readDemoSession, readPendingInvite, writeDemoSession, writePendingInvite } from '../data/demo-store';
import type { Profile } from '../data/types';
import type { Notice } from '../data/notices';
import { initAnalytics, track } from '../lib/analytics';
import { backendMode, type BackendMode } from '../lib/env';
import { getSupabase } from '../lib/supabase';
import { CavosLoader } from '../lib/cavos/loader';
import { cavosLogout } from '../lib/cavos/session';

export type Flash = { id: string; title: string; body?: string; href?: string; tone?: 'accent' | 'danger' };

type AppValue = {
  ready: boolean;
  mode: BackendMode;
  userId: string | null;
  profile: Profile | null;
  repo: Repository;
  version: number;
  /** Avisos recientes (amistad, retos, resultados) y cuántos faltan por leer. */
  notices: Notice[];
  unread: number;
  markNoticesRead: (ids?: string[]) => void;
  /** Aviso local de un momento (p. ej. la invitación se usó al entrar). */
  flash: Flash | null;
  showFlash: (next: Flash | null) => void;
  signInDemo: (userId: string) => void;
  signOut: () => Promise<void>;
  refresh: () => void;
};

const AppContext = createContext<AppValue | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const mode = backendMode();
  const repo = useMemo(() => (mode === 'invalid' ? null : createRepository()), [mode]);
  const [userId, setUserId] = useState<string | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [ready, setReady] = useState(mode === 'invalid');
  const [version, setVersion] = useState(0);
  const [notices, setNotices] = useState<Notice[]>([]);
  const [flash, setFlash] = useState<Flash | null>(null);

  useEffect(() => {
    initAnalytics();
  }, []);

  useEffect(() => {
    if (!repo) return;
    return repo.subscribe(() => setVersion((current) => current + 1));
  }, [repo]);

  useEffect(() => {
    if (!repo || mode === 'invalid') return;
    let active = true;
    if (mode === 'demo') {
      setUserId(readDemoSession());
      setReady(true);
      return;
    }
    const supabase = getSupabase();
    void supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      setUserId(data.session?.user.id ?? null);
      setReady(true);
    });
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      setUserId(session?.user.id ?? null);
      setReady(true);
    });
    return () => {
      active = false;
      data.subscription.unsubscribe();
    };
  }, [mode, repo]);

  useEffect(() => {
    if (!repo || !userId) {
      setProfile(null);
      return;
    }
    let active = true;
    void repo.getProfile(userId).then((next) => {
      if (active) setProfile(next);
    });
    return () => {
      active = false;
    };
  }, [repo, userId, version]);

  useEffect(() => {
    if (!repo || !userId) {
      setNotices([]);
      return;
    }
    let active = true;
    void repo
      .notices(userId)
      .then((next) => {
        if (active) setNotices(next);
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, [repo, userId, version]);

  // Respaldo de Realtime: al volver a la app (pestaña visible, red de vuelta) y cada 30 s se relee todo,
  // así los dos lados quedan al día aunque el socket se haya dormido (p. ej. al saltar a WhatsApp).
  useEffect(() => {
    if (!repo || !userId) return;
    let last = 0;
    const wake = () => {
      const now = Date.now();
      if (now - last < 2000) return;
      last = now;
      repo.invalidate();
    };
    const web = Platform.OS === 'web' && typeof document !== 'undefined';
    const visible = () => !web || document.visibilityState === 'visible';
    const onVisible = () => {
      if (visible()) wake();
    };
    const timer = setInterval(() => {
      if (visible()) wake();
    }, 30_000);
    if (web) {
      document.addEventListener('visibilitychange', onVisible);
      window.addEventListener('focus', onVisible);
      window.addEventListener('online', wake);
      return () => {
        clearInterval(timer);
        document.removeEventListener('visibilitychange', onVisible);
        window.removeEventListener('focus', onVisible);
        window.removeEventListener('online', wake);
      };
    }
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') wake();
    });
    return () => {
      clearInterval(timer);
      sub.remove();
    };
  }, [repo, userId]);

  const markNoticesRead = useCallback(
    (ids?: string[]) => {
      if (!repo || !userId) return;
      const at = new Date().toISOString();
      setNotices((current) => current.map((n) => (n.readAt || (ids && !ids.includes(n.id)) ? n : { ...n, readAt: at })));
      void repo.markNoticesRead(userId, ids).catch(() => undefined);
    },
    [repo, userId],
  );

  useEffect(() => {
    if (!repo || !userId) return;
    void repo.expireStale();
    const timer = setInterval(() => void repo.expireStale(), 30_000);
    return () => clearInterval(timer);
  }, [repo, userId]);

  useEffect(() => {
    if (!repo || !userId) return;
    const code = readPendingInvite();
    if (!code) return;
    writePendingInvite(null);
    void repo
      .redeemInvite(userId, code)
      .then((result) =>
        setFlash({
          id: `invite-${code}`,
          title: result === 'already' ? 'Ya eran amigos' : 'Listo, ya son amigos',
          body: 'Ya aparecen en la lista del otro. Rétalo desde Amigos.',
          href: '/amigos',
        }),
      )
      .catch((cause: unknown) =>
        setFlash({
          id: `invite-${code}`,
          title: 'El enlace de invitación no sirvió',
          body: cause instanceof Error ? cause.message : 'Pide uno nuevo.',
          tone: 'danger',
        }),
      );
  }, [repo, userId]);

  const value = useMemo<AppValue | null>(() => {
    if (!repo || mode === 'invalid') return null;
    return {
      ready,
      mode,
      userId,
      profile,
      repo,
      version,
      notices,
      unread: notices.filter((n) => !n.readAt).length,
      markNoticesRead,
      flash,
      showFlash: setFlash,
      signInDemo(nextId: string) {
        writeDemoSession(nextId);
        setUserId(nextId);
        track('sign_in', { method: 'demo' });
      },
      async signOut() {
        if (mode === 'supabase') {
          await cavosLogout();
          // Solo este dispositivo: cerrar sesión aquí no saca al usuario de su otro teléfono o de la app instalada.
          await getSupabase().auth.signOut({ scope: 'local' });
        }
        writeDemoSession(null);
        setUserId(null);
        setProfile(null);
      },
      refresh() {
        setVersion((current) => current + 1);
      },
    };
  }, [flash, markNoticesRead, mode, notices, profile, ready, repo, userId, version]);

  if (mode === 'invalid' || !value) {
    return <InvalidEnv />;
  }
  return (
    <AppContext.Provider value={value}>
      {mode === 'supabase' ? <CavosLoader /> : null}
      {children}
    </AppContext.Provider>
  );
}

function InvalidEnv() {
  return (
    <View style={styles.invalid}>
      <T variant="title">Falta una credencial</T>
      <T color={colors.muted}>
        Define EXPO_PUBLIC_SUPABASE_URL y EXPO_PUBLIC_SUPABASE_ANON_KEY juntas, o déjalas vacías para el modo demostración.
      </T>
    </View>
  );
}

const styles = StyleSheet.create({
  invalid: { flex: 1, backgroundColor: colors.bg, padding: 24, justifyContent: 'center', gap: 12 },
});

export function useApp() {
  const value = useContext(AppContext);
  if (!value) throw new Error('La app no está lista.');
  return value;
}

/** Igual que useApp, pero null si el proveedor aún no tiene valor (p. ej. config inválida). */
export function useAppMaybe() {
  return useContext(AppContext);
}
