# CLAUDE.md — Expédition · Chasse au Trésor Photo

Guide de référence pour travailler sur l'application. À lire avant toute modification.

> Source de vérité = le dépôt GitHub `MikRob-glitch/Expedition`. Ce fichier décrit l'état
> **réellement poussé sur GitHub** (HEAD = 2026-08-17, lot #69 = commit `ea0362a`, `BUILD`
> `2026-08-17.1`, `CACHE` `expedition-v35`, vérifié par re-clone frais + `diff`). Les écarts
> connus (travail local non poussé) sont signalés ⚠️.
> ⚠️ `ea0362a` est resté **25 min sur `main` sans être publié** (`CACHE` servi encore à `v34`) :
> c'est le commit de doc suivant, `1dd0d36`, qui a débloqué Pages — les deux sont sortis
> ensemble, publication vérifiée sur le contenu servi (`sw.js` → `expedition-v35`) à 17h34 UTC.
> Voir la règle « Deployment cancelled » du § Workflow attendu, complétée du **piège de sonde**
> qui a failli faire conclure à un site mort depuis douze jours.
> ✅ **Le lot #64 (carte live + positions par broadcast) est poussé ET EN LIGNE depuis le
> 2026-08-16** (commit `5bf6636`, un seul commit atomique — les quatre fichiers de code + la
> politique + le banc `tests/test-map.js`). Publication vérifiée sur le contenu réellement
> servi (`regie.html` porte la carte, `confidentialite.html` la mention GPS) **malgré des runs
> Pages en rouge** — voir la règle « Deployment cancelled » du § Workflow attendu.
> ⚠️ **CORRECTION DE DATE (2026-08-16)** : les lots #64 à #68 ont été datés par erreur du
> **6 août** (déduction depuis le dernier commit, sans vérification). Corrigé et **publié**
> (commit `c5a91a8`, vérifié sur le contenu servi) — journal, `BUILD` des deux surfaces ramenés
> à `2026-08-16.1`, politique de confidentialité de la racine redatée.
> ✅ **Copie OVH redéployée et vérifiée le 2026-08-16** : le site vitrine sert « 16 août 2026 ».
> Les deux politiques sont donc à jour, datées juste, et cohérentes avec le code.
> ✅ **Les lots #65 à #68 sont poussés ET EN LIGNE depuis le 2026-08-16** (commit `1568631`,
> un seul commit atomique — `expedition.html`, `regie.html`, `sw.js`, les deux docs et les
> deux bancs). Publication vérifiée sur le contenu réellement servi (`regie.html` porte
> l'overlay de fusion).
> ✅ **Observation utile sur le déploiement** : ce push **unique, laissé tranquille**, s'est
> déployé sans incident — alors que la double poussée du lot #64 avait bloqué Pages pendant
> 45 min. Cela conforte la règle du § Workflow attendu : **un seul push, puis attendre**.
> L'auteur du push n'a rien à y voir (celui-ci venait du PAT, comme les précédents).
> ✅ **`site/confidentialite.html` redéployé par FTP chez OVH le 2026-08-16** et vérifié sur le
> contenu servi : la mention de la position GPS éphémère est en ligne, la phrase « aucune donnée
> de géolocalisation n'est collectée » a disparu des **deux** copies (racine + OVH). Plus
> d'écart RGPD entre ce que fait le code et ce que disent les politiques.
> ✅ **Les lots #56 à #60 et #62 sont poussés depuis le 2026-08-05** (commit `e0fa1b3`,
> un seul commit atomique — `expedition.html`, `regie.html`, `print-frame.js`, `sw.js` —
> conformément à la règle : l'app ne démarre pas sans `print-frame.js` et un `cache.addAll`
> sur un 404 ferait échouer l'installation du service worker).
> ✅ **Docs publiées le 2026-08-05 en versions expurgées** (#63) : `README.md` et `PROJECT.md`
> du dépôt sont à jour du code et **identiques au local** — les tarifs n'y figurent plus, ils
> ne vivent que dans `commercial/` et dans le § #47 du présent fichier. Le `CLAUDE.md` du dépôt
> est une **copie expurgée** de ce fichier : § #47 résumé sans aucun montant, identifiants FTP
> OVH retirés du § #61. L'ancienne grille tarifaire qui traînait dans le CLAUDE.md du dépôt
> est retirée.
> ⚠️ **Règle inchangée : jamais un tarif sur GitHub.** Seule la version locale de ce fichier
> porte la grille et le raisonnement de marge. Toute future poussée de `CLAUDE.md` doit être
> **ré-expurgée** (§ #47 + identifiants FTP) — ne jamais pousser ce fichier tel quel, et
> vérifier par grep (`€` collé à un chiffre, montants de la grille, login FTP) avant push.
> ✅ **État des tests réels — la régie a servi sur un vrai événement** (chasse `LBM7`, Capfun
> Camping de l'Eve, 2026-08-06) : validation des photos **et** vote menés depuis la console,
> 3 équipes / 9 indices / 17 preuves, arbitrage au fil de l'eau. Détail chiffré au § #56.
> ⚠️ **Mais l'événement tournait sur la version du 2026-08-05** : les lots **#64 à #68**
> (carte live, minimap, fusion d'équipes, photos plein cadre, QR) **n'y étaient pas**. Vérifiés
> depuis en vrai navigateur (carte et minimap uniquement), jamais sur un événement.
> ✅ **LOT #69 POUSSÉ le 2026-08-17** (commit `ea0362a`) — zone de sécurité d'impression. Un vrai
> tirage paysage a montré que **le cadre n'arrivait pas sur le papier** : les deux filets
> extérieurs étaient posés à 1,2 et 1,9 mm du bord, donc dans la bande de 2 à 3 mm que toute
> impression sans marge rogne. Insets repassés en millimètres absolus (4,5 et 5,7 mm), marge
> et cartouche recalculés en conséquence, **la photo paysage y perd ~8 % de côté**. Fichiers
> touchés : `print-frame.js`, `expedition.html` + `regie.html` (BUILD), `sw.js` (CACHE v35),
> `site/index.html` + `commercial/plaquette.css` (maquettes), `tests/test-print.js` (nouveau,
> 38 tests). ⚠️ **Le correctif n'a pas encore été confirmé par un tirage réel.**
> ⚠️ Restent non éprouvés : le **débit d'arbitrage** (17 photos, soit un dixième du cas de
> charge du § #47), le **mode rafale**, la **fusion d'équipes**, aucun tirage **PORTRAIT**
> produit avec le cadre de #55/#58, et #54 (QR du diaporama) jamais scanné en conditions
> réelles. #58 vient bien, lui, d'un **vrai tirage paysage** — c'est lui qui a montré que
> #55 (4) était faux.
> ⚠️ **`site/` est EN PRODUCTION mais hors du dépôt GitHub** (#61) : le site vitrine
> <https://www.expedition-selfiesafari.fr> est déployé **par FTP chez OVHcloud**, indépendamment
> de l'application. Il ne contient aucun tarif (règle du § #47) et pourrait donc être publié,
> mais la décision n'est pas prise : le poser à la racine sous le nom `index.html` en ferait la
> page d'accueil de GitHub Pages, alors que l'app y est servie par `expedition.html`.
> ⚠️ `commercial/` et `ANALYSE_CONCURRENCE.md` sont **volontairement hors dépôt** (`.gitignore`) :
> le dépôt est public et servi par Pages, les grilles tarifaires et l'analyse des faiblesses
> n'ont rien à y faire. Ne pas les y remettre.
>
> **À mettre à jour à chaque livraison** : la ligne ci-dessus (commit, BUILD, CACHE), le
> § « État des migrations SQL » si une migration est ajoutée, et une entrée dans le journal.

## Vue d'ensemble

Jeu de chasse au trésor photo en équipe, conçu pour des événements live (team-building,
séminaires, Center Parcs). Les équipes scannent un code, reçoivent des indices, prennent
des photos comme preuves ; un maître du jeu (admin) valide puis fait juger les photos.

- **Repo** : `MikRob-glitch/Expedition`
- **Déploiement** : GitHub Pages → `https://mikrob-glitch.github.io/Expedition/expedition.html`
- **Fichier principal** : `expedition.html` (application joueurs + admin mobile, ~3670 lignes)
- **Console maître du jeu** : `regie.html` (~2055 lignes, voir #56 et #60)
- **Module partagé** : `print-frame.js` (moteur du cadre de tirage, voir #59)

## Stack & conventions

- **Front** : HTML/CSS/JS vanilla, **un fichier par surface** — `expedition.html` (joueurs +
  parcours admin mobile) et `regie.html` (console maître du jeu grand écran) — **plus un module
  partagé**, `print-frame.js`. Pas de framework, pas de TypeScript, pas de build. ES2022+.
  ⚠️ **Une seule chose est mutualisée : le cadre de tirage** (`print-frame.js`, #59), parce que
  c'est la seule pièce assez grosse et assez remaniée pour que deux copies divergent à coup sûr.
  Le reste du socle (`rowToGame`/`rowToSub`, export ZIP, `purgeGamePhotos`, zoom, QR) est encore
  dupliqué : assumé, mais **un changement de schéma se répercute dans les deux fichiers**.
  La règle générale reste : au-delà d'une poignée de lignes, **extraire un module, jamais copier**.
- **Back** : Supabase (Postgres + Realtime + Storage).
  - Projet Supabase : **`rwagwbzztcehvdztkscj`** (« Expedition catching », région eu-north-1).
  - URL + clé `anon` codées en dur dans `SUPABASE_DEFAULTS` (fallback), surchargées si
    présentes en `localStorage` (`sb_url`, `sb_key`).
- **CDN** : `@supabase/supabase-js@2`, `jszip@3.10.1` (export ZIP), polices Google (Fraunces,
  Geist, Geist Mono).
- **Style** : thème « parchemin » (variables CSS `--parchment`, `--oxblood`, `--gold-dark`,
  `--forest`, `--ink`…). Police titres = Fraunces, mono = Geist Mono.

## Modèle de données (Postgres)

- **`games`** — PK `code` (texte, 4 lettres). Champs : `is_template` (booléen, défaut `false` —
  chasse type rangée au tiroir : jamais jouée, exclue des pickers de jeu et de la purge 90 j,
  voir #53), `name`, `status`, `location` (texte,
  optionnel — lieu de la chasse, ex. « Center Parcs »), `logo_url` (texte, optionnel — logo du
  lieu affiché sur le tirage, fichier `{code}/logo.png` dans le bucket, voir #43), `clues` (jsonb :
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
- **Storage** : bucket public `photos`, chemin `{game_code}/{submission_id}.jpg` pour les preuves,
  `{game_code}/team_{team_id}.jpg` pour les photos d'équipe et `{game_code}/logo.png` pour le
  logo du lieu.

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

- **Console maître du jeu (`regie.html`)** : tableau de bord autonome, responsive 1/2/3 colonnes
  (onglets Pilotage / Travail / Outils au téléphone). Chrono et actions de phase, équipes avec
  score live et progression indice par indice, flux de preuves filtrable (statut × équipe ×
  indice) **validable dès l'arrivée des photos**, mode rafale plein écran au clavier, vote
  50/30/10 groupé par indice, classement temps réel, QR d'accès et QR diaporama, export ZIP,
  **tirages souvenir** (aperçu, unité, ZIP, complétion des choix manquants — via
  `print-frame.js`, #59), **tirages à la demande** pour les exemplaires vendus en plus
  (panier, quantités, bon de commande — #60), **carte live** (indices nommés + position de
  chaque équipe reçue par broadcast, raccourci `M` — #64) doublée d'une **minimap permanente**
  dans la colonne Pilotage (#66), **fusion d'équipes en doublon** (bouton `⇄`, toutes phases —
  #65), purge RGPD. Même session d'auth que l'app (même origine).
  Hors périmètre volontaire : édition d'indices, chasses types.
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
  (JSZip, pool de 8 requêtes parallèles). La photo d'équipe échappe aux filtres de statut et
  ouvre le dossier de son équipe sous `00_photo-equipe.jpg` (voir #48).
- **Tiroir de chasses types** : une chasse type est une ligne `games` avec `is_template=true` —
  une **copie vierge** (indices aux `id` neufs, réglages, lieu, logo recopié sous son propre code),
  sans équipe ni preuve, jamais lancée. Section « Tiroir des chasses types » sur l'écran de
  préparation (`loadTemplates` → `#tpl-picker`, `selectTemplate`, `useTemplate` →
  `duplicateFromCode(code,{suffix:false})` — pas de « (copie) » dans le nom, `deleteTemplate`).
  On y range un scénario par l'**étoile ☆** de chaque ligne du picker de duplication ou par le
  bouton « ☆ Enregistrer comme chasse type » du lobby, tous deux branchés sur `saveAsTemplate`.
  ⚠️ **On ne marque jamais une chasse déjà jouée** : les modèles échappant à la rétention 90 j,
  poser le drapeau sur une chasse jouée immobiliserait hors rétention les photos et les noms de
  ses participants. `saveAsTemplate` **crée donc toujours une copie neuve** ; la source n'est pas
  touchée et reste soumise à la purge. ⚠️ `saveGame` **n'écrit pas** `is_template` (colonne absente
  du payload d'upsert, donc jamais mise à jour) : le drapeau ne peut pas être effacé par une
  sauvegarde ordinaire. Les modèles sont exclus de `loadSessionsForPicker` et de
  `loadGamesForDuplicate`, et `resumeByCode`/`loadAndEditGameFromPicker` refusent d'en ouvrir un.
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
  Affichée en pastille (`teamAva`, repli sur l'initiale) dans le lobby admin, le lobby équipe,
  le classement et — depuis #48 — **en en-tête d'équipe** sur les écrans du maître du jeu (suivi
  live, cartes de validation/vote, liste des tirages), cliquable pour l'ouvrir en grand
  (`teamAvaLink`). Depuis #48 elle est aussi une **photo à part entière** : proposée en premier
  dans le choix du tirage souvenir et jointe en tête du dossier de l'équipe dans l'export ZIP.
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
  stocké dans `teams.print_submission_id`). Le tirage est un **produit** (imprimé, offert ou
  vendu par l'organisateur) : côté équipe, l'aperçu est une **épreuve** (`buildProofCanvas` :
  700 px + filigrane « ÉPREUVE ») et **aucun téléchargement** n'est proposé — voir #46.
  Le maître du jeu voit les choix sur `screenAdminEnd`
  (`renderAdminPrintCard`), peut choisir **à la place** d'une équipe absente (`openPrintPicker`),
  prévisualiser (`openPrintPreview`), télécharger un tirage (`downloadPrint`) ou **tous** en ZIP
  `{CODE}_tirages.zip` (`downloadAllPrints`, JSZip, `STORE` — du JPEG ne se recompresse pas).
  Le cadre est composé **en canvas** par `buildPrintCanvas` : fond parchemin + vignette, double
  filet + losanges d'angle, rose des vents vectorielle (mêmes tracés que `icons/favicon.svg`),
  puis cartouche. Depuis #55 : la rose des vents est un **sceau à cheval sur le filet bas de la
  photo** (bord gauche collé au filet, 35 % du diamètre sous lui), « EXPÉDITION » sous elle en
  portrait / à sa droite en paysage, le bloc de texte **équipe / chasse / lieu / date**
  **centré** sur un axe commun (4 lignes en portrait, 2 en paysage) et, à droite, le **logo du
  lieu** s'il a été joint à la chasse (#43). **Format de sortie FIXE
  10×15 cm** : 1200×1800 px en portrait, 1800×1200 en paysage (~300 dpi), selon l'orientation
  de la photo — le labo imprime plein format sans recadrer (#41). La photo est posée **entière**
  (« contain », jamais rognée) dans la fenêtre ; le parchemin absorbe l'écart de ratio, et une
  photo portrait 3:4 (sortie standard de `compressImage`, #40) remplit la fenêtre exactement. ⚠️ La photo est chargée par **fetch → blob → objectURL** : une `<img>` pointant
  directement le Storage (autre origine) **souillerait le canvas** et ferait échouer `toBlob()`.
  ⚠️ Les polices sont préchargées (`ensurePrintFonts`) sinon le canvas dessine en repli système.
- **Zoom avant le choix du tirage** : chaque vignette de la grille de choix (équipe et
  sélecteur admin) porte une pastille 🔍 qui ouvre la photo en grand, zoomable
  (`openPrintZoom` → `initPhotoZoom`), avec un bouton « ✦ Choisir cette photo ». En mode admin
  la visionneuse remplace le contenu du sélecteur : « ← Retour » (`backToPrintPicker`) le
  rouvre, sinon un simple coup d'œil ferait perdre la liste. Un clic sur la vignette elle-même
  sélectionne toujours directement (la loupe fait `stopPropagation`). ⚠️ La loupe est un
  `<span role="button">` : un `<button>` ne peut pas en contenir un autre (même piège que #33).
- **Zoom des photos** : le modal photo (vote / validation / galerie) est zoomable — pincer,
  molette, double-clic (1×↔2,5×), glisser pour déplacer, boutons +/−/⟲ (`initPhotoZoom`,
  Pointer Events, zoom 1–6×). Voir #27.

## Procédures de récupération (terrain)

- **Admin éjecté d'une partie en cours** : sur PC, console (F12) →
  `localStorage.setItem('me', JSON.stringify({role:'admin', id:'<admin_id>', gameCode:'<CODE>'})); location.reload()`.
  (Si collage bloqué dans Chrome : taper `allow pasting` puis Entrée.)
  Alternative sans console : champ « Reprendre par code » dans l'écran admin.
- **Doublons d'équipe** (même nom recréé) : **se règle désormais dans la régie**, bouton `⇄`
  sur la ligne à supprimer (#65) — réaffecte les preuves vers l'équipe conservée puis supprime
  le doublon vide. Le SQL manuel ci-dessous ne sert plus que si la console est inaccessible :
  réaffecter les `submissions` vers l'équipe canonique (la plus ancienne `joined_at`), puis
  supprimer les doublons vides — **l'ordre compte à cause du `cascade`**. `addTeam` réutilise
  l'équipe existante du même nom et `joinGame` bloque un nom déjà pris, ce qui limite leur
  apparition.
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
| `migration-venue-logo.sql` | `games.logo_url` — logo du lieu (#43) | appliqué 2026-07-27 |
| `migration-storage-delete-fix.sql` | Policy DELETE du bucket : `name` mal résolu (#50) | appliqué 2026-07-28 |
| `migration-templates.sql` | `games.is_template` + purge 90 j épargnant les modèles (#53) | appliqué 2026-07-28 |

⚠️ `supabase-setup.sql` §5 est **obsolète** depuis #38 : ses trois fonctions de purge y
suppriment encore des lignes de `storage.objects`, ce que Supabase refuse. C'est
`migration-storage-purge.sql` qui fait foi. Appliquer les deux, dans cet ordre, sur une base neuve.

## Déploiement

Pas de build : GitHub Pages sert les fichiers du dépôt tels quels (`.nojekyll`, voir #29).

**Checklist à chaque livraison :**

1. Incrémenter **`BUILD`** dans le(s) fichier(s) touché(s) — `expedition.html` (affiché en bas
   de l'écran de préparation) et/ou `regie.html` (logué au démarrage). Sans ça, impossible de
   savoir quelle version tourne sur un appareil.
2. Incrémenter **`CACHE`** dans `sw.js` si l'app-shell change (`expedition.html`, `regie.html`,
   `print-frame.js`, icônes, `manifest.json`, CDN précachés). Dans le doute, incrémenter.
3. Vérifier la **syntaxe JS** avant de pousser : extraire le bloc `<script>` inline de chaque
   HTML et le passer à `new Function(...)`, plus `node --check sw.js print-frame.js`. Les bancs
   JSDOM du § « Workflow attendu » vont plus loin (géométrie du cadre, rendu de la régie,
   filtres, rafale, transitions, branchement de `expedition.html` sur le module).
   ⚠️ **Toute retouche du cadre se vérifie d'abord au banc géométrie** (il connaît les cotes de
   #55/#58 : 1080×1440, 1347×1010, sceau 117/90,5), **puis sur un tirage réel** — c'est un
   tirage réel, pas un test, qui a corrigé #55.
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
    La **photo d'équipe** était volontairement basse définition (`{max:800, q:0.8}` — inutile
    de payer 1600 px pour un avatar de 40 px). ⚠️ **Annulé par #48** : devenue imprimable
    (choix du tirage souvenir), elle passe au régime commun `compressImage(file)`.
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

### Poussés sur GitHub (2026-07-26) — Cartouche : lockup logo, sans code de chasse

42. **Cartouche du tirage remanié.** (1) Le code de la chasse (« CHASSE XXXX ») est retiré —
    information de gestion, pas de souvenir. (2) « EXPÉDITION » forme désormais un **lockup
    avec la rose des vents** : nom sous le logo en portrait (cartouche de 300 px), **côte à
    côte** en paysage (230 px — l'empilement y touchait le filet doré, deux itérations pour
    le voir). (3) Les textes (équipe / chasse · lieu / date) récupèrent **toute la largeur**
    restante : le nom de chasse long qui se tronquait en portrait (#41) tient maintenant.
    (4) Vignettes de sélection (grille équipe, lignes admin) passées d'`object-fit:cover` à
    **`contain`** : l'utilisateur choisit sur la photo **entière**, plus sur un recadrage
    carré — sur le tirage, la photo a toujours été posée entière (« contain », #41), mais
    les vignettes recadrées pouvaient faire croire le contraire. `BUILD` → `2026-07-26.9`,
    `CACHE` **v12→v13**.

### Poussés sur GitHub (2026-07-27) — Logo du lieu sur le tirage

43. **Logo du lieu (camping, Center Parcs, entreprise…)**. (1) **Base** : `games.logo_url`
    (`migration-venue-logo.sql`, appliquée le 2026-07-27). (2) **Fichier** : chemin fixe
    `{code}/logo.png` dans le bucket `photos`. Aucune policy à ajouter — l'upload est déjà
    ouvert (Lot 2) et `photos_delete_owner` couvre la suppression par l'admin propriétaire.
    ⚠️ Le bucket n'a **pas** de policy UPDATE : `uploadGameLogoBlob` fait donc `remove()`
    **puis** `upload(upsert:false)` — un `upsert` partirait en `42501` silencieux (même piège
    que #26). (3) **Format** : `compressLogo` réencode **toujours en PNG** à 600 px — un logo
    se pose sur le parchemin, la transparence doit survivre ; un JPEG y collerait un pavé blanc.
    (4) **UI** : champ « Logo du lieu (optionnel) » avec aperçu sur les écrans de création et de
    modification (`renderLogoField`, `handleLogoPick`, `clearGameLogo`) ; le brouillon vit dans
    `STATE.logoDraft` et `refreshLogoField` met à jour **l'aperçu seul** — un `render()` global
    effacerait les champs déjà saisis. (5) **Envoi** : `persistGameLogo` est appelé **après**
    l'insert de la chasse (la policy de suppression vérifie que le code du chemin appartient à
    `auth.uid()`). (6) **Duplication** : le fichier est **recopié** sous le nouveau code, jamais
    référencé en travers — sinon supprimer la chasse source ferait disparaître le logo de la
    copie. (7) **Purge** : `{code}/logo.png` ajouté aux chemins de `purgeGamePhotos`.
    (8) **Tirage** : logo calé à droite du cartouche, boîte de `foot*0.62` de haut et au plus
    20 % de la largeur, posé entier ; la place qu'il prend est retirée de la largeur des textes.
    Un échec de chargement n'empêche jamais la production du tirage. `BUILD` → `2026-07-27.1`,
    `CACHE` **v13→v14**.
    ⚠️ **Marques de tiers** : c'est à l'organisateur de s'assurer qu'il a l'accord du lieu pour
    imprimer son logo (mention affichée sous le champ).

### Poussés sur GitHub (2026-07-27, commit `92eb326`) — Le lieu sur sa propre ligne

44. **Cartouche : bloc de texte à 4 lignes, mis à l'échelle.** Le lieu était accolé au nom de
    chasse (« Chasse · Lieu ») sur une seule ligne : dès que le logo du lieu (#43) prenait de
    la largeur, l'ellipse mangeait le lieu — invisible en portrait, précisément là où on
    voulait le lire. Il a désormais **sa propre ligne**, sous le nom de la chasse.
    Quatre lignes ne tenant pas aux tailles nominales dans le cartouche paysage (230 px contre
    300 en portrait), les lignes sont décrites dans un tableau (texte, taille, taille mini,
    couleur, interligne), leur **hauteur totale est mesurée avant de dessiner**, puis un facteur
    d'échelle unique `k` ramène le bloc dans la place réellement disponible (`usableTop` →
    `usableBot`, ce dernier calé sur le filet doré). Chaque ligne garde son ajustement de
    largeur (`fitFont` + `ellipsize`). Effet mesuré : les noms longs qui se tronquaient tiennent
    désormais entiers. `BUILD` → `2026-07-27.2`, `CACHE` **v14→v15**.

### Poussés sur GitHub (2026-07-27) — Zoom sur les photos avant de choisir le tirage

45. **Loupe sur les vignettes de choix du tirage.** Sur un écran de téléphone, une vignette
    d'un tiers de largeur ne permet pas de juger la netteté ni les visages : les équipes
    choisissaient à l'aveugle. `renderPrintGrid` prend un paramètre `mode` (`team`/`admin`) et
    pose sur chaque vignette une pastille 🔍 → `openPrintZoom`, qui réutilise `initPhotoZoom`
    (pincer / molette / double-clic / glisser, 1–6×) et propose « ✦ Choisir cette photo »
    (libellé « ✓ Déjà choisie » si c'est le choix courant). Côté admin, la visionneuse écrase
    le contenu du sélecteur → bouton « ← Retour » (`backToPrintPicker`). Le clic sur la vignette
    continue de sélectionner en un geste. `BUILD` → `2026-07-27.3`, `CACHE` **v15→v16**.

### Poussés sur GitHub (2026-07-27, commit `952b779`) — Le tirage n'est plus téléchargeable par les équipes

46. **Épreuve filigranée côté joueur.** Le tirage étant destiné à être imprimé puis offert ou
    vendu, laisser les équipes le télécharger en pleine définition revenait à donner le produit.
    `openPrintPreview(teamId, mode)` a désormais deux régimes : `admin` (défaut) rend le tirage
    définitif avec son bouton de téléchargement ; `team` passe par `buildProofCanvas` — le
    tirage complet est réduit à **700 px** au plus long côté puis barré d'un filigrane
    « ÉPREUVE » répété en diagonale (texte plein **et** contour, pour rester lisible sur une
    zone sombre comme sur une zone claire) — sans aucun bouton de téléchargement. La mention
    « le tirage vous sera remis par l'organisateur » remplace ce bouton. `BUILD` →
    `2026-07-27.4`, `CACHE` **v16→v17**.
    ⚠️ **Limite assumée, à ne pas se raconter d'histoires** : tout ce qu'un navigateur affiche
    peut être capturé (appui long, capture d'écran) et les **photos brutes** restent de toute
    façon accessibles par leur URL publique dans le bucket (`public=true`, cf. Lot 2).
    Le filigrane + la basse définition rendent le fichier **inutilisable à l'impression** ;
    ils n'empêchent pas de le copier. Une vraie protection supposerait des URLs signées et un
    rendu du cadre côté serveur (Edge Function) — non fait.

### Local, non poussé (2026-07-27 → 2026-07-29) — Livrets commerciaux

47. **Dossier `commercial/`** (hors dépôt, `.gitignore`) — supports de vente de la
    **prestation** : Mika anime les événements avec son outil, l'appli est le différenciateur,
    pas un SaaS vendu seul. **Aucun fichier applicatif touché** : ni `BUILD` ni `CACHE`.
    Deux livrets de 6 pages A4 (campings / entreprises), une cible chacun, partageant
    `plaquette.css` ; PDF produits par **WeasyPrint** depuis les HTML.
    ⚠️ **Les grilles tarifaires, leur construction et les plafonds commerciaux sont documentés
    uniquement en local** — le dépôt est public, ils n'y ont rien à faire (même règle que le
    site vitrine et que le mode commande de la régie, #60/#61). Points transposables :
    - Le goulot opérationnel est l'**arbitrage** (validation photo par photo + vote 50/30/10,
      manuels sur un seul écran) : plafond **~10 équipes / ~50 participants** pour un
      animateur seul ; au-delà, seconde session plutôt que second animateur. Le vrai levier
      d'ajustement est le **nombre d'indices**, volontairement absent des livrets.
    - Le modèle repose sur la **répétition** : repérage et écriture s'amortissent dès la
      deuxième date sur un même site — d'où un **forfait saison** au cœur de l'offre.
    - Accroche de couverture « **Selfie Safari en équipe** » ; « chasse au trésor photo » en
      explication dans le corps. Aucun tiret cadratin dans le corps des livrets.
    - Maquette du tirage en portrait et paysage, avec l'encart « VOTRE LOGO ». ⚠️ Depuis #69
      elle est **volontairement infidèle** sur la marge et le cartouche (à l'échelle du livret
      le texte serait clippé) ; seul le **ratio de la fenêtre photo** y est juste.
    - `commercial/verif-pages.py` est **obligatoire** après chaque rendu : `overflow:hidden`
      **masque** un débordement au lieu de le paginer — un bloc trop long glisse sous le pied
      de page sans erreur, le PDF reste « valide ». Le script mesure le bas du dernier élément
      dessiné à 150 dpi et exige 5 mm de dégagement. Deux pièges de calibrage : viser le
      **filet** du pied de page (pas son texte), et un **seuil de gris à 233** (le fond teinté
      d'un encadré déborde avant son texte).
    - Contraintes WeasyPrint : support flex **partiel** (`flex-wrap` ignoré, `margin-top:auto`
      inopérant) — grilles en `inline-block` / `display:table` / `float`, à ne **pas**
      repasser en flexbox ; pages en `height:297mm; overflow:hidden`.

### Poussés sur GitHub (2026-07-27, commit `22d69d8`) — La photo d'équipe devient une photo à part entière

48. **Selfie d'inscription traité comme une preuve virtuelle.** Constat terrain : la photo prise
    à l'inscription n'existait **qu'en pastille de 26–40 px** — invisible à la fin, absente du
    choix du tirage et de l'export. Or c'est souvent la seule photo où l'équipe est au complet.
    (1) **Cœur** : `teamPhotoSub(team)` fabrique un objet de la forme d'une submission
    (`photoUrl`/`photoDataUrl`, `clueId:null`, `points:0`) portant l'id sentinelle
    **`team:<teamId>`** ; `findAnySub(id)` résout indifféremment une preuve réelle ou cette
    photo ; `teamPhotos(teamId)` retourne toutes les photos d'une équipe, **selfie en tête**.
    **Aucune migration** : rien n'est écrit en base, l'objet est reconstruit à chaque rendu
    depuis `teams.photo_url`. Le score est intact — la photo n'entre jamais dans
    `STATE.submissions`, seule source du calcul.
    (2) **Tirage** : première vignette de `renderPrintGrid` (badge « ÉQUIPE »), côté équipe
    **et** dans le sélecteur de secours admin ; `teamPrintSub` reconnaît la sentinelle, donc
    `buildPrintCanvas`/`buildProofCanvas`/`downloadPrint`/`downloadAllPrints` fonctionnent sans
    modification. L'id sentinelle est stocké tel quel dans `teams.print_submission_id`
    (colonne `text` **sans FK**, cf. #39 — c'est précisément ce qui rend l'astuce possible) ;
    il ne peut pas entrer en collision avec un id de submission (`uid()` = 7 caractères
    `[a-z0-9]`, sans `:`).
    (3) **Export ZIP** : la photo d'équipe **échappe aux filtres de statut** (elle n'en a pas)
    et ouvre le dossier de son équipe sous `00_photo-equipe.jpg` (le préfixe `00_` la garde en
    tête au tri). Le modal annonce le nombre de photos d'équipe jointes.
    (4) **En-tête d'équipe côté maître du jeu** : `teamAvaLink` (pastille cliquable →
    `openPhoto('team:<id>')`, zoomable) sur le suivi live, les cartes de validation/vote et la
    liste des tirages. `openPhoto` accepte désormais la sentinelle.
    (5) **Définition** : `handleJoinCapture` ne bride plus la capture à 800 px — la photo étant
    imprimable, elle passe au régime commun `PHOTO_MAX` 1600 px / q 0,82 (annule la note de #40).
    ⚠️ **Contrepartie** : ~350 Ko par équipe au lieu de ~80 Ko dans le bucket. Négligeable
    (une photo par équipe, pas par indice) mais à compter avec le plafond de 1 Go.
    `BUILD` → `2026-07-27.5`, `CACHE` **v17→v18**.
    ⚠️ **Photos d'équipe des chasses déjà jouées** : elles restent en 800 px — imprimables en
    10×15 à ~200 dpi, correct mais en deçà des preuves. Seules les inscriptions postérieures au
    déploiement bénéficient de la pleine définition.

### Poussés sur GitHub (2026-07-27, commit `0d75dfe`) — Le nom d'équipe survit à la photo

49. **Brouillon d'inscription tenu dans `STATE`, plus dans le DOM.** Symptôme signalé sur le
    terrain : prendre la photo d'équipe **effaçait le nom d'équipe** déjà saisi. Cause :
    `handleJoinCapture` sauvait les champs, appelait `render()` **sans `await`** — or `render()`
    est `async` (il recharge jeu et preuves) — puis « restaurait » les valeurs. La restauration
    écrivait donc dans le DOM que `render()` allait remplacer une fraction de seconde plus tard.
    Le code de la chasse survivait par chance : `screenTeamJoin` le réémet depuis
    `STATE.joinDraftCode` ; le nom d'équipe, lui, n'avait aucun attribut `value`.
    ⚠️ Le bug ne se limitait pas à la photo : **n'importe quel `render()`** (realtime, poll 15 s)
    pendant la saisie vidait le champ. Il attendait juste un déclencheur reproductible.
    Correctif : (1) `#join-team` réémis depuis `STATE.joinDraftTeam`, `escapeHtml` protégeant
    l'attribut (guillemets compris) ; (2) `syncJoinDraft()` recopie les trois champs dans
    `STATE` **à chaque frappe** (`oninput`/`onchange`) et avant toute action qui redessine ;
    (3) `await render()` et suppression de la restauration post-rendu ; (4) doublage en
    **`sessionStorage`** (`join_draft`) : ouvrir l'appareil photo peut faire recharger la page
    sur un téléphone peu doté, ce qui viderait `STATE` — la photo, elle, n'y est pas mise
    (dataURL ~350 Ko, quota trop juste), donc un rechargement pendant la capture perd la photo,
    jamais le nom ; (5) `clearJoinDraft()` à l'inscription, à la reconnexion et au `logout`,
    sinon le brouillon ressurgirait à l'inscription suivante. Le libellé du champ photo annonce
    désormais qu'elle pourra servir de tirage souvenir (#48). `BUILD` → `2026-07-27.6`,
    `CACHE` **v18→v19**.

### Poussés sur GitHub (2026-07-28) — Deux pannes silencieuses : photo d'équipe et purge des fichiers

**✅ Vérifié en conditions réelles le 2026-07-28** : nouvelle inscription avec selfie → fichier
présent dans le bucket, pastille affichée, photo proposée au choix du tirage.

50. **(a) La photo d'équipe n'a jamais été stockée du 2026-06-30 au 2026-07-28.**
    Symptôme : « on ne voit pas la photo », nulle part. Diagnostic en base plutôt qu'en
    supposant : **0 fichier `%/team_%`** dans le bucket sur 91 objets, et `teams.photo_url`
    à `null` partout. Le rendu n'était donc pas en cause — il n'y avait rien à afficher, et
    tout le lot #48 reposait sur une donnée inexistante. Cause : `uploadTeamPhoto` envoyait
    en **`upsert:true`**, or l'upsert réclame le droit **UPDATE** sur `storage.objects` et le
    bucket n'a qu'une policy **INSERT** depuis le Lot 2 (#14) → refus RLS à chaque inscription,
    signalé par un toast de 4,5 s au milieu du parcours d'inscription, donc invisible en
    pratique. Exactement le piège de #26 (preuves) et de #43 (logo du lieu), reproduit une
    troisième fois. Correctif : `upsert:false` + 409/« Duplicate » traité comme succès (le
    chemin porte un `teamId` neuf à chaque inscription : rien à écraser), message d'erreur
    explicite et `reportError`. `BUILD` → `2026-07-28.1`, `CACHE` **v19→v20**.
    ⚠️ **Aucune récupération possible** : les photos d'équipe des chasses passées n'existent
    nulle part, elles n'ont jamais quitté le téléphone des joueurs.

    **(b) `photos_delete_owner` n'autorisait aucune suppression** (`migration-storage-delete-fix.sql`,
    appliquée le 2026-07-28). La policy écrite en #38 contenait :

    ```sql
    from public.games g
    where g.admin_id = (select auth.uid())::text
      and g.code = (storage.foldername(name))[1]   -- ⚠ `name` NON qualifié
    ```

    `name` n'étant pas qualifié et `games` alias `g` étant dans le `FROM` de la sous-requête,
    Postgres résout `name` en **`g.name`** — le *nom de la chasse* — au lieu de
    `storage.objects.name`, le *chemin du fichier*. Aucune erreur, aucun avertissement : la
    condition compare le code d'une chasse au premier segment de son propre nom, donc elle est
    **toujours fausse**. Conséquence : `purgeGamePhotos` échouait en silence, la corbeille de
    l'app purgeait les lignes mais **jamais les fichiers**. Constat au 2026-07-28 : **89 fichiers
    orphelins (~15 Mo) pour 16 chasses supprimées**, soit tout l'historique. Corrige aussi le
    **remplacement du logo du lieu** (`uploadGameLogoBlob` fait `remove()` puis `upload`, et le
    `remove()` échouait). Correctif : `storage.foldername(storage.objects.name)`.
    ⚠️ **Ménage à faire à la main une fois** : les 89 fichiers déjà orphelins ne sont plus
    référencés par aucune chasse — l'app ne peut plus reconstruire leurs chemins. À supprimer
    depuis le dashboard Supabase (Storage → `photos` → dossiers dont le code n'existe plus).

### Poussés sur GitHub (2026-07-28) — Sortie de secours de la phase validation

51. **La phase `validation` n'était plus un cul-de-sac.** Symptôme signalé : chasse terminée
    (chrono expiré ou fin déclenchée par erreur) **sans aucune photo** → l'écran « Photos
    conformes ? » n'offrait qu'un bouton **désactivé** « Aucune photo ». Aucun moyen de revenir
    au jeu, ni de clôturer, ni de supprimer la chasse (le bouton de purge vit sur
    `screenAdminEnd`, inatteignable). Deux correctifs : (1) **`resumeHunt()`** — bouton
    « ↩︎ Reprendre la chasse » sur `screenAdminValidation`, repasse `status` à `active`,
    `ended_at` à `null` et **décale `startedAt`** pour que le temps restant soit exactement
    celui qui restait au moment de la fin ; si le chrono était épuisé, un `prompt` demande les
    minutes à ajouter (défaut 15) et `durationMinutes` n'est allongée que si le temps ajouté
    dépasse la durée initiale. ⚠️ Sans ce décalage, `render()` rebascule **aussitôt** en
    `validation` (le contrôle de chrono en tête de `render`) — la reprise serait invisible.
    Les équipes repassent de `screenTeamWaiting` à `screenTeamActive` par realtime (`team-waiting`
    est dans la liste blanche depuis #30). (2) **Clôture possible à vide** : quand il n'y a
    aucune photo, le bouton principal devient « Clôturer la chasse → » (`finalizeGame`, saut
    direct de `validation` à `ended`) au lieu d'être grisé — l'écran de fin, et donc la
    corbeille RGPD, redevient accessible. `BUILD` → `2026-07-28.2`, `CACHE` **v20→v21**.

### Poussés sur GitHub (2026-07-28, commit `d7ea340`) — Retour au menu de préparation depuis le lobby

**✅ Vérifié en conditions réelles le 2026-07-28.**

52. **`backToSetup()` — préparer plusieurs chasses d'affilée.** Besoin : créer une chasse à
    l'avance puis y revenir plus tard, sans la lancer ni la perdre. Le lobby (`setup`) n'offrait
    que « Annuler » (= **suppression** de la chasse), « Modifier » et « Démarrer » : le seul moyen
    d'en sortir sans détruire était `logout()`, qui déconnecte aussi le compte admin. Correctif :
    bouton **« ← Menu »** dans la topbar de `screenAdminLobby` → `backToSetup()`, qui **détache
    seulement l'appareil** (`stopRealtime`, `me.gameCode = null`, `STATE.game/submissions` vidés,
    brouillons `draftClues`/`draftMeta`/`logoDraft` remis à `null` pour repartir sur un formulaire
    vierge) puis `await render()` → `screenAdminSetup`. **Rien n'est écrit sur la chasse** : elle
    reste en `setup` et remonte telle quelle dans le picker « Reprendre une session »
    (`loadSessionsForPicker` filtre déjà `status='setup'` + `admin_id`), qui reprend directement
    au lobby. Aucune migration, aucun changement de schéma.
    Deux retouches de lisibilité au passage : « Annuler » devient **« Supprimer 🗑 »** en oxblood
    (le mot « Annuler » à côté d'un « ← Menu » laissait croire à un simple retour, alors qu'il
    appelle `deleteGame`), et une ligne d'aide sous le code rappelle que la chasse est déjà
    enregistrée. `BUILD` → `2026-07-28.3`, `CACHE` **v21→v22**.

### Poussés sur GitHub (2026-07-28, commit `2c2bf19`) — Tiroir de chasses types

**✅ Vérifié en conditions réelles le 2026-07-28** : mise au tiroir depuis la liste des chasses,
réutilisation d'un modèle et création de la chasse à partir de lui — parcours complet OK.

53. **Chasses types réutilisables** (`migration-templates.sql`, appliquée le 2026-07-28).
    Besoin : garder un scénario prêt à rejouer sans dépendre d'une chasse passée, qui finit
    supprimée à la main ou par le cron de rétention. Jusqu'ici, dupliquer supposait que la
    chasse source existe encore.
    (1) **Base** : `games.is_template boolean not null default false` + index
    `(admin_id, is_template)`. `purge_expired_games` gagne `and is_template = false` — c'est la
    seule protection contre l'expiration.
    (2) **Décision d'archi** : marquer une chasse **déjà jouée** aurait été plus simple mais est
    **écarté pour raison RGPD** — le modèle échappant à la rétention 90 j, il aurait immobilisé
    hors purge les photos et les noms de ses participants. `saveAsTemplate(code)` **insère
    toujours une copie neuve et vierge** (nouveaux `id` d'indices, `hunt_date=null`, logo recopié
    par `copyLogoTo` sous le nouveau code, aucune équipe) ; la chasse source n'est jamais modifiée
    et reste soumise à la purge.
    (3) **Écriture du drapeau** : `saveGame` **ne liste pas** `is_template` dans son payload —
    un upsert PostgREST ne met à jour que les colonnes fournies, le drapeau survit donc à toutes
    les sauvegardes ordinaires et ne peut pas être effacé par accident. Seul `saveAsTemplate`
    l'écrit, par un `insert` direct.
    (4) **UI** : section « Tiroir des chasses types » sur l'écran de préparation (picker
    `#tpl-picker`, colonne de gauche = nombre d'indices puisqu'un modèle n'a pas de date, bouton
    « Utiliser cette chasse type → », corbeille par ligne) ; **étoile ☆** sur chaque ligne du
    picker de duplication et bouton « ☆ Enregistrer comme chasse type » dans le lobby.
    `useTemplate` passe par `duplicateFromCode(code,{suffix:false})` : depuis un modèle, le
    suffixe « (copie) » n'a pas de sens.
    (5) **Étanchéité** : `loadSessionsForPicker` et `loadGamesForDuplicate` filtrent
    `is_template=false` (sinon un modèle apparaîtrait dans trois listes et pourrait être
    **lancé**) ; `resumeByCode` et `loadAndEditGameFromPicker` refusent explicitement d'ouvrir un
    modèle, y compris par saisie de son code.
    (6) **Refactor** : la recopie de fichier logo sort de `persistGameLogo` dans `copyLogoTo(url,
    code)`, partagée avec le tiroir. Comportement inchangé.
    ⚠️ **Modifier un modèle n'est pas prévu** : on l'utilise (ce qui remplit le formulaire de
    création), on ajuste, on crée la chasse, puis on range la nouvelle version au tiroir et on
    retire l'ancienne. Une édition en place demanderait de charger un modèle dans `STATE.game`,
    donc de rouvrir la porte que le point (5) ferme.
    `BUILD` → `2026-07-28.4`, `CACHE` **v22→v23**.

### Poussés sur GitHub (2026-07-29, commit `6f1e2d5`) — QR code du diaporama

⚠️ **Poussé mais non testé en conditions réelles.**

54. **`showQR(mode)` — un overlay, deux usages.** Besoin terrain : en camping il n'y a **pas de
    vidéoprojecteur**, le diaporama ne peut pas être projeté à la remise des prix. La solution
    envisagée d'abord (récolter les adresses mail et envoyer le lien) a été **écartée** : une
    adresse mail est une donnée personnelle supplémentaire, non couverte par le consentement
    actuel ni par `confidentialite.html`, qui ne parlent que des photos. Or l'URL publique
    `?diapo=CODE` existe depuis l'origine — il suffisait de l'encoder en QR.
    (1) L'overlay `#qr-overlay` gagne deux id (`qr-title`, `qr-hint`) pour que son texte change
    selon le mode. (2) `showQR(mode)` lit la table `QR_MODES` (`join` par défaut, `diapo`), qui
    porte le titre, l'aide et la fonction d'URL (`joinUrl` / `diapoUrl` — cette dernière extraite
    du littéral qui vivait dans `screenAdminEnd`). (3) Bouton « 📱 QR code du diaporama » sur
    `screenAdminEnd`, à côté de « Lancer le diaporama ». Le repli sans lib QR affiche désormais
    **l'URL** et non le code : un code à 4 lettres ne sert à rien pour le diaporama.
    **Aucune migration, aucun changement de schéma** — le lien était déjà public.
    ⚠️ Le mode `diapo` n'a de sens qu'en statut `ended` : le diaporama ne montre que les photos
    **validées**, il est vide tant que le jugement n'a pas eu lieu. C'est pour ça que le bouton
    est sur l'écran de fin et nulle part ailleurs.
    ⚠️ **Le lien reste public et non signé** : quiconque a le code voit les photos de la chasse.
    C'était déjà le cas avant (bouton « Copier le lien »), le QR ne fait qu'en faciliter la
    diffusion. À reconsidérer si le tirage souvenir devient une vraie source de revenu — voir la
    dette « bucket privé + URLs signées » (#46).
    `BUILD` → `2026-07-29.1`, `CACHE` **v23→v24**.

### Poussés sur GitHub (2026-07-30) — Cadre du tirage : sceau, centrage, fenêtre paysage

⚠️ **Poussé mais aucun tirage réel produit depuis.** Validé sur maquettes PIL hors app.

55. **`buildPrintCanvas` remanié : quatre décisions, prises sur des rendus mesurés.**

    (1) **La rose des vents devient un sceau à cheval** sur le filet bas de la photo, bord
    gauche **collé** à ce filet (`sealX = dx + sealR`), 35 % du diamètre sous le filet
    (`sealY = (dy+dh) - sealR*0.30`), agrandie de 30 % (rayon 117 px en portrait, 90 en
    paysage). Dessinée **en dernier**, après le cartouche : dessinée avant, le filet noir lui
    passait dessus et elle paraissait *derrière une vitre* au lieu d'être apposée dessus.
    ⚠️ Aucune pastille de fond n'a été nécessaire : `drawRose` remplit **déjà** un disque
    parchemin opaque cerclé de noir, donc la marque reste lisible sur photo claire comme
    sombre. C'est ce qui distingue ce sceau du logo **du lieu**, un PNG nu qui disparaît sur
    fond sombre — raison pour laquelle le logo du lieu, lui, **reste dans le cartouche**.
    ⚠️ Ancré sur `dx/dy/dw/dh` (le rectangle **réellement dessiné**), jamais sur la fenêtre :
    en paysage une photo 4:3 ne remplit pas la largeur, un ancrage sur la fenêtre poserait le
    sceau sur le parchemin, à côté de la photo. Conséquence assumée : avec une 4:3 en paysage
    le sceau suit la photo et reste donc à ~186 px du bord du cadre. Le coller au cadre
    supposerait de **caler la photo à gauche** au lieu de la centrer — écarté, composition
    trop asymétrique.
    ⚠️ Le sceau est dimensionné sur le **petit côté du tirage** (`PRINT_SHORT`), jamais sur
    `foot` : il l'était, et ramener le cartouche paysage à 150 px le réduisait à 39 px de
    rayon — exactement l'inverse du but.

    (2) **Bloc de texte centré** : **un axe commun** (sinon les quatre lignes se décalent et
    ce n'est plus un bloc) mais une **largeur propre à chaque ligne**, via une liste
    d'obstacles `(haut, bas, bord droit)` — le sceau et le mot ne rognent que les lignes que
    leur bande verticale croise réellement. ⚠️ Borner toutes les lignes à l'intervalle du
    bloc (première version) rétrécissait pour rien les lignes basses et **tronquait le lieu**.
    ⚠️ **Limite arithmétique à connaître** : avec le sceau à gauche et le logo du lieu à
    droite, un axe unique devrait être à ≥ 571 px pour le nom d'équipe et à ≤ 480 pour la
    ligne du lieu. Incompatible. En portrait, un libellé de lieu long (« Center Parcs ·
    Domaine des Trois Forêts ») tombe donc au plancher et se tronque ; un libellé court
    (« Domaine des Trois Forêts ») passe à sa taille nominale. **Le logo du lieu dit déjà la
    marque : ne pas la répéter dans le champ Lieu.** En paysage, le centrage ne coûte rien.

    (3) **Fenêtre photo agrandie en paysage : +23 %** (1347×1010 au lieu de 1213×910 pour une
    4:3). En paysage la photo est limitée par la **hauteur** — elle n'atteint jamais les bords
    latéraux — donc seuls `pad` et `foot` peuvent l'agrandir : `pad` 60 → **40**, `foot`
    230 → **150**. ⚠️ Le levier est le cartouche, pas la marge : un bandeau de 1800 px de
    large n'a aucune raison d'empiler quatre lignes. Le texte passe donc à **deux lignes**
    (équipe, puis `chasse · lieu · date`) et y est **plus gros** qu'avant, pas plus petit — le
    bloc à quatre lignes était déjà mis à l'échelle à 0,82 faute de place verticale.
    ⚠️ Descendre à `foot` 130 donne +28 % en 4:3 mais **rien de plus en 16:9** (la photo y
    devient limitée par la largeur) et « EXPÉDITION » touche le filet doré : 150 est le point
    d'arrêt. ⚠️ Une 16:9 est désormais **agrandie de 7,5 %** (contre 1 %) depuis une source de
    1600 px : sans effet visible à 300 dpi, et `buildPrintCanvas` préfère déjà l'agrandissement
    au tirage à trou (#41). En 4:3 et 3:2 on reste en réduction, donc sans coût de définition.

    (4) **En paysage, « EXPÉDITION » passe à droite de la rose** et non sous elle : sous un
    disque agrandi il ne tient plus dans 150 px de bandeau. Cohérent avec la règle de #42
    (lockup côte à côte en paysage).
    ⚠️ **Faux — corrigé par #58 après le premier tirage réel.** L'empilement tient (le mot
    finit à 1156 px pour un filet doré à 1178) et le placer à droite empêchait de centrer le
    cartouche. Le calcul qui concluait à l'impossibilité datait des cotes d'avant #55.

    Portrait inchangé côté fenêtre : `pad` 60, `foot` 300, photo 1080×1440 (3:4 exact).
    **Aucune migration, aucun changement de schéma** ; `buildProofCanvas`, `downloadPrint` et
    `downloadAllPrints` fonctionnent sans modification. `BUILD` → `2026-07-30.1`,
    `CACHE` **v24→v25**.

    Portrait inchangé côté fenêtre : `pad` 60, `foot` 300, photo 1080×1440 (3:4 exact).
    **Aucune migration, aucun changement de schéma** ; `buildProofCanvas`, `downloadPrint` et
    `downloadAllPrints` fonctionnent sans modification. `BUILD` → `2026-07-30.1`,
    `CACHE` **v24→v25**.

### Poussés sur GitHub (2026-08-05, commit `e0fa1b3`) — Console maître du jeu `regie.html`

✅ **ÉPROUVÉE SUR UN ÉVÉNEMENT RÉEL** — chasse `LBM7` « Sur les traces de la fée Carabosse »,
Capfun Camping de l'Eve, le **2026-08-06** : la console a servi à valider les photos **et** à
mener le vote. Mesures relevées en base (voir § #47 pour l'usage commercial) : 3 équipes,
9 indices, 110 min prévues mais **69 min réelles**, 17 preuves (5,7 par équipe, 8 indices sur 9
couverts), 13 conformes / 4 refusées / **0 laissée en attente**, arbitrage étalé de 15h35 à
16h30 — donc **au fil de l'eau pendant la chasse**, ce qui valide la raison d'être de la régie.
⚠️ **Ce que l'événement ne prouve PAS** : (a) il tournait sur la version du 2026-08-05, donc
**les lots #64 à #68 n'y étaient pas** (carte, minimap, fusion, correctif d'affichage, QR) ;
(b) 17 photos, c'est un dixième du cas de charge estimé au § #47 — **le débit d'arbitrage
n'a donc toujours pas été éprouvé**.

56. **`regie.html` — tableau de bord du maître du jeu**, fichier **autonome** servi à côté de
    `expedition.html`. Même projet Supabase, même schéma, **même session d'auth** (le client
    supabase-js range le jeton en `localStorage` sur l'origine : se connecter d'un côté connecte
    l'autre). `expedition.html` **n'est pas modifié**.
    (1) **Raison d'être** : le parcours admin de l'app est une suite d'écrans mobiles
    (lobby → live → validation → jury → fin) ; on ne voit jamais le chrono, les équipes et le
    flux de photos en même temps. La régie met tout sur un seul écran, en 1 / 2 / 3 colonnes
    selon la largeur (téléphone : trois onglets Pilotage / Travail / Outils).
    (2) **Le vrai gain est l'arbitrage.** La validation peut désormais se faire **pendant** la
    chasse, au fil des arrivées, au lieu de tout empiler à la fin — c'est le goulot chiffré au
    § #47 (~11 s par photo à 8 équipes × 10 indices, intenable à 14 équipes). S'y ajoutent un
    **mode rafale** plein écran (une photo, `→` conforme / `←` refuser / `S` passer /
    `Retour arrière` revenir) et un **« tout marquer conforme »** sur la sélection filtrée.
    (3) **Périmètre** : pilotage du cycle de vie (démarrer, ±5/±10 min, terminer, reprendre,
    jury, clôturer, rouvrir), équipes (score live, progression indice par indice, indices de
    départ + répartition auto, retrait en `setup`), flux filtrable (statut × équipe × indice),
    vote 50/30/10 groupé par indice avec compteur `n/3`, classement temps réel, QR d'accès et
    QR du diaporama, export ZIP, choix de tirage de secours, purge RGPD.
    (4) **Hors périmètre, volontairement** : création/édition d'indices, tiroir des chasses
    types, carte Leaflet et **production des tirages encadrés**. Le cadre est un moteur canvas
    de ~250 lignes qui vient d'être remanié (#55) : le recopier ici garantissait la divergence.
    La régie affiche donc les choix et renvoie à l'app pour les produire. ⚠️ **Si ce partage
    devient gênant, la bonne réponse est d'extraire un `print-frame.js` chargé par les deux
    fichiers, pas de dupliquer.**
    ⚠️ **Point (4) périmé le jour même : voir #59.** Les tirages se produisent désormais depuis
    la régie — non pas en copiant le moteur, mais en l'extrayant dans `print-frame.js`, comme
    annoncé ici. Seuls l'édition d'indices, les chasses types et la carte restent hors périmètre.
    (5) **Écritures** : uniquement des `UPDATE` ciblés (`games`, `submissions`, `teams`), jamais
    d'`upsert` — `games.is_template` n'apparaît dans aucun payload et ne peut donc pas être
    effacé. ⚠️ **`.select()` est ajouté à chaque `update()`** : sous RLS, un UPDATE qui ne touche
    aucune ligne (chasse d'un autre compte, `admin_id` legacy) renvoie **0 ligne sans erreur** —
    l'écran afficherait un changement de phase jamais écrit. Même famille de pannes muettes que
    #26 / #43 / #50, attrapée cette fois à l'écriture.
    (6) **Purge** : `purgeGamePhotos` (API Storage) **puis** RPC `admin_purge_game`, jamais
    l'inverse.
    (7) **Chrono** : la régie étant admin, elle **persiste** la bascule `active → validation` à
    l'expiration, comme `render()` dans l'app.
    (8) **Défilement préservé** : chaque événement realtime repeint les panneaux ; le `scrollTop`
    des zones scrollables est relevé et restauré, sinon le flux remonterait en haut au milieu
    d'une session d'arbitrage. Un test de signature évite de repeindre pour rien, et la rafale
    n'est jamais repeinte sous les doigts.
    **Aucune migration, aucun changement de schéma.** `BUILD` de `expedition.html` inchangé.

57. **`sw.js` : la navigation ne poisonne plus l'app-shell des joueurs.** `CACHE` **v25→v26**,
    `./regie.html` ajouté à `CORE`. ⚠️ **Bug réel introduit par #35 et révélé par la régie** :
    le handler de navigation écrivait **toute** réponse sous `'./expedition.html'`
    (`c.put('./expedition.html', net.clone())`). Ouvrir `regie.html` une seule fois écrasait donc
    l'app-shell mise en cache — et hors ligne, un **joueur** serait retombé sur la console du
    maître du jeu. Le chemin de cache est désormais celui du document réellement demandé
    (`regie.html` / `confidentialite.html` / `expedition.html`), avec repli sur `expedition.html`.

### Poussés sur GitHub (2026-07-30) — Cartouche paysage vraiment centré (1er tirage réel)

58. **Deux corrections dictées par le premier tirage produit pour de vrai** (chasse « Chasse
    test », équipe « Les nanas », logo Capfun — donc large).
    (1) **« EXPÉDITION » repasse SOUS la rose en paysage**, comme en portrait. #55 (4) le
    plaçait à droite en affirmant que l'empilement ne tenait pas dans 150 px : mesuré, il
    tient — le mot finit à **1156 px** pour un filet doré à **1178** (22 px de dégagement).
    Le gain n'est pas cosmétique : le lockup côte à côte occupait
    `sceau + 22 + largeur du mot` à gauche, soit **171 px de plus**, et l'axe du bloc était
    donc repoussé à 956 px au lieu de 900 — visiblement décentré vers la droite sur le tirage.
    ⚠️ La règle de #42 (« lockup côte à côte en paysage ») ne s'applique plus depuis que la
    rose a quitté le cartouche pour devenir un sceau posé sur la photo (#55) : elle valait
    pour un lockup logé *dans* le bandeau.
    (2) **En paysage, l'axe du bloc est celui du CADRE** (`W/2`), plus celui de la place
    libre. Deux raisons mesurées : le cartouche paysage laisse 1192 px utiles, donc le
    centrage exact ne coûte rien ; et l'axe de la place libre **dérive de ~100 px selon qu'un
    logo de lieu est joint ou non** (870 avec, 1002 sans), ce qui donnait deux compositions
    différentes pour la même chasse. En **portrait**, l'axe reste celui de la place libre :
    mesuré, l'axe du cadre y ramène le nom d'équipe de 51 à 48 px et **tronque la ligne du
    lieu** — le cartouche portrait n'est pas assez large pour se payer un centrage exact.
    **Aucune migration.** `BUILD` → `2026-07-30.2`, `CACHE` **v25→v26**.
    ⚠️ Conséquence de numérotation : le `sw.js` local du lot #57 (régie) portait déjà
    `expedition-v26` sans être poussé. Il est passé à **v27** en local pour ne pas exister en
    deux versions différentes sous le même nom de cache.

### Poussés sur GitHub (2026-08-05, commit `e0fa1b3`) — `print-frame.js` + tirages depuis la régie

59. **Le moteur du cadre sort de `expedition.html` dans `print-frame.js`, chargé par les DEUX
    fichiers.** Demande : produire les tirages depuis la console. #56 (4) l'avait laissé de côté
    en écrivant que la bonne réponse serait d'extraire un module plutôt que de copier
    `buildPrintCanvas` (~250 lignes, remaniées en #41/#42/#44/#55/#58). C'est fait.
    (1) **Contenu du module** : `build`, `proof`, `dateStr`, `safeFile`, `fileName`, `loadImage`,
    `ensureFonts`, `toBlob`, `dataUrlToBlob`, `save`, + les constantes `Q`/`LONG`/`SHORT`/
    `PROOF_LONG`. Exposé en `window.PrintFrame` par une IIFE. **Aucune dépendance** : ni
    Supabase, ni `STATE`, ni DOM applicatif — `build(sub, team, game)` reçoit la chasse en
    argument, là où l'ancienne fonction lisait `STATE.game`.
    (2) **`expedition.html` ne perd aucun nom** : les appelants (`openPrintPreview`,
    `downloadPrint`, `downloadAllPrints`, `renderTeamPrintCard`…) sont **inchangés**, le fichier
    garde des alias d'une ligne (`const buildPrintCanvas = (sub,team) => PrintFrame.build(sub,
    team, STATE.game);`). Bilan : **−298 lignes** (3970 → 3672).
    ⚠️ **`<script src="print-frame.js">` doit précéder le script inline** : celui-ci évalue
    `const PRINT_Q = PrintFrame.Q;` dès son chargement. Un `defer` ou un placement en fin de
    body casserait l'app au démarrage.
    (3) **`regie.html`** gagne l'aperçu plein écran (`previewPrint`), le téléchargement à
    l'unité (`downloadPrint`), le ZIP `{CODE}_tirages.zip` (`downloadAllPrints`, séquentiel
    avec indicateur de progression) et **`fillMissingPrints`** : pour chaque équipe partie sans
    choisir, retient sa photo la mieux notée (points de vote, puis points d'indice, puis la plus
    récente), la photo d'équipe ne servant que de dernier recours. Réversible ligne par ligne.
    ⚠️ Un tirage prend ~1 s à composer. Pendant une série, un événement realtime repeindrait les
    panneaux et effacerait l'indicateur : `S.printing` gèle le rendu, comme le fait déjà la rafale.
    (4) **`sw.js`** : `./print-frame.js` ajouté à `CORE`, `CACHE` **v27→v28**.
    ⚠️ **Ordre de poussée impératif** : `print-frame.js` et `regie.html` **avant** `sw.js`
    (un `cache.addAll` sur un 404 fait échouer l'installation du worker) et avant
    `expedition.html` (qui ne démarre plus sans le module).
    (5) **Vérification** : banc de 19 tests sur le moteur seul (canvas *enregistreur* sous JSDOM,
    faute de `node-canvas` dans le sandbox) — il rejoue la géométrie documentée et l'aurait vue
    bouger : portrait 1200×1800 avec photo 1080×1440 posée en (60,60), paysage 1800×1200 avec
    fenêtre **1347×1010**, sceau de rayon **117** px en portrait / **90,5** en paysage calé à
    `bas_du_filet − 0,30 R`, quatre lignes de cartouche en portrait contre deux en paysage,
    logo du lieu à droite, échec de chargement du logo non bloquant, épreuve à 700 px avec
    filigrane répété. Plus 45 tests sur la régie et 7 sur le branchement de `expedition.html`,
    soit **71 au total** — tous rejouables hors ligne, sans réseau ni base.
    ⚠️ **Ce banc ne dessine rien** : il vérifie les *appels* et la géométrie, pas les pixels.
    Un tirage réel reste à produire — c'est encore lui qui a corrigé #55 (voir #58).
    **Aucune migration.** `BUILD` `expedition.html` → `2026-07-30.3`, `regie.html` → `2026-07-30.2`.

### Poussés sur GitHub (2026-08-05, commit `e0fa1b3`) — Tirages à la demande (vente d'exemplaires supplémentaires)

60. **`regie.html` : mode « commande », n'importe quelle photo en n exemplaires.** Le tirage
    souvenir (#39) est **une** photo par équipe, offerte ou incluse dans la formule ; les
    livrets prévoient en plus des **tirages supplémentaires payants** (#47). Il manquait donc
    le geste le plus simple du jour J : « je veux aussi celle-là, en double ».
    (1) **Ouverture** : bouton `🛒 Tirages` dans la barre haute (et depuis le panneau Tirages),
    raccourci `T`. Grille de **toutes** les photos de la chasse, triées par équipe puis par
    ordre d'indice — **refusées et selfies d'équipe compris** : une belle photo n'est pas
    forcément une preuve conforme, et c'est souvent celle-là qu'on achète.
    (2) **Panier** : clic = ajouter, `−/+` = quantité (1–99), loupe = aperçu du cadre réel.
    Stocké en `localStorage` sous `order:{CODE}` — **rien en base**, c'est un panier local.
    ⚠️ La persistance n'est pas un luxe : le jour J la console peut être rechargée entre deux
    paiements, et un panier perdu se reconstitue de mémoire, donc mal.
    (3) **Sortie** : ZIP `{CODE}_commande_{AAAAMMJJ-HHhMM}.zip`, **un fichier par photo** (le
    labo prend un fichier + une quantité ; envoyer N copies du même JPEG ferait payer N fois
    le transfert), quantité portée par le nom (`_x3`) **et** par un `bon-de-commande.txt` joint
    qui récapitule équipe, indice, quantités et total. Téléchargement à l'unité également
    possible sans passer par le panier.
    (4) ⚠️ **AUCUN PRIX N'EST CODÉ EN DUR** — le dépôt est public, la règle du § #47 s'applique.
    Le prix unitaire est une **préférence locale** (`localStorage.print_unit_price`), saisie une
    fois sur l'appareil du maître du jeu ; il ne sert qu'à afficher un total d'aide-mémoire et
    à le reporter sur le bon de commande. Un test du banc échoue si un tarif réapparaît dans
    le source.
    (5) **Rendu** : `S.printing` gèle le repeint pendant la série, comme pour la rafale et le
    ZIP des tirages. La commande vit dans son propre overlay, hors de `#app`, donc un événement
    realtime ne l'efface pas.
    **Aucune migration, aucun changement de schéma.** `BUILD` `regie.html` → `2026-07-30.3`.
    ⚠️ `expedition.html` **n'a pas** ce mode : la vente est un geste d'organisateur, pas de
    joueur — côté équipe, la règle de #46 (épreuve filigranée, aucun téléchargement) tient.

### EN LIGNE sur OVH, non poussé sur GitHub (2026-08-03 → 2026-08-05) — Site vitrine `site/`

✅ **En production depuis le 2026-08-05** : <https://www.expedition-selfiesafari.fr>
(domaine + hébergement OVHcloud, voir « Mise en ligne » plus bas). **Le dossier `site/` n'est
pas dans le dépôt GitHub** : il est déployé par FTP, indépendamment de l'application.

⚠️ **Le rendu réel a tranché — et il a trouvé deux défauts que le banc ne pouvait pas voir.**
Chromium ne s'installe pas dans le sandbox (téléchargement bloqué) : les 85 tests JSDOM
vérifient le comportement et la géométrie, **jamais les pixels ni les couleurs**. Ont échappé
au banc, et ont été signalés par l'organisateur en regardant l'écran :
1. le `mailto:` du formulaire **ne produisait rien** sur un Windows sans client mail associé —
   échec silencieux sur le seul appel à l'action du site, voir (4) ;
2. le **gras des listes était noir sur fond noir** dans les sections sombres, voir (9).
Même leçon que #55 corrigé par #58 : le banc protège des régressions, il ne remplace pas un
essai réel. Les deux défauts sont désormais couverts par des tests.

61. **`site/index.html` — vitrine commerciale, fichier unique autonome.** Aucun fichier
    applicatif touché : ni `BUILD` ni `CACHE` à bumper, et le service worker de l'app ne
    connaît pas ce fichier. Contenu repris des deux livrets (#47), **tarifs retirés**.
    (1) **Architecture** : un seul `index.html` (~88 Ko), zéro build, zéro dépendance à
    installer. Trois vues dans le même DOM, basculées par un routeur d'ancre
    (`#/`, `#/campings`, `#/entreprises`) + une section devis **partagée, hors des `.view`**.
    Seule ressource externe : les polices Google (Fraunces / Geist), avec repli système.
    (2) ⚠️ **AUCUN TARIF, décision explicite** — même règle que #47 et #60. Trois tests
    échouent si un `€`, un montant de la grille ou un « HT »
    réapparaît. La conversion passe par le formulaire de devis.
    (3) **E-mail de contact : une seule constante** `CONTACT_EMAIL` en tête du script inline,
    injectée dans le pied de page, le bloc contact et le `mailto` du formulaire. Un test
    échoue si un `href="mailto:` en dur revient dans le HTML — c'est ce qui garantit qu'une
    seule ligne suffira le jour où l'adresse pro d'EXPÉDITION existera.
    (4) **Formulaire de devis : trois sorties, plus un `mailto:` d'autorité** (revu le
    2026-08-05 après essai réel). Première version : la validation posait
    `window.location.href = 'mailto:…'`. **Sur un Windows sans client mail associé — le cas
    par défaut — le clic ne produit RIEN**, et le visiteur croit sa demande envoyée. Constaté
    sur le poste de l'organisateur ; la limite était documentée mais jugée théorique, elle ne
    l'était pas. Le formulaire ouvre désormais une fenêtre `#devis-out` qui propose
    **Gmail** (`https://mail.google.com/mail/?view=cm&fs=1&…`, nouvel onglet), **la messagerie
    du système** (`mailto:`, conservé pour ceux qui en ont une) et **la copie du message**
    (`navigator.clipboard`, repli `execCommand`), le corps étant affiché en clair dans un
    `<textarea readonly>`. Deux des trois chemins ne dépendent d'aucun logiciel installé.
    Aucun backend, aucune donnée stockée, aucun service tiers.
    ⚠️ **Ne jamais revenir à une navigation `mailto:` sans retour visuel** : c'est un échec
    silencieux sur le seul appel à l'action du site. Un test du banc échoue si la soumission
    navigue au lieu d'ouvrir la fenêtre.
    ⚠️ Reste vrai : un envoi *garanti* supposerait Formspree, Web3Forms ou Netlify Forms,
    donc un compte tiers.
    (5) **Boussole toujours visible** (`#roseDock`) : élément **fixe** qui démarre à la taille
    de son emplacement dans le héros (`#rose-slot .slot`, mesuré par `getBoundingClientRect`)
    puis rétrécit et se range en bas à droite sur 62 % de la hauteur du héros. Une fois rangée
    elle sert de « retour en haut » (focusable, `aria-hidden` basculé). ⚠️ Première version :
    la boussole vivait dans le héros et sortait de l'écran au bout d'un écran de défilement —
    sa rotation liée au scroll ne servait à rien. ⚠️ Sous `prefers-reduced-motion`, le badge
    disparaît au profit d'un `.rose-static` posé dans le héros : **rien ne suit le défilement**.
    (6) **Maquette du tirage** aux proportions réelles de `PrintFrame.build` (portrait 1080×1440
    dans 1200×1800, paysage 1347×1010 dans 1800×1200, sceau à cheval sur le filet bas), avec
    bascule portrait/paysage. ⚠️ Si les cotes du cadre bougent (#55/#58 l'ont déjà fait deux
    fois), **cette maquette ment en silence** : aucun test ne la relie au module.
    (7) **Politique de confidentialité recopiée dans `site/`** (2026-08-03) : le lien pointait
    `../confidentialite.html`, cassé dès que le dossier est déployé seul. `site/confidentialite.html`
    est une **copie enrichie** — §1 renseigné (Mickaël Hague + `contact@expedition-selfiesafari.fr`),
    §2 nouveau décrivant le site vitrine (aucun cookie, aucune mesure d'audience, `mailto`
    sans backend, polices Google donc IP transmise, hébergement OVHcloud) et OVH ajouté aux
    sous-traitants. ⚠️ **Deux copies à tenir à jour** : celle-ci et
    `confidentialite.html` à la racine (servie par l'app). Restent en « À COMPLÉTER » dans
    les deux : statut juridique, SIRET, adresse professionnelle.
    (8) **Vérification** : `site/test-site.js`, **85 tests JSDOM** hors ligne
    (`npm i jsdom && node site/test-site.js`) — routeur, injection de l'e-mail, fenêtre d'envoi
    du devis et liens produits, géométrie de la boussole, contrastes en section sombre, règles
    du `.htaccess`, labels, lien d'évitement, conformité tarifaire.
    (9) **Contraste sur fond sombre** (2026-08-05, signalé à l'œil) : `.ul b{color:var(--ink)}`
    et le ✓ en `--forest` s'appliquaient aussi dans les sections `.dark` — **du gras noir sur
    fond noir**, sur la section « Le tirage encadré » et sur le bloc de devis. Ajout des
    pendants `.dark .ul li` / `b` / `::before` (parchemin + doré) et de quatre tests qui
    échouent si ces règles disparaissent. ⚠️ **Règle générale : toute règle de couleur d'encre
    doit avoir son pendant `.dark`** — le site alterne les fonds clairs et sombres.
    (10) **Forçage HTTPS en `.htaccess`, et non par l'espace client** : l'offre
    `hosting-free-100m` **n'expose aucune case « Forcer le HTTPS »** (l'écran Multisite →
    Modifier un domaine se limite à « SSL : Activé »). La règle teste
    **`X-Forwarded-Proto` ET `%{HTTPS}`** : OVH place un proxy devant Apache, et selon le
    chemin emprunté c'est l'un ou l'autre qui porte l'information — n'en tester qu'un seul
    crée une **boucle de redirection infinie**, donc un site totalement inaccessible. Une
    troisième condition restreint la règle au domaine réel, pour que l'URL provisoire
    l'URL provisoire OVH (`*.hosting.ovh.net`) reste joignable en http comme accès de secours.
    ⚠️ Quatre pièges du banc, documentés en tête du fichier : jsdom refuse la navigation
    `mailto:` (d'où le wrapper `(function(window, location){…})(proxy, faux)`), n'implémente pas
    `scrollTo`, ne calcule **aucune** géométrie (`fakeLayout` la simule) et le site filtre ses
    `scroll` par `requestAnimationFrame` — deux défilements dans la même tâche et le second est
    perdu, d'où `await scrollTo(...)`.
    ⚠️ **`site/` n'est pas dans `.gitignore`** : contrairement à `commercial/`, il est fait pour
    être public. Le poser à la racine sous le nom `index.html` en ferait la page d'accueil de
    GitHub Pages — décision non prise, l'app est aujourd'hui servie par `expedition.html`.

    **Mise en ligne (2026-08-03 → 2026-08-05, EN PRODUCTION)** : domaine
    **`expedition-selfiesafari.fr`** acheté chez OVHcloud avec l'offre `hosting-free-100m`
    (100 Mo, FTP, **pas de SSH** — identifiants dans l'espace client OVH). Le site
    pèse ~96 Ko déployé : le quota n'est pas un sujet. DNS propagé en moins de 24 h ; l'apex et `www`
    pointent tous deux sur `51.91.236.255`, MX `mx1`/`mx2.mail.ovh.net` + SPF en place.
    - **Déploiement** = dépôt FTP du **contenu** de `site/` dans `www` (et non du dossier
      lui-même, sinon le site répond sur `/site/`). Trois fichiers : `index.html`,
      `confidentialite.html`, `.htaccess`. ⚠️ **`test-site.js` ne doit jamais partir** —
      `www` est publiquement téléchargeable.
    - ⚠️ **FileZilla masque les fichiers en `.`** : activer « forcer l'affichage des fichiers
      cachés », sinon `.htaccess` n'est jamais transféré. L'Explorateur Windows
      (`ftp://…`) les affiche, lui, mais **transmet le
      mot de passe en clair** — pas de FTPS.
    - **E-mail** : `contact@expedition-selfiesafari.fr` (MX Plan inclus). Envoi depuis Gmail
      par « Ajouter une adresse » : SMTP **`ssl0.ovh.net`**, port 587 TLS (ou 465 SSL),
      **identifiant = l'adresse complète**. ⚠️ `mx1.mail.ovh.net` est le serveur *entrant* :
      le renseigner en SMTP fait échouer l'authentification. Réception dans Gmail par
      **redirection OVH avec conservation d'une copie**, plus fiable que la relève POP de
      Gmail, irrégulière.
    - `site/.htaccess` gère la forme canonique `www`, **le forçage HTTPS** (voir (10)), la
      page 404, deux en-têtes de sécurité, la compression et surtout
      `ExpiresByType text/html "access plus 0 seconds"` — même leçon que #35 : un HTML mis en
      cache masque les correctifs.
    ⚠️ **Le contenu de `site/` part tel quel sur un serveur web public.** Un fichier
    « code de secours OVH.txt » s'y trouvait le 2026-08-03 ; déposé dans `www`, il aurait été
    téléchargeable par n'importe qui à une URL devinable. Déplacé à la racine du projet et
    couvert par `.gitignore` (`code de secours*`, `*secours*.txt`). **Règle : rien d'autre que
    des fichiers destinés à être publics ne doit entrer dans `site/`.**

### Poussés sur GitHub (2026-08-05, commit `e0fa1b3`) — La date prévue redevient visible en dupliquant

62. **`duplicateFromCode` : retour au formulaire, date mise en évidence.** Constat d'usage :
    en prenant une chasse type (« Utiliser cette chasse type → »), impossible en pratique de
    poser la **date prévue** de la nouvelle chasse. Le champ existait pourtant (`#g-date`,
    pré-rempli à la date du jour) — mais les pickers (tiroir, duplication) vivent **en bas**
    de l'écran de préparation et « Créer la chasse → » est un bouton **sticky** toujours
    visible : après la duplication, `screenAdminSetup()` re-rend la page **sans changer le
    défilement**, le formulaire (nom, date, lieu) reste hors écran et la chasse partait avec
    la date du jour sans que l'utilisateur l'ait vue. Correctif : après le re-rendu,
    `scrollIntoView` sur `#g-date` (`block:'center'`) + surlignage doré 4 s (outline posé et
    retiré en inline, aucun CSS ajouté), et le toast dit désormais « choisissez la date
    prévue puis créez la session ». Vaut pour **les trois voies** (tiroir, liste, par code),
    qui passent toutes par `duplicateFromCode`. Aucune migration, aucun changement de schéma.
    `BUILD` → `2026-08-05.1`, `CACHE` **v28→v29**.

### Poussés sur GitHub (2026-08-05, commit `ec10128`) — Docs publiées en versions expurgées

63. **`README.md`, `PROJECT.md` et `CLAUDE.md` poussés, sans tarifs.** Les docs du dépôt
    étaient en retard sur le code (aucune mention de la régie, du module ni du mode commande)
    et le CLAUDE.md publié affichait encore une ancienne grille tarifaire.
    (1) `README.md` / `PROJECT.md` : mis à jour (console, module, mode commande, #62, règle du
    **commit atomique** en remplacement de l'ancien ordre de poussée), **tarifs et taux
    retirés**, et liens vers `site/`, `commercial/` et `ANALYSE_CONCURRENCE.md` remplacés par
    du texte simple — ces dossiers sont hors dépôt, les liens étaient cassés sur GitHub.
    Les deux fichiers sont désormais **identiques local = dépôt**.
    (2) `CLAUDE.md` : le dépôt reçoit une **copie expurgée** du fichier local — § #47 résumé
    sans montants ni raisonnement de marge, identifiants FTP OVH retirés du § #61 (le login
    fait partie des identifiants), montants retirés de la description des tests du site (#61).
    La version locale reste la seule complète.
    ⚠️ **À chaque future poussée de docs, ré-expurger** : remplacement du § #47 + chaînes
    sensibles, puis grep de contrôle (`€` collé à un chiffre, montants de la grille, login
    FTP) qui doit rendre zéro sur l'arbre à pousser.
    Aucun fichier applicatif touché : ni `BUILD` ni `CACHE`.

### Poussés sur GitHub (2026-08-16, commit `5bf6636`) — Carte live du maître du jeu (positions des équipes)

✅ **Vérifié en vrai navigateur le 2026-08-16** : minimap affichée, **marqueurs d'équipe qui
bougent** — donc la chaîne complète fonctionne (émission GPS depuis `expedition.html` →
broadcast → réception et rendu dans la régie). ⚠️ Toujours **pas essayé sur un événement**.

64. **Carte live dans la régie : indices + position de chaque équipe en direct.** Besoin :
    localiser une équipe en difficulté pour la guider. Jusqu'ici la position (`watchPosition`)
    ne quittait jamais le téléphone de l'équipe (point bleu local de `openTeamMap`).
    (1) **Transport = Realtime Broadcast, RIEN EN BASE** (décision explicite) : pendant la
    phase `active`, `expedition.html` émet la position sur le canal `pos:{code}`
    (section « POSITION LIVE », `POSCTX`, `syncPosShare` appelé à chaque `render()`),
    throttlée à **15 s** (`POS_PERIOD` — batterie + quota Realtime). Aucune migration,
    aucune donnée de localisation stockée ni conservée : rien à purger, RGPD minimal.
    L'émission démarre en `active` et s'arrête partout ailleurs (validation, fin, logout).
    (2) **Régie** : Leaflet 1.9.4 ajouté au `<head>` (mêmes URLs unpkg que l'app, déjà
    précachées par le SW). Overlay `#map-ov` (bouton « 🗺️ Carte » topbar, raccourci `M`,
    Échap le ferme) : indices **nommés et numérotés** (le maître du jeu voit tout,
    contrairement à la carte équipe anonymisée), marqueurs équipe (initiale + tooltip
    permanent « nom · il y a Xs »), **grisés au-delà de 60 s** (`POS_STALE`), pied de carte
    listant chaque équipe (localisée / jamais reçue, précision ±m). `S.pos` est rempli par
    le canal broadcast **dès l'ouverture de la chasse** (`startRealtime`), pas à l'ouverture
    de la carte — on a déjà les dernières positions quand on l'ouvre. Un timer 5 s fait
    vieillir les marqueurs ; l'overlay vit hors de `#app`, un repaint realtime ne l'efface pas.
    (3) ⚠️ **Limite navigateur, assumée et affichée dans le pied de carte** : la position
    n'est émise que si l'app de l'équipe est **au premier plan** avec le GPS autorisé.
    Téléphone verrouillé ou appareil photo ouvert → le marqueur se fige (d'où l'âge affiché).
    Un marqueur figé n'est PAS une équipe immobile. Refus GPS = silencieux, l'équipe joue
    sans partage.
    (4) **RGPD** : `confidentialite.html` (racine) **et** `site/confidentialite.html`
    (copie OVH, à redéployer par FTP) documentent la position GPS éphémère (transmise en
    direct, jamais enregistrée, refusable). La ligne « Aucune donnée de géolocalisation
    n'est collectée » — devenue fausse — est retirée des deux.
    (5) **Vérification** : 34 tests JSDOM (`tests/test-map.js` — premier banc **conservé
    dans le dossier** au lieu de /tmp, rejouable par `npm i jsdom && node tests/test-map.js`
    depuis la racine ; recette du banc régie +
    stub Leaflet enregistreur) — ouverture du canal, payload invalide ignoré, marqueurs
    indices/équipes, vieillissement, mise à jour sur broadcast carte ouverte, fermeture
    propre, throttle 15 s, idempotence, arrêt en `validation`, refus GPS. Les 85 tests du
    site passent toujours.
    `BUILD` `expedition.html` → `2026-08-16.1`, `regie.html` → `2026-08-16.1`,
    `CACHE` **v29→v30**.

### Local, non poussé (2026-08-16) — Fusion d'équipes en doublon

⚠️ **Écrit et testé sous JSDOM (29 tests dédiés), jamais essayé en vrai navigateur.**

65. **`regie.html` : fusionner un doublon au lieu de le supprimer.** Besoin terrain : une équipe
    qui se réinscrit au lieu de se reconnecter crée une seconde ligne, et ses preuves se
    retrouvent éparpillées. Jusqu'ici la corbeille n'existait **qu'en phase `setup`** — donc
    précisément pas quand le doublon apparaît — et la seule issue était la fusion SQL manuelle
    décrite au § « Procédures de récupération ».
    (1) **Pourquoi fusionner et non supprimer** : `submissions` porte `on delete cascade` sur
    `teams`. Un bouton « supprimer » après le départ de la chasse détruirait les preuves du
    doublon **et** laisserait leurs fichiers orphelins dans le bucket — les chemins ne se
    reconstruisent que depuis les lignes qu'on vient d'effacer (#38/#50). La fusion vide d'abord
    la ligne, sa suppression devient alors inoffensive.
    (2) **Ordre impératif** : `submissions.update({team_id})` **puis** `teams.delete`. Jamais
    l'inverse. Un test du banc échoue si l'ordre s'inverse, et un échec du transfert
    **interrompt la fusion sans supprimer** le doublon.
    (3) **`.select()` sur chaque écriture** : sous RLS, un UPDATE qui ne touche aucune ligne
    renvoie 0 ligne **sans erreur** (même famille de pannes muettes que #26/#43/#50/#56).
    (4) **Réglages** : `start_clue_id` et `print_submission_id` ne sont repris **que si l'équipe
    conservée n'en a pas** — on n'écrase jamais ce qu'elle porte. Une sentinelle `team:<src>`
    en choix de tirage est ignorée : elle pointe une photo qui va disparaître.
    (5) **Photo d'équipe** : le fichier est nommé d'après l'id (`{code}/team_{id}.jpg`). Si
    l'équipe conservée n'a pas de photo, celle du doublon est **recopiée** sous son id (fetch →
    blob → `upload(upsert:false)`, bucket sans policy UPDATE) puis `photo_url` est écrite ;
    sinon elle est simplement retirée. **Dans les deux cas le fichier source est supprimé** —
    l'abandonner en ferait un orphelin introuvable. Un échec de recopie n'interrompt pas la
    fusion (elle a déjà réussi) : il est signalé dans le toast et passé à `reportError`.
    (6) ⚠️ **La fusion n'arbitre rien.** Si les deux équipes ont couvert le même indice, les
    deux preuves survivent et `scoreOf` **additionne les deux** — les points de cet indice
    comptent donc double. `clueClash()` détecte ces collisions, les affiche dans le sélecteur
    et les liste dans la confirmation, en invitant à refuser une des deux photos dans le flux.
    Automatiser ce choix serait arbitraire : la seconde photo est parfois la meilleure.
    (7) **UI** : bouton `⇄` sur chaque ligne d'équipe (toutes phases, dès qu'il y a 2 équipes),
    overlay `#merge-ov` listant les cibles avec leur nombre de preuves et l'avertissement de
    collision, puis `confirm()` détaillant exactement ce qui va se passer. La corbeille 🗑
    reste réservée à `setup` : après le départ, la fusion est le seul chemin.
    (8) **Vérification** : 29 tests JSDOM (`tests/test-merge.js`) — ordre des opérations,
    non-écrasement des réglages, recopie et nettoyage de la photo, refus de fusionner une
    équipe avec elle-même ou vers une cible inexistante, annulation au `confirm`, échec RLS
    laissant le doublon intact, présence du bouton hors `setup`. Le stub Supabase **enregistre
    l'ordre** des opérations, c'est tout l'intérêt du banc ici.
    **Aucune migration, aucun changement de schéma.** `BUILD` `regie.html` → `2026-08-16.2`,
    `CACHE` **v30→v31**.

### Local, non poussé (2026-08-16) — Minimap permanente dans la régie

✅ **Vérifié en vrai navigateur le 2026-08-16** : panneau affiché, marqueurs à jour, aucun
clignotement au fil des repaints — le nœud détaché tient. ⚠️ Pas essayé sur un événement.

66. **Panneau « Carte » toujours visible, colonne Pilotage.** L'overlay plein écran (#64) oblige
    à interrompre l'arbitrage pour jeter un œil. La minimap (230 px de haut, sous le chrono)
    donne le coup d'œil permanent ; le bouton « ⤢ Agrandir » ouvre l'overlay pour le détail.
    (1) ⚠️ **Le problème central est le cycle de vie de l'instance Leaflet.** `paintConsole()`
    réécrit **tout** `#app` à chaque événement realtime : une carte créée dans ce HTML serait
    détruite et recréée en boucle (zoom perdu, clignotement, handlers fuités). Solution : **un
    seul nœud `#mini-canvas`, conservé détaché du document** dans `MINI.el`, que `mountMini()`
    ré-insère dans l'emplacement `#mini-slot` fraîchement rendu après chaque peinture. Leaflet
    survit à un **déplacement** de son conteneur, jamais à sa destruction. Un test du banc
    échoue si un repaint recrée l'instance.
    (2) **`invalidateSize()` après réinsertion** : le nœud détaché mesure 0×0, Leaflet garde
    cette mesure tant qu'on ne le détrompe pas. Idem au changement d'onglet mobile
    (`setTab`) — la colonne masquée mesure 0×0 elle aussi.
    (3) **Cadrage une seule fois** (`MINI.fitted`) : recadrer à chaque position reçue
    arracherait la vue sous les yeux du maître du jeu. Après le premier cadrage, il est maître
    de sa vue ; `miniFit()` recadre à la demande et à la **première** position d'une équipe.
    (4) **Pas de panneau s'il n'y a rien à montrer** (`hasMapData()` : aucun indice localisé
    **et** aucune position reçue) — pas de carte morte dans la colonne, et aucune instance
    Leaflet créée pour rien.
    (5) **Marqueurs mutualisés** : `syncTeamMarkers(ctx, small)` sert l'overlay **et** la
    minimap (icônes 22 px, infobulle au survol au lieu d'une étiquette permanente qui
    saturerait 230 px). Deux copies auraient divergé à la première retouche — même
    raisonnement que `print-frame.js` (#59).
    (6) **Vieillissement** : l'overlay a son timer quand il est ouvert ; la minimap vivant en
    permanence, son propre timer 5 s est posé par `startRealtime` et libéré par
    `stopRealtime`, qui **détruit aussi l'instance** (les coordonnées de la chasse suivante
    n'ont rien à voir).
    (7) **Vérification** : 16 tests ajoutés à `tests/test-map.js` (**50 au total**) — absence
    de panneau quand rien à montrer, création à la première position, **aucune recréation
    d'instance sur deux repaints**, nœud identique et réinséré, icônes réduites, grisage,
    libération par `stopRealtime`. ⚠️ Les tests de l'overlay ont dû être **reciblés** : ils
    comptaient les instances et marqueurs *globalement*, or la minimap en crée aussi. Ils
    filtrent désormais par taille d'icône (30 px = overlay, 22 px = minimap).
    **Aucune migration.** `BUILD` `regie.html` → `2026-08-16.3`, `CACHE` **v31→v32**.

### Local, non poussé (2026-08-16) — Photos tronquées dans la régie (signalé à l'œil)

67. **`max-height:100%` sautait : la photo s'affichait à sa taille réelle, rognée.** Symptôme
    signalé par l'organisateur : en ouvrant une photo pour la valider, **elle n'apparaissait pas
    entièrement**. Cause : `#zoomwrap img` était borné par `max-width/max-height:100%`, un
    **pourcentage** dont la base est le conteneur en `flex:1`. Quand cette hauteur n'est pas
    résoluble, la contrainte est **ignorée** et l'image s'affiche à ses 1600 px, coupée par
    `overflow:hidden`. `object-fit:contain` n'y change rien : il ne redimensionne pas la boîte,
    il place le contenu **dans** la boîte — or la boîte faisait déjà la taille de la photo.
    ⚠️ **Le même défaut existait à trois endroits** : le zoom photo, le **mode rafale** (donc
    l'outil de validation le plus rapide) et l'**aperçu du tirage**. Cherché et corrigé partout,
    pas seulement là où c'était signalé.
    Correctif : image en `position:absolute; inset:0; margin:auto; width/height:auto` avec les
    mêmes `max-*`. Un bloc conteneur positionné a une hauteur **définie** : le pourcentage se
    résout toujours, `margin:auto` centre, et `width/height:auto` conserve les dimensions
    réelles de l'image — dont dépend le recadrage du zoom (`clamp` lit `img.clientWidth`).
    ⚠️ **Pourquoi l'app ne l'avait pas** : `expedition.html` borne ses photos en `max-height:80vh`
    (#27), une unité viewport toujours calculable. La régie a réécrit ce zoom en pourcentages —
    la duplication documentée en dette technique a coûté ce bug. **Règle : borner une image en
    unités viewport, ou dans un bloc positionné ; jamais en pourcentage sous un parent flexible.**
    ⚠️ **Aucun banc ne pouvait le voir** — c'est de la mise en page pure, et Chromium ne
    s'installe pas dans l'environnement de développement (même leçon que #55/#58 et que les deux
    défauts du site vitrine, § #61). Signalé à l'œil, corrigé à l'aveugle : **à confirmer
    visuellement**. `BUILD` `regie.html` → `2026-08-16.4`, `CACHE` **v32→v33**.

### Local, non poussé (2026-08-16) — QR pointant un chemin local (signalé à l'œil)

68. **Ouverte depuis le disque, la console encodait `file:///C:/Users/…` dans le QR d'accès.**
    Symptôme : QR affiché par la régie ouverte en double-clic → l'URL sous le QR était un chemin
    Windows. Un capitaine qui le scanne n'arrive nulle part. Cause : `joinUrl`/`diapoUrl`
    construisaient l'adresse depuis `location.origin + location.pathname`, ce qui est juste
    quand le fichier est **servi**, et absurde en `file://`.
    ⚠️ **Défaut identique dans `expedition.html`** (QR d'accès **et** lien du diaporama),
    corrigé au passage — pas seulement là où c'était signalé.
    Correctif : constante `PUBLIC_BASE` (adresse publiée) + repli automatique hors http/https.
    Servie normalement, la construction est **strictement inchangée** : l'app suit son origine,
    donc un déploiement ailleurs continue de fonctionner sans retouche. Le repli n'entre en jeu
    que sur `file://`. L'overlay QR de la régie affiche alors un avertissement rouge — sinon on
    croit tester la copie locale alors que le QR renvoie vers le site en ligne.
    ⚠️ **`PUBLIC_BASE` est un chemin en dur, dans les deux fichiers** : si le site déménage
    (autre dépôt, domaine propre), c'est le seul endroit à corriger, et rien ne le signalera —
    aucun test ne peut vérifier qu'une URL en dur est encore la bonne.
    ⚠️ **Piège de méthode, à retenir** : c'est ma suggestion d'ouvrir `regie.html` en local pour
    contourner le blocage de déploiement qui a exposé ce défaut. Tester en `file://` ne teste
    pas ce qui est servi — le service worker ne s'y enregistre pas non plus.
    `BUILD` `regie.html` → `2026-08-16.5`, `expedition.html` → `2026-08-16.2`, `CACHE` **v33→v34**.

### Poussés sur GitHub (2026-08-17, commit `ea0362a`) — Le cadre était imprimé hors du papier

⚠️ **Corrigé à partir d'un vrai tirage, jamais revérifié sur un vrai tirage.** Un nouveau
tirage paysage est le seul contrôle qui vaille.

69. **Zone de sécurité d'impression : les deux filets extérieurs étaient dans la bande que
    le labo rogne.** Symptôme signalé avec photo à l'appui (tirage paysage 10×15, chasse
    `LBM7`, équipe « Titi et gros minet ») : **le cadre n'était plus là**. Ni le filet noir,
    ni le filet doré, ni les losanges d'angle — seule restait une bande de parchemin nu
    entre le bord du papier et le filet de la photo.
    (1) **Cause, et elle n'est pas côté labo** : une impression sans marge **agrandit** le
    fichier de 2 à 5 % pour garantir l'absence de liseré blanc, puis rogne le débord — soit
    **2 à 3 mm perdus sur chaque bord**. Or le cadre posait ses filets à `pad*0.34` et
    `pad*0.55`, c'est-à-dire, avec le `pad` paysage de 40 px hérité de #55, à **1,2 mm et
    1,9 mm** du bord. Les deux tombaient dans la bande sacrifiée. Le portrait n'allait
    guère mieux (1,7 et 2,8 mm) — il n'avait simplement jamais été imprimé (§ en-tête).
    ⚠️ **Le fichier était pourtant parfaitement au format** : 1800×1200 = 3:2 = 15×10 cm
    exact, ce qui est précisément ce qui a masqué le défaut pendant six mois. « Le fichier
    fait le bon format » et « tout le fichier arrive sur le papier » sont deux choses
    différentes. Aucun recadrage n'a eu lieu : c'est le **bleed** qui a mangé le cadre.
    (2) **Correctif** : les insets deviennent **absolus, exprimés en millimètres de papier**
    (`PX_MM = LONG/152.4`), et non plus une fraction de `pad`. `SAFE = 4,5 mm` (53 px) pour
    le filet noir, `5,7 mm` (67 px) pour le doré. C'est ce **couplage à `pad`** qui est la
    vraie faute : #55 a réduit la marge pour agrandir la photo et a déplacé le cadre sans
    que personne ne le décide.
    (3) **Conséquences en cascade, toutes subies** : les filets ayant reculé, la marge de la
    fenêtre photo doit les contenir → `pad` passe à **77 px (6,5 mm) dans les deux
    orientations** ; et le bas du bloc de texte étant borné par le filet doré (`usableBot =
    H - i2 - 10`), le cartouche doit grandir sinon le texte est mis à l'échelle 0,4 et
    devient illisible → `foot` **150 → 190** en paysage, **300 → 328** en portrait.
    Le 328 n'est pas arbitraire : c'est la valeur qui **conserve la fenêtre portrait en 3:4
    exact** (1046×1395), propriété de #41 qu'une valeur ronde aurait cassée en silence.
    (4) ⚠️ **Le prix à payer, dit franchement : la photo paysage perd ~8 % de côté**
    (1347×1010 → 1244×933, soit −15 % de surface). C'est presque tout le gain de #55. Le
    calcul reste favorable : à 300 dpi la perte est invisible à l'œil sur un 10×15, alors
    qu'un cadre absent se voit du premier coup d'œil — et c'est le cadre qu'on vend.
    Le ratio de la fenêtre, lui, **ne change pas** (4:3 en paysage, 3:4 en portrait).
    (5) **Vérification** : `tests/test-print.js`, **38 tests** (`npm i jsdom && node
    tests/test-print.js`). Le banc du moteur annoncé en #59 avait été écrit dans `/tmp` et
    **perdu** — il est cette fois **dans le dépôt**. Il porte le test qui manquait :
    « rien de décoratif à moins de 4 mm du bord », dans les deux orientations, filets et
    textes compris. Rejoué contre l'ancienne géométrie, il tombe sur **9 échecs** — il
    aurait donc attrapé le défaut avant l'impression.
    ⚠️ **Ne jamais assouplir ce seuil.** 4 mm n'est pas une marge de confort : c'est
    2,5 mm de rognage mesuré plus 1,5 mm de tolérance de massicot.
    (6) **Maquettes** : `site/index.html` reproduit les cotes (dette connue) — recalculée.
    `commercial/plaquette.css` ne l'est **pas** et ne doit pas l'être : à l'échelle du
    livret le cartouche paysage ferait 3,4 mm, moins que la seule rose des vents du lockup,
    et `overflow:hidden` clipperait le texte sans rien signaler. Le commentaire du fichier
    dit désormais ce qui est fidèle (le ratio de la fenêtre) et ce qui ne l'est pas.
    (7) ⚠️ **Écart constaté au passage** : les `BUILD` des deux surfaces étaient restés à
    `2026-08-16.1` alors que les lots #65 à #68 sont dans les fichiers et que `CACHE` était
    bien à `v34`. Le journal annonçait `.5` et `.2`. Le seul témoin de version de l'app
    mentait donc — exactement le trou de diagnostic que #36 existe pour boucher. Les deux
    repartent alignés sur `2026-08-17.1`.
    **Aucune migration, aucun changement de schéma.** `BUILD` des deux surfaces →
    `2026-08-17.1`, `CACHE` **v34→v35** (`print-frame.js` est dans `CORE`).

## Dette technique / points de vigilance connus

- **[ARCHI — depuis 2026-07-30] Deux surfaces, un seul module partagé** (`expedition.html` /
  `regie.html` + `print-frame.js`). Le cadre de tirage est mutualisé depuis #59 — c'était le
  point chaud, il est traité. Reste dupliqué : `rowToGame`/`rowToSub`, l'export ZIP,
  `purgeGamePhotos`, le zoom photo, la génération de QR. ⚠️ **Un changement de schéma doit être
  répercuté dans les deux fichiers** — c'est aujourd'hui le vrai risque, plus le cadre.
  Prochain candidat à l'extraction si la douleur vient : le socle de mapping DB.
  ⚠️ **`expedition.html` ne démarre plus sans `print-frame.js`** (il lit `PrintFrame.Q` à
  l'évaluation du script inline). Le module est dans `CORE` du service worker, donc disponible
  hors ligne, mais ne jamais retirer le `<script src>` ni le passer en `defer`.
- **[CARTE LIVE — depuis 2026-08-16] Une position ne circule que si l'app de l'équipe est au
  premier plan** (#64). Téléphone verrouillé, appareil photo ouvert ou onglet en arrière-plan →
  le marqueur se fige ; l'âge affiché est le seul garde-fou. **Un marqueur immobile n'est pas
  une équipe immobile.** Aucun contournement en web (il faudrait une app native). Et comme le
  transport est éphémère par choix, il n'y a **aucun historique** : une position perdue l'est
  définitivement, on ne peut pas rejouer le trajet d'une équipe après coup. À rediscuter
  seulement si un vrai besoin apparaît en événement — le stockage rouvrirait un sujet RGPD
  (consentement, conservation, purge) aujourd'hui inexistant.
- **[VITRINE — depuis 2026-08-03] La maquette du tirage de `site/index.html` duplique les cotes
  de `print-frame.js`** (depuis #69 : portrait 1046×1395, paysage 1244×933, marge 77, sceau à
  cheval sur le filet). Aucun test ne relie les deux : une retouche du cadre laisserait la
  vitrine **mentir en silence**, sur la page qui sert justement à vendre le tirage. Recalculée
  le 2026-08-17 ; à revérifier à chaque évolution de #55/#58/#59/#69.
  ⚠️ `commercial/plaquette.css` duplique aussi ces cotes mais **volontairement infidèle** sur
  la marge et le cartouche (à l'échelle du livret, le texte serait clippé) — voir #69 (6).
  Ne pas « corriger » sans rapetisser le lockup puis rejouer `verif-pages.py`.
- **[VITRINE — depuis 2026-08-05] Le site est en production mais hors du dépôt** : `site/` se
  déploie par FTP chez OVH, sans versionnement ni historique. Une modification écrase la
  précédente et **rien ne permet de revenir en arrière** — seule la copie locale fait foi.
  À traiter le jour où le site bougera souvent : dépôt Git dédié, ou simple copie datée avant
  chaque envoi.
- **[VITRINE — depuis 2026-08-05] Le devis n'est pas un envoi garanti** : le formulaire prépare
  un message et propose trois sorties (Gmail, `mailto:`, copie), mais rien ne prouve que le
  visiteur aille au bout. Aucune trace, aucun accusé. Si les demandes n'arrivent pas, la réponse
  est un service tiers (Formspree, Web3Forms, Netlify Forms) — donc un compte de plus.
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
- ⚠️ **`Deployment cancelled` sur Pages : pousser un commit neuf, ne JAMAIS relancer le run**
  (constaté le 2026-08-16, lot #64 — 45 min perdues). Symptôme : le commit arrive bien sur
  `main` (re-clone + `diff` OK), le job `build` réussit et produit son artefact, mais
  `actions/deploy-pages@v5` échoue sur `Error: Deployment cancelled.` et le site continue de
  servir la version précédente.
  Enchaînement observé : (1) **deux pushes à 2 min d'intervalle** → Pages annule le déploiement
  en vol dès qu'un plus récent démarre (comportement documenté, seule certitude du lot) ;
  (2) le second run reste 10 min puis échoue ; (3) **chaque « Re-run all jobs » échoue en
  8-29 s** — relancer un run ne crée pas un déploiement neuf, il se fait rejeter aussitôt ;
  (4) **un push neuf débloque tout** et publie l'historique en attente.
  ⚠️ **Ne pas conclure sur la cause racine : elle n'est pas établie.** Une première explication
  (« un push par PAT ne déploie pas, il faut un compte admin à l'e-mail vérifié », ligne tirée
  de la réponse du support) a été **écartée** : le même PAT avait poussé `e0fa1b3` et `ec10128`
  la veille avec des déploiements réussis. La corrélation « tous les échecs sont sur mes
  pushes » ignorait que les succès de la veille en étaient aussi. Rien ne permet d'incriminer
  l'auteur du push.
  ⚠️ Pistes explorées **pour rien**, ne pas les refaire : environnement `github-pages` (règle de
  branche `main` = configuration par défaut, saine), incident GitHub (statut vert),
  réinitialisation de la source de publication (bascule « GitHub Actions » puis retour branche —
  **sans effet, et ne déclenche aucun build par elle-même**). Le support GitHub n'a répondu
  qu'une liste générique et a reconnu ne pas savoir expliquer ce message.
  ⚠️ Trompeur : Settings → Pages affiche « Last deployed il y a X minutes », or cet horodatage
  se met à jour à la **création** du déploiement, même annulé — il ne prouve rien. Seul le
  **contenu réellement servi** fait foi (sonder une page avec une chaîne datée, par ex. la date
  de mise à jour de `confidentialite.html`).
  ⚠️ **Sonder avec une chaîne de requête UNIQUE** — `…/sw.js?probe=<horodatage>`, jamais l'URL
  nue. Constaté le 2026-08-17 : `sw.js` nu renvoyait `expedition-v29` (état du 2026-08-05) alors
  que le même fichier en `?probe=2` renvoyait `v34` — c'est-à-dire douze jours d'écart entre
  deux lectures à trente secondes d'intervalle. Sans cette précaution on conclut à un
  déploiement mort qui va très bien, et on repousse pour rien. La sonde idéale est **petite et
  porteuse d'un numéro de version** : `sw.js` (constante `CACHE`) plutôt qu'un HTML de 4 000
  lignes ou qu'un fichier inchangé par le lot (`manifest.json` ne prouve jamais rien).
  ⚠️ Ordre de grandeur mesuré le 2026-08-17 (lot #69) : commit `ea0362a` sur `main`, **toujours
  pas publié 25 min plus tard** (`CACHE` servi encore à `v34`) ; il a fallu le push suivant
  pour que Pages publie les deux. Le schéma « un push reste en rade, le suivant débloque
  l'historique » est donc **la règle sur ce dépôt, pas l'accident** — prévoir une seconde
  livraison utile (mise à jour de doc, par exemple) plutôt qu'un commit vide.
  ⚠️ **Un run rouge ne signifie pas que la publication a échoué.** Constaté le 2026-08-16 :
  les runs #92 (10 min 26) et #95 (10 min 31) ont tous deux tourné **~10 minutes** — la durée
  d'attente maximale de `actions/deploy-pages` — puis échoué, **alors que le contenu était bien
  publié** (vérifié sur `confidentialite.html` et `regie.html`). Le déploiement aboutit, mais
  son statut ne remonte pas à l'action, qui abandonne. **Sur ce dépôt, juger un déploiement au
  contenu servi, jamais à la pastille d'Actions.**
- ⚠️ **Vérifier la date réelle (`date` en bash) avant de dater quoi que ce soit** — constaté le
  2026-08-16 : tout un lot a été daté du **6** août au lieu du **16**, par déduction depuis la
  date du dernier commit du dépôt au lieu d'une vérification. Contaminés : les entrées de
  journal, les constantes `BUILD` (dont la date **est** la convention, cf. #36) et les **deux
  politiques de confidentialité**, dont une déjà publiée chez OVH — donc un document juridique
  antidaté, à redéployer. La date d'un environnement de travail n'est jamais déductible du
  contenu du dépôt.
- ⚠️ **Rien de décoratif à moins de 4 mm du bord d'un tirage** (#69). Une impression sans
  marge agrandit le fichier de 2 à 5 % puis rogne le débord : **2 à 3 mm disparaissent sur
  chaque bord**, quel que soit le labo. Un fichier au format exact (1800×1200 = 15×10 cm)
  n'y change rien — « bon format » ne veut pas dire « tout arrive sur le papier ». Corollaire
  de méthode : **une cote de sécurité s'exprime en millimètres de papier, jamais en fraction
  d'une autre cote** — c'est en réduisant `pad` (#55) qu'on a déplacé le cadre hors du papier
  sans le décider. Le banc `tests/test-print.js` porte l'invariant, ne pas le desserrer.
- ⚠️ **Borner une image en unités viewport ou dans un bloc positionné, jamais en pourcentage
  sous un parent flexible** (#67). `max-height:100%` sur un enfant de conteneur `flex:1` est un
  pourcentage dont la base peut ne pas être résoluble : la contrainte saute **en silence** et
  l'image s'affiche à sa taille réelle, rognée par `overflow:hidden`. `object-fit:contain` ne
  sauve pas — il place le contenu dans la boîte, il ne redimensionne pas la boîte.
- ⚠️ **Avant de conclure qu'un correctif ne marche pas, vérifier la version qui tourne** (`BUILD`
  en bas de l'écran de préparation). Un cache HTTP ou un service worker périmé a déjà fait
  conclure à tort à un bug applicatif (#35/#36).
- ⚠️ **Écritures équipe = INSERT seul, jamais `upsert`** (RLS UPDATE réservée à l'admin, bucket
  sans policy UPDATE) — sinon le moindre retry se bloque en `42501`. Insert idempotent : `23505`
  (DB) et `409` (storage) valent succès.
- ⚠️ **`render()` est `async` et réécrit tout l'écran** : ne jamais lire/restaurer la valeur d'un
  champ après l'avoir appelé (encore moins sans `await`) — la valeur part dans le DOM remplacé.
  Un champ de saisie qui doit survivre se réémet depuis `STATE`, tenu à jour à chaque frappe
  (voir #49). Vaut pour tout formulaire, pas seulement l'inscription.
- ⚠️ **Photos : API Storage uniquement**, jamais de `delete from storage.objects` (#38).
- ⚠️ **Aucun `upsert` sur le bucket, pour personne** : il n'existe pas de policy UPDATE. Trois
  fonctions s'y sont brûlées (#26 preuves, #43 logo, #50 photo d'équipe). `upload(upsert:false)`,
  409 = succès ; pour remplacer un fichier, `remove()` **puis** `upload`.
- ⚠️ **Dans une policy RLS, qualifier les colonnes de la table protégée** : une sous-requête
  `exists (select 1 from autre_table x where ... colonne ...)` résout `colonne` sur `x` d'abord,
  en silence. C'est ce qui a rendu `photos_delete_owner` inopérante pendant un mois (#50).
- ⚠️ **L'API REST Supabase n'est pas joignable depuis le sandbox** (proxy) : impossible de
  vérifier une hypothèse sur les données par `curl`. Passer par le table editor ou une requête
  SQL demandée à l'utilisateur, plutôt que supposer.
- ⚠️ **`regie.html` se teste hors ligne, sous JSDOM, sans réseau.** Recette éprouvée
  (`npm i jsdom`) : retirer les `<script src>` du HTML, instancier `JSDOM` avec
  `runScripts:'outside-only'`, poser des stubs `window.supabase` / `qrcode` / `JSZip` /
  `confirm` / `fetch`, puis `window.eval(scriptInline)`. On exerce ensuite le rendu, les
  filtres, la rafale et les transitions de phase.
  ⚠️ **Deux pièges de ce banc**, tous deux déjà rencontrés :
  1. `const S = {…}` déclaré dans un `eval` **n'est pas** exposé sur `window` (seules les
     `function` le sont). Pour l'inspecter, concaténer une sonde au source évalué :
     `window.eval(src + ';window.__p={get S(){return S}};')`. En vrai navigateur le problème
     n'existe pas : un `<script>` classique met `const` dans le global lexical, que les
     handlers `onclick` inline voient parfaitement.
  2. `startRealtime` pose des `setInterval` : sans `process.exit()` final, le script Node ne
     rend jamais la main et le test part en timeout.
- ⚠️ **`print-frame.js` se teste avec un canvas ENREGISTREUR**, pas avec un vrai rendu :
  `node-canvas` ne s'installe pas dans le sandbox. On remplace `document.createElement('canvas')`
  par un objet dont le contexte 2D note les appels (`drawImage`, `arc`, `fillText`, `strokeRect`)
  et dont `measureText` renvoie `longueur × taille × 0,5`. On assert ensuite la **géométrie**
  (dimensions du canvas, rectangle réellement dessiné, rayon et centre du sceau, textes tracés).
  Le banc vit désormais **dans le dépôt** : `tests/test-print.js` (38 tests). Celui de #59
  avait été écrit dans `/tmp` et perdu — c'est pour ça que #69 n'a été vu qu'à l'impression.
  ⚠️ **Le sceau n'est pas le dernier `arc` tracé** : `drawRose` en dessine d'autres derrière lui
  (disque à `31·s`, cercle à `30·s`, moyeu à `3,4·s`). Prendre l'arc de **plus grand rayon**,
  jamais `.pop()` — l'erreur coûte deux faux échecs.
