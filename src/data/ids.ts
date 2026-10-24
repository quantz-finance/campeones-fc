export function createId(): string {
  const cryptoApi = globalThis.crypto;
  if (cryptoApi?.randomUUID) return cryptoApi.randomUUID();
  return `id_${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`;
}

export function createCode(): string {
  const alphabet = 'abcdefghjkmnpqrstuvwxyz23456789';
  const bytes = globalThis.crypto?.getRandomValues?.(new Uint8Array(8));
  let out = '';
  if (bytes) {
    for (const byte of bytes) out += alphabet[byte % alphabet.length];
    return out;
  }
  for (let index = 0; index < 8; index += 1) {
    out += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return out;
}
