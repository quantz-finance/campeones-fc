import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { T } from '../ui/text';
import { colors } from '../ui/theme';
import { createRepository, type Repository } from '../data';
import { readDemoSession, readPendingInvite, writeDemoSession, writePendingInvite } from '../data/demo-store';
import type { Profile } from '../data/types';
import { initAnalytics, track } from '../lib/analytics';
import { backendMode, type BackendMode } from '../lib/env';
import { getSupabase } from '../lib/supabase';
import { CavosLoader } from '../lib/cavos/loader';
import { cavosLogout } from '../lib/cavos/session';

type AppValue = {
  ready: boolean;
  mode: BackendMode;
  userId: string | null;
  profile: Profile | null;
  repo: Repository;
  version: number;
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
    void repo.redeemInvite(userId, code).catch(() => undefined);
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
      signInDemo(nextId: string) {
        writeDemoSession(nextId);
        setUserId(nextId);
        track('sign_in', { method: 'demo' });
      },
      async signOut() {
        if (mode === 'supabase') {
          await cavosLogout();
          await getSupabase().auth.signOut();
        }
        writeDemoSession(null);
        setUserId(null);
        setProfile(null);
      },
      refresh() {
        setVersion((current) => current + 1);
      },
    };
  }, [mode, profile, ready, repo, userId, version]);

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
