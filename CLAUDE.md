# CLAUDE.md — Expédition · Chasse au Trésor Photo

Guide de référence pour travailler sur l'application. À lire avant toute modification.

> Source de vérité = le dépôt GitHub `MikRob-glitch/Expedition`. Ce fichier décrit l'état
> **réellement poussé sur GitHub** (HEAD = 2026-07-02, commit `c02a404`). Les écarts connus
> (travail local non poussé) sont signalés ⚠️. À ce jour, aucun écart : local et distant alignés.

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
  `[{id,title,text,points,lat,lng}]` — `lat`/`lng` optionnels, `null` si l'indice n'est pas
  géolocalisé), `duration_minutes`, `per_clue_minutes`, `admin_id`, `started_at`, `ended_at`.
  ⚠️ **Aucune migration** pour la géoloc des indices : `clues` est du jsonb, les coords sont
  simplement stockées dans chaque objet indice.
- **`teams`** — PK `id` (uid). FK `game_code`. Champs : `name`, `start_clue_id`, `photo_url`
  (photo d'équipe optionnelle, prise à l'inscription), `joined_at`.
- **`submissions`** — PK `id` (uid, = nom du fichier photo). FK `team_id`
  (`on delete cascade`), `game_code`. Champs : `clue_id`, `photo_url`, `status`
  (`pending`/`approved`/`rejected`), `points`, `bonus_points`, `submitted_at`, `judged_at`.
  Colonnes `lat`/`lng` héritées du prototype GPS, désormais inutilisées.
- **Storage** : bucket public `photos`, chemin `{game_code}/{submission_id}.jpg` pour les preuves
  et `{game_code}/team_{team_id}.jpg` pour les photos d'équipe.

⚠️ Le **`submission.id` est réutilisé comme nom de fichier** dans le Storage. Ne jamais
dissocier les deux.

> Le GPS/carte **des preuves** (submissions.lat/lng) du prototype initial reste retiré : la preuve
> est purement photographique. À ne pas confondre avec la **géoloc des indices** (clues.lat/lng)
> réintroduite ci-dessous, qui sert uniquement à afficher une carte d'orientation aux équipes.


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
- **Dupliquer une chasse passée** : dans l'écran admin de préparation, le champ « Dupliquer
  par code » charge une chasse existante (**n'importe quel statut**, y compris `ended`) via
  `duplicateByCode` et copie ses indices (nouveaux `id`) + réglages dans le formulaire de
  création (`STATE.draftMeta`, nom suffixé « (copie) », date du jour). « Créer la chasse »
  génère ensuite une **nouvelle session vierge** (nouveau code, aucune équipe ni photo). La
  chasse source n'est jamais modifiée. Permet de rejouer une même chasse pour un autre groupe.
- **Photo d'équipe à l'inscription** : sur l'écran « Rejoindre une chasse », champ photo
  **optionnel** (`capture="user"`, façade selfie). Capturée via `compressImage`, uploadée par
  `uploadTeamPhoto` dans `{game_code}/team_{team_id}.jpg`, puis `setTeamPhoto` écrit l'URL
  (cache-bustée) dans `teams.photo_url`. N'empêche jamais l'inscription si l'upload échoue.
  Affichée en pastille (`teamAva`, repli sur l'initiale) dans le lobby admin, le lobby équipe
  et le classement.
- **Géolocalisation des indices + carte d'orientation (Leaflet)** : chaque indice porte des
  coordonnées **optionnelles** (`clues[].lat`/`lng`, jsonb — aucune migration). **Admin** : dans
  l'éditeur d'indices (`renderClueListEdit`), boutons « 📍 Placer sur la carte »
  (`openClueMapPicker` → overlay plein écran, pose/déplace un repère draggable) et « 🎯 Ma
  position » (`useMyPositionForClue`, `navigator.geolocation`). Coords copiées par
  `duplicateByCode` et l'édition de chasse. **Équipe** : bouton « 🗺️ Carte » sur
  `screenTeamActive` (affiché seulement si ≥1 indice est localisé) → `openTeamMap`. La carte
  montre **tous** les indices localisés en repères **anonymes gris « ? »**, **sauf** l'indice de
  départ de l'équipe (repère doré ★ nommé) et les indices **déjà réalisés** par l'équipe (repère
  vert ✓ nommé). Position live de l'équipe (`watchPosition`, point bleu). Overlay + instance
  Leaflet uniques (`MAPCTX`), réutilisés admin/équipe ; tuiles OpenStreetMap ; Leaflet 1.9.4 via
  unpkg (CDN). ⚠️ **Limite de sécurité (non résolue)** : les coords — comme tout le payload
  `clues` (titres, textes) — transitent dans le jsonb public lu par la clé `anon`.
  L'anonymisation des repères est donc **cosmétique (côté client uniquement)** : un joueur avisé
  lit le mapping indice→GPS via l'onglet réseau. À corriger par le gating serveur — voir la dette
  « Anonymisation carte + secret des indices » ci-dessous (Lot Edge Functions).

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

### Poussés sur GitHub (2026-06-30, commit `3fba57d`)

9. Docs : alignement README / PROJECT / CLAUDE sur l'app (export ZIP, sécurité, retrait GPS).

### Poussés sur GitHub (2026-06-30, commit `4aa0813`)

10. `duplicateByCode` : duplication d'une chasse existante (toute statut) vers une nouvelle
    session vierge. `screenAdminSetup` pré-remplit le formulaire depuis `STATE.draftMeta` ;
    `createGame` et `screenAdminEditGame` réinitialisent `draftMeta`. Aucun changement de
    schéma. Voir « Dupliquer une chasse passée » dans Fonctionnalités clés.

### Poussés sur GitHub (2026-06-30) — photo d'équipe

11. `teams.photo_url` (migration `ALTER TABLE … ADD COLUMN IF NOT EXISTS`, appliquée en base +
    ajoutée à `supabase-setup.sql`). Capture optionnelle sur `screenTeamJoin`
    (`handleJoinCapture`, `STATE.joinPhoto`), upload `uploadTeamPhoto` + `setTeamPhoto` dans
    `joinGame` (non bloquant). Helper d'affichage `teamAva` (pastille ronde ou initiale) dans
    lobby admin, lobby équipe et `renderLeaderboard`.

### Poussés sur GitHub (2026-06-30, commit `da27780`) — LOT 1 SÉCURITÉ : auth admin + RLS scopées

**✅ Déployé et appliqué le 2026-06-30** : client poussé sur GitHub Pages, compte admin créé
(`hague.mickael@gmail.com`, `auth.uid()=5d15cb3f-…`), `migration-lot1-rls.sql` appliquée en base
(policies games + submissions vérifiées, advisors OK), Email OTP length ramené de 8 à **6**,
templates email « Magic link or OTP » et « Confirm sign up » configurés avec `{{ .Token }}`.
Création/gestion de chasse testée OK sous les nouvelles RLS.

12. **Auth admin par code OTP email (Supabase Auth)**. L'admin n'est plus identifié par un
    `uid()` client mais par son `auth.uid()` (stable, lié à l'email). Nouvel écran
    `screenAdminLogin` (saisie email → `signInWithOtp` → code 6 chiffres → `verifyOtp`).
    `pickRole('admin')` exige une session ; `render()` (branche admin) redirige vers le login
    si pas de session ; `currentUser()` lit `sb.auth.getSession()`. `createGame` écrit
    `admin_id = auth.uid()`. `resumeByCode` et le picker de sessions **refusent** les chasses
    dont `admin_id ≠ auth.uid()` (fin de l'usurpation admin). `logout()` fait `sb.auth.signOut()`.
13. **RLS scopées** (`migration-lot1-rls.sql` + `supabase-setup.sql` §3) : `games`
    INSERT/UPDATE/DELETE et `submissions` UPDATE réservés à l'admin propriétaire authentifié.
    Lecture publique conservée ; `teams` + `submissions` INSERT encore ouverts (→ Lot 2).
    `admin_id` reste `text` (reçoit `auth.uid()::text`). Anciennes chasses → lecture seule.

    **⚠️ Ordre de cutover impératif** : (1) déployer le nouveau `expedition.html`,
    (2) se connecter une fois (crée le compte admin), (3) PUIS exécuter `migration-lot1-rls.sql`.
    Appliquer la migration avant le déploiement casse la création/gestion de chasse de l'ancien
    client. **Pré-requis Supabase** : provider Email activé (défaut) + le template d'email doit
    inclure le jeton `{{ .Token }}` pour que le code à 6 chiffres apparaisse (Auth → Email
    Templates → Magic Link). SMTP custom recommandé en prod (le SMTP partagé Supabase est
    fortement limité et peu fiable).

### Poussés sur GitHub (2026-06-30, commit `be2e1b0`) — LOT 2 SÉCURITÉ : verrou du bucket photos

14. **Storage `photos` verrouillé** (`migration-lot2-storage.sql` + `supabase-setup.sql` §4) :
    suppression de la policy DELETE publique (fin du vandalisme de masse — n'importe qui avec la
    clé anon pouvait supprimer toutes les photos) et de la policy SELECT publique (fin du listing
    du bucket). Upload conservé (joueurs anonymes). Les URLs publiques (`getPublicUrl`) et
    l'export ZIP continuent de fonctionner car le bucket reste `public=true` et l'app ne fait
    jamais de `.list()`. Le seul `.remove()` (rollback d'orphelin dans `saveSubmission`) est en
    try/catch : son échec est toléré. **Aucun changement client, appliqué à chaud.** Advisor
    « public bucket allows listing » levé.

    **Décision d'archi** : l'auth anonyme des joueurs (envisagée pour scoper `teams`/`submissions`)
    est **écartée** car (a) elle casserait la reconnexion par nom d'équipe (nouvel uid ≠
    propriétaire d'origine → envoi de photos bloqué) et (b) Supabase limite les connexions
    anonymes par IP → risque de blocage massif derrière le NAT d'un site. La protection des
    écritures `teams`/`submissions` (encore ouvertes) est reportée à un lot **Edge Functions**
    (gate serveur `service_role`), moins urgent car ces atteintes sont récupérables (contrairement
    à la suppression de photos).

### Poussés sur GitHub (2026-06-30, commit `3695b18`) — LOT FIABILITÉ : keep-alive + capture d'erreurs

15. **Keep-alive anti-pause** (`.github/workflows/keepalive.yml`) : le projet Supabase est en
    tier gratuit → pause après ~7 j d'inactivité (risque jour J pour une activité à événements
    espacés). Un workflow GitHub Actions ping l'API REST (`SELECT` léger sur `games`) tous les
    3 jours via la clé anon publique (aucun secret à configurer) → activité enregistrée → pas de
    pause. ⚠️ GitHub désactive les crons après 60 j sans commit ; « Run workflow » ou un commit
    les réactive. **Vraie solution pro : plan Supabase Pro** (pas de pause, backups quotidiens,
    meilleures ressources) — non fait ici (facturation = action utilisateur).
16. **Capture d'erreurs client** (`reportError` + handlers `error` / `unhandledrejection` dans
    `expedition.html`) : erreurs non gérées → console + toast discret côté **admin** (pas les
    joueurs), sans bloquer le jeu. Hook **Sentry** optionnel, activé uniquement si
    `localStorage.sentry_dsn` est défini (aucune dépendance par défaut). Recommandé pour la prod :
    créer un projet Sentry gratuit et coller le DSN.

### Poussés sur GitHub (2026-06-30, commit `37d1e81`) — LOT RGPD : consentement + conservation + politique

17. **Consentement à l'inscription** : case à cocher **obligatoire** sur `screenTeamJoin`
    (`join-consent`, préservée via `STATE.joinConsent`), bloquante dans `joinGame`, avec lien vers
    `confidentialite.html`. Sans coche, pas d'inscription.
18. **Politique de confidentialité** (`confidentialite.html`, servie par Pages) : modèle FR complet
    (responsable, données, finalités, base légale = consentement, sous-traitants Supabase/GitHub,
    conservation 90 j, droits, mineurs, CNIL). ⚠️ **Champs « À COMPLÉTER »** (identité + email de
    l'organisateur) à remplir avant tout usage commercial.
19. **Conservation + effacement** (migration `rgpd_retention_purge`, reprise dans
    `supabase-setup.sql` §5) : fonctions `purge_expired_games(days)` et `purge_game(code)`
    (SECURITY DEFINER, purgent storage + lignes ; `revoke` côté client), + job **pg_cron**
    `purge-expired-games-rgpd` quotidien (03:30 UTC) → suppression auto 90 j après création.
    Effacement à la demande : `select public.purge_game('CODE');`.

### Poussés sur GitHub (2026-06-30, commit `c09d80f`) — RGPD : effacement in-app par l'admin

20. **RPC `admin_purge_game(code)`** (migration `admin_purge_game_rpc`, `supabase-setup.sql` §5) :
    SECURITY DEFINER, vérifie `auth.uid() = games.admin_id` puis purge storage + lignes ;
    `grant execute` à `authenticated`. Bouton « Supprimer définitivement cette chasse + photos »
    sur `screenAdminEnd` (`purgeCurrentGame`, double confirmation). Complète le droit à
    l'effacement RGPD sans passer par le SQL Editor.

### Poussés sur GitHub (2026-07-01) — Géolocalisation des indices + carte d'orientation

21. **Géoloc des indices + carte Leaflet**. Leaflet 1.9.4
    ajouté (CDN unpkg, CSS+JS dans le `<head>`). Overlay carte plein écran (`#map-overlay`) +
    styles pins (`.pin-hidden/-start/-done/-num/-target`). Coords **optionnelles** par indice
    (`clues[].lat/lng`, jsonb, **aucune migration**). Admin : `openClueMapPicker`,
    `placeTargetMarker`, `useMyPositionForClue`, `clearClueCoord` ; UI dans `renderClueListEdit`.
    Équipe : `openTeamMap` (repères anonymes sauf départ ★ + réalisés ✓, position live), bouton
    « 🗺️ Carte » dans `screenTeamActive`. Contexte partagé `MAPCTX`, cycle de vie géré
    (`openMapOverlay`/`closeMap`, `invalidateSize`, `watchPosition` nettoyé à la fermeture).
    Voir « Géolocalisation des indices » dans Fonctionnalités clés. Poussé et déployé (Pages).

### Poussés sur GitHub (2026-07-02) — LOT PWA (étape 1) : app-shell offline

22. **Service worker `sw.js` (app-shell offline)**. Enregistré depuis `expedition.html` (non
    bloquant, un échec ne casse pas le jeu). Stratégies : navigation HTML **network-first**
    (hotfixes en ligne toujours servis ; hors-ligne → dernière version cachée) ; CDN versionnés
    (supabase-js, jszip, Leaflet) + polices en **cache-first** ; tuiles OSM en cache-first runtime
    (cache `expedition-tiles`) ; appels **Supabase toujours réseau** (jamais d'état de jeu périmé).
    Résout le trou majeur : un rechargement pendant une coupure ne donne plus d'écran blanc.
    Bandeau `#offline-banner` piloté par `navigator.onLine` + events `online`/`offline`.
    ⚠️ Bumper la constante `CACHE` de `sw.js` à chaque déploiement changeant l'app-shell.
    **Étape 2 (non faite)** : file d'attente d'envoi photo offline (IndexedDB + flush).

### Poussés sur GitHub (2026-07-02) — LOT PWA (étape 2) : file d'envoi photo offline

23. **Outbox d'envoi photo (IndexedDB)**. `submitClue` écrit d'abord la preuve dans une file
    IndexedDB (`expedition-outbox`) — la photo survit à une coupure/rechargement/fermeture — puis
    tente l'envoi. `flushOutbox` (verrou `FLUSHING`) vide la file en séquence (upload+insert
    `upsert` idempotent par `id` → pas de doublon ni d'orphelin), retire à chaque succès, puis
    resynchronise (`loadSubmissions`+`render`). Déclencheurs : boot, event `online`, chaque
    `refreshState` (poll 15 s). `saveSubmission`/`uploadPhoto` acceptent un flag `silent` (pas de
    toast d'échec pendant les tentatives de fond). Rendu équipe : `myTeamSubs()` fusionne les items
    en file comme preuves « en attente d'envoi » (pseudo-status `queued`) → l'indice s'affiche
    envoyé, le verrou de départ se débloque hors-ligne, `openClue` bloque une nouvelle capture.
    `CACHE` de `sw.js` bumpé v1→v2. ⚠️ Limite iOS : pas de Background Sync → flush appli
    ouverte/réouverte uniquement.

### Poussés sur GitHub (2026-07-02) — Reconnexion équipe fiabilisée (anti-doublon)

24. **Reconnexion sans doublon**. (1) « Quitter la chasse » ne supprime plus l'équipe une fois la
    chasse démarrée (`leaveGame` : `removeTeam` réservé au lobby `setup`) → simple détachement de
    l'appareil, preuves conservées ; bouton renommé « Se déconnecter ». (2) Reconnexion par
    **choix dans la liste** des équipes (`showReconnectTeams`/`reconnectToTeam` sur
    `screenTeamJoin`) au lieu de retaper le nom → plus de doublon par faute de frappe (les noms
    sont déjà publics). (3) `joinGame` **bloque un nom déjà pris** (comparaison insensible
    casse/espaces) et oriente vers la reconnexion ; `screenAdminLobby` avertit si des noms
    d'équipe en double existent.

### Poussés sur GitHub (2026-07-02, commit `c02a404`) — Branding / icônes PWA

25. **Identité visuelle finalisée** (la boussole « rose des vents » existait déjà). Trois manques
    comblés : (1) **favicon** dédié — `icons/favicon.svg` (motif boussole simplifié, sans les
    fines graduations qui bavent en petit) + rasters `favicon-32.png`/`favicon-16.png`, câblés via
    `<link rel="icon">` dans le `<head>` (l'onglet navigateur n'affiche plus l'icône générique) ;
    (2) **icône maskable** dédiée `icons/icon-maskable-512.png` (boussole à ~72 % centrée sur carré
    parchemin plein cadre → zone de sécurité Android, l'anneau n'est plus rogné) ; l'ancien
    `"purpose": "any maskable"` sur les icônes 192/512 est scindé en `any` (192/512) + `maskable`
    (512 dédiée) dans `manifest.json` ; (3) **`icons/apple-touch-icon.png`** en 180 px (iOS arrondit
    les coins lui-même), remplace le pointage sur `icon-192.png`. `sw.js` : nouveaux assets ajoutés
    à `CORE`, `CACHE` bumpé **v2→v3**. Les icônes d'origine `icon-192/512.png` sont conservées.

## Dette technique / points de vigilance connus

- **Clé `anon` publique en clair** dans le code. Historiquement « sans auth / RLS permissive »,
  désormais durcie (Lots 1–2 : auth admin + RLS scopées + storage verrouillé). Reste à traiter
  avant usage grand public / commercial : un tiers peut toujours scrapper les codes de chasse et
  rejoindre (écritures `teams`/`submissions` encore ouvertes → Lot Edge Functions). La fusion par
  nom d'équipe (reconnexion) est désormais atténuée : `joinGame` bloque un nom déjà pris et la
  reconnexion se fait par choix dans la liste des équipes (voir #24). Reste un cas de course rare
  (deux appareils inscrivant le même nom exactement au même instant → `addTeam` réutilise l'id).
- **[SÉCURITÉ — identifié 2026-07-02, non implémenté] Anonymisation carte + secret des indices
  côté client uniquement** : `games.clues` (titres, textes, points, `lat`/`lng`) est en lecture
  publique via la clé `anon`. Les repères « anonymes » de la carte équipe **et** le verrou
  d'indice de départ sont donc contournables par lecture réseau (un tricheur obtient le mapping
  indice→texte→GPS). Correctif = **Lot Edge Functions** : fonction `service_role` renvoyant à
  chaque équipe seulement ses indices autorisés (départ + réalisés) + les autres en points
  anonymes sans `clue_id`, et verrouillage de la lecture publique de `games.clues`. Ferme aussi
  la fuite pré-existante des textes d'indices.
- Pas de transaction entre upload Storage et insert DB → mitigé par le retry+rollback (#4),
  mais une vraie solution serait une Edge Function ou un nettoyage périodique des orphelins.
- `start_clue_id` : à conserver lors des fusions (l'équipe canonique la plus ancienne le porte).
- **PWA — app-shell + file d'envoi offline en place** (`sw.js` + outbox IndexedDB) : navigation
  HTML network-first, CDN/Leaflet + polices en cache-first, tuiles OSM en cache runtime, Supabase
  toujours réseau ; appli installable. Un rechargement pendant une coupure ne donne plus d'écran
  blanc ; une photo prise hors-ligne est mise en file (IndexedDB, survit rechargement/fermeture)
  puis ré-émise automatiquement au retour du réseau. ⚠️ Limite iOS : pas de Background Sync
  (Safari) → le flush se fait appli ouverte / à sa réouverture, pas « appli tuée jamais rouverte ».
  ⚠️ Bumper la constante `CACHE` de `sw.js` à chaque déploiement modifiant l'app-shell.

## Workflow attendu

Implémentation directe, sans recap de questions. Corriger préventivement ce qui n'a pas
encore été testé en conditions réelles plutôt que demander confirmation. Vérifier la syntaxe
JS avant livraison
