// Elementos del selector (src/ui/picker.tsx) para amigos, perfiles y grupos.
import type { Profile } from '../data/types';
import type { GroupSummary } from '../data/snapshots';
import type { SideRecord } from '../domain/stats';
import { matchesPerson, matchesText } from '../domain/search';
import { Avatar } from './avatar';
import { Shield } from './broadcast';
import { firstName, monogram, recordLine } from './format';
import type { PickItem } from './picker';

export function profileItem(profile: Profile, extra?: string): PickItem {
  return {
    id: profile.id,
    title: profile.displayName,
    detail: extra ? `@${profile.username} · ${extra}` : `@${profile.username}`,
    short: firstName(profile.displayName),
    media: (size) => <Avatar avatarKey={profile.avatarKey} name={profile.displayName} photoUrl={profile.photoUrl} size={size} />,
    matches: (q) => matchesPerson(profile, q),
  };
}

export function friendItem(friend: { profile: Profile; record: SideRecord }): PickItem {
  return profileItem(friend.profile, recordLine(friend.record));
}

export function groupItem(item: GroupSummary): PickItem {
  const g = item.group;
  return {
    id: g.id,
    title: g.name,
    detail: `${item.memberCount === 1 ? '1 jugador' : `${item.memberCount} jugadores`}${item.yourPlace ? ` · vas ${item.yourPlace}º` : ''}`,
    short: g.name,
    media: (size) => <Shield letters={monogram(g.name)} photoUrl={g.photoUrl} kind="groups" id={g.id} logo={g.logo} size={size} />,
    matches: (q) => matchesText(q, g.name),
  };
}
