-- Rendimiento (avisos de Supabase): auth.uid() se evalúa una vez por consulta
-- y no por fila, y cada clave foránea tiene un índice que la cubre.

alter policy profiles_update on public.profiles
  using (id = (select auth.uid())) with check (id = (select auth.uid()));

alter policy ratings_select on public.player_ratings
  using (user_id = (select auth.uid()) or public.are_friends((select auth.uid()), user_id));

alter policy friendships_select on public.friendships
  using (requester_id = (select auth.uid()) or addressee_id = (select auth.uid()));

alter policy invites_select on public.invite_links
  using (creator_id = (select auth.uid()));

alter policy groups_select on public.groups
  using (public.is_group_member(id, (select auth.uid())));

alter policy members_select on public.group_members
  using (public.is_group_member(group_id, (select auth.uid())));

alter policy tournaments_select on public.tournaments
  using (public.is_group_member(group_id, (select auth.uid())));

alter policy achievements_select on public.achievements
  using (
    user_id = (select auth.uid())
    or public.are_friends((select auth.uid()), user_id)
    or exists (
      select 1 from public.group_members gm
      where gm.user_id = achievements.user_id
        and public.is_group_member(gm.group_id, (select auth.uid()))
    )
  );

create index if not exists friendships_requester on public.friendships (requester_id);
create index if not exists friendships_addressee on public.friendships (addressee_id);
create index if not exists group_members_user on public.group_members (user_id);
create index if not exists groups_created_by on public.groups (created_by);
create index if not exists invite_links_creator on public.invite_links (creator_id);
create index if not exists match_reports_reporter on public.match_reports (reporter_id);
create index if not exists match_reports_winner on public.match_reports (winner_id);
create index if not exists matches_player_b on public.matches (player_b_id);
create index if not exists matches_slot on public.matches (tournament_slot_id);
create index if not exists matches_tournament on public.matches (tournament_id);
create index if not exists matches_winner on public.matches (winner_id);
create index if not exists tournament_slots_match on public.tournament_slots (match_id);
create index if not exists tournament_slots_player_a on public.tournament_slots (player_a_id);
create index if not exists tournament_slots_player_b on public.tournament_slots (player_b_id);
create index if not exists tournament_slots_winner on public.tournament_slots (winner_id);
create index if not exists tournaments_created_by on public.tournaments (created_by);
create index if not exists tournaments_group on public.tournaments (group_id);
create index if not exists tournaments_winner on public.tournaments (winner_id);
