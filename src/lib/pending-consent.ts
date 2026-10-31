// Lo que la persona aceptó en la entrada, guardado hasta que vuelve de Google con su sesión
// (OAuth sale de la app y vuelve; sin esto se perdería). Se borra al guardarlo en el servidor.
import type { ConsentDraft } from '../domain/consent';
import { storage } from './storage';

const KEY = 'campeonesfc.consent.pending';

export function readPendingConsent(): ConsentDraft | null {
  const raw = storage.get(KEY);
  if (!raw) return null;
  try {
    const v = JSON.parse(raw) as ConsentDraft;
    return typeof v.birthDate === 'string' ? v : null;
  } catch {
    return null;
  }
}

export function writePendingConsent(draft: ConsentDraft | null) {
  storage.set(KEY, draft ? JSON.stringify(draft) : null);
}
