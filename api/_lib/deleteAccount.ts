// Eliminación de la cuenta del usuario autenticado (guía 5.1.1 de Apple).
// Solo opera sobre el userId que viene del token de Supabase: nunca se toma del cuerpo.
// Los partidos confirmados y las huellas en Stellar se conservan (el rival y la cadena los necesitan);
// el perfil queda como tumba sin datos personales y se corta el acceso.
// Se libera la fila de wallets: Cavos devuelve la misma dirección para el mismo Google/Apple/correo,
// así que si se quedara, volver a registrarse daría 409 address_taken.
// Al final se revocan TODAS las sesiones y refresh tokens (todos los dispositivos) y se banea la tumba.
// La función SQL equivalente es public.delete_my_account (20261111000000 + 20261113010000).

import { HttpError } from './http';

export const DELETE_CONFIRM = 'ELIMINAR';
export const TOMBSTONE_NAME = 'Cuenta eliminada';

export type DeleteAccountUser = {
  id: string;
  email: string | null;
  demoLogin: boolean;
  isDemoProfile: boolean;
  alreadyDeleted: boolean;
};

export type DeleteAccountStore = {
  loadUser(userId: string): Promise<DeleteAccountUser | null>;
  cancelOpenMatches(userId: string): Promise<void>;
  deletePhotos(userId: string): Promise<void>;
  deleteFriendships(userId: string): Promise<void>;
  deleteInvites(userId: string): Promise<void>;
  deleteNotifications(userId: string): Promise<void>;
  deleteAchievements(userId: string): Promise<void>;
  deleteGroupMemberships(userId: string): Promise<void>;
  /** Borra las identidades de Cavos y los nonces de login de esas identidades. */
  deleteCavosIdentities(userId: string): Promise<void>;
  /** Libera la dirección de la billetera (UNIQUE(address)) para que la misma persona pueda volver. */
  deleteWallet(userId: string): Promise<void>;
  anonymizeProfile(userId: string, username: string, displayName: string): Promise<void>;
  /** Cambia el correo a la tumba, marca deleted y banea la cuenta (no se puede refrescar ni volver a entrar). */
  disableAuth(userId: string, tombstoneEmail: string): Promise<void>;
  /** Borra todas las sesiones y refresh tokens de la cuenta, en todos los dispositivos. */
  revokeSessions(userId: string): Promise<void>;
};

export type DeleteAccountResult = { status: 'anonymized'; userId: string };

export function tombstoneUsername(userId: string): string {
  const hex = userId.replace(/-/g, '').toLowerCase().slice(0, 15);
  return `x${hex}`.slice(0, 16);
}

export function tombstoneEmail(userId: string): string {
  return `deleted-${userId.replace(/-/g, '').toLowerCase()}@deleted.campeonesfc.invalid`;
}

export async function deleteAccount(
  store: DeleteAccountStore,
  userId: string,
  confirm: unknown,
): Promise<DeleteAccountResult> {
  if (typeof confirm !== 'string' || confirm !== DELETE_CONFIRM) {
    throw new HttpError(400, 'Para confirmar, escribe ELIMINAR.', 'confirm_required');
  }
  if (!userId) throw new HttpError(401, 'Inicia sesión para continuar.', 'auth_missing');

  const user = await store.loadUser(userId);
  if (!user) throw new HttpError(404, 'No encontramos tu cuenta.', 'not_found');
  if (user.alreadyDeleted) throw new HttpError(409, 'Esta cuenta ya estaba eliminada.', 'already_deleted');
  if (user.demoLogin) {
    throw new HttpError(403, 'La cuenta de prueba compartida no se puede eliminar.', 'demo_forbidden');
  }
  if (user.isDemoProfile) {
    throw new HttpError(403, 'Las cuentas de ejemplo no se pueden eliminar.', 'demo_forbidden');
  }

  // Orden: primero se corta lo personal y el acceso; los partidos confirmados no se tocan.
  await store.cancelOpenMatches(userId);
  await store.deletePhotos(userId);
  await store.deleteFriendships(userId);
  await store.deleteInvites(userId);
  await store.deleteNotifications(userId);
  await store.deleteAchievements(userId);
  await store.deleteGroupMemberships(userId);
  await store.deleteCavosIdentities(userId);
  await store.deleteWallet(userId);
  await store.anonymizeProfile(userId, tombstoneUsername(userId), TOMBSTONE_NAME);
  await store.disableAuth(userId, tombstoneEmail(userId));
  // Al último, ya baneada: así ningún dispositivo alcanza a refrescar entre medio.
  await store.revokeSessions(userId);

  return { status: 'anonymized', userId };
}
