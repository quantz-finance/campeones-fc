// Redes sociales del jugador: el usuario escribe un @usuario o un enlace; guardamos el enlace canónico (https)
// de cada red. Solo se aceptan estas redes y sus dominios. Discord se guarda como nombre de usuario (sin enlace).
// Las mismas reglas viven en la base (public.valid_social_links) para que nadie guarde otra cosa.

export const SOCIAL_NETWORKS = ['tiktok', 'instagram', 'youtube', 'twitch', 'kick', 'x', 'discord'] as const;
export type SocialNetwork = (typeof SOCIAL_NETWORKS)[number];
export type SocialLinks = Partial<Record<SocialNetwork, string>>;

type Spec = {
  label: string;
  hosts: string[];
  handle: RegExp;
  canonical: (handle: string) => string;
  /** Enlace canónico válido (lo que se guarda). */
  stored: RegExp;
  /** Saca el usuario del path de un enlace. */
  fromPath: (path: string) => string | null;
};

const first = (path: string) => path.split('/').filter(Boolean)[0] ?? '';

export const SOCIAL_SPECS: Record<Exclude<SocialNetwork, 'discord'>, Spec> = {
  tiktok: {
    label: 'TikTok',
    hosts: ['tiktok.com', 'www.tiktok.com', 'm.tiktok.com'],
    handle: /^[A-Za-z0-9._]{2,24}$/,
    canonical: (h) => `https://www.tiktok.com/@${h}`,
    stored: /^https:\/\/www\.tiktok\.com\/@[A-Za-z0-9._]{2,24}$/,
    fromPath: (p) => (first(p).startsWith('@') ? first(p).slice(1) : null),
  },
  instagram: {
    label: 'Instagram',
    hosts: ['instagram.com', 'www.instagram.com', 'm.instagram.com'],
    handle: /^[A-Za-z0-9._]{1,30}$/,
    canonical: (h) => `https://www.instagram.com/${h}`,
    stored: /^https:\/\/www\.instagram\.com\/[A-Za-z0-9._]{1,30}$/,
    fromPath: (p) => (['p', 'reel', 'reels', 'stories', 'explore'].includes(first(p)) ? null : first(p) || null),
  },
  youtube: {
    label: 'YouTube',
    hosts: ['youtube.com', 'www.youtube.com', 'm.youtube.com'],
    handle: /^[A-Za-z0-9._-]{3,30}$/,
    canonical: (h) => `https://www.youtube.com/@${h}`,
    stored: /^https:\/\/www\.youtube\.com\/(@[A-Za-z0-9._-]{3,30}|channel\/UC[A-Za-z0-9_-]{22})$/,
    fromPath: (p) => {
      const parts = p.split('/').filter(Boolean);
      if (parts[0]?.startsWith('@')) return parts[0].slice(1);
      if (parts[0] === 'channel' && /^UC[A-Za-z0-9_-]{22}$/.test(parts[1] ?? '')) return `channel/${parts[1]}`;
      return null;
    },
  },
  twitch: {
    label: 'Twitch',
    hosts: ['twitch.tv', 'www.twitch.tv', 'm.twitch.tv'],
    handle: /^[A-Za-z0-9_]{4,25}$/,
    canonical: (h) => `https://www.twitch.tv/${h}`,
    stored: /^https:\/\/www\.twitch\.tv\/[A-Za-z0-9_]{4,25}$/,
    fromPath: (p) => first(p) || null,
  },
  kick: {
    label: 'Kick',
    hosts: ['kick.com', 'www.kick.com'],
    handle: /^[A-Za-z0-9_]{3,25}$/,
    canonical: (h) => `https://kick.com/${h}`,
    stored: /^https:\/\/kick\.com\/[A-Za-z0-9_]{3,25}$/,
    fromPath: (p) => first(p) || null,
  },
  x: {
    label: 'X',
    hosts: ['x.com', 'www.x.com', 'twitter.com', 'www.twitter.com', 'mobile.twitter.com', 'mobile.x.com'],
    handle: /^[A-Za-z0-9_]{1,15}$/,
    canonical: (h) => `https://x.com/${h}`,
    stored: /^https:\/\/x\.com\/[A-Za-z0-9_]{1,15}$/,
    fromPath: (p) => (['home', 'i', 'intent', 'search', 'share'].includes(first(p)) ? null : first(p) || null),
  },
};

export const DISCORD_HANDLE = /^[a-z0-9_.]{2,32}$/;

export const socialLabel: Record<SocialNetwork, string> = {
  tiktok: 'TikTok',
  instagram: 'Instagram',
  youtube: 'YouTube',
  twitch: 'Twitch',
  kick: 'Kick',
  x: 'X',
  discord: 'Discord',
};

export type SocialResult = { ok: true; value: string | null } | { ok: false; error: string };

/** Normaliza lo que escribió el usuario. Vacío = quitar. */
export function normalizeSocial(network: SocialNetwork, input: string): SocialResult {
  const raw = input.trim();
  if (!raw) return { ok: true, value: null };
  if (raw.length > 200) return { ok: false, error: 'Es demasiado largo.' };
  if (network === 'discord') {
    const handle = raw.replace(/^@/, '').toLowerCase();
    return DISCORD_HANDLE.test(handle)
      ? { ok: true, value: handle }
      : { ok: false, error: 'Usuario de Discord no válido (2 a 32 letras, números, _ o .).' };
  }
  const spec = SOCIAL_SPECS[network];
  const looksLikeUrl = /^[a-z][a-z0-9+.-]*:/i.test(raw) || /^(www\.|m\.)?[a-z0-9-]+\.[a-z]{2,}\//i.test(raw) || spec.hosts.some((h) => raw.toLowerCase().startsWith(h));
  let handle: string | null;
  if (looksLikeUrl) {
    let url: URL;
    try {
      url = new URL(/^[a-z][a-z0-9+.-]*:/i.test(raw) ? raw : `https://${raw}`);
    } catch {
      return { ok: false, error: 'No es un enlace válido.' };
    }
    if (url.protocol !== 'https:' && url.protocol !== 'http:') return { ok: false, error: 'Solo se aceptan enlaces https.' };
    if (url.username || url.password || url.port) return { ok: false, error: 'No es un enlace válido.' };
    if (!spec.hosts.includes(url.hostname.toLowerCase())) return { ok: false, error: `Ese enlace no es de ${spec.label}.` };
    handle = spec.fromPath(url.pathname);
    if (!handle) return { ok: false, error: `Pega el enlace de tu perfil de ${spec.label}.` };
  } else {
    handle = raw.replace(/^@/, '');
  }
  if (network === 'youtube' && handle.startsWith('channel/')) {
    const value = `https://www.youtube.com/${handle}`;
    return spec.stored.test(value) ? { ok: true, value } : { ok: false, error: 'Canal de YouTube no válido.' };
  }
  if (!spec.handle.test(handle)) return { ok: false, error: `Usuario de ${spec.label} no válido.` };
  return { ok: true, value: spec.canonical(handle) };
}

/** ¿Es un valor guardado válido? (Se vuelve a revisar antes de abrir cualquier enlace.) */
export function isStoredSocial(network: SocialNetwork, value: unknown): value is string {
  if (typeof value !== 'string') return false;
  if (network === 'discord') return DISCORD_HANDLE.test(value);
  return SOCIAL_SPECS[network].stored.test(value);
}

/** Limpia lo que venga de la base o de la API: solo redes conocidas con valores válidos. */
export function cleanSocialLinks(input: unknown): SocialLinks {
  const out: SocialLinks = {};
  if (!input || typeof input !== 'object' || Array.isArray(input)) return out;
  for (const network of SOCIAL_NETWORKS) {
    const value = (input as Record<string, unknown>)[network];
    if (isStoredSocial(network, value)) out[network] = value;
  }
  return out;
}

/** Lo que se muestra al lado del ícono: @usuario. */
export function socialHandle(network: SocialNetwork, value: string): string {
  if (network === 'discord') return value;
  if (network === 'youtube' && value.includes('/channel/')) return 'Canal';
  const tail = value.split('/').pop() ?? '';
  return tail.startsWith('@') ? tail : `@${tail}`;
}

/** Valor de un campo del editor a partir de lo guardado (el usuario ve su @usuario). */
export function socialInputValue(network: SocialNetwork, value: string | undefined): string {
  if (!value) return '';
  if (network === 'youtube' && value.includes('/channel/')) return value;
  return network === 'discord' ? value : socialHandle(network, value);
}
