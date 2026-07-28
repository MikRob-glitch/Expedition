-- ═══════════════════════════════════════════════════════════════════════════
-- Migration : tiroir de chasses types (#53)
-- ═══════════════════════════════════════════════════════════════════════════
--
-- POURQUOI
-- Un scénario bien monté (indices, textes, coordonnées, durées, logo du lieu) doit
-- pouvoir être rejoué indéfiniment sans dépendre d'une chasse passée — laquelle finit
-- par être supprimée à la main, ou par le cron de rétention 90 jours.
--
-- MODÈLE RETENU
-- Une « chasse type » est une ligne `games` ordinaire portant `is_template = true` :
--   · elle n'est JAMAIS jouée : aucune équipe, aucune preuve, aucune photo ;
--   · elle est exclue des deux pickers de jeu (reprise de session, duplication) ;
--   · elle ne sert qu'à être dupliquée — la duplication ne la consomme pas.
--
-- ⚠️ RGPD — pourquoi une COPIE et non un simple drapeau posé sur une chasse jouée :
-- les modèles échappent à la purge automatique 90 j. Marquer une chasse déjà jouée
-- immobiliserait hors rétention les photos et les noms de ses participants. Le client
-- (`saveAsTemplate`) crée donc toujours une copie neuve et vierge ; la chasse d'origine
-- reste soumise à la rétention normale.
--
-- À exécuter dans Supabase → SQL Editor.
-- ═══════════════════════════════════════════════════════════════════════════


-- ───────── 1. Colonne ─────────
alter table public.games add column if not exists is_template boolean not null default false;

create index if not exists games_admin_template_idx on public.games (admin_id, is_template);

-- Aucune policy à ajouter : `games` est déjà en lecture publique, et INSERT/UPDATE/DELETE
-- sont réservés à l'admin propriétaire authentifié depuis le Lot 1.


-- ───────── 2. Rétention RGPD : les chasses types n'expirent pas ─────────
-- Reprend la fonction de migration-storage-purge.sql (lignes uniquement, jamais le
-- Storage : Supabase interdit tout DELETE sur storage.objects, voir #38) et y ajoute
-- la seule clause `is_template = false`.

create or replace function public.purge_expired_games(retention_days int default 90)
returns integer language plpgsql security definer set search_path = public as $$
declare n int;
begin
  with gone as (
    delete from public.games
    where created_at < now() - make_interval(days => retention_days)
      and is_template = false          -- le tiroir de modèles n'expire pas
    returning 1
  )
  select count(*) into n from gone;
  return n;
end; $$;

revoke all on function public.purge_expired_games(int) from public, anon, authenticated;


-- ───────── 3. Contrôle ─────────
select count(*) filter (where is_template) as chasses_types,
       count(*) filter (where not is_template) as chasses
from public.games;
