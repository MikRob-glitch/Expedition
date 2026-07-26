# Expédition · Chasse au trésor photo

Application web mobile (**PWA installable, capable hors-ligne**) pour une chasse au trésor multi-équipes. Les équipes résolvent des indices, prouvent chaque trouvaille par une **photo**, l'admin **valide** la conformité, puis un **jury vote** les meilleures photos. Synchronisation temps réel entre tous les téléphones.

> Mono-fichier, sans build. Dépôt : `github.com/MikRob-glitch/Expedition`. Déploiement : GitHub Pages → `https://mikrob-glitch.github.io/Expedition/expedition.html`.
> Le **journal des correctifs détaillé** (chronologique, numéroté) est dans [`CLAUDE.md`](CLAUDE.md).

---

## Stack

| Couche | Choix | Pourquoi |
|---|---|---|
| Frontend | HTML5 + Vanilla JS, fichier unique (~3360 lignes) | Zéro build, démarrage instantané, debug trivial |
| Backend | Supabase (Postgres + Realtime + Storage + Auth) | Synchro websockets, photos hébergées, auth OTP, tier gratuit |
| Caméra | `<input type="file" capture>` | Caméra native iOS/Android sans permission custom |
| Carte | Leaflet 1.9.4 + tuiles OpenStreetMap | Carte d'orientation des indices (géoloc optionnelle) |
| PWA | `manifest.json` + `sw.js` + outbox IndexedDB + icônes any/maskable | Installable + **offline** + file d'envoi photo |
| CDN | supabase-js@2, jszip@3.10.1, qrcode-generator@1.4.4, Leaflet 1.9.4 | Export ZIP, QR d'accès, carte |
| Hébergement | GitHub Pages (`.nojekyll`) | HTTPS obligatoire (la caméra l'exige) |
| Typo | Fraunces (serif display) + Geist + Geist Mono | Identité « expédition vintage » |

> ℹ️ Le **GPS des preuves** (submissions) reste retiré du prototype initial — la preuve est purement photographique. La **géoloc optionnelle des indices** (`clues.lat/lng`) + carte d'orientation Leaflet a en revanche été **réintroduite** (voir Fonctionnalités clés).

---

## Fichiers du projet

```
expedition.html            ← app complète, single-file SPA (~3360 lignes)
sw.js                      ← service worker (app-shell offline, cache, tuiles OSM)
confidentialite.html       ← politique de confidentialité RGPD (servie par Pages)
manifest.json              ← manifeste PWA (icônes any + maskable)
icons/                     ← icon-192/512, icon-maskable-512, favicon.svg/-16/-32, apple-touch-icon
supabase-setup.sql         ← schéma + RLS scopées + bucket + auth + RGPD (à exécuter 1×)
migration-lot1-rls.sql     ← Lot 1 sécurité : auth admin + RLS scopées
migration-lot2-storage.sql ← Lot 2 sécurité : verrou du bucket photos
migration-legacy-admin.sql ← réattribution des admin_id d'avant l'auth (à jouer 1×)
migration-storage-purge.sql ← purge sans DELETE sur storage.objects (obligatoire)
migration-print-choice.sql ← teams.print_submission_id (tirage souvenir)
.github/workflows/keepalive.yml ← ping Supabase (anti-pause tier gratuit)
.nojekyll                  ← désactive Jekyll sur GitHub Pages
README.md                  ← présentation + démarrage rapide
PROJECT.md                 ← ce fichier
CLAUDE.md                  ← guide de travail + journal des correctifs
```

---

## Démarrage rapide

1. **Supabase** : projet sur supabase.com → SQL Editor → `supabase-setup.sql` → Run → noter `Project URL` + clé `anon public` (Settings → API).
2. **Auth** : activer le provider **Email** ; template « Magic Link / OTP » avec le jeton `{{ .Token }}` (code admin à 6 chiffres). SMTP custom recommandé en prod.
3. **Config app** : valeurs Supabase **par défaut** codées en dur (`SUPABASE_DEFAULTS`), surchargables via l'écran **Configuration** (`localStorage`, par navigateur).
4. **Héberger** sur GitHub Pages (le `.nojekyll` évite l'échec de build Jekyll/Liquid). HTTPS obligatoire.

---

## Architecture

### Modèle de données

```sql
games        (code PK, name, hunt_date, location, status, duration_minutes,
              per_clue_minutes, clues JSONB, admin_id,
              created_at, started_at, ended_at)

teams        (id PK, game_code FK, name, start_clue_id, photo_url,
              print_submission_id, joined_at)

submissions  (id PK, game_code FK, team_id FK, clue_id, photo_url,
              status, points, bonus_points, submitted_at, judged_at,
              lat, lng  ← hérités, inutilisés)
```

- `games.clues` (JSONB) : `[{id, title, text, points, lat, lng}, ...]` — `lat`/`lng` **optionnels** (géoloc d'indice, `null` si non localisé). **Aucune migration** : les coords vivent dans le jsonb.
- `games.hunt_date` / `games.location` : date et lieu de l'activité (optionnels) — repris sur le cadre du tirage souvenir et dans les listes de chasses.
- `games.admin_id` : reçoit `auth.uid()` (Supabase Auth) — l'admin propriétaire, vérifié par les RLS. ⚠️ Les chasses d'avant juin 2026 portent un identifiant client non-UUID (voir `migration-legacy-admin.sql`).
- `teams.start_clue_id` : indice de départ imposé (dispersion). `null` = pas de verrou.
- `teams.photo_url` : photo d'équipe optionnelle (selfie à l'inscription).
- `teams.print_submission_id` : photo choisie par l'équipe pour le tirage souvenir (`null` = pas de choix). Pas de FK : valeur pendante ignorée côté client.
- `submissions.bonus_points` : points de **vote du jury** (50/30/10).
- `submissions.id` = **nom du fichier** dans le Storage (`{game_code}/{id}.jpg`) — ne jamais dissocier.
- `submissions.lat/lng` : colonnes héritées du prototype GPS, plus renseignées.
- Toutes les FK ont `on delete cascade`.
- **Storage** : bucket public `photos`, `{game_code}/{id}.jpg` (preuves), `{game_code}/team_{id}.jpg` (photos d'équipe).

### Machine à états (`games.status`)

```
setup → active → validation → judging → ended
```

| Statut | Phase | Qui agit |
|---|---|---|
| `setup` | Lobby : indices, équipes, indices de départ, **QR d'accès** | Admin |
| `active` | Les équipes capturent et envoient leurs preuves photo | Équipes |
| `validation` | Marquer chaque photo **conforme / refusée** (→ points d'indice) | Admin |
| `judging` | **Vote du jury** : 50/30/10 par indice (toutes photos) | Jury/Admin |
| `ended` | Classement final + galerie + **choix du tirage souvenir** | Équipes (choix) / Admin (récupération) |

> `active → validation` est calculé à la fin du temps imparti, mais **persisté uniquement par l'admin** (les équipes le calculent en local).

### Routeur `render()`

SPA mono-fichier sans framework. `render()` lit `STATE` et choisit l'écran : configuration Supabase, sélection de rôle, **login admin (code email)**, puis côté **admin** (setup → lobby → live → validation → vote jury → fin) et côté **équipe** (join → lobby → active/capture → attente → fin). Deep-links : **diaporama public** `?diapo=CODE`, **accès joueur** `?join=CODE` (inscription pré-remplie).

### Identité & temps réel

- `localStorage.me` = `{ role, id, gameCode }`, par appareil. Seul pointeur reliant l'appareil à une partie.
- **Admin** : authentifié par **Supabase Auth** (code OTP email) ; `me.id` = `auth.uid()`, vérifié par les RLS (`games.admin_id`). Les **équipes** restent anonymes (clé `anon`).
- Abonnement Realtime (websockets) sur `games`, `teams`, `submissions` filtré par `game_code`, + poll de sécurité (~15 s).

---

## Fonctionnalités clés

### Indices de départ (dispersion)
Dans le **lobby**, l'admin assigne un **indice de départ distinct par équipe** (menu + « Répartir auto »). Chaque équipe ne voit **que son indice de départ** ; dès qu'elle l'a **réalisé (photo envoyée)**, les autres se débloquent. Optionnel (`teams.start_clue_id`, « — Aucun — »).

### Accès joueurs par QR code (deep-link)
Écran maître du jeu (lobby + live) : bouton « 📱 QR code d'accès » → overlay avec un QR encodant `…/expedition.html?join=CODE`. Au scan, le joueur arrive **directement sur l'inscription équipe, code pré-rempli**. Lib `qrcode-generator` (CDN, cachée par le SW).

### Géoloc des indices + carte d'orientation (Leaflet)
Chaque indice porte des coords **optionnelles**. Admin : « 📍 Placer sur la carte » / « 🎯 Ma position » dans l'éditeur d'indices. Équipe : bouton « 🗺️ Carte » (si ≥1 indice localisé) → tous les indices localisés en repères **anonymes** sauf le **départ** (★) et les indices **réalisés** (✓), + position live. ⚠️ Anonymisation **cosmétique** (client) : le payload `clues` transite via la clé `anon` (voir Sécurité).

### Vote du jury (50 / 30 / 10)
En `judging`, photos groupées par indice ; le jury attribue **🥇50 / 🥈30 / 🥉10** (3 max/indice, refusées incluses). Un seul de chaque rang par indice. Stocké dans `submissions.bonus_points`.

### Calcul du score
```
score équipe = Σ points d'indice (photos CONFORMES uniquement)
             + Σ points de vote (TOUTES les photos, refusées incluses)
```

### Zoom sur les photos
Le modal photo (vote / validation / galerie) est zoomable : **pincer**, **molette**, **double-clic** (1×↔2,5×), **glisser**, boutons +/−/⟲ (`initPhotoZoom`, Pointer Events, 1–6×).

### Photo d'équipe
Selfie **optionnel** à l'inscription (`capture="user"`), uploadé dans `{game_code}/team_{id}.jpg`, affiché en pastille au lobby et au classement. N'empêche jamais l'inscription si l'upload échoue.

### Reconnexion sans doublon
« Se déconnecter » ne supprime plus l'équipe une fois la chasse démarrée (détachement de l'appareil, preuves conservées). Reconnexion par **choix dans la liste** des équipes ; `joinGame` bloque un nom déjà pris.

### PWA offline (service worker + outbox)
`sw.js` : navigation HTML **network-first** (hotfix en ligne toujours servi ; hors-ligne → dernière version cachée), CDN/Leaflet + polices **cache-first**, tuiles OSM en cache runtime, **appels Supabase toujours réseau**. Une photo prise hors-ligne est mise en **file IndexedDB** (`enqueueSubmission`), survit rechargement/fermeture, et est **ré-émise automatiquement** au retour du réseau (`flushOutbox`, insert idempotent). ⚠️ Limite iOS : pas de Background Sync → flush appli ouverte/réouverte. ⚠️ Bumper `CACHE` de `sw.js` à chaque changement d'app-shell.

### Compression des photos
`compressImage(file, {max, q})` — plus grand côté ramené à **1600 px**, JPEG **0,82**, rééchantillonnage `high`, jamais d'agrandissement ; si la dataURL dépasse ~3 Mo, la **qualité** baisse par paliers (plancher 0,45) et non la définition. Photo d'équipe : `{max:800, q:0.8}` (simple pastille). Compromis : ~350–450 Ko par preuve (≈2× l'ancien plafond de 1000 px) contre un tirage net en 10×15 cm (~300 dpi) et 13×18 (~225 dpi).

### Tirage souvenir encadré
Écran de fin **équipe** : l'équipe choisit **une** photo parmi les siennes (`teams.print_submission_id`). Écran de fin **admin** : liste des choix, choix de secours pour une équipe absente, aperçu, téléchargement à l'unité ou en ZIP `{CODE}_tirages.zip`. Le cadre (parchemin, double filet, lockup logo « rose des vents + EXPÉDITION », nom d'équipe, nom de la chasse + lieu, date) est composé **en canvas** (`buildPrintCanvas`) — la photo passe par `fetch → blob → objectURL` pour ne pas souiller le canvas. **Sortie au format fixe 10×15 cm** (1200×1800 portrait / 1800×1200 paysage, ~300 dpi) selon l'orientation de la photo : le labo imprime plein format, sans recadrage ; la photo est posée entière (jamais rognée), le parchemin absorbe l'écart de ratio. Migration : `migration-print-choice.sql`.

### Export ZIP des photos
Écrans **Jury** et **Fin** : télécharge **toutes les photos** d'une partie (filtrable par statut) en `{CODE}_photos.zip`, organisé `Équipe/HHhMM_statut_indice_id.jpg` (JSZip, pool de 8 requêtes).

### Dupliquer une chasse passée
Voie principale : **liste de toutes mes chasses** (`loadGamesForDuplicate`, tout statut, tri par date) → sélection → « Dupliquer cette chasse ». Repli replié : **par code** (`duplicateByCode`), seul moyen de dupliquer la chasse d'un autre compte. Les deux passent par `duplicateFromCode` : indices (nouveaux `id`) + réglages (dont `location`) copiés dans le formulaire → **nouvelle session vierge**. La source n'est jamais modifiée.

### Supprimer une chasse
Corbeille 🗑 sur chaque ligne de la liste, et bouton sur l'écran de fin. Double confirmation, puis **deux étapes dans cet ordre** : (1) `purgeGamePhotos` retire les fichiers par l'**API Storage** — Supabase interdit tout `DELETE` SQL sur `storage.objects` ; (2) RPC `admin_purge_game` supprime les lignes (cascade). ⚠️ Jamais l'inverse : le bucket n'étant pas listable, les chemins ne se reconstruisent que depuis `submissions.id` / `teams.id`.

---

## Fonctions clés à connaître

| Fonction | Rôle |
|---|---|
| `render` | Routeur principal, idempotent |
| `currentUser` / `pickRole('admin')` | Session Supabase Auth (admin OTP email) |
| `loadGame` / `saveGame` | Lire / écrire la partie (+ équipes) |
| `loadSubmissions` / `saveSubmission` | Lire / écrire les preuves (`idempotentInsert` côté équipe) |
| `uploadPhoto` | Blob → Storage bucket `photos` → URL publique (`upsert:false`) |
| `enqueueSubmission` / `flushOutbox` | File d'envoi photo offline (IndexedDB) + flush idempotent |
| `submitClue` | Capture → outbox → envoi (réactive le bouton si échec) |
| `addTeam` / `removeTeam` | INSERT / DELETE équipe (reconnexion sans doublon) |
| `setTeamStartClue` / `autoAssignStartClues` | Indices de départ |
| `validateSubmission` / `resetValidation` | Conforme / refusée (points d'indice) |
| `setVote` | Vote jury 50/30/10, unicité par indice |
| `openClueMapPicker` / `openTeamMap` | Carte Leaflet (admin place / équipe s'oriente) |
| `showQR` / `closeQR` | QR d'accès joueurs (deep-link `?join=CODE`) |
| `openPhoto` / `initPhotoZoom` | Modal photo + zoom/pan |
| `openExportZip` / `runExportZip` | Export ZIP des photos |
| `compressImage` | Redimension + JPEG avant envoi (`{max, q}`) |
| `setTeamPrintChoice` / `choosePrintPhoto` | Choix de la photo souvenir (équipe) |
| `buildPrintCanvas` / `downloadPrint` / `downloadAllPrints` | Composition du cadre et récupération des tirages |
| `loadGamesForDuplicate` / `duplicateFromCode` | Liste de mes chasses + duplication |
| `purgeGamePhotos` + `purgeCurrentGame` / `admin_purge_game` | Effacement RGPD in-app : fichiers par l'API Storage **puis** lignes (RPC SECURITY DEFINER) |
| `renderLeaderboard` | Classement (points d'indice + vote) |

---

## Sécurité

Historiquement « sans auth, RLS permissives ». **Durci** depuis (Lots 1–2) :

- **Auth admin par code OTP email** (Supabase Auth) : l'admin est identifié par `auth.uid()` (stable, lié à l'email), écrit dans `games.admin_id`. Fin de l'usurpation admin.
- **RLS scopées** : `games` (INSERT/UPDATE/DELETE) et `submissions` (UPDATE) réservés à l'**admin propriétaire authentifié**. Lecture publique conservée.
- **Bucket `photos` verrouillé** : suppression des policies SELECT (listing) et DELETE publiques ; upload conservé (joueurs anonymes).

**Dette restante (avant usage grand public / commercial)** :

- La **clé `anon` publique** est en clair (dépôt public) : un tiers peut scrapper les codes et rejoindre. Les écritures `teams`/`submissions` sont **encore ouvertes** → **Lot Edge Functions** (gate `service_role`).
- **Anonymisation carte + secret des indices = côté client uniquement** : `games.clues` (titres, textes, GPS) est en lecture publique via `anon` → contournable par lecture réseau. Correctif = Lot Edge Functions (renvoyer à chaque équipe seulement ses indices autorisés).
- **Règle d'écriture équipe** : **INSERT seul, jamais `upsert`** (RLS UPDATE réservée à l'admin, bucket sans policy UPDATE) — sinon le moindre retry se bloque en `42501`. Le chemin équipe est **idempotent** (insert `23505` et upload `409` traités comme succès).

---

## RGPD

- **Consentement obligatoire** à l'inscription (case à cocher bloquante + lien vers `confidentialite.html`).
- **Politique de confidentialité** (`confidentialite.html`) : modèle FR complet. ⚠️ Champs « À COMPLÉTER » (identité + email de l'organisateur) avant usage commercial.
- **Conservation + effacement** : fonctions `purge_expired_games` / `purge_game` (SECURITY DEFINER) + job **pg_cron** quotidien → suppression auto **90 j** après création. Effacement in-app par l'admin via RPC `admin_purge_game(code)` (bouton sur l'écran Fin) **précédé** de `purgeGamePhotos` côté client.
- ⚠️ **Ouvert** : depuis la restriction Supabase sur `storage.objects`, le cron **n'efface plus les fichiers**, seulement les lignes. Les photos restent dans le bucket. Correctif prévu : Edge Function `service_role`. En attendant, purger les vieilles chasses **depuis l'app** avant l'échéance des 90 jours.

---

## Fiabilité

- **Keep-alive** (`.github/workflows/keepalive.yml`) : ping REST tous les 3 j → évite la pause du projet Supabase (tier gratuit). ⚠️ GitHub désactive les crons après 60 j sans commit.
- **Capture d'erreurs client** (`reportError` + handlers globaux) : toast discret côté admin, hook **Sentry** optionnel (`localStorage.sentry_dsn`).
- **Envoi photo robuste** : retry + rollback d'orphelin, idempotence, outbox offline (voir `CLAUDE.md` #4, #23, #26).

---

## Limitations connues

1. **Écritures `teams`/`submissions` ouvertes** (clé `anon`) → Lot Edge Functions à venir.
2. **Secret des indices côté client seulement** (payload `clues` public).
3. **Plus de GPS sur les preuves** : la preuve est la photo seule.
4. **iOS** : pas de Background Sync → flush outbox appli ouverte/réouverte uniquement.
5. **Pas de tests automatisés** ; compression photo destructive (1600 px, JPEG 0,82, plafond ~3 Mo de dataURL).
6. **Stockage** : ~350–450 Ko par preuve depuis le passage à 1600 px, tier gratuit plafonné à **1 Go**, et la purge automatique n'efface plus les fichiers → vider les vieilles chasses après chaque événement.
7. **Tirage souvenir** : composé côté client (canvas), sortie fixe 10×15 à ~300 dpi — la qualité plafonne à ce que vaut la photo envoyée (1600 px).

---

## Roadmap

- **Lot Edge Functions** (`service_role`) : verrouiller les écritures `teams`/`submissions`, servir à chaque équipe seulement ses indices autorisés (ferme la fuite des textes/GPS d'indices), et **purger les fichiers du Storage** à l'échéance des 90 j (le cron ne sait plus le faire).
- **Supabase Pro** : plus de pause, backups quotidiens (remplace le keep-alive).
- **App native** (Expo/React Native) : le schéma et la logique ne changent pas.
- Notifications push quand le jury vote ; replay animé ; etc.

---

## Commandes utiles

```bash
# Serveur local (HTTPS recommandé pour la caméra)
python3 -m http.server 8000
# puis http://localhost:8000/expedition.html
```

```sql
-- Effacer les LIGNES d'une chasse (cascade → teams + submissions)
-- ⚠️ Les fichiers du bucket ne sont PAS supprimés (restriction storage.objects) :
--    préférer la corbeille de l'app, qui purge d'abord les photos par l'API Storage.
select public.purge_game('XXXX');
```

---

## Historique des évolutions

Le **journal détaillé et numéroté** des correctifs (D4CK live, export ZIP, sécurité Lots 1–2, RGPD, géoloc/carte, PWA app-shell + outbox, reconnexion, branding, envoi idempotent, zoom, QR d'accès, `.nojekyll`, lieu de chasse + duplication par liste, purge Storage, **tirage souvenir** et **photos 1600 px**) est maintenu dans [`CLAUDE.md`](CLAUDE.md) — section « Journal des correctifs ».
