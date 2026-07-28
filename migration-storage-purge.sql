-- ═══════════════════════════════════════════════════════════════════════════
-- Migration : purge compatible avec le verrou Supabase sur storage.objects
-- ═══════════════════════════════════════════════════════════════════════════
--
-- POURQUOI
-- Supabase interdit désormais tout DELETE direct sur `storage.objects`, même
-- depuis une fonction SECURITY DEFINER :
--
--     Direct deletion from storage tables is not allowed.
--     Use the Storage API instead.
--
-- Raison : supprimer la ligne de métadonnées sans passer par l'API laisserait
-- le fichier binaire orphelin sur le stockage objet, sans moyen de le retrouver.
--
-- CONSÉQUENCE
-- Les trois fonctions de purge (§5 de supabase-setup.sql) échouaient :
--   · admin_purge_game(code)        → bouton corbeille de l'app en erreur
--   · purge_game(code)              → effacement manuel en erreur
--   · purge_expired_games(days)     → ⚠️ CRON RGPD QUOTIDIEN EN ÉCHEC SILENCIEUX
--
-- NOUVELLE RÉPARTITION
--   · Les lignes (games → cascade teams + submissions) : SQL, comme avant.
--   · Les fichiers photos : API Storage, appelée par le client AVANT la purge
--     des lignes (elles seules permettent de reconstruire les chemins, le bucket
--     n'étant pas listable depuis le Lot 2).
--
-- À exécuter dans Supabase → SQL Editor.
-- ═══════════════════════════════════════════════════════════════════════════


-- ───────── 1. Policy : l'admin propriétaire peut supprimer les photos de SES chasses ─────────
-- Le Lot 2 avait retiré toute policy DELETE du bucket (fin du vandalisme de masse).
-- On en réintroduit une, strictement scopée : l'admin authentifié ne peut effacer que
-- les fichiers dont le premier segment de chemin est le code d'une chasse qu'il possède.
-- Rappel du plan de nommage : {game_code}/{submission_id}.jpg et {game_code}/team_{team_id}.jpg

drop policy if exists photos_delete_owner on storage.objects;

-- ⚠️ #50 : la clause `(storage.foldername(name))[1]` ci-dessous est BUGGÉE — `name` se
-- résout en `g.name` (nom de la chasse) et non `storage.objects.name` (chemin du fichier),
-- donc la policy n' autorisait aucune suppression. Corrigée par migration-storage-delete-fix.sql.
create policy photos_delete_owner on storage.objects
for delete to authenticated
using (
  bucket_id = 'photos'
  and exists (
    select 1
    from public.games g
    where g.admin_id = (select auth.uid())::text
      and g.code = (storage.foldername(name))[1]
  )
);


-- ───────── 2. Purge in-app par l'admin : lignes uniquement ─────────
-- Ownership toujours vérifié côté serveur. Les photos sont retirées par le client
-- via l'API Storage juste avant cet appel.

create or replace function public.admin_purge_game(p_code text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not exists (
    select 1 from public.games
    where code = p_code and admin_id = (select auth.uid())::text
  ) then
    raise exception 'Non autorisé : vous n''êtes pas le maître de cette chasse';
  end if;
  delete from public.games where code = p_code;   -- cascade teams + submissions
end; $$;

revoke all on function public.admin_purge_game(text) from public, anon;
grant execute on function public.admin_purge_game(text) to authenticated;


-- ───────── 3. Effacement manuel (éditeur SQL) : lignes uniquement ─────────

create or replace function public.purge_game(p_code text)
returns void language plpgsql security definer set search_path = public as $$
begin
  delete from public.games where code = p_code;   -- cascade teams + submissions
end; $$;

revoke all on function public.purge_game(text) from public, anon, authenticated;


-- ───────── 4. Rétention RGPD 90 jours : lignes uniquement ─────────
-- ⚠️ LIMITE CONNUE : ce job ne peut plus supprimer les fichiers du bucket. Il efface
-- les données personnelles structurées (équipes, preuves, chasses) mais laisse les
-- photos dans le Storage. La suppression automatique des fichiers demande une Edge
-- Function `service_role` appelant l'API Storage, planifiée quotidiennement.
-- Tant qu'elle n'existe pas, purger les photos anciennes à la main depuis l'app
-- (corbeille de la liste des chasses) AVANT que le cron n'efface les lignes.

create or replace function public.purge_expired_games(retention_days int default 90)
returns integer language plpgsql security definer set search_path = public as $$
declare n int;
begin
  with gone as (
    delete from public.games
    where created_at < now() - make_interval(days => retention_days)
    returning 1
  )
  select count(*) into n from gone;
  return n;
end; $$;

revoke all on function public.purge_expired_games(int) from public, anon, authenticated;


-- ───────── 5. Contrôle ─────────
-- La policy doit apparaître :
select policyname, cmd, roles
from pg_policies
where schemaname = 'storage' and tablename = 'objects'
order by policyname;

-- Le job cron doit toujours être planifié :
-- select jobid, jobname, schedule from cron.job;
