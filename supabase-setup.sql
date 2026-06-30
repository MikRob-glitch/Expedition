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

-- ───────── 3. RLS permissives (prototype "entre amis") ─────────
-- ⚠️ POUR LA PROD : remplacer par de vraies policies basées sur auth.uid()
-- Ici n'importe qui avec la clé anon peut lire/écrire. C'est OK pour un jeu
-- privé partagé par lien, pas pour une app publique.

alter table games        enable row level security;
alter table teams        enable row level security;
alter table submissions  enable row level security;

drop policy if exists games_all on games;
drop policy if exists teams_all on teams;
drop policy if exists submissions_all on submissions;

create policy games_all        on games        for all using (true) with check (true);
create policy teams_all        on teams        for all using (true) with check (true);
create policy submissions_all  on submissions  for all using (true) with check (true);

-- ───────── 4. Storage : bucket photos ─────────

insert into storage.buckets (id, name, public)
values ('photos', 'photos', true)
on conflict (id) do nothing;

drop policy if exists "photos read"   on storage.objects;
drop policy if exists "photos upload" on storage.objects;
drop policy if exists "photos delete" on storage.objects;

create policy "photos read"
  on storage.objects for select
  using (bucket_id = 'photos');

create policy "photos upload"
  on storage.objects for insert
  with check (bucket_id = 'photos');

create policy "photos delete"
  on storage.objects for delete
  using (bucket_id = 'photos');

-- ───────── Fait ! ─────────
-- Récupère URL + anon key dans Settings → API
