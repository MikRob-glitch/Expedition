# CLAUDE.md — Expédition · Chasse au Trésor Photo

Guide de référence pour travailler sur l'application. À lire avant toute modification.

> Source de vérité = le dépôt GitHub `MikRob-glitch/Expedition`. Ce fichier décrit l'état
> **réellement poussé sur GitHub** (HEAD = 2026-06-29, commit `4e62310`). Les écarts connus
> (travail local non poussé) sont signalés ⚠️.

## Vue d'ensemble

Jeu de chasse au trésor photo en équipe, conçu pour des événements live (team-building,
séminaires, Center Parcs). Les équipes scannent un code, reçoivent des indices, prennent
des photos comme preuves ; un maître du jeu (admin) valide puis fait juger les photos.

- **Repo** : `MikRob-glitch/Expedition`
- **Déploiement** : GitHub Pages → `https://mikrob-glitch.github.io/Expedition/expedition.html`
- **Fichier principal** : `expedition.html` (application mono-fichier, ~2040 lignes)

## Stack & conventions

- **Front** : HTML/CSS/JS vanilla, **un seul fichier** `expedition.html`. Pas de framework,
  pas de TypeScript, pas de build. ES2022+.
- **Back** : Supabase (Postgres + Realtime + Storage).
  - Projet Supabase : **`rwagwbzztcehvdztkscj`** (« Expedition catching », région eu-north-1).
  - URL + clé `anon` codées en dur dans `SUPABASE_DEFAULTS` (fallback), surchargées si
    présentes en `localStorage` (`sb_url`, `sb_key`).
- **CDN** : `@supabase/supabase-js@2`, `jszip@3.10.1` (export ZIP), polices Google (Fraunces,
  Geist, Geist Mono).
- **Style** : thème « parchemin » (variables CSS `--parchment`, `--oxblood`, `--gold-dark`,
  `--forest`, `--ink`…). Police titres = Fraunces, mono = Geist Mono.

## Modèle de données (Postgres)

- **`games`** — PK `code` (texte, 4 lettres). Champs : `name`, `status`, `clues` (jsonb :
  `[{id,title,text,points}]`), `duration_minutes`, `per_clue_minutes`, `admin_id`,
  `started_at`, `ended_at`.
- **`teams`** — PK `id` (uid). FK `game_code`. Champs : `name`, `start_clue_id`, `joined_at`.
- **`submissions`** — PK `id` (uid, = nom du fichier photo). FK `team_id`
  (`on delete cascade`), `game_code`. Champs : `clue_id`, `photo_url`, `status`
  (`pending`/`approved`/`rejected`), `points`, `bonus_points`, `submitted_at`, `judged_at`.
  Colonnes `lat`/`lng` héritées du prototype GPS, désormais inutilisées.
- **Storage** : bucket public `photos`, chemin `{game_code}/{submission_id}.jpg`.

⚠️ Le **`submission.id` est réutilisé comme nom de fichier** dans le Storage. Ne jamais
dissocier les deux.

> Le GPS et la carte (Leaflet) du prototype initial ont été retirés : la preuve est purement
> photographique.

## Cycle de vie d'une partie (`status`)

`setup` → `active` → `validation` → `judging` → `ended`

- Le passage `active → validation` est déclenché par expiration du chrono, **mais persisté
  uniquement par l'admin** (les équipes le calculent en local sans sauvegarder). Si l'admin
  est hors-jeu, le statut reste bloqué sur `active` en base.
- Bonus : **diaporama public** des photos via l'URL `?diapo=CODE`.

## Identité & session (client)

- `localStorage.me` = `{ role, id, gameCode }`. C'est le **seul** pointeur reliant l'appareil
  à une partie. Le `id` admin doit correspondre à `games.admin_id`.
- Le picker « Reprendre une session » ne liste que les parties `status='setup'` et reprend
  directement au lobby. Pour reprendre une partie déjà démarrée → champ « Reprendre par
  code » (admin).
- Abonnement Realtime (websockets) sur `games`, `teams`, `submissions` filtré par `game_code`,
  + poll de sécurité (~15 s).

## Fonctionnalités clés

- **Indices de départ (dispersion)** : dans le lobby, l'admin assigne un indice de départ
  distinct par équipe (`teams.start_clue_id`, bouton « Répartir auto »). Chaque équipe ne voit
  que son indice de départ ; il se débloque tous les autres dès la première photo envoyée.
  Optionnel (« — Aucun — »).
- **Vote du jury (50/30/10)** : en phase `judging`, photos groupées par indice ; le jury
  attribue 🥇50 / 🥈30 / 🥉10 (3 max par indice, **y compris photos refusées**). Stocké dans
  `submissions.bonus_points`.
- **Score** : Σ points d'indice (photos **conformes** uniquement) + Σ points de vote (**toutes**
  les photos, refusées incluses).
- **Export ZIP** : modal sur les écrans Jury et Fin, télécharge toutes les photos d'une partie
  (filtrables par statut) en archive `{CODE}_photos.zip`, organisée `Équipe/HHhMM_statut_indice_id.jpg`
  (JSZip, pool de 8 requêtes parallèles).

## Procédures de récupération (terrain)

- **Admin éjecté d'une partie en cours** : sur PC, console (F12) →
  `localStorage.setItem('me', JSON.stringify({role:'admin', id:'<admin_id>', gameCode:'<CODE>'})); location.reload()`.
  (Si collage bloqué dans Chrome : taper `allow pasting` puis Entrée.)
  Alternative sans console : champ « Reprendre par code » dans l'écran admin.
- **Doublons d'équipe** (même nom recréé) : fusion SQL = réaffecter les `submissions` vers
  l'équipe canonique (la plus ancienne `joined_at`), puis supprimer les doublons vides
  (l'ordre compte à cause du `cascade`). `addTeam` réutilise désormais l'équipe existante du
  même nom, ce qui limite l'apparition de doublons.
- **Photos « disparues »** : chercher les fichiers Storage `D4CK/%` sans `submission`
  correspondante (`storage.objects` vs `submissions.id`) = uploads dont l'insert a échoué.
  Réinsérer les lignes pointant sur les fichiers existants.

## Journal des correctifs

### Poussés sur GitHub (2026-05-27/28) — révèlés par l'événement live D4CK (Center Parcs)

1. `loadGame` distingue erreur réseau transitoire (`undefined`) vs jeu réellement absent
   (`null`).
2. `render` / `refreshState` n'effacent plus la session (`clearMe`) sur une simple coupure
   réseau — uniquement si le jeu est confirmé supprimé.
3. `addTeam` réutilise l'équipe existante du même nom au lieu d'en recréer une à la
   reconnexion (anti-fragmentation des preuves).
4. `saveSubmission` : retry + rollback du fichier Storage si l'insert échoue définitivement
   + retour de succès réel (booléen). Plus de photo orpheline.
5. `submitClue` : n'affiche plus « Preuve envoyée » à tort ; en cas d'échec, garde la photo
   en mémoire et réactive le bouton pour réessayer.
6. Reprise admin par code (lobby/active/validation/judging).

### Poussés sur GitHub (2026-06-29, commit `4e62310`)

7. Modal d'export ZIP intégré (CSS + HTML + JS) : modal accessible depuis les écrans **Jury**
   et **Fin**, télécharge toutes les photos d'une partie (filtrables par statut), pool de
   8 requêtes parallèles, **JSZip** (`jszip@3.10.1`) côté client. Nomenclature :
   `Équipe/HHhMM_statut_indice_id.jpg`. Génère `{CODE}_photos.zip`.
8. Boutons « 📦 Télécharger les photos » sur les écrans Jury et Fin.

## Dette technique / points de vigilance connus

- **Clé `anon` publique en clair** dans le code (par design : pas d'auth, RLS permissive).
  Acceptable pour un usage convivial ; à revoir avant tout usage grand public (un tiers peut
  scrapper les codes de chasse et rejoindre). La fusion par nom d'équipe peut fusionner à tort
  deux vraies équipes homonymes.
- Pas de transaction entre upload Storage et insert DB → mitigé par le retry+rollback (#4),
  mais une vraie solution serait une Edge Function ou un nettoyage périodique des orphelins.
- `start_clue_id` : à conserver lors des fusions (l'équipe canonique la plus ancienne le porte).
- **PWA partielle** : pas de service worker (ni install Android/desktop, ni offline).

## Workflow attendu

Implémentation directe, sans recap de questions. Corriger préventivement ce qui n'a pas
encore été testé en conditions réelles plutôt que demander confirmation. Vérifier la syntaxe
JS avant livraison 