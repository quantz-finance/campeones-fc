/** Evita un bucle de recargas cuando el service worker nuevo toma el control. */
export const SW_RELOAD_KEY = 'cfc-sw-reload';
export const SW_RELOAD_WINDOW_MS = 10_000;

export function shouldReloadForUpdate(hadController: boolean, lastReloadAt: number | null, now: number): boolean {
  if (!hadController) return false;
  if (lastReloadAt != null && Number.isFinite(lastReloadAt) && now - lastReloadAt < SW_RELOAD_WINDOW_MS) return false;
  return true;
}

function readLastReload(): number | null {
  try {
    const raw = sessionStorage.getItem(SW_RELOAD_KEY);
    if (!raw) return null;
    const n = Number(raw);
    return Number.isFinite(n) ? n : null;
  } catch {
    return null;
  }
}

function showUpdating() {
  if (typeof document === 'undefined' || document.getElementById('cfc-update')) return;
  const el = document.createElement('div');
  el.id = 'cfc-update';
  el.setAttribute('role', 'status');
  el.textContent = 'Actualizando…';
  el.style.cssText = [
    'position:fixed',
    'left:16px',
    'right:16px',
    'bottom:calc(16px + env(safe-area-inset-bottom, 0px))',
    'z-index:10000',
    'max-width:480px',
    'margin:0 auto',
    'padding:12px 14px',
    'background:#131A2A',
    'color:#fff',
    'font:600 14px/1.3 system-ui,sans-serif',
    'letter-spacing:0',
    'border:1px solid rgba(255,255,255,0.16)',
    'border-left:4px solid #C9FF2F',
    'border-radius:2px',
    'box-shadow:none',
    'backdrop-filter:none',
    '-webkit-font-smoothing:antialiased',
  ].join(';');
  document.body.appendChild(el);
}

/**
 * Registra el service worker sin caché HTTP, pide una revisión al volver a la
 * pestaña y, si ya había uno controlando la página, recarga una sola vez.
 */
export function startPwaUpdates() {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return () => {};
  const hadController = Boolean(navigator.serviceWorker.controller);
  let reloading = false;
  const onChange = () => {
    if (reloading) return;
    if (!shouldReloadForUpdate(hadController, readLastReload(), Date.now())) return;
    reloading = true;
    try {
      sessionStorage.setItem(SW_RELOAD_KEY, String(Date.now()));
    } catch {
      // sesión bloqueada: igual recargamos una vez en esta pestaña
    }
    showUpdating();
    window.setTimeout(() => window.location.reload(), 700);
  };
  navigator.serviceWorker.addEventListener('controllerchange', onChange);
  let stopVis = () => {};
  const ready = navigator.serviceWorker
    .register('/sw.js', { scope: '/', updateViaCache: 'none' })
    .then((reg) => {
      const kick = () => {
        if (document.visibilityState === 'visible') void reg.update();
      };
      document.addEventListener('visibilitychange', kick);
      window.addEventListener('focus', kick);
      const timer = window.setInterval(kick, 60 * 60 * 1000);
      stopVis = () => {
        document.removeEventListener('visibilitychange', kick);
        window.removeEventListener('focus', kick);
        window.clearInterval(timer);
      };
      kick();
    })
    .catch(() => {});
  return () => {
    navigator.serviceWorker.removeEventListener('controllerchange', onChange);
    void ready.then(() => stopVis());
  };
}
