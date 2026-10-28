// Entrada con Cavos (Google, Apple o correo), compartida por la portada y /entrar.
import { useEffect, useRef, useState } from 'react';
import { track } from '../analytics';
import { useApp } from '../../state/app-provider';
import { authErrorText } from './auth-ux';
import { cavosConfigured } from './config';
import { DeviceApprovalNeeded, exchangeCavosSession, loginPath, NoDeviceKey } from './session';
import { cavosStore, useCavosState } from './store';

export type EntryPhase = 'idle' | 'opening' | 'session' | 'approve' | 'nokey';

export function useCavosEntry() {
  const app = useApp();
  const { bridged, signedOut } = useCavosState();
  const [phase, setPhase] = useState<EntryPhase>('idle');
  const [error, setError] = useState<string | null>(null);
  const exchanging = useRef(false);
  const configured = app.mode === 'supabase' && cavosConfigured();

  useEffect(() => {
    if (configured) cavosStore.want();
  }, [configured]);

  useEffect(() => {
    if (!configured || app.userId || !bridged || bridged.isLoading) return;
    if (!bridged.isAuthenticated || !bridged.address || exchanging.current || error || signedOut) return;
    if (!bridged.token()) return;
    const path = loginPath(bridged.wallet);
    if (path === null || (path === 'approve' && phase === 'approve') || phase === 'nokey') return;
    exchanging.current = true;
    setPhase('session');
    exchangeCavosSession(bridged)
      .then((w) => {
        track('sign_in', { method: 'cavos', wallet: w.status });
      })
      .catch((cause) => {
        if (cause instanceof DeviceApprovalNeeded) {
          setPhase('approve');
          return;
        }
        if (cause instanceof NoDeviceKey) {
          setPhase('nokey');
          return;
        }
        setError(cause instanceof Error ? authErrorText(cause.message) : 'No se pudo entrar.');
        setPhase('idle');
      })
      .finally(() => {
        exchanging.current = false;
      });
  }, [configured, app.userId, bridged, error, phase, signedOut]);

  useEffect(() => {
    if (bridged?.error) {
      setError(bridged.error);
      setPhase('idle');
    }
  }, [bridged?.error]);

  useEffect(() => {
    if (phase !== 'opening' || !bridged || bridged.isLoading) return;
    setPhase('idle');
    if (!bridged.isAuthenticated) bridged.openModal();
  }, [phase, bridged]);

  async function otherAccount() {
    setError(null);
    setPhase('idle');
    if (bridged) {
      await bridged.logout().catch(() => undefined);
      bridged.openModal();
    }
  }

  function openCavos() {
    setError(null);
    if (signedOut) {
      cavosStore.setSignedOut(false);
      if (bridged?.isAuthenticated) {
        void otherAccount();
        return;
      }
    }
    if (!bridged || bridged.isLoading) {
      setPhase('opening');
      cavosStore.want();
      return;
    }
    if (bridged.isAuthenticated && bridged.address) {
      void otherAccount();
      return;
    }
    bridged.openModal();
  }

  async function approveDevice() {
    if (!bridged) return;
    setError(null);
    try {
      await bridged.approveDevice();
      setPhase('idle');
    } catch (cause) {
      setError(cause instanceof Error ? authErrorText(cause.message) : 'No se pudo confirmar.');
    }
  }

  const busy = phase === 'opening' || phase === 'session';
  const label = phase === 'session' ? 'Abriendo tu sesión…' : phase === 'opening' ? 'Cargando Cavos…' : 'Entrar con Cavos';

  return { configured, phase, error, busy, label, openCavos, approveDevice, otherAccount };
}
