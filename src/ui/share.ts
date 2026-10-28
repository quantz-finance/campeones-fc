import * as Linking from 'expo-linking';
import { Platform, Share } from 'react-native';
import { branding } from '../../config/branding';

export function inviteUrl(code: string): string {
  if (typeof window !== 'undefined' && window.location?.origin) {
    return `${window.location.origin}/i/${code}`;
  }
  return `/i/${code}`;
}

export function inviteMessage(code: string): string {
  return `Armemos el pique en ${branding.name}: ${inviteUrl(code)}`;
}

export async function copyText(value: string): Promise<boolean> {
  if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(value);
    return true;
  }
  return false;
}

export async function shareInvite(code: string) {
  const message = inviteMessage(code);
  if (Platform.OS === 'web' && typeof navigator !== 'undefined' && navigator.share) {
    try {
      await navigator.share({ title: branding.name, text: message });
      return;
    } catch {
      return;
    }
  }
  await Share.share({ message });
}

/** Abre una URL afuera: pestaña nueva en web, navegador del sistema en el teléfono. */
export function openExternal(url: string) {
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    window.open(url, '_blank', 'noopener,noreferrer');
    return;
  }
  void Linking.openURL(url);
}

export function openWhatsApp(code: string) {
  const url = `https://wa.me/?text=${encodeURIComponent(inviteMessage(code))}`;
  void Linking.openURL(url);
}
