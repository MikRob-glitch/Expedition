-- Expédition — Logo du lieu sur le tirage souvenir
-- À exécuter une fois dans le SQL Editor Supabase (sans risque si déjà appliquée).
--
-- L'organisateur peut joindre à une chasse le logo du lieu (camping, Center Parcs,
-- entreprise…). Il est stocké dans le bucket `photos` au chemin {code}/logo.png et
-- son URL publique est mémorisée ici. Aucune policy à ajouter : l'upload est déjà
-- ouvert (Lot 2) et la suppression est couverte par `photos_delete_owner`, qui
-- autorise l'admin propriétaire de la chasse dont le code ouvre le chemin.

alter table games add column if not exists logo_url text;

-- Contrôle
select code, name, location, (logo_url is not null) as logo
from games order by created_at desc limit 20;
