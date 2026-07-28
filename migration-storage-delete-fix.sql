-- ═══════════════════════════════════════════════════════════════════════════
-- Correctif #50 — la policy DELETE du bucket `photos` ne s'appliquait à rien
-- ═══════════════════════════════════════════════════════════════════════════
-- `migration-storage-purge.sql` (#38) écrivait :
--
--     from public.games g
--     where g.admin_id = (select auth.uid())::text
--       and g.code = (storage.foldername(name))[1]
--
-- `name` n'est PAS qualifié : la table `games` alias `g` est dans le FROM de la
-- sous-requête, donc Postgres résout `name` en **`g.name`** (le nom de la chasse),
-- pas en `storage.objects.name` (le chemin du fichier). Aucune erreur, aucun
-- avertissement — la condition compare le code de la chasse au premier segment de
-- son propre nom, donc elle est toujours fausse.
--
-- Conséquence : `photos_delete_owner` n'a jamais autorisé la moindre suppression.
-- La corbeille de l'app (`purgeGamePhotos`) échouait en silence, les lignes étaient
-- purgées mais **les fichiers restaient**. Constat au 2026-07-28 : 89 fichiers
-- orphelins (~15 Mo) appartenant à 16 chasses supprimées.
--
-- Correctif : qualifier explicitement `storage.objects.name`.
-- Idempotent, réexécutable.

drop policy if exists photos_delete_owner on storage.objects;

create policy photos_delete_owner on storage.objects
for delete to authenticated
using (
  bucket_id = 'photos'
  and exists (
    select 1
    from public.games g
    where g.admin_id = (select auth.uid())::text
      and g.code = (storage.foldername(storage.objects.name))[1]
  )
);

-- Contrôle : doit afficher « objects.name » dans la clause, pas « g.name ».
select policyname, cmd, qual
from pg_policies
where schemaname='storage' and tablename='objects' and policyname='photos_delete_owner';
