-- ╔════════════════════════════════════════════════════════════════╗
-- ║  EXPÉDITION · Migration RLS — LOT 1 (auth admin)               ║
-- ║  Projet : rwagwbzztcehvdztkscj                                  ║
-- ╚════════════════════════════════════════════════════════════════╝
--
-- ⚠️ ORDRE DE DÉPLOIEMENT — IMPORTANT
-- Cette migration verrouille l'écriture de `games` (et la mise à jour de
-- `submissions`) au seul admin authentifié. L'ANCIEN client (sans login) ne
-- pourra plus créer ni gérer de chasse une fois appliquée.
--   1) Déployer d'abord le nouveau `expedition.html` (avec login OTP) sur GitHub Pages.
--   2) Se connecter une fois (crée le compte admin via Supabase Auth).
--   3) PUIS exécuter ce script (Supabase → SQL Editor → Run).
--
-- Pré-requis : provider Email activé dans Supabase Auth (par défaut : oui).
-- Rien à migrer côté données : games.admin_id reste de type text et recevra
-- désormais l'auth.uid() (uuid sérialisé). Les anciennes chasses (admin_id =
-- ancien id court) deviennent en lecture seule — comportement attendu.

-- ───────── GAMES : écriture réservée au propriétaire authentifié ─────────
drop policy if exists games_insert on public.games;
drop policy if exists games_update on public.games;
drop policy if exists games_delete on public.games;

create policy games_insert on public.games
  for insert to authenticated
  with check (admin_id = (select auth.uid())::text);

create policy games_update on public.games
  for update to authenticated
  using (admin_id = (select auth.uid())::text)
  with check (admin_id = (select auth.uid())::text);

create policy games_delete on public.games
  for delete to authenticated
  using (admin_id = (select auth.uid())::text);

-- games_select reste « using (true) » : lecture publique (équipes + diaporama).

-- ───────── SUBMISSIONS : mise à jour (validation + jury) réservée à l'admin ─────────
-- INSERT (preuves des équipes) et SELECT restent publics : durcis au Lot 2.
drop policy if exists submissions_update on public.submissions;

create policy submissions_update on public.submissions
  for update to authenticated
  using (exists (select 1 from public.games g
                 where g.code = submissions.game_code
                   and g.admin_id = (select auth.uid())::text))
  with check (exists (select 1 from public.games g
                 where g.code = submissions.game_code
                   and g.admin_id = (select auth.uid())::text));

-- ───────── Vérification ─────────
-- select tablename, policyname, cmd, roles, qual, with_check
--   from pg_policies where schemaname='public' order by tablename, policyname;

-- ───────── ROLLBACK (si besoin de revenir en arrière en urgence) ─────────
-- drop policy if exists games_insert on public.games;
-- drop policy if exists games_update on public.games;
-- drop policy if exists games_delete on public.games;
-- create policy games_insert on public.games for insert with check (true);
-- create policy games_update on public.games for update using (true) with check (true);
-- drop policy if exists submissions_update on public.submissions;
-- create policy submissions_update on public.submissions for update using (true) with check (true);
