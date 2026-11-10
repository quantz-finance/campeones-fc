// Eliminación de la cuenta del usuario autenticado (guía 5.1.1 de Apple).
// Solo opera sobre el userId que viene del token de Supabase: nunca se toma del cuerpo.
// Los partidos confirmados y las huellas en Stellar se conservan (el rival y la cadena los necesitan);
// el perfil queda como tumba sin datos personales y se corta el acceso.
// La función SQL equivalente está en supabase/migrations/20261111000000_delete_my_account.sql
// (PENDIENTE DE APLICAR; no se ha ejecutado en ninguna base).

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
  deleteCavosIdentities(userId: string): Promise<void>;
  anonymizeProfile(userId: string, username: string, displayName: string): Promise<void>;
  disableAuth(userId: string, tombstoneEmail: string): Promise<void>;
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
  await store.anonymizeProfile(userId, tombstoneUsername(userId), TOMBSTONE_NAME);
  await store.disableAuth(userId, tombstoneEmail(userId));

  return { status: 'anonymized', userId };
}
