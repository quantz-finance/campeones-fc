// Elegir, recortar a cuadrado (~512 px) y comprimir (WebP/JPEG, < ~150 KB) en el cliente antes de subir.
import { Platform } from 'react-native';

export type PhotoKind = 'users' | 'groups' | 'tournaments';
export type PhotoPayload = { body: Blob | ArrayBuffer; type: string; ext: 'webp' | 'jpg' };

const SIDE = 512;
const MAX_BYTES = 150 * 1024;

/** Abre el selector y devuelve la foto lista para subir, o null si el usuario cancela. */
export async function pickPhoto(): Promise<PhotoPayload | null> {
  return Platform.OS === 'web' ? pickWeb() : pickNative();
}

function pickWeb(): Promise<PhotoPayload | null> {
  return new Promise((resolve, reject) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = () => {
      const file = input.files?.[0];
      if (!file) return resolve(null);
      compressWeb(file).then(resolve, reject);
    };
    input.click();
  });
}

async function compressWeb(file: Blob): Promise<PhotoPayload> {
  const bitmap = await createImageBitmap(file);
  const side = Math.min(bitmap.width, bitmap.height);
  const canvas = document.createElement('canvas');
  canvas.width = SIDE;
  canvas.height = SIDE;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('No se pudo procesar la foto.');
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(bitmap, (bitmap.width - side) / 2, (bitmap.height - side) / 2, side, side, 0, 0, SIDE, SIDE);
  bitmap.close?.();
  const encode = (type: string, q: number) => new Promise<Blob | null>((ok) => canvas.toBlob(ok, type, q));
  const webp = (await encode('image/webp', 0.82))?.type === 'image/webp';
  const type = webp ? 'image/webp' : 'image/jpeg';
  for (const q of [0.82, 0.72, 0.6, 0.5, 0.4]) {
    const blob = await encode(type, q);
    if (blob && (blob.size <= MAX_BYTES || q === 0.4)) return { body: blob, type, ext: webp ? 'webp' : 'jpg' };
  }
  throw new Error('No se pudo comprimir la foto.');
}

async function pickNative(): Promise<PhotoPayload | null> {
  const Picker = await import('expo-image-picker');
  const { ImageManipulator, SaveFormat } = await import('expo-image-manipulator');
  const perm = await Picker.requestMediaLibraryPermissionsAsync();
  if (!perm.granted) throw new Error('Necesitamos permiso para ver tus fotos.');
  const result = await Picker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: [1, 1], quality: 1 });
  if (result.canceled || !result.assets[0]) return null;
  const asset = result.assets[0];
  const side = Math.min(asset.width, asset.height);
  for (const compress of [0.8, 0.65, 0.5]) {
    const ctx = ImageManipulator.manipulate(asset.uri);
    if (asset.width !== asset.height) ctx.crop({ originX: (asset.width - side) / 2, originY: (asset.height - side) / 2, width: side, height: side });
    ctx.resize({ width: SIDE, height: SIDE });
    const image = await ctx.renderAsync();
    const saved = await image.saveAsync({ format: SaveFormat.WEBP, compress });
    const body = await (await fetch(saved.uri)).arrayBuffer();
    if (body.byteLength <= MAX_BYTES || compress === 0.5) return { body, type: 'image/webp', ext: 'webp' };
  }
  return null;
}
