-- Expédition — Tirage souvenir : la photo choisie par chaque équipe
-- À exécuter une fois dans le SQL Editor Supabase (sans risque si déjà appliquée).
--
-- Chaque équipe choisit, sur son écran de fin de chasse, UNE photo à imprimer.
-- On stocke l'id de la submission (= nom du fichier dans le Storage) sur la ligne d'équipe :
-- une seule valeur par équipe, aucune table supplémentaire, aucune policy à ajouter
-- (teams reste ouvert en écriture — les équipes sont anonymes, cf. Lot 2).
-- Pas de clé étrangère : une submission supprimée laisse une valeur pendante, que le
-- client ignore silencieusement (teamPrintSub renvoie null).

alter table teams add column if not exists print_submission_id text;

-- Contrôle
select code, count(*) filter (where print_submission_id is not null) as choix
from teams join games on games.code = teams.game_code
group by code order by code;
