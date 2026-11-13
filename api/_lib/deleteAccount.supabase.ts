// Implementación con el cliente admin de Supabase. Solo la llama /api/account
// después de resolver el userId con supabaseUserFromToken (el token del usuario).
import type { SupabaseClient } from '@supabase/supabase-js';
import type { DeleteAccountStore, DeleteAccountUser } from './deleteAccount';
import { TOMBSTONE_NAME } from './deleteAccount';

const OPEN_MATCHES = ['pending_accept', 'in_progress', 'disputed'];
/** ~100 años: la tumba no puede volver a entrar ni refrescar tokens. */
const BAN_FOREVER = '876000h';

export function supabaseDeleteAccountStore(db: SupabaseClient): DeleteAccountStore {
  const check = (error: { message: string } | null, what: string) => {
    if (error) throw new Error(`${what}: ${error.message}`);
  };

  return {
    async loadUser(userId) {
      const { data: auth, error: authError } = await db.auth.admin.getUserById(userId);
      if (authError || !auth.user) return null;
      const { data: profile, error } = await db
        .from('profiles')
        .select('id, display_name, username, is_demo')
        .eq('id', userId)
        .maybeSingle();
      check(error, 'loadUser');
      if (!profile) return null;
      const meta = (auth.user.app_metadata ?? {}) as Record<string, unknown>;
      const email = auth.user.email ?? '';
      const alreadyDeleted =
        meta.deleted === true ||
        profile.display_name === TOMBSTONE_NAME ||
        /@deleted\.campeonesfc\.invalid$/i.test(email);
      const user: DeleteAccountUser = {
        id: userId,
        email: auth.user.email ?? null,
        demoLogin: meta.demo_login === true,
        isDemoProfile: profile.is_demo === true,
        alreadyDeleted,
      };
      return user;
    },

    async cancelOpenMatches(userId) {
      const { error } = await db
        .from('matches')
        .update({ status: 'cancelled' })
        .in('status', OPEN_MATCHES)
        .or(`player_a_id.eq.${userId},player_b_id.eq.${userId}`);
      check(error, 'cancelOpenMatches');
    },

    async deletePhotos(userId) {
      const prefix = `users/${userId}`;
      const { data, error } = await db.storage.from('photos').list(prefix, { limit: 100 });
      // Si el bucket no existe o no hay objetos, no fallamos el borrado de la cuenta.
      if (error || !data?.length) return;
      const paths = data.map((obj) => `${prefix}/${obj.name}`);
      const { error: removed } = await db.storage.from('photos').remove(paths);
      check(removed, 'deletePhotos');
      const { error: cleared } = await db.from('profiles').update({ photo_url: null }).eq('id', userId);
      check(cleared, 'clearPhotoUrl');
    },

    async deleteFriendships(userId) {
      const { error } = await db.from('friendships').delete().or(`requester_id.eq.${userId},addressee_id.eq.${userId}`);
      check(error, 'deleteFriendships');
    },

    async deleteInvites(userId) {
      const { error } = await db.from('invite_links').delete().eq('creator_id', userId);
      check(error, 'deleteInvites');
    },

    async deleteNotifications(userId) {
      const { error } = await db.from('notifications').delete().or(`user_id.eq.${userId},actor_id.eq.${userId}`);
      check(error, 'deleteNotifications');
    },

    async deleteAchievements(userId) {
      const { error } = await db.from('achievements').delete().eq('user_id', userId);
      check(error, 'deleteAchievements');
    },

    async deleteGroupMemberships(userId) {
      const { error } = await db.from('group_members').delete().eq('user_id', userId);
      check(error, 'deleteGroupMemberships');
    },

    async deleteCavosIdentities(userId) {
      const { data: ids, error: readError } = await db.from('cavos_identities').select('iss, sub').eq('user_id', userId);
      check(readError, 'deleteCavosIdentities.read');
      for (const id of ids ?? []) {
        const { error: nonceError } = await db.from('session_nonces').delete().eq('iss', id.iss).eq('sub', id.sub);
        check(nonceError, 'deleteSessionNonces');
      }
      const { error } = await db.from('cavos_identities').delete().eq('user_id', userId);
      check(error, 'deleteCavosIdentities');
    },

    async deleteWallet(userId) {
      const { error } = await db.from('wallets').delete().eq('user_id', userId);
      check(error, 'deleteWallet');
    },

    async anonymizeProfile(userId, username, displayName) {
      const { error } = await db
        .from('profiles')
        .update({
          username,
          display_name: displayName,
          photo_url: null,
          show_demo: false,
          avatar_key: 'rayo',
          deleted_at: new Date().toISOString(),
        })
        .eq('id', userId);
      check(error, 'anonymizeProfile');
    },

    async disableAuth(userId, tombstoneEmail) {
      const { error } = await db.auth.admin.updateUserById(userId, {
        email: tombstoneEmail,
        email_confirm: false,
        user_metadata: {},
        app_metadata: { deleted: true },
        ban_duration: BAN_FOREVER,
      });
      check(error, 'disableAuth');
    },

    async revokeSessions(userId) {
      // RPC solo para service_role (migración 20261113010000): borra auth.sessions y auth.refresh_tokens.
      const { error } = await db.rpc('revoke_user_sessions', { p_user: userId });
      check(error, 'revokeSessions');
    },
  };
}
