-- ═══════════════════════════════════════════════════════════════════════════
-- Migration : indice photo payant (#72)
-- ═══════════════════════════════════════════════════════════════════════════
--
-- POURQUOI
-- Une équipe coincée sur un indice peut demander la « photo indice » — un cliché du lieu
-- pris au repérage. Elle la paie en points (30 par défaut, réglable indice par indice).
--
-- CE QUI N'EST PAS ICI
-- La photo elle-même et son prix vivent dans `games.clues` (JSONB), qui gagne deux champs
-- optionnels — aucune migration de schéma n'est donc nécessaire pour eux :
--   · `hintUrl`  : URL publique de la photo, chemin Storage `{code}/hints/{clueId}.jpg`
--   · `hintCost` : coût en points, défaut 30
-- ⚠️ `games` n'est modifiable que par son admin authentifié (Lot 1) : le prix est donc
-- **hors de portée des équipes**, et c'est lui qui fait foi au calcul du score.
--
-- CE QUI EST ICI
-- La trace des révélations. Il FAUT une table : une équipe anonyme ne peut qu'INSÉRER
-- (RLS UPDATE réservée à l'admin) — elle ne peut donc pas écrire son achat dans `teams`
-- ni dans `games`. Même contrat que `submissions` : INSERT ouvert, lecture publique,
-- aucun UPDATE, aucun DELETE. Un achat ne se reprend pas.
--
-- IDEMPOTENCE
-- `unique (team_id, clue_id)` : un retry réseau ne fait pas payer deux fois. Côté client,
-- un doublon de clé (23505) vaut SUCCÈS — même règle que l'envoi des preuves (#26).
--
-- À exécuter dans Supabase → SQL Editor. Idempotent, réexécutable.
-- ═══════════════════════════════════════════════════════════════════════════


-- ───────── 1. Table ─────────
create table if not exists public.hint_reveals (
  id          text primary key,
  game_code   text not null references public.games(code) on delete cascade,
  team_id     text not null references public.teams(id)   on delete cascade,
  clue_id     text not null,
  cost        int  not null default 30,
  revealed_at timestamptz not null default now(),
  unique (team_id, clue_id)
);

create index if not exists hint_reveals_game_idx on public.hint_reveals (game_code);

-- ⚠️ `cost` est une COPIE D'AUDIT de ce qui a été affiché à l'équipe au moment de l'achat.
-- Le score se calcule sur `games.clues[].hintCost`, seule valeur qu'une équipe ne peut pas
-- écrire. Les deux ne divergent que si l'admin change un prix en cours de chasse — ce que
-- l'application ne propose pas (les indices ne s'éditent qu'avant le lancement).


-- ───────── 2. Realtime ─────────
-- `add table` échoue si la table est déjà publiée : on ne l'ajoute que si besoin.
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'hint_reveals'
  ) then
    alter publication supabase_realtime add table public.hint_reveals;
  end if;
end $$;


-- ───────── 3. RLS ─────────
alter table public.hint_reveals enable row level security;

drop policy if exists hint_reveals_select on public.hint_reveals;
drop policy if exists hint_reveals_insert on public.hint_reveals;

-- Lecture publique : le maître du jeu voit qui a acheté quoi, l'équipe voit ses achats,
-- et le classement (calculé côté client sur les deux surfaces) a besoin de tout le monde.
create policy hint_reveals_select on public.hint_reveals for select using (true);

-- INSERT ouvert, comme `submissions` : une équipe est anonyme. Durcissement prévu au
-- même moment que le reste (Lot Edge Functions).
create policy hint_reveals_insert on public.hint_reveals for insert with check (true);

-- Volontairement AUCUNE policy UPDATE ni DELETE : un achat est définitif. Le ménage se
-- fait par les `on delete cascade` ci-dessus (suppression d'une chasse ou d'une équipe)
-- et donc par `admin_purge_game`.


-- ───────── 4. Contrôle ─────────
select
  (select count(*) from pg_policies where tablename = 'hint_reveals')                    as policies,
  (select count(*) from pg_publication_tables
    where pubname = 'supabase_realtime' and tablename = 'hint_reveals')                  as realtime,
  (select count(*) from public.hint_reveals)                                             as reveals;
