// Consentimiento y edad al crear la cuenta. Mismas reglas que public.record_consent() en Supabase.
export const TERMS_VERSION = '2026-10-31-borrador';
export const PRIVACY_VERSION = '2026-10-31-borrador';
export const MIN_AGE = 13;
export const ADULT_AGE = 18;

export type AgeBand = '13_17' | '18_plus';

export type ConsentDraft = {
  /** AAAA-MM-DD */
  birthDate: string;
  terms: boolean;
  privacy: boolean;
  parentalAck: boolean;
};

export type ConsentCheck =
  | { ok: true; band: AgeBand; age: number }
  | { ok: false; reason: 'date' | 'under_13' | 'parental' | 'terms'; message: string; age?: number };

/** Acepta DD/MM/AAAA, D-M-AAAA o AAAA-MM-DD. Devuelve AAAA-MM-DD o null si no es una fecha real. */
export function parseBirthDate(raw: string): string | null {
  const text = raw.trim();
  let y: number, m: number, d: number;
  const iso = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(text);
  const local = /^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/.exec(text);
  if (iso) [y, m, d] = [Number(iso[1]), Number(iso[2]), Number(iso[3])];
  else if (local) [d, m, y] = [Number(local[1]), Number(local[2]), Number(local[3])];
  else return null;
  const date = new Date(Date.UTC(y, m - 1, d));
  if (date.getUTCFullYear() !== y || date.getUTCMonth() !== m - 1 || date.getUTCDate() !== d) return null;
  if (y < 1900) return null;
  return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

/** Años cumplidos en `today` (AAAA-MM-DD). */
export function ageOn(birthDate: string, today: string): number {
  const [by, bm, bd] = birthDate.split('-').map(Number);
  const [ty, tm, td] = today.split('-').map(Number);
  return ty - by - (tm < bm || (tm === bm && td < bd) ? 1 : 0);
}

export function todayIso(now = new Date()): string {
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

/** Solo la edad (sirve para mostrar el aviso a menores antes de marcar las casillas). */
export function ageCheck(rawBirthDate: string, today = todayIso()): { birthDate: string | null; age: number | null; band: AgeBand | 'under_13' | null } {
  const birthDate = parseBirthDate(rawBirthDate);
  if (!birthDate || birthDate > today) return { birthDate: null, age: null, band: null };
  const age = ageOn(birthDate, today);
  return { birthDate, age, band: age < MIN_AGE ? 'under_13' : age < ADULT_AGE ? '13_17' : '18_plus' };
}

export function checkConsent(draft: ConsentDraft, today = todayIso()): ConsentCheck {
  const { birthDate, age, band } = ageCheck(draft.birthDate, today);
  if (!birthDate || age == null || band == null) return { ok: false, reason: 'date', message: 'Escribe tu fecha de nacimiento como DD/MM/AAAA.' };
  if (band === 'under_13') {
    return { ok: false, reason: 'under_13', age, message: 'Necesitas tener al menos 13 años para usar Campeones FC.' };
  }
  if (band === '13_17' && !draft.parentalAck) {
    return { ok: false, reason: 'parental', age, message: 'Confirma que tu madre, padre o tutor te dio permiso.' };
  }
  if (!draft.terms || !draft.privacy) {
    return { ok: false, reason: 'terms', age, message: 'Acepta los Términos de uso y el Aviso de privacidad para seguir.' };
  }
  return { ok: true, band, age };
}
