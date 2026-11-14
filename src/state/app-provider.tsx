import { signInTestUser } from '../lib/demo-login';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { AppState, Platform, StyleSheet, View } from 'react-native';
import { T } from '../ui/text';
import { colors, space } from '../ui/theme';
import { createRepository, type Repository } from '../data';
import { forgetSavedWorlds } from '../data/supabase-repository';
import { readDemoSession, readPendingInvite, writeDemoSession, writePendingInvite } from '../data/demo-store';
import type { Profile } from '../data/types';
import type { Notice } from '../data/notices';
import { initAnalytics, track } from '../lib/analytics';
import { backendMode, type BackendMode } from '../lib/env';
import { getSupabase } from '../lib/supabase';
import { CavosLoader } from '../lib/cavos/loader';
import { cavosLogout } from '../lib/cavos/session';
import { cavosConfigured } from '../lib/cavos/config';
import { cavosStore } from '../lib/cavos/store';
import { isNetworkError } from '../domain/errors';
import { reportError } from '../lib/analytics';
import { clearQueryCache, prefetchQuery, sameData } from './query-cache';
import { PREFETCH_ORDER, routeQueries, tabQueries } from './queries';
import { setNavPrefetcher } from '../ui/nav';

/** Corre cuando el hilo de JS está libre (requestIdleCallback donde existe). */
function whenIdle(run: () => void) {
  const idle = (globalThis as { requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => unknown }).requestIdleCallback;
  if (idle) idle(run, { timeout: 2000 });
  else setTimeout(run, 0);
}

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
  /** Entra con la cuenta de prueba compartida (en modo local, la primera cuenta de ejemplo). */
  signInTestUser: () => Promise<void>;
  signOut: () => Promise<void>;
  refresh: () => void;
  /** Sin conexión con el servidor: la UI muestra un aviso y se reintenta sola al volver la red. */
  offline: boolean;
  retry: () => void;
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
  const [offline, setOffline] = useState(false);
  const [noticeTick, setNoticeTick] = useState(0);
  const versionRef = useRef(version);
  versionRef.current = version;

  // Cada carga de fondo pasa por aquí: una falla de red solo enciende el aviso «Sin conexión»
  // (nunca un error sin atrapar ni un cierre de sesión); cualquier otra falla se reporta.
  const onBackgroundError = useCallback((cause: unknown, where: string) => {
    if (isNetworkError(cause)) setOffline(true);
    else reportError(cause, { where });
  }, []);

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
    void supabase.auth
      .getSession()
      .then(({ data }) => {
        if (!active) return;
        setUserId(data.session?.user.id ?? null);
        setReady(true);
      })
      .catch((cause: unknown) => {
        if (!active) return;
        onBackgroundError(cause, 'get_session');
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
  }, [mode, repo, onBackgroundError]);

  useEffect(() => {
    if (!repo || !userId) {
      setProfile(null);
      return;
    }
    let active = true;
    repo
      .getProfile(userId)
      .then((next) => {
        if (!active) return;
        // Mismo perfil que antes: misma referencia, así no se vuelve a pintar toda la app.
        setProfile((current) => (sameData(current, next) ? current : next));
        setOffline(false);
      })
      .catch((cause: unknown) => {
        // Se queda el perfil que ya había: sin red no se borra nada ni se cierra la sesión.
        if (active) onBackgroundError(cause, 'get_profile');
      });
    return () => {
      active = false;
    };
  }, [repo, userId, version, onBackgroundError]);

  useEffect(() => {
    if (!repo || !userId) {
      setNotices([]);
      return;
    }
    let active = true;
    void repo
      .notices(userId)
      .then((next) => {
        if (active) setNotices((current) => (sameData(current, next) ? current : next));
      })
      .catch((cause: unknown) => {
        if (active && isNetworkError(cause)) setOffline(true);
      });
    return () => {
      active = false;
    };
  }, [repo, userId, version, noticeTick]);

  // Respaldo de Realtime: al volver a la app (pestaña visible, red de vuelta) y cada 30 s se relee todo,
  // así los dos lados quedan al día aunque el socket se haya dormido (p. ej. al saltar a WhatsApp).
  useEffect(() => {
    if (!repo || !userId) return;
    // Con sesión abierta, cargar Cavos de una vez: reconecta la billetera en silencio al abrir la app.
    if (backendMode() === 'supabase' && cavosConfigured()) cavosStore.want();
    let last = 0;
    const wake = () => {
      const now = Date.now();
      if (now - last < 2000) return;
      last = now;
      // Relee en segundo plano y solo avisa si cambió algo: antes cada 30 s se recalculaban y
      // repintaban todas las pantallas abiertas aunque nada hubiera cambiado.
      if (repo.refresh) void repo.refresh(userId).catch((cause: unknown) => onBackgroundError(cause, 'refresh'));
      else repo.invalidate();
      setNoticeTick((n) => n + 1);
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
  }, [repo, userId, onBackgroundError]);

  // Al navegar, los datos del destino se calculan durante la animación de salida.
  useEffect(() => {
    if (!repo || !userId) {
      setNavPrefetcher(null);
      return;
    }
    setNavPrefetcher((path) => {
      for (const q of routeQueries(path, { repo, userId, ready, version: versionRef.current })) void prefetchQuery(q.key, q.deps, q.load);
    });
    return () => setNavPrefetcher(null);
  }, [repo, userId, ready]);

  // Precarga: con la app ya pintada y quieta, deja calculados Perfil, Grupos y Torneos para que
  // al tocar la pestaña aparezcan al instante (antes Perfil tardaba en salir).
  useEffect(() => {
    if (!repo || !userId) {
      clearQueryCache();
      return;
    }
    let alive = true;
    const timer = setTimeout(() => {
      whenIdle(async () => {
        const q = tabQueries(repo, userId);
        for (const name of PREFETCH_ORDER) {
          if (!alive) return;
          await prefetchQuery(q[name].key, [repo, userId, versionRef.current], q[name].load as () => Promise<unknown>);
          // Un respiro entre cálculo y cálculo: un toque a mitad de la precarga responde enseguida.
          await new Promise((resolve) => setTimeout(resolve, 16));
        }
      });
    }, 1200);
    return () => {
      alive = false;
      clearTimeout(timer);
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
    const expire = () => {
      repo.expireStale().catch((cause: unknown) => onBackgroundError(cause, 'expire_stale'));
    };
    expire();
    const timer = setInterval(expire, 30_000);
    return () => clearInterval(timer);
  }, [repo, userId, onBackgroundError]);

  const retry = useCallback(() => {
    if (!repo) return;
    repo.invalidate();
    setVersion((current) => current + 1);
  }, [repo]);

  // Sin conexión: reintenta cada 5 s, al volver a la app y (web) cuando el navegador recupera la red.
  // El aviso se apaga en cuanto el perfil vuelve a cargar.
  useEffect(() => {
    if (!offline) return;
    const timer = setInterval(retry, 5_000);
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') retry();
    });
    const web = Platform.OS === 'web' && typeof window !== 'undefined';
    if (web) window.addEventListener('online', retry);
    return () => {
      clearInterval(timer);
      sub.remove();
      if (web) window.removeEventListener('online', retry);
    };
  }, [offline, retry]);

  useEffect(() => {
    if (!repo || !userId) return;
    const code = readPendingInvite();
    if (!code) return;
    let alive = true;
    let finished = false;
    writePendingInvite(null);
    void repo
      .redeemInvite(userId, code)
      .then((result) => {
        if (!alive) return;
        finished = true;
        setFlash({
          id: `invite-${code}`,
          title: result === 'already' ? 'Ya eran amigos' : 'Listo, ya son amigos',
          body: 'Ya aparecen en la lista del otro. Rétalo desde Amigos.',
          href: '/amigos',
        });
      })
      .catch((cause: unknown) => {
        if (!alive) return;
        finished = true;
        setFlash({
          id: `invite-${code}`,
          title: 'El enlace de invitación no sirvió',
          body: cause instanceof Error ? cause.message : 'Pide uno nuevo.',
          tone: 'danger',
        });
      });
    // Si el efecto se cancela antes de avisar (Strict Mode), el código sigue guardado para el siguiente intento.
    return () => {
      alive = false;
      if (!finished && readPendingInvite() == null) writePendingInvite(code);
    };
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
      async signInTestUser() {
        if (mode === 'demo') {
          const first = repo.demoAccounts()[0];
          if (!first) throw new Error('No hay cuentas de ejemplo.');
          writeDemoSession(first.id);
          setUserId(first.id);
        } else {
          await signInTestUser();
        }
        track('sign_in', { method: 'test_user' });
      },
      async signOut() {
        if (mode === 'supabase') {
          await cavosLogout();
          // Solo este dispositivo: cerrar sesión aquí no saca al usuario de su otro teléfono o de la app instalada.
          await getSupabase().auth.signOut({ scope: 'local' });
        }
        // Lo guardado en este teléfono para pintar al instante se borra con la sesión.
        void forgetSavedWorlds();
        clearQueryCache();
        writeDemoSession(null);
        setUserId(null);
        setProfile(null);
        setOffline(false);
      },
      refresh() {
        setVersion((current) => current + 1);
      },
      offline,
      retry,
    };
  }, [flash, markNoticesRead, mode, notices, offline, profile, ready, repo, retry, userId, version]);

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
  invalid: { flex: 1, backgroundColor: colors.bg, padding: 24, justifyContent: 'center', gap: space.md },
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
