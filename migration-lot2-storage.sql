-- ╔════════════════════════════════════════════════════════════════╗
-- ║  EXPÉDITION · Migration LOT 2 (storage) — verrou bucket photos ║
-- ║  Projet : rwagwbzztcehvdztkscj                                  ║
-- ╚════════════════════════════════════════════════════════════════╝
--
-- Ferme le vrai trou restant : n'importe qui avec la clé anon pouvait
-- SUPPRIMER toutes les photos (policy DELETE publique) et LISTER le bucket.
-- Aucune modification du client requise :
--   • l'app ne fait qu'un seul .remove() (rollback d'orphelin, try/catch → tolère l'échec) ;
--   • elle ne fait jamais de .list() ;
--   • l'affichage et l'export ZIP passent par des URLs publiques (getPublicUrl),
--     qui fonctionnent car le bucket reste public — indépendamment des policies.
--
-- Applicable à chaud, sans coordination de déploiement (contrairement au Lot 1).

-- 1) Fin de la suppression publique (anti-vandalisme de masse).
--    Aucune policy DELETE ensuite => suppression client interdite (service_role uniquement).
drop policy if exists "photos delete" on storage.objects;

-- 2) Fin du listing public (les URLs publiques continuent de fonctionner).
drop policy if exists "photos read" on storage.objects;

-- 3) Upload conservé tel quel (joueurs anonymes).
--    Résiduel connu : upload ouvert = risque d'abus de stockage → à traiter au lot Edge Functions.

-- ───────── Vérification ─────────
-- select policyname, cmd, roles from storage.objects_policies; -- ou pg_policies (schema storage)
-- select id, public from storage.buckets where id='photos';    -- doit rester public=true

-- ───────── ROLLBACK d'urgence ─────────
-- create policy "photos read"   on storage.objects for select using (bucket_id = 'photos');
-- create policy "photos delete" on storage.objects for delete using (bucket_id = 'photos');
