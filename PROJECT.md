# Expédition · Chasse au trésor photo

Application web mobile (**PWA installable, capable hors-ligne**) pour une chasse au trésor multi-équipes. Les équipes résolvent des indices, prouvent chaque trouvaille par une **photo**, l'admin **valide** la conformité, puis un **jury vote** les meilleures photos. Synchronisation temps réel entre tous les téléphones.

> Mono-fichier, sans build. Dépôt : `github.com/MikRob-glitch/Expedition`. Déploiement : GitHub Pages → `https://mikrob-glitch.github.io/Expedition/expedition.html`.
> Le **journal des correctifs détaillé** (chronologique, numéroté) est dans [`CLAUDE.md`](CLAUDE.md).

---

## Stack

| Couche | Choix | Pourquoi |
|---|---|---|
| Frontend | HTML5 + Vanilla JS, fichier unique (~3750 lignes) | Zéro build, démarrage instantané, debug trivial |
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
expedition.html            ← app complète, single-file SPA (~3750 lignes)
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
migration-venue-logo.sql   ← games.logo_url (logo du lieu sur le tirage)
migration-storage-delete-fix.sql ← policy DELETE du bucket : `name` mal résolu (obligatoire)
.github/workflows/keepalive.yml ← ping Supabase (anti-pause tier gratuit)
.nojekyll                  ← désactive Jekyll sur GitHub Pages
commercial/                ← supports de vente de la prestation (hors app)
  plaquette.css            ←   feuille de style commune aux deux livrets
  livret-campings.html     ←   source — campings, villages de vacances, parcs
  livret-entreprises.html  ←   source — séminaires, incentive, CSE
  verif-pages.py           ←   contrôle anti-débordement, à lancer après chaque rendu
  Expedition_livret_campings.pdf    ←  6 pages A4, à envoyer aux hébergeurs
  Expedition_livret_entreprises.pdf ←  6 pages A4, à envoyer aux entreprises
README.md                  ← présentation + démarrage rapide
PROJECT.md                 ← ce fichier
ANALYSE_CONCURRENCE.md     ← paysage concurrentiel + positionnement retenu
CLAUDE.md                  ← guide de travail + journal des correctifs
```

> `commercial/` ne fait pas partie de l'application : aucun fichier n'y est servi par Pages,
> et une modification n'entraîne **ni bump de `BUILD` ni bump de `CACHE`**.
>
> **Deux livrets, une cible chacun** — le camping ne doit pas lire « séminaire », ni voir le
> tarif entreprise. Chacun n'affiche que **sa** grille : campings 390 / 690 / 1 190 € HT
> (30 / 50 / 100 participants), entreprises 690 / 990 / 1 690 € HT (20 / 30 / 60). ⚠️ Rien ne
> synchronise les deux fichiers : une révision de prix se répercute **à la main dans les deux**.
>
> ⚠️ **Les plafonds de participants viennent d'une contrainte produit, pas commerciale** :
> la validation photo par photo et le vote 50/30/10 sont manuels et faits par une seule
> personne sur un seul écran. Au-delà de ~10 équipes, l'arbitrage annoncé (15 min) devient
> intenable. Ne pas les remonter pour « faire un meilleur prix » sans avoir d'abord réglé
> le goulot d'arbitrage. Détail du calcul : #47 dans [`CLAUDE.md`](CLAUDE.md).
>
> Regénération : `weasyprint commercial/livret-campings.html commercial/Expedition_livret_campings.pdf`
> (idem pour `entreprises`), **puis `python3 commercial/verif-pages.py commercial/*.pdf`**.
> ⚠️ Le CSS est calibré pour WeasyPrint, dont le support flex est partiel (`flex-wrap` ignoré,
> `margin-top:auto` inopérant) : les grilles sont en `inline-block` / `display:table` / `float`,
> **à ne pas repasser en flexbox**. Les pages sont en `overflow:hidden`, donc un débordement est
> **masqué** et non paginé : le PDF reste valide à 6 pages pendant qu'un bloc recouvre le pied de
> page. D'où le script de contrôle, qui sort en code 1 dans ce cas. Détail et marges page par
> page : #47 dans [`CLAUDE.md`](CLAUDE.md).

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
games        (code PK, name, hunt_date, location, logo_url, status, duration_minutes,
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
- `games.logo_url` : logo du lieu (optionnel), fichier `{code}/logo.png` du bucket `photos`, affiché à droite du cartouche du tirage. Recopié sous le nouveau code lors d'une duplication.
- `games.admin_id` : reçoit `auth.uid()` (Supabase Auth) — l'admin propriétaire, vérifié par les RLS. ⚠️ Les chasses d'avant juin 2026 portent un identifiant client non-UUID (voir `migration-legacy-admin.sql`).
- `teams.start_clue_id` : indice de départ imposé (dispersion). `null` = pas de verrou.
- `teams.photo_url` : photo d'équipe optionnelle (selfie à l'inscription).
- `teams.print_submission_id` : photo choisie par l'équipe pour le tirage souvenir (`null` = pas de choix). Pas de FK : valeur pendante ignorée côté client.
- `submissions.bonus_points` : points de **vote du jury** (50/30/10).
- `submissions.id` = **nom du fichier** dans le Storage (`{game_code}/{id}.jpg`) — ne jamais dissocier.
- `submissions.lat/lng` : colonnes héritées du prototype GPS, plus renseignées.
- Toutes les FK ont `on delete cascade`.
- **`games.is_template`** — chasse type (modèle) : ligne vierge jamais jouée, exclue des pickers de jeu **et** de la purge 90 j. Voir « Tiroir de chasses types ».
- **Storage** : bucket public `photos`, `{game_code}/{id}.jpg` (preuves), `{game_code}/team_{id}.jpg` (photos d'équipe), `{game_code}/logo.png` (logo du lieu).

### Machine à états (`games.status`)

```
setup → active → validation → judging → ended
```

| Statut | Phase | Qui agit |
|---|---|---|
| `setup` | Lobby : indices, équipes, indices de départ, **QR d'accès**. Quittable par « ← Menu » **sans rien supprimer** | Admin |
| `active` | Les équipes capturent et envoient leurs preuves photo | Équipes |
| `validation` | Marquer chaque photo **conforme / refusée** (→ points d'indice) | Admin |
| `judging` | **Vote du jury** : 50/30/10 par indice (toutes photos) | Jury/Admin |
| `ended` | Classement final + galerie + **choix du tirage souvenir** | Équipes (choix) / Admin (récupération) |

> `active → validation` est calculé à la fin du temps imparti, mais **persisté uniquement par l'admin** (les équipes le calculent en local).

**Retours en arrière** (le maître du jeu n'est jamais coincé) :

- `judging → validation` : bouton « ← Validation » (`backToValidation`).
- `validation → active` : bouton « ↩︎ Reprendre la chasse » (`resumeHunt`) — remet `ended_at` à `null` et **décale `started_at`** pour restituer exactement le temps qui restait ; si le chrono était épuisé, un prompt demande les minutes à ajouter (défaut 15) et la durée n'est allongée que si l'ajout dépasse la durée initiale. ⚠️ Sans ce décalage, le contrôle de chrono en tête de `render()` rebasculerait aussitôt en `validation`. Les équipes repassent de l'écran d'attente à l'écran de jeu par realtime.
- `setup → menu de préparation` : bouton « ← Menu » (`backToSetup`) — **détache seulement l'appareil** (`me.gameCode = null`, realtime coupé, brouillons remis à zéro) ; la chasse reste en `setup` et se retrouve dans « Reprendre une session ». Avant, sortir du lobby imposait « Annuler » (= suppression) ou `logout()`. Le bouton de suppression est désormais libellé « Supprimer 🗑 ». Voir `CLAUDE.md` #52.
- `validation → ended` **sans aucune photo** : le bouton principal devient « Clôturer la chasse → » (`finalizeGame`, saut direct par-dessus `judging`) au lieu d'être grisé. Sans lui, une chasse terminée à vide était un cul-de-sac : ni jury, ni fin, donc **ni corbeille RGPD** (le bouton de purge vit sur l'écran de fin). Voir `CLAUDE.md` #51.

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

### Tiroir de chasses types
Un scénario prêt à rejouer se range au tiroir : étoile ☆ dans la liste des chasses, ou « ☆ Enregistrer comme chasse type » depuis le lobby. Le tiroir vit sur l'écran de préparation ; « Utiliser cette chasse type → » remplit le formulaire de création (indices, durées, lieu, logo) sans consommer le modèle.

Une chasse type est une ligne `games` avec `is_template=true` : **copie vierge**, aucune équipe, aucune preuve, jamais lancée. Elle est exclue des pickers de reprise et de duplication, et `resumeByCode` refuse son code.

⚠️ **Pourquoi une copie et non un drapeau sur une chasse jouée** : les modèles échappent à la rétention 90 j. Marquer une chasse déjà jouée immobiliserait hors purge les photos et les noms de ses participants. `saveAsTemplate` crée donc toujours une copie neuve ; la source reste soumise à la rétention. Migration : `migration-templates.sql`.

⚠️ **Un modèle ne s'édite pas en place** : utilisez-le, ajustez le formulaire, créez la chasse, rangez la nouvelle version et retirez l'ancienne.

### Préparer plusieurs chasses à l'avance
Une chasse créée est **enregistrée immédiatement** (statut `setup`). Depuis le lobby, « ← Menu » ramène à l'écran de préparation pour en créer une autre ; le picker « Reprendre une session » (`loadSessionsForPicker` : `status='setup'` + `admin_id`) liste les chasses en attente et reprend directement au lobby. Aucune donnée n'est écrite ni effacée au passage.

### QR code : accès joueurs et diaporama
Un seul overlay (`#qr-overlay`), deux modes portés par la table `QR_MODES` et sélectionnés par `showQR(mode)` — chaque mode fournit son titre, son texte d'aide et sa fonction d'URL :

| Mode | Où | URL encodée | Usage |
|---|---|---|---|
| `join` (défaut) | lobby + live | `?join=CODE` | le joueur arrive **sur l'inscription équipe, code pré-rempli** |
| `diapo` | écran de fin | `?diapo=CODE` | à la remise des prix, chacun scanne pour **emporter le diaporama** |

Lib `qrcode-generator` (CDN, cachée par le SW) ; repli affichant l'URL en clair si elle n'a pas pu être chargée.

> Le mode `diapo` remplace l'idée d'envoyer le lien par mail : **une adresse mail serait une donnée personnelle de plus**, non couverte par le consentement ni par `confidentialite.html`. Le lien `?diapo=` étant public depuis l'origine, le QR ne fait que le rendre distribuable sur place.
> ⚠️ Le mode `diapo` n'a de sens qu'en statut `ended` : le diaporama ne montre que les photos **validées**. D'où le bouton placé sur l'écran de fin uniquement.
> ⚠️ Lien **public et non signé** : qui a le code voit les photos (déjà vrai avant, via « Copier le lien »).

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
Selfie **optionnel** à l'inscription (`capture="user"`), uploadé dans `{game_code}/team_{id}.jpg`. N'empêche jamais l'inscription si l'upload échoue. C'est souvent la **seule photo où l'équipe est au complet** : elle est donc traitée comme une **photo à part entière**, pas comme un simple avatar.

- **Pastille** au lobby, au classement et **en en-tête d'équipe** sur les écrans du maître du jeu (suivi live, cartes de validation/vote, liste des tirages) — cliquable (`teamAvaLink`) pour l'ouvrir en grand et zoomer.
- **Preuve virtuelle** : `teamPhotoSub(team)` fabrique un objet de la forme d'une submission, d'id sentinelle **`team:<teamId>`** ; `findAnySub(id)` résout indifféremment une preuve réelle ou cette photo, `teamPhotos(teamId)` liste les photos d'une équipe **selfie en tête**. **Aucune migration** : rien n'est écrit en base, l'objet est reconstruit à chaque rendu depuis `teams.photo_url`.
- **Score intact** : cette photo n'entre jamais dans `STATE.submissions`, seule source du calcul des points.
- Proposée **en premier** dans le choix du tirage souvenir (badge « ÉQUIPE ») et jointe en tête du dossier de l'équipe dans l'export ZIP.

⚠️ L'envoi se fait en **`upload(upsert:false)`** : le bucket n'a pas de policy UPDATE, un `upsert` part en refus RLS silencieux. C'est ce qui a empêché toute photo d'équipe d'être stockée entre le 2026-06-30 et le 2026-07-28 (`CLAUDE.md` #50).

⚠️ L'id sentinelle est stocké tel quel dans `teams.print_submission_id` — possible parce que la colonne est du `text` **sans FK**. Pas de collision possible avec un id de submission (`uid()` = 7 caractères `[a-z0-9]`, sans `:`).

### Brouillon d'inscription
`render()` est **asynchrone** et réécrit tout l'écran ; il peut se déclencher à tout moment (realtime, poll 15 s, prise de la photo d'équipe). Les champs de `screenTeamJoin` sont donc **réémis depuis `STATE`**, tenu à jour à chaque frappe par `syncJoinDraft()` (`oninput`/`onchange`), et doublés en `sessionStorage` (`join_draft`) au cas où l'ouverture de l'appareil photo ferait recharger la page. `clearJoinDraft()` à l'inscription, à la reconnexion et au `logout`. ⚠️ La photo n'est **pas** mise en `sessionStorage` (dataURL ~350 Ko, quota trop juste) : un rechargement pendant la capture perd la photo, jamais le nom. Corrige le bug où prendre la photo effaçait le nom d'équipe (voir `CLAUDE.md` #49).

### Reconnexion sans doublon
« Se déconnecter » ne supprime plus l'équipe une fois la chasse démarrée (détachement de l'appareil, preuves conservées). Reconnexion par **choix dans la liste** des équipes ; `joinGame` bloque un nom déjà pris.

### PWA offline (service worker + outbox)
`sw.js` : navigation HTML **network-first** (hotfix en ligne toujours servi ; hors-ligne → dernière version cachée), CDN/Leaflet + polices **cache-first**, tuiles OSM en cache runtime, **appels Supabase toujours réseau**. Une photo prise hors-ligne est mise en **file IndexedDB** (`enqueueSubmission`), survit rechargement/fermeture, et est **ré-émise automatiquement** au retour du réseau (`flushOutbox`, insert idempotent). ⚠️ Limite iOS : pas de Background Sync → flush appli ouverte/réouverte. ⚠️ Bumper `CACHE` de `sw.js` à chaque changement d'app-shell.

### Compression des photos
`compressImage(file, {max, q})` — plus grand côté ramené à **1600 px**, JPEG **0,82**, rééchantillonnage `high`, jamais d'agrandissement ; si la dataURL dépasse ~3 Mo, la **qualité** baisse par paliers (plancher 0,45) et non la définition. La photo d'équipe suit le **même régime** depuis qu'elle est imprimable (~350 Ko par équipe, contre ~80 Ko en 800 px auparavant). ⚠️ Les photos d'équipe **enregistrées avant** ce changement restent en 800 px : imprimables en 10×15 à ~200 dpi, correct mais en deçà des preuves. Compromis : ~350–450 Ko par preuve (≈2× l'ancien plafond de 1000 px) contre un tirage net en 10×15 cm (~300 dpi) et 13×18 (~225 dpi).

### Tirage souvenir encadré
Écran de fin **équipe** : l'équipe choisit **une** photo parmi les siennes (`teams.print_submission_id`) — sa **photo d'équipe est proposée en première vignette** —, avec une **loupe sur chaque vignette** pour l'ouvrir en grand et zoomer (pincer / molette / double-clic) avant de trancher. Écran de fin **admin** : liste des choix, choix de secours pour une équipe absente, aperçu, téléchargement à l'unité ou en ZIP `{CODE}_tirages.zip`. Le cadre (parchemin, double filet, lockup logo « rose des vents + EXPÉDITION », puis **une ligne par information** — équipe, chasse, lieu, date — et le **logo du lieu** à droite s'il a été joint à la chasse) est composé **en canvas** (`buildPrintCanvas`) — la photo passe par `fetch → blob → objectURL` pour ne pas souiller le canvas. **Sortie au format fixe 10×15 cm** (1200×1800 portrait / 1800×1200 paysage, ~300 dpi) selon l'orientation de la photo : le labo imprime plein format, sans recadrage ; la photo est posée entière (jamais rognée), le parchemin absorbe l'écart de ratio. Migration : `migration-print-choice.sql`.

### Export ZIP des photos
Écrans **Jury** et **Fin** : télécharge **toutes les photos** d'une partie (filtrable par statut) en `{CODE}_photos.zip`, organisé `Équipe/HHhMM_statut_indice_id.jpg` (JSZip, pool de 8 requêtes). La **photo d'équipe** n'a pas de statut : elle échappe aux filtres et ouvre le dossier de son équipe sous `00_photo-equipe.jpg` (le préfixe la garde en tête au tri).

### Dupliquer une chasse passée
Voie principale : **liste de toutes mes chasses** (`loadGamesForDuplicate`, tout statut, tri par date) → sélection → « Dupliquer cette chasse ». Repli replié : **par code** (`duplicateByCode`), seul moyen de dupliquer la chasse d'un autre compte. Les deux passent par `duplicateFromCode` : indices (nouveaux `id`) + réglages (dont `location`) copiés dans le formulaire → **nouvelle session vierge**. La source n'est jamais modifiée.

### Supprimer une chasse
Corbeille 🗑 sur chaque ligne de la liste, et bouton sur l'écran de fin. Double confirmation, puis **deux étapes dans cet ordre** : (1) `purgeGamePhotos` retire les fichiers par l'**API Storage** — Supabase interdit tout `DELETE` SQL sur `storage.objects` ; (2) RPC `admin_purge_game` supprime les lignes (cascade). ⚠️ Jamais l'inverse : le bucket n'étant pas listable, les chemins ne se reconstruisent que depuis `submissions.id` / `teams.id`.

⚠️ **L'étape (1) n'a réellement fonctionné qu'à partir du 2026-07-28** : la policy `photos_delete_owner` résolvait `name` sur `games` au lieu de `storage.objects` et n'autorisait donc rien (`CLAUDE.md` #50, `migration-storage-delete-fix.sql`). Les **89 fichiers déjà orphelins** (~15 Mo, 16 chasses supprimées avant le correctif) ne sont plus atteignables par l'app : à retirer une fois à la main depuis le dashboard Supabase (Storage → `photos`).

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
| `endGameNow` / `resumeHunt` | Terminer la chasse / **revenir en arrière** (validation → active, chrono restitué) |
| `goToJudging` / `backToValidation` / `finalizeGame` | Transitions de phase (clôture directe possible si aucune photo) |
| `setVote` | Vote jury 50/30/10, unicité par indice |
| `openClueMapPicker` / `openTeamMap` | Carte Leaflet (admin place / équipe s'oriente) |
| `showQR` / `closeQR` | QR d'accès joueurs (deep-link `?join=CODE`) |
| `openPhoto` / `initPhotoZoom` | Modal photo + zoom/pan (accepte l'id sentinelle `team:<id>`) |
| `teamPhotoSub` / `findAnySub` / `teamPhotos` | Photo d'équipe traitée comme une preuve virtuelle |
| `teamAva` / `teamAvaLink` | Pastille d'équipe, inerte ou cliquable (ouvre la photo en grand) |
| `syncJoinDraft` / `clearJoinDraft` | Brouillon d'inscription : champs ↔ `STATE` ↔ `sessionStorage` |
| `openPrintZoom` / `backToPrintPicker` | Voir une photo en grand avant de choisir le tirage |
| `openExportZip` / `runExportZip` | Export ZIP des photos |
| `compressImage` | Redimension + JPEG avant envoi (`{max, q}`) |
| `compressLogo` / `persistGameLogo` | Logo du lieu : PNG 600 px (alpha conservé) + envoi au bucket |
| `setTeamPrintChoice` / `choosePrintPhoto` | Choix de la photo souvenir (équipe) |
| `backToSetup` / `loadSessionsForPicker` | Quitter le lobby sans supprimer, puis retrouver la chasse en attente |
| `saveAsTemplate` / `loadTemplates` / `useTemplate` | Tiroir de chasses types (copie vierge réutilisable, hors purge 90 j) |
| `buildPrintCanvas` / `downloadPrint` / `downloadAllPrints` | Composition du cadre et récupération des tirages (admin) |
| `buildProofCanvas` / `openPrintPreview(id,'team')` | Épreuve filigranée 700 px montrée aux équipes (sans téléchargement) |
| `loadGamesForDuplicate` / `duplicateFromCode` | Liste de mes chasses + duplication |
| `purgeGamePhotos` + `purgeCurrentGame` / `admin_purge_game` | Effacement RGPD in-app : fichiers par l'API Storage **puis** lignes (RPC SECURITY DEFINER) |
| `renderLeaderboard` | Classement (points d'indice + vote) |

---

## Sécurité

Historiquement « sans auth, RLS permissives ». **Durci** depuis (Lots 1–2) :

- **Auth admin par code OTP email** (Supabase Auth) : l'admin est identifié par `auth.uid()` (stable, lié à l'email), écrit dans `games.admin_id`. Fin de l'usurpation admin.
- **RLS scopées** : `games` (INSERT/UPDATE/DELETE) et `submissions` (UPDATE) réservés à l'**admin propriétaire authentifié**. Lecture publique conservée.
- **Bucket `photos` verrouillé** : suppression des policies SELECT (listing) et DELETE publiques ; upload conservé (joueurs anonymes). Il reste donc exactement **deux** policies : `INSERT` (public) et `DELETE` (admin propriétaire de la chasse dont le code est le premier segment du chemin). **Aucune policy UPDATE** — d'où l'interdiction absolue d'`upsert` sur ce bucket, pour tout le monde.

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
- **Envoi photo robuste** : retry + rollback d'orphelin, idempotence, outbox offline (voir `CLAUDE.md` #4, #23, #26). Tous les envois vers le bucket sont en `upsert:false` avec 409 traité comme succès — un `upsert` réclamerait le droit UPDATE, absent du bucket, et échouerait en silence (#26, #43, #50).

---

## Limitations connues

1. **Écritures `teams`/`submissions` ouvertes** (clé `anon`) → Lot Edge Functions à venir.
2. **Secret des indices côté client seulement** (payload `clues` public).
3. **89 fichiers orphelins** (~15 Mo) laissés par la policy DELETE cassée jusqu'au 2026-07-28 : à supprimer une fois depuis le dashboard Supabase. Les photos d'équipe d'avant cette date, elles, n'existent nulle part (jamais stockées, voir `CLAUDE.md` #50).
4. **Plus de GPS sur les preuves** : la preuve est la photo seule.
5. **iOS** : pas de Background Sync → flush outbox appli ouverte/réouverte uniquement.
6. **Pas de tests automatisés** ; compression photo destructive (1600 px, JPEG 0,82, plafond ~3 Mo de dataURL).
7. **Stockage** : ~350–450 Ko par preuve depuis le passage à 1600 px, tier gratuit plafonné à **1 Go**, et la purge automatique n'efface plus les fichiers → vider les vieilles chasses après chaque événement.
8. **Tirage souvenir** : composé côté client (canvas), sortie fixe 10×15 à ~300 dpi — la qualité plafonne à ce que vaut la photo envoyée (1600 px).
9. **Reprise d'une chasse terminée** : `resumeHunt` restitue le temps restant mais ne « rejoue » rien — une équipe déjà déconnectée doit se reconnecter par la liste des équipes.

---

## Roadmap

- **Lot Edge Functions** (`service_role`) : verrouiller les écritures `teams`/`submissions`, servir à chaque équipe seulement ses indices autorisés (ferme la fuite des textes/GPS d'indices), **purger les fichiers du Storage** à l'échéance des 90 j (le cron ne sait plus le faire), et — si le tirage devient une vraie source de revenu — passer le bucket en **privé + URLs signées** avec rendu du cadre côté serveur (aujourd'hui les photos brutes sont publiques et l'épreuve filigranée n'est qu'un frein).
- **Supabase Pro** : plus de pause, backups quotidiens (remplace le keep-alive). Devient un
  **pré-requis commercial** dès la première date vendue : une pause du projet le jour J est
  inacceptable face à un client payant.
- **Commercialisation** (voir `commercial/` et #47) : compléter téléphone / SIRET dans les
  deux livrets, souscrire une **RC pro** (annoncée page 4), puis fermer la dette Edge Functions
  avant de démarcher un grand compte.
- **Vote du public — étudié le 2026-07-29, non retenu pour l'instant.** Le maître du jeu reste
  seul jury (comportement actuel, décrit tel quel dans les livrets) ; à revoir après les
  premiers événements réels. Ce qu'il faudrait construire : table `votes` (INSERT ouvert comme
  `teams`/`submissions`), écran de vote côté équipe, bouton « nominée » côté admin pendant la
  validation, agrégation vers `bonus_points`.
  **Pourquoi c'est tentant** : le vote deviendrait **parallèle**, ce qui supprimerait la moitié
  du goulot d'arbitrage et relèverait le plafond de 50 participants (#47).
  **Pourquoi c'est délicat** — trois pièges identifiés, à ne pas redécouvrir :
  1. Interdire de voter pour sa propre équipe ne suffit pas : l'intérêt bascule vers le vote
     **stratégique contre le rival le plus menaçant**, invisible et donc pire qu'un vote pour soi.
  2. L'app fonctionne à **un téléphone par équipe** : « vote des capitaines » et « vote de la
     salle » donnent le **même nombre de bulletins** (un par équipe). Élargir l'électorat
     supposerait un mode spectateur, donc du bourrage d'urnes tant que les écritures ne sont
     pas authentifiées (dette Edge Functions).
  3. Correctif le plus efficace pour un coût minime : **masquer le nom des équipes** pendant le
     vote — on ne vote pas contre un rival qu'on ne peut pas identifier ; garder l'exclusion de
     ses propres photos en filet, chacun reconnaissant les siennes.
  ⚠️ Un vote 100 % public ferait aussi perdre le grand écran et la réaction de la salle, que
  `ANALYSE_CONCURRENCE.md` identifie comme le différenciateur n° 1. Toute évolution doit garder
  le diaporama comme spectacle.
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

Le **journal détaillé et numéroté** des correctifs (D4CK live, export ZIP, sécurité Lots 1–2, RGPD, géoloc/carte, PWA app-shell + outbox, reconnexion, branding, envoi idempotent, zoom, QR d'accès, `.nojekyll`, lieu de chasse + duplication par liste, purge Storage, **tirage souvenir** 10×15, photos 1600 px, logo du lieu, **épreuve filigranée** et **sortie de secours de la phase validation**) est maintenu dans [`CLAUDE.md`](CLAUDE.md) — section « Journal des correctifs ».
