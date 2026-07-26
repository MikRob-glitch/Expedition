-- ═══════════════════════════════════════════════════════════════════════════
-- Migration : réattribution des chasses « legacy » au compte admin authentifié
-- ═══════════════════════════════════════════════════════════════════════════
--
-- POURQUOI
-- Avant le Lot 1 sécurité (2026-06-30), l'admin était identifié par un id client
-- aléatoire de 7 caractères généré dans le navigateur (`uid()`), stocké tel quel
-- dans games.admin_id : 'arvbeed', 'zo2zpxv', 'aqk9xh6'…
-- Depuis, games.admin_id reçoit auth.uid() — un UUID de 36 caractères.
--
-- Conséquence : toutes les chasses d'avant cette date n'ont AUCUN propriétaire
-- authentifié. Les policies RLS (UPDATE/DELETE réservés à `admin_id = auth.uid()`)
-- les rendent donc intouchables depuis l'app : impossible de les reprendre, de les
-- modifier, de les juger ou de les supprimer. Seule la lecture (et donc la
-- duplication) fonctionne.
--
-- CE QUE FAIT CE SCRIPT
-- Il attribue toutes ces chasses orphelines au compte dont l'email est indiqué
-- ci-dessous. À exécuter UNE FOIS, dans Supabase → SQL Editor.
--
-- ⚠️ Pré-requis : s'être déjà connecté au moins une fois dans l'app avec cet
--    email (c'est ce qui crée la ligne dans auth.users).
-- ⚠️ Ne touche jamais aux chasses qui appartiennent déjà à un compte (UUID) :
--    le WHERE exclut explicitement les admin_id au format UUID.
-- ═══════════════════════════════════════════════════════════════════════════

-- ───────── 1. Contrôle avant : qui possède quoi ? ─────────
-- (exécuter seul d'abord pour vérifier le périmètre)

select
  case
    when admin_id ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
      then 'compte authentifié (' || admin_id || ')'
    else 'LEGACY — sera réattribuée'
  end as proprietaire,
  count(*) as nb_chasses
from public.games
group by 1
order by 2 desc;

-- Vérifier aussi que le compte cible existe bien :
-- select id, email, created_at from auth.users;


-- ───────── 2. Réattribution ─────────
-- Remplacer l'email si besoin.

update public.games g
set admin_id = u.id::text
from auth.users u
where u.email = 'hague.mickael@gmail.com'
  and g.admin_id !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';


-- ───────── 3. Contrôle après ─────────
-- Plus aucune ligne ne doit être « LEGACY ».

select
  case
    when admin_id ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
      then 'compte authentifié'
    else 'LEGACY — restante'
  end as proprietaire,
  count(*) as nb_chasses
from public.games
group by 1;


-- ═══════════════════════════════════════════════════════════════════════════
-- APRÈS CETTE MIGRATION
-- · La mention « ancienne » disparaît de la liste de duplication.
-- · La corbeille 🗑 de cette liste fonctionne sur toutes les chasses
--   (le RPC admin_purge_game vérifie admin_id = auth.uid()).
-- · Les anciennes chasses redeviennent reprenables et modifiables.
--
-- Effacement ponctuel sans passer par l'app (ignore la RLS, éditeur SQL seulement) :
--   select public.purge_game('TAED');
-- ═══════════════════════════════════════════════════════════════════════════
