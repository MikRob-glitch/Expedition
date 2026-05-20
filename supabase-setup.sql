-- ╔════════════════════════════════════════════════════════════════╗
-- ║  EXPÉDITION · Setup Supabase                                   ║
-- ║  À exécuter UNE FOIS dans Supabase → SQL Editor → Run          ║
-- ╚════════════════════════════════════════════════════════════════╝

-- ───────── 1. Tables ─────────

create table if not exists games (
  code              text primary key,
  name              text not null,
  status            text not null default 'setup'
                      check (status in ('setup','active','ended')),
  duration_minutes  int  not null,
  per_clue_minutes  int  not null,
  clues             jsonb not null default '[]'::jsonb,
  admin_id          text not null,
  created_at        timestamptz not null default now(),
  started_at        timestamptz,
  ended_at          timestamptz
);

create table if not exists teams (
  id          text primary key,
  game_code   text not null references games(code) on delete cascade,
  name        text not null,
  joined_at   timestamptz not null default now()
);
create index if not exists teams_game_idx on teams(game_code);

create table if not exists submissions (
  id            text primary key,
  game_code     text not null references games(code) on delete cascade,
  team_id       text not null references teams(id) on delete cascade,
  clue_id       text not null,
  photo_url     text not null,
  lat           double precision not null,
  lng           double precision not null,
  status        text not null default 'pending'
                  check (status in ('pending','approved','rejected')),
  points        int not null default 0,
  bonus_points  int not null default 0,
  submitted_at  timestamptz not null default now(),
  judged_at     timestamptz
);
create index if not exists submissions_game_idx on submissions(game_code);
create index if not exists submissions_team_idx on submissions(team_id);

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
