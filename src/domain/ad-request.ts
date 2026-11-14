// Solicitud «Quiero ver mi anuncio aquí». Las mismas reglas que la tabla ad_requests en Supabase,
// para avisar en el formulario antes de enviar.

/** Los 5 espacios de anuncio (arte de Stan, medidas en pt a 390 de ancho). */
export const AD_SECTIONS = ['inicio-franja', 'inicio-ficha', 'inicio-copas', 'grupos-publicos', 'torneos-lista'] as const;
export type AdSection = (typeof AD_SECTIONS)[number];

export const AD_SPACE: Record<AdSection, { label: string; width: number; height: number; ratio: string }> = {
  'inicio-franja': { label: 'Inicio · Franja', width: 358, height: 96, ratio: '179:48' },
  'inicio-ficha': { label: 'Inicio · Ficha', width: 172, height: 120, ratio: '43:30' },
  'inicio-copas': { label: 'Inicio · Torneos más calientes', width: 168, height: 168, ratio: '1:1' },
  'grupos-publicos': { label: 'Grupos · Grupos públicos', width: 174, height: 205, ratio: '174:205' },
  'torneos-lista': { label: 'Torneos · Lista', width: 358, height: 61, ratio: '358:61' },
};

export const AD_SECTION_LABEL: Record<AdSection, string> = Object.fromEntries(
  AD_SECTIONS.map((s) => [s, AD_SPACE[s].label]),
) as Record<AdSection, string>;

export const AD_LIMITS = {
  business: { min: 2, max: 80 },
  contactName: { min: 2, max: 80 },
  contact: { min: 5, max: 120 },
  message: { min: 5, max: 60 },
} as const;

export type AdRequestInput = {
  business: string;
  contactName: string;
  contact: string;
  section: AdSection;
  message: string;
};

export function isAdSection(value: unknown): value is AdSection {
  return typeof value === 'string' && (AD_SECTIONS as readonly string[]).includes(value);
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/** ¿Es un correo o un teléfono (al menos 7 dígitos)? */
export function isContact(value: string): boolean {
  const v = value.trim();
  if (EMAIL.test(v)) return true;
  const digits = v.replace(/\D/g, '');
  return /^[+\d][\d\s().-]*$/.test(v) && digits.length >= 7 && digits.length <= 15;
}

export function contactIsEmail(value: string): boolean {
  return EMAIL.test(value.trim());
}

export function cleanAdRequest(input: AdRequestInput): AdRequestInput {
  return {
    business: input.business.trim(),
    contactName: input.contactName.trim(),
    contact: input.contact.trim(),
    section: input.section,
    message: input.message.trim(),
  };
}

/** Primer problema del formulario, en español y con tú, o null si se puede enviar. */
export function adRequestProblem(input: AdRequestInput): string | null {
  const v = cleanAdRequest(input);
  if (v.business.length < AD_LIMITS.business.min) return 'Escribe el nombre de tu negocio.';
  if (v.business.length > AD_LIMITS.business.max) return `El nombre del negocio puede tener hasta ${AD_LIMITS.business.max} letras.`;
  if (v.contactName.length < AD_LIMITS.contactName.min) return 'Escribe tu nombre.';
  if (v.contactName.length > AD_LIMITS.contactName.max) return `Tu nombre puede tener hasta ${AD_LIMITS.contactName.max} letras.`;
  if (!v.contact) return 'Déjanos un correo o un teléfono para contactarte.';
  if (v.contact.length > AD_LIMITS.contact.max || !isContact(v.contact)) return 'Revisa el correo o el teléfono.';
  if (!isAdSection(v.section)) return 'Elige la sección donde lo quieres.';
  if (v.message.length < AD_LIMITS.message.min) return 'Escribe el texto del anuncio.';
  if (v.message.length > AD_LIMITS.message.max) return `El texto puede tener hasta ${AD_LIMITS.message.max} letras.`;
  return null;
}

/** UUID v4 con getRandomValues (crypto.randomUUID no existe en todos los motores de React Native). */
export function uuidV4(): string {
  const bytes = new Uint8Array(16);
  const api = globalThis.crypto;
  if (api?.getRandomValues) api.getRandomValues(bytes);
  else for (let i = 0; i < 16; i += 1) bytes[i] = Math.floor(Math.random() * 256);
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

/** Traduce los errores de Postgres que no vienen ya en español. */
export function adRequestServerMessage(raw: string): string {
  if (/Ya nos enviaste|Ya recibimos|Estamos recibiendo/.test(raw)) return raw.replace(/^.*?(Ya nos enviaste|Ya recibimos|Estamos recibiendo)/, '$1');
  if (/row-level security|permission denied|violates row/i.test(raw)) return 'Tu sesión venció. Vuelve a entrar e intenta de nuevo.';
  if (/check constraint/i.test(raw)) return 'Revisa los datos del formulario.';
  if (/mime|file size|payload too large|exceeded/i.test(raw)) return 'La imagen es muy pesada o no es PNG, JPG o WebP.';
  return raw;
}
