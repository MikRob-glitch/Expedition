-- ╔════════════════════════════════════════════════════════════════╗
-- ║  EXPÉDITION · Setup Supabase                                   ║
-- ║  À exécuter UNE FOIS dans Supabase → SQL Editor → Run          ║
-- ╚════════════════════════════════════════════════════════════════╝

-- ───────── 1. Tables ─────────

create table if not exists games (
  code              text primary key,
  name              text not null,
  status            text not null default 'setup'
                      check (status in ('setup','active','validation','judging','ended')),
  duration_minutes  int  not null,
  per_clue_minutes  int  not null,
  clues             jsonb not null default '[]'::jsonb,
  admin_id          text not null,
  created_at        timestamptz not null default now(),
  started_at        timestamptz,
  ended_at          timestamptz
);

create table if not exists teams (
  id            text primary key,
  game_code     text not null references games(code) on delete cascade,
  name          text not null,
  start_clue_id text,            -- indice de départ imposé (dispersion) ; null = pas de verrou
  photo_url     text,            -- photo d'équipe optionnelle (prise à l'inscription)
  joined_at     timestamptz not null default now()
);
create index if not exists teams_game_idx on teams(game_code);

-- Migration pour une base déjà créée (sans risque si la colonne existe déjà) :
alter table teams add column if not exists start_clue_id text;
alter table teams add column if not exists photo_url text;

create table if not exists submissions (
  id            text primary key,
  game_code     text not null references games(code) on delete cascade,
  team_id       text not null references teams(id) on delete cascade,
  clue_id       text not null,
  photo_url     text not null,
  lat           double precision,            -- hérité (GPS retiré) : optionnel
  lng           double precision,            -- hérité (GPS retiré) : optionnel
  status        text not null default 'pending'
                  check (status in ('pending','approved','rejected')),
  points        int not null default 0,
  bonus_points  int not null default 0,
  submitted_at  timestamptz not null default now(),
  judged_at     timestamptz
);
create index if not exists submissions_game_idx on submissions(game_code);
create index if not exists submissions_team_idx on submissions(team_id);

-- Migration : GPS retiré de l'app → lat/lng deviennent optionnels (sans risque si déjà nullable)
alter table submissions alter column lat drop not null;
alter table submissions alter column lng drop not null;

-- Migration : l'app utilise aussi les statuts 'validation' et 'judging'
alter table games drop constraint if exists games_status_check;
alter table games add constraint games_status_check
  check (status in ('setup','active','validation','judging','ended'));

-- ───────── 2. Realtime ─────────
-- Permet les websockets sur ces tables (Supabase Realtime)

alter publication supabase_realtime add table games;
alter publication supabase_realtime add table teams;
alter publication supabase_realtime add table submissions;

-- ───────── 3. RLS — Lot 1 : propriété des chasses par l'admin authentifié ─────────
-- L'admin s'authentifie via Supabase Auth (code OTP par email) ; games.admin_id = auth.uid().
-- → un admin ne peut créer / modifier / supprimer / juger QUE ses propres chasses.
-- Lecture publique conservée (équipes anonymes + diaporama public ?diapo=CODE).
-- Les écritures des équipes (teams + submissions INSERT) restent ouvertes : durcies au Lot 2.

alter table games        enable row level security;
alter table teams        enable row level security;
alter table submissions  enable row level security;

-- nettoyage d'éventuelles policies antérieures (idempotent)
drop policy if exists games_all on games;
drop policy if exists teams_all on teams;
drop policy if exists submissions_all on submissions;
drop policy if exists games_select on games;
drop policy if exists games_insert on games;
drop policy if exists games_update on games;
drop policy if exists games_delete on games;
drop policy if exists submissions_select on submissions;
drop policy if exists submissions_insert on submissions;
drop policy if exists submissions_update on submissions;

-- GAMES : lecture publique, écriture réservée au propriétaire authentifié
create policy games_select on games for select using (true);
create policy games_insert on games for insert to authenticated
  with check (admin_id = (select auth.uid())::text);
create policy games_update on games for update to authenticated
  using (admin_id = (select auth.uid())::text)
  with check (admin_id = (select auth.uid())::text);
create policy games_delete on games for delete to authenticated
  using (admin_id = (select auth.uid())::text);

-- TEAMS : ouvert (équipes anonymes) — sera scopé au Lot 2
create policy teams_all on teams for all using (true) with check (true);

-- SUBMISSIONS : lecture + insertion publiques (preuves des équipes) ;
-- mise à jour (validation + vote du jury) réservée à l'admin propriétaire de la chasse.
create policy submissions_select on submissions for select using (true);
create policy submissions_insert on submissions for insert with check (true);
create policy submissions_update on submissions for update to authenticated
  using (exists (select 1 from games g
                 where g.code = submissions.game_code
                   and g.admin_id = (select auth.uid())::text))
  with check (exists (select 1 from games g
                 where g.code = submissions.game_code
                   and g.admin_id = (select auth.uid())::text));

-- ───────── 4. Storage : bucket photos ─────────

insert into storage.buckets (id, name, public)
values ('photos', 'photos', true)
on conflict (id) do nothing;

drop policy if exists "photos read"   on storage.objects;
drop policy if exists "photos upload" on storage.objects;
drop policy if exists "photos delete" on storage.objects;

-- LOT 2 : bucket public "photos" verrouillé.
--  • Lecture : via URL publique (bucket public) — PAS de policy SELECT (empêche le listing).
--  • Upload  : conservé (joueurs anonymes, sans auth).
--  • Suppression : AUCUNE policy => interdite côté client (service_role only) = anti-vandalisme.
create policy "photos upload"
  on storage.objects for insert
  with check (bucket_id = 'photos');

-- ───────── 5. RGPD : rétention + effacement ─────────
-- Suppression automatique des photos + données 90 jours après création d'une chasse,
-- + fonction d'effacement à la demande. postgres a bypassrls + DELETE sur storage.objects.

create or replace function public.purge_expired_games(retention_days int default 90)
returns integer language plpgsql security definer set search_path = public, storage as $$
declare g record; n int := 0;
begin
  for g in select code from public.games where created_at < now() - make_interval(days => retention_days) loop
    delete from storage.objects where bucket_id = 'photos' and name like g.code || '/%';
    delete from public.games where code = g.code;   -- cascade teams + submissions
    n := n + 1;
  end loop;
  return n;
end; $$;

create or replace function public.purge_game(p_code text)
returns void language plpgsql security definer set search_path = public, storage as $$
begin
  delete from storage.objects where bucket_id = 'photos' and name like p_code || '/%';
  delete from public.games where code = p_code;      -- cascade teams + submissions
end; $$;

-- Jamais appelables par le client (elles ignorent la RLS) :
revoke all on function public.purge_expired_games(int) from public, anon, authenticated;
revoke all on function public.purge_game(text)         from public, anon, authenticated;

-- Planification quotidienne (03:30 UTC) de la purge 90 jours :
create extension if not exists pg_cron;
select cron.schedule('purge-expired-games-rgpd', '30 3 * * *', $$ select public.purge_expired_games(90) $$);
-- Effacement à la demande d'une chasse : select public.purge_game('CODE');

-- ───────── Fait ! ─────────
-- Récupère URL + anon key dans Settings → API
