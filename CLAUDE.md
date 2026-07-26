# CLAUDE.md — Expédition · Chasse au Trésor Photo

Guide de référence pour travailler sur l'application. À lire avant toute modification.

> Source de vérité = le dépôt GitHub `MikRob-glitch/Expedition`. Ce fichier décrit l'état
> **réellement poussé sur GitHub** (HEAD = 2026-07-26, commit `9e05921`+docs, `BUILD` `2026-07-26.8`,
> `CACHE` `expedition-v12`). Les écarts connus (travail local non poussé) sont signalés ⚠️.
> À ce jour, aucun écart : local et distant alignés (vérifié par re-clonage + `diff`).
>
> **À mettre à jour à chaque livraison** : la ligne ci-dessus (commit, BUILD, CACHE), le
> § « État des migrations SQL » si une migration est ajoutée, et une entrée dans le journal.

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

- **`games`** — PK `code` (texte, 4 lettres). Champs : `name`, `status`, `location` (texte,
  optionnel — lieu de la chasse, ex. « Center Parcs »), `clues` (jsonb :
  `[{id,title,text,points,lat,lng}]` — `lat`/`lng` optionnels, `null` si l'indice n'est pas
  géolocalisé), `duration_minutes`, `per_clue_minutes`, `admin_id`, `started_at`, `ended_at`.
  ⚠️ **Aucune migration** pour la géoloc des indices : `clues` est du jsonb, les coords sont
  simplement stockées dans chaque objet indice.
- **`teams`** — PK `id` (uid). FK `game_code`. Champs : `name`, `start_clue_id`, `photo_url`
  (photo d'équipe optionnelle, prise à l'inscription), `print_submission_id` (id de la photo
  choisie par l'équipe pour le tirage souvenir — voir #39), `joined_at`.
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
- **Dupliquer une chasse passée** : dans l'écran admin de préparation, section « Dupliquer une
  chasse ». Voie principale = **liste de toutes MES chasses** (`loadGamesForDuplicate` : chasses
  dont `admin_id = auth.uid()` **ou** dont l'`admin_id` n'est pas un UUID — voir #32 et le
  § migrations —, **tout statut** y compris `ended`, tri `created_at` desc, limite 60) →
  sélection (`selectDupSession`) puis bouton « Dupliquer cette chasse ». Repli dans un `<details>`
  replié = **par code** (`duplicateByCode`), utile pour une chasse appartenant à un autre compte.
  Les deux voies passent par le cœur partagé `duplicateFromCode(code)`, qui copie les indices
  (nouveaux `id`) + réglages (dont `location`) dans le formulaire de création (`STATE.draftMeta`,
  nom suffixé « (copie) », date du jour). « Créer la chasse » génère ensuite une **nouvelle session
  vierge** (nouveau code, aucune équipe ni photo). La chasse source n'est jamais modifiée.
  ⚠️ Deux pickers coexistent sur cet écran (`#session-picker` reprise, `#dup-picker` duplication) :
  `selectSession`/`selectDupSession` **scopent** leur `$$` par id de conteneur — sinon la sélection
  de l'un désélectionne l'autre.
- **Supprimer une chasse** : corbeille 🗑 sur chaque ligne de la liste de duplication
  (`deleteGameFromPicker`) et bouton sur l'écran de fin (`purgeCurrentGame`). Double confirmation.
  **Deux étapes obligatoires, dans cet ordre** : (1) `purgeGamePhotos(code)` retire les fichiers
  par l'**API Storage** (`sb.storage.from('photos').remove`) — Supabase interdit tout DELETE SQL
  sur `storage.objects`, voir #38 ; (2) RPC `admin_purge_game` supprime les lignes (`games` →
  cascade `teams`/`submissions`), ownership vérifié serveur. ⚠️ **Jamais l'inverse** : le bucket
  n'étant pas listable (Lot 2), les chemins ne se reconstruisent que depuis `submissions.id` et
  `teams.id` — une fois les lignes parties, les photos sont irrécupérables et orphelines.
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

- **QR code d'accès joueurs (deep-link)** : sur l'écran maître du jeu (lobby + live), bouton
  « 📱 QR code d'accès » → overlay `#qr-overlay` affichant un QR qui encode `…?join=CODE`. Au scan,
  le joueur arrive **directement sur l'inscription équipe, code pré-rempli** (géré au boot :
  `params.get('join')` → `STATE.joinDraftCode` → `render` crée une session équipe si aucune,
  `screenTeamJoin` pré-remplit `#join-code`). Lib `qrcode-generator@1.4.4` (CDN, cachée par le SW).
  Voir #28.
- **Tirage souvenir encadré** : en fin de chasse (`ended`), chaque équipe choisit **une** photo
  à imprimer sur `screenTeamEnd` (`renderTeamPrintCard` → `choosePrintPhoto` → `setTeamPrintChoice`,
  stocké dans `teams.print_submission_id`). Le maître du jeu voit les choix sur `screenAdminEnd`
  (`renderAdminPrintCard`), peut choisir **à la place** d'une équipe absente (`openPrintPicker`),
  prévisualiser (`openPrintPreview`), télécharger un tirage (`downloadPrint`) ou **tous** en ZIP
  `{CODE}_tirages.zip` (`downloadAllPrints`, JSZip, `STORE` — du JPEG ne se recompresse pas).
  Le cadre est composé **en canvas** par `buildPrintCanvas` : fond parchemin + vignette, double
  filet + losanges d'angle, rose des vents vectorielle (mêmes tracés que `icons/favicon.svg`),
  puis cartouche « nom d'équipe / nom de la chasse · lieu / date ». **Format de sortie FIXE
  10×15 cm** : 1200×1800 px en portrait, 1800×1200 en paysage (~300 dpi), selon l'orientation
  de la photo — le labo imprime plein format sans recadrer (#41). La photo est posée **entière**
  (« contain », jamais rognée) dans la fenêtre ; le parchemin absorbe l'écart de ratio, et une
  photo portrait 3:4 (sortie standard de `compressImage`, #40) remplit la fenêtre exactement. ⚠️ La photo est chargée par **fetch → blob → objectURL** : une `<img>` pointant
  directement le Storage (autre origine) **souillerait le canvas** et ferait échouer `toBlob()`.
  ⚠️ Les polices sont préchargées (`ensurePrintFonts`) sinon le canvas dessine en repli système.
- **Zoom des photos** : le modal photo (vote / validation / galerie) est zoomable — pincer,
  molette, double-clic (1×↔2,5×), glisser pour déplacer, boutons +/−/⟲ (`initPhotoZoom`,
  Pointer Events, zoom 1–6×). Voir #27.

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

## État des migrations SQL

Ordre d'application sur une base neuve : `supabase-setup.sql`, puis les migrations dans
l'ordre chronologique ci-dessous. Sur la base de production, seules les lignes « à exécuter »
restent à passer — **à ce jour, aucune : la base est à jour**.

| Fichier / migration | Objet | État |
|---|---|---|
| `supabase-setup.sql` | Schéma de base, RLS, Realtime, Storage, RGPD | appliqué |
| `migration-lot1-rls.sql` | Auth admin + RLS scopées (#12/#13) | appliqué 2026-06-30 |
| `migration-lot2-storage.sql` | Verrou du bucket photos (#14) | appliqué 2026-06-30 |
| `rgpd_retention_purge` | Rétention 90 j + pg_cron (#19) | appliqué 2026-06-30 |
| `admin_purge_game_rpc` | Effacement in-app (#20) | appliqué 2026-06-30 |
| `alter table games add column location` | Lieu de la chasse (#31) | appliqué 2026-07-26 |
| `migration-legacy-admin.sql` | Réattribution des `admin_id` legacy (#34) | appliqué 2026-07-26 |
| `migration-storage-purge.sql` | Purge sans DELETE sur `storage.objects` (#38) | appliqué 2026-07-26 |
| `migration-print-choice.sql` | `teams.print_submission_id` — tirage souvenir (#39) | appliqué 2026-07-26 |

⚠️ `supabase-setup.sql` §5 est **obsolète** depuis #38 : ses trois fonctions de purge y
suppriment encore des lignes de `storage.objects`, ce que Supabase refuse. C'est
`migration-storage-purge.sql` qui fait foi. Appliquer les deux, dans cet ordre, sur une base neuve.

## Déploiement

Pas de build : GitHub Pages sert les fichiers du dépôt tels quels (`.nojekyll`, voir #29).

**Checklist à chaque livraison :**

1. Incrémenter **`BUILD`** dans `expedition.html` (affiché en bas de l'écran de préparation et
   logué au démarrage). Sans ça, impossible de savoir quelle version tourne sur un appareil.
2. Incrémenter **`CACHE`** dans `sw.js` si l'app-shell change (`expedition.html`, icônes,
   `manifest.json`, CDN précachés). Dans le doute, incrémenter.
3. Vérifier la **syntaxe JS** avant de pousser : extraire le bloc `<script>` inline de
   `expedition.html` et le passer à `new Function(...)`, plus `node --check sw.js`.
4. Vérifier l'**intégrité du fichier** : il doit finir par `</script></body></html>`, et les
   ancres de fin (`function escapeHtml`, `async function logout`, `// ---------- TICK`) doivent
   être présentes. Voir l'avertissement sur le mount OneDrive dans « Workflow attendu ».
5. Pousser, puis **re-cloner et comparer** au dossier local (`diff`) — la seule preuve que ce qui
   est publié est bien ce qui a été écrit.
6. Mettre à jour ce fichier : ligne HEAD de l'en-tête, § migrations si besoin, entrée de journal.
7. Sur l'appareil : la nouvelle version arrive au premier rechargement (#35) ; le bandeau
   « Nouvelle version disponible » s'affiche si un ancien worker contrôle encore la page (#37).
   Contrôler le numéro affiché en bas de l'écran de préparation.

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

### Poussés sur GitHub (2026-07-03) — Envoi photo idempotent (correctif file bloquée)

26. **Envoi photo idempotent par insert** (`saveSubmission` param `idempotentInsert`,
    `uploadPhoto` en `upsert:false`). Symptôme : une photo restait « en attente d'envoi » même
    réseau revenu. Cause : le flush outbox faisait `.upsert()` (DB) et `upload({upsert:true})`
    (storage) ; sur un **retry** frappant une ligne/un fichier déjà créés (réponse réseau perdue),
    l'`ON CONFLICT DO UPDATE` déclenchait la policy **UPDATE réservée à l'admin** (Lot 1) et le
    bucket sans policy UPDATE (Lot 2) → refus RLS **silencieux** → file bloquée à jamais alors que
    la preuve était déjà en base. Correctif : chemin équipe en `.insert()` sec traitant `23505`
    (doublon DB) comme **succès**, upload `upsert:false` traitant `409/Duplicate` comme **succès**.
    Les équipes anon n'ont que le droit INSERT ; **ne jamais `upsert` côté équipe** (l'admin
    authentifié garde `.upsert()` pour le jugement). Les photos déjà coincées se débloquent seules
    au flush suivant. `CACHE` `sw.js` bumpé **v3→v4**.

### Poussés sur GitHub (2026-07-03) — Zoom sur les photos

27. **Zoom/pan sur le modal photo** (`initPhotoZoom`) : sur toute photo ouverte (vote, validation,
    galerie), zoom au **pincer** (tactile), à la **molette** (desktop), **double-clic** pour
    basculer 1×↔2,5×, **glisser** pour déplacer quand zoomé, + boutons **+/−/⟲**. Pointer Events
    unifiés, sans dépendance ; borne 1–6×, panoramique clampé aux bords. `openPhoto` enveloppe
    l'image dans `.zoomv` et instancie le contrôleur au chargement ; `closeModal` libère
    `window.PZOOM`. `CACHE` `sw.js` bumpé **v4→v5**. But : mieux juger les détails au vote.

### Poussés sur GitHub (2026-07-03) — QR code d'accès joueurs + deep-link

28. **QR code d'accès (écran maître du jeu)**. Bouton « 📱 Afficher le QR code d'accès » dans le
    lobby admin (sous le code) et « 📱 QR d'accès » sur l'écran live. `showQR`/`closeQR` ouvrent un
    overlay plein écran (`#qr-overlay`) avec un grand QR + le code + l'URL. Le QR encode un
    **deep-link** `…/expedition.html?join=CODE` : au scan, l'appli s'ouvre **directement sur
    l'inscription équipe, code pré-rempli** (boot `params.get('join')` → `STATE.joinDraftCode` ;
    `render` crée une session équipe si aucune ; `screenTeamJoin` pré-remplit `#join-code`). Lib
    **`qrcode-generator@1.4.4`** via CDN (jsdelivr), ajoutée au `<head>` et au cache SW (offline
    après 1er chargement) ; repli affichant le code si le QR ne peut être généré. `CACHE` `sw.js`
    bumpé **v5→v6**.

### Poussés sur GitHub (2026-07-03, commit `2c20328`) — CI : fix build GitHub Pages

29. **`.nojekyll` à la racine**. Le build « pages build and deployment » échouait : en « deploy
    from branch », Pages passe les `.md` par Jekyll/Liquid, qui plante sur les `{{ .Token }}` de
    `CLAUDE.md` (jetons de template email Supabase — `.Token` = variable Liquid invalide, non
    protégée par les backticks car Liquid lit le markdown brut). `.nojekyll` désactive Jekyll →
    Pages sert les fichiers statiques tels quels. Aucun changement applicatif.

### Poussés sur GitHub (2026-07-26, commit `5017856`) — Correctif : classement final non affiché côté équipe

30. **Re-render realtime de `screenTeamWaiting`**. Symptôme : après la fin d'une chasse, l'équipe
    restait bloquée sur l'écran d'attente (« Les résultats arrivent… ») et ne voyait jamais le
    classement final. Cause : `refreshState` ne déclenche `render()` sur changement d'état que si
    l'écran courant figure dans une **liste blanche** ; celle-ci omettait `team-waiting`. Quand
    l'admin terminait la chasse (`status` → `ended`), l'update realtime parvenait bien à
    l'appareil joueur, mais `render()` n'était pas appelé → pas de bascule vers `screenTeamEnd`.
    Correctif : ajout de `team-waiting` à la liste blanche (+ `admin-validation` et `admin-judging`
    qui souffraient du même défaut de rafraîchissement de leurs écrans côté maître du jeu). Aucun
    changement d'app-shell → `CACHE` `sw.js` **non bumpé** (navigation network-first sert le hotfix
    en ligne).

### Poussés sur GitHub (2026-07-26) — Lieu de la chasse + duplication par liste

31. **Champ « Lieu de la chasse »** (`games.location`, colonne `text` nullable — migration
    `alter table games add column if not exists location text;` appliquée en base + ajoutée à
    `supabase-setup.sql`). Saisi à la création (`screenAdminSetup` → `createGame`) et modifiable
    (`screenAdminEditGame` → `saveEditedGame`) ; porté par `rowToGame`/`saveGame` ; copié par
    `duplicateFromCode`. Affiché dans le lobby admin (sous-titre), le picker de reprise et le
    picker de duplication. Optionnel : vide = rien d'affiché.
32. **Duplication par liste** (remplace la saisie de code comme voie principale). Nouveau picker
    `#dup-picker` alimenté par `loadGamesForDuplicate` : **toutes les chasses de l'admin
    connecté**, tout statut, tri `created_at` desc, limite 60, chaque ligne affichant nom, date,
    lieu, statut et code. Sélection via `selectDupSession` puis « Dupliquer cette chasse »
    (`duplicateSelected`). L'ancienne saisie par code (`duplicateByCode`) est conservée mais
    repliée dans un `<details>` — seul moyen de dupliquer la chasse d'un **autre** compte, que la
    liste ne peut pas montrer. Les deux voies partagent `duplicateFromCode`.
    ⚠️ **Le picker ne filtre pas sur `admin_id = auth.uid()` seul** : les chasses d'avant le Lot 1
    (juin 2026) portent un `admin_id` client de 7 caractères (`arvbeed`…), jamais un UUID — un
    filtre strict renvoyait donc une liste **vide** alors que 24 chasses existaient. Règle
    retenue (`isAuthUid`) : on garde les chasses dont `admin_id === auth.uid()` **et** celles dont
    l'`admin_id` n'est pas un UUID (= antérieures au compte, donc à nous), et on exclut celles
    d'un autre compte authentifié. Les anciennes portent la mention « ancienne ». Sans risque RLS :
    la duplication ne fait que **lire** la source (SELECT public) et la copie créée appartient à
    `auth.uid()`.
    ⚠️ `selectSession` scopait son `$$('.session-picker-item')` au document : avec deux pickers sur
    le même écran, sélectionner dans l'un désélectionnait l'autre → les deux sélecteurs sont
    désormais **scopés par id de conteneur**. Aucun changement d'app-shell → `CACHE` `sw.js` non
    bumpé.

### Poussés sur GitHub (2026-07-26) — Suppression d'une chasse depuis la liste

33. **Corbeille 🗑 par ligne dans le picker de duplication** (`deleteGameFromPicker`) : double
    confirmation puis RPC `admin_purge_game` (purge storage + lignes, ownership vérifié serveur),
    puis rafraîchissement des deux pickers. Comble un trou réel : le bouton de suppression
    n'existait que sur `screenAdminEnd`, donc une chasse restée en `setup` était **ineffaçable
    depuis l'app**. ⚠️ La ligne du picker passe de `<button>` à `<div role="button" tabindex="0">`
    (+ `onkeydown` Entrée/Espace) : un `<button>` ne peut pas en contenir un autre — HTML invalide,
    le clic sur la corbeille serait avalé par le parent. La corbeille fait `event.stopPropagation()`
    pour ne pas déclencher la sélection. Le nom passé au handler a ses apostrophes remplacées par
    `’` **avant** `escapeHtml` (sinon `&#39;` est redécodé par le parser HTML et casse le
    littéral JS de l'attribut `onclick`).
34. **`migration-legacy-admin.sql`** (à exécuter une fois, non appliquée automatiquement) :
    réattribue les chasses au `admin_id` legacy (non-UUID) au compte `auth.users` de
    l'organisateur, avec contrôles avant/après. Sans elle, la corbeille échoue sur les anciennes
    chasses (`admin_purge_game` lève « Non autorisé ») et l'app affiche un message explicite le
    disant. Après elle, les anciennes chasses redeviennent reprenables, modifiables et
    supprimables, et la mention « ancienne » disparaît du picker.

### Poussés sur GitHub (2026-07-26) — SW : l'app-shell périmée masquait les correctifs

35. **`fetch(req.url, {cache:'reload'})` sur la navigation** (`sw.js`) + `CACHE` bumpé **v6→v7**.
    Symptôme : la corbeille #33 n'apparaissait pas après déploiement, alors que le fichier publié
    était correct. Cause : la navigation était déjà network-first, **mais `fetch(req)` respecte le
    cache HTTP du navigateur** — GitHub Pages renvoie un `max-age`, donc le « réseau » servait une
    copie périmée et le SW la recopiait ensuite dans `CACHE`. `cache:'reload'` force un aller-retour
    réseau réel. ⚠️ On repart de `req.url` et non de `req` : une `Request` en mode `navigate` ne
    peut pas être reconstruite avec un init (`new Request(req, {...})` lève). Conséquence pratique :
    un correctif déployé arrive désormais au premier rechargement, sans `Ctrl+Maj+R`.

### Poussés sur GitHub (2026-07-26) — Version visible + proposition de mise à jour

36. **Constante `BUILD`** (`'2026-07-26.4'`) loguée au démarrage et affichée en bas de l'écran de
    préparation (`.build-tag`). Sans elle, impossible de savoir en un coup d'œil quelle version
    tourne réellement sur un appareil — c'est ce qui a rendu le diagnostic de #35 laborieux.
    **À incrémenter à chaque déploiement.**
37. **Détection de nouvelle version** : l'enregistrement du SW écoute `updatefound` +
    `statechange`, et affiche le bandeau `#update-banner` (« Nouvelle version disponible ·
    Mettre à jour ») **seulement** si la page est déjà contrôlée par un ancien worker. Pas de
    rechargement automatique : on n'arrache jamais la page sous les pieds d'un maître du jeu en
    pleine partie. `reg.update()` est appelé au démarrage **et** au retour sur l'onglet
    (`visibilitychange`) — sans ça le navigateur peut conserver l'ancien `sw.js` pendant des
    heures. `CACHE` bumpé **v7→v8**.

### Poussés sur GitHub (2026-07-26) — Supabase interdit le DELETE direct sur storage.objects

38. **Purge scindée : lignes en SQL, fichiers via l'API Storage** (`migration-storage-purge.sql`,
    à exécuter une fois). Symptôme : « Suppression impossible : Direct deletion from storage
    tables is not allowed. use the Storage API instead » en supprimant une chasse. Supabase
    refuse désormais tout `delete from storage.objects`, **même en `SECURITY DEFINER`** (sinon le
    binaire resterait orphelin sur le stockage objet). Les **trois** fonctions du §5 étaient donc
    cassées — dont `purge_expired_games`, c'est-à-dire le **cron RGPD quotidien, en échec
    silencieux depuis la restriction**. Nouvelle répartition : les fonctions ne suppriment plus
    que les lignes (`games` → cascade `teams`/`submissions`) ; les photos sont retirées par le
    client via `sb.storage.from('photos').remove(paths)` dans `purgeGamePhotos(code)`, appelé
    **avant** le RPC — après la purge des lignes les chemins sont irrécupérables, le bucket
    n'étant pas listable (Lot 2). Les chemins sont reconstruits depuis `submissions.id` et
    `teams.id` (`{code}/{id}.jpg`, `{code}/team_{id}.jpg`), par lots de 100. Nouvelle policy
    `photos_delete_owner` sur `storage.objects` : DELETE réservé à l'admin authentifié dont
    `auth.uid()` possède la chasse dont le code est le premier segment du chemin
    (`storage.foldername(name))[1]`). Branché sur la corbeille du picker **et** sur
    `purgeCurrentGame` (écran de fin). `BUILD` → `2026-07-26.5`, `CACHE` **v8→v9**.
    ⚠️ **Reste ouvert** : `purge_expired_games` n'efface plus les fichiers, seulement les lignes.
    La rétention 90 j laisse donc les photos dans le bucket. Correctif = **Edge Function
    `service_role`** appelant l'API Storage, planifiée quotidiennement. En attendant, purger les
    vieilles chasses à la main depuis l'app **avant** que le cron n'en efface les lignes.

### Poussés sur GitHub (2026-07-26, commit `9e05921`) — Tirage souvenir choisi par l'équipe

39. **Photo souvenir à imprimer**. Besoin terrain : à la fin d'un événement, imprimer une photo
    par équipe, encadrée aux couleurs d'Expédition. (1) **Base** : `teams.print_submission_id`
    (`migration-print-choice.sql`, colonne `text` nullable, pas de FK — une preuve supprimée
    laisse une valeur pendante que `teamPrintSub` ignore). Aucune policy à ajouter : `teams`
    est encore ouvert en écriture (les équipes sont anonymes), et le choix ne peut pas passer
    par `submissions` dont l'UPDATE est **réservé à l'admin** depuis le Lot 1. (2) **Équipe** :
    carte de choix sur l'écran de fin, toutes ses photos (y compris refusées — un beau souvenir
    n'est pas forcément une preuve conforme), sélection enregistrée immédiatement, aperçu du
    tirage. (3) **Maître du jeu** : liste des choix par équipe sur l'écran de fin (compteur
    `n/m`), choix de secours pour une équipe partie sans choisir, aperçu, téléchargement à
    l'unité ou ZIP `{CODE}_tirages.zip`. (4) **Cadre** : `buildPrintCanvas`, rendu canvas pur
    (aucun service d'image), rose des vents redessinée en vectoriel depuis `icons/favicon.svg`,
    nom d'équipe / nom de la chasse · lieu / date de l'activité, ajustement automatique de la
    taille des textes + ellipse (noms longs) et repli si le pavé « EXPÉDITION » ne tient pas.
    `BUILD` → `2026-07-26.6`, `CACHE` **v9→v10**.
    ⚠️ Le plafond de compression des preuves (1000 px à l'époque) a été relevé à 1600 px
    juste après — voir #40.

### Poussés sur GitHub (2026-07-26, commit `9e05921`) — Définition des photos relevée pour l'impression

40. **`compressImage` : 1000 → 1600 px, qualité JPEG 0,72 → 0,82.** Le plafond de 1000 px
    datait d'avant le tirage souvenir (#39) : il visait le seul envoi sur réseau d'événement.
    Constantes nommées et documentées (`PHOTO_MAX`, `PHOTO_Q`, `PHOTO_BUDGET`), rééchantillonnage
    en `imageSmoothingQuality:'high'`, jamais d'agrandissement, et le filet de sécurité baisse
    désormais la **qualité** (plancher 0,45) plutôt que la définition si une photo dépasse
    ~3 Mo de dataURL. Rendu à l'impression : 10×15 cm ~300 dpi, 13×18 ~225 dpi, A5 ~190 dpi.
    La **photo d'équipe** (pastille de 40 px à l'écran) reste volontairement basse définition :
    `compressImage(file, {max:800, q:0.8})` — inutile de payer 1600 px pour un avatar.
    `BUILD` → `2026-07-26.7`, `CACHE` **v10→v11**.
    ⚠️ **Contrepartie à surveiller** : ~350–450 Ko par preuve au lieu de ~200 Ko, soit **~2×**
    en upload le jour J (l'outbox + le retry idempotent couvrent les échecs) et **~2×** en
    stockage Supabase — or le tier gratuit plafonne à **1 Go** et la purge automatique 90 j
    n'efface plus les fichiers depuis #38. Purger les vieilles chasses depuis la corbeille de
    l'app, sinon le bucket se remplit deux fois plus vite qu'avant.

### Poussés sur GitHub (2026-07-26) — Tirage au format 10×15 exact

41. **`buildPrintCanvas` : format de sortie fixe 10×15 cm** (portrait 1200×1800, paysage
    1800×1200, ~300 dpi). Avant, le canvas suivait les dimensions de la photo + marges → un
    ratio quelconque, que le labo photo aurait **recadré ou bordé de blanc** à l'impression.
    Désormais l'orientation suit la photo (`iw >= ih`), et la photo est posée **entière** en
    « contain » centré dans la fenêtre (agrandie au besoin — un tirage à trou serait pire) ;
    le filet intérieur épouse les bords **réellement dessinés**. Géométrie : marge 60 px
    (≈ 5 mm), cartouche 300 px en portrait — choisi pour que la fenêtre fasse 1080×1440,
    soit **3:4 exact** : la sortie standard de `compressImage` tombe au pixel près — et
    230 px en paysage (une 4:3 paysage laisse ~2 cm de parchemin de part et d'autre, assumé :
    on ne rogne jamais la photo). `PRINT_MAX` (garde-fou devenu inutile) remplacé par
    `PRINT_LONG`/`PRINT_SHORT`. Cotes du cadre en px fixes (le canvas ne varie plus).
    `BUILD` → `2026-07-26.8`, `CACHE` **v11→v12**.

## Dette technique / points de vigilance connus

- **[STOCKAGE — depuis 2026-07-26] Les preuves pèsent ~2× plus lourd** (1600 px, #40) alors
  que le tier gratuit Supabase plafonne à 1 Go et que la purge automatique n'efface plus les
  fichiers (voir ci-dessous). À surveiller après chaque événement.
- **[RGPD — ouvert depuis 2026-07-26] Rétention 90 j : les photos ne sont plus purgées
  automatiquement.** `purge_expired_games` ne peut plus toucher au Storage (restriction Supabase,
  voir #38) : le cron efface les lignes, les fichiers restent. Correctif = Edge Function
  `service_role` appelant l'API Storage, planifiée quotidiennement. Contournement manuel :
  supprimer les vieilles chasses depuis la corbeille de l'app (qui, elle, purge bien les deux)
  **avant** l'échéance des 90 jours.
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
- Pas de transaction entre upload Storage et insert DB → mitigé par le retry+rollback (#4) et
  l'**idempotence** du chemin équipe (#26 : insert traitant `23505` et upload `409` comme succès) ;
  une vraie solution resterait une Edge Function ou un nettoyage périodique des orphelins.
  ⚠️ **Règle : écritures équipe = INSERT seul, jamais `upsert`** (RLS UPDATE réservée à l'admin,
  bucket sans policy UPDATE) — sinon le moindre retry se bloque en `42501`.
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
JS avant livraison.

**Règles apprises à la dure — ne pas les redécouvrir :**

- ⚠️ **Le dossier de travail est synchronisé OneDrive** : `git init` y échoue et laisse un `.git`
  corrompu ; depuis un sandbox Linux, une lecture du mount peut rendre une copie **tronquée**.
  Procédure fiable : cloner le dépôt dans `/tmp`, y rejouer les éditions par remplacements de
  chaînes **exacts** (échec bruyant si une ancre ne matche pas), vérifier, pousser — puis
  répercuter les mêmes éditions dans le dossier local. Ne jamais pousser une copie du mount sans
  contrôle d'intégrité.
- ⚠️ **Avant de conclure qu'un correctif ne marche pas, vérifier la version qui tourne** (`BUILD`
  en bas de l'écran de préparation). Un cache HTTP ou un service worker périmé a déjà fait
  conclure à tort à un bug applicatif (#35/#36).
- ⚠️ **Écritures équipe = INSERT seul, jamais `upsert`** (RLS UPDATE réservée à l'admin, bucket
  sans policy UPDATE) — sinon le moindre retry se bloque en `42501`. Insert idempotent : `23505`
  (DB) et `409` (storage) valent succès.
- ⚠️ **Photos : API Storage uniquement**, jamais de `delete from storage.objects` (#38).
- ⚠️ **L'API REST Supabase n'est pas joignable depuis le sandbox** (proxy) : impossible de
  vérifier une hypothèse sur les données par `curl`. Passer par le table editor ou une requête
  SQL demandée à l'utilisateur, plutôt que supposer.
