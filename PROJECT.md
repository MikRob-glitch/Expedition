# Expédition · Chasse au trésor photo

Application web mobile (**PWA installable, capable hors-ligne**) pour une chasse au trésor multi-équipes. Les équipes résolvent des indices, prouvent chaque trouvaille par une **photo**, l'admin **valide** la conformité, puis un **jury vote** les meilleures photos. Synchronisation temps réel entre tous les téléphones.

> Sans build. Dépôt : `github.com/MikRob-glitch/Expedition`. Déploiement : GitHub Pages.
> **Deux surfaces** : `expedition.html` (joueurs + parcours admin mobile) et `regie.html`
> (console du maître du jeu, grand écran). Elles partagent la base, la session d'auth et
> **un module**, `print-frame.js` — le moteur du cadre de tirage.
> Le **journal des correctifs détaillé** (chronologique, numéroté) est dans [`CLAUDE.md`](CLAUDE.md).

---

## Stack

| Couche | Choix | Pourquoi |
|---|---|---|
| Frontend | HTML5 + Vanilla JS : `expedition.html` (~3670 l.) + `regie.html` (~2055 l.) + `print-frame.js` | Zéro build, démarrage instantané, debug trivial |
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
expedition.html            ← app joueurs + parcours admin mobile, SPA (~3670 lignes)
regie.html                 ← console maître du jeu, grand écran (~2055 lignes)
print-frame.js             ← moteur du cadre de tirage, PARTAGÉ par les deux (ne jamais dupliquer)
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
tests/test-print.js        ← banc JSDOM : géométrie du cadre de tirage (38 tests, zone de sécurité)
tests/test-map.js          ← banc JSDOM : carte live + minimap + émetteur de position (50 tests)
tests/test-merge.js        ← banc JSDOM : fusion d'équipes en doublon (29 tests, ordre des écritures)
.github/workflows/keepalive.yml ← ping Supabase (anti-pause tier gratuit)
.nojekyll                  ← désactive Jekyll sur GitHub Pages
site/                      ← SITE VITRINE (hors dépôt Git) — en prod sur www.expedition-selfiesafari.fr
  index.html               ←   fichier unique (~88 Ko) : accueil + campings + entreprises + devis
  confidentialite.html     ←   copie enrichie de la politique RGPD (§1 et §2 renseignés)
  .htaccess                ←   canonique www, forçage HTTPS, 404, cache HTML nul, compression
  test-site.js             ←   banc de 85 tests JSDOM ⚠️ NE JAMAIS DÉPLOYER (www est public)
commercial/                ← supports de vente + grille tarifaire (hors app, hors dépôt Git)
  plaquette.css            ←   feuille de style commune aux deux livrets
  livret-campings.html     ←   source — campings, villages de vacances, parcs
  livret-entreprises.html  ←   source — séminaires, incentive, CSE
  verif-pages.py           ←   contrôle anti-débordement, à lancer après chaque rendu
  Expedition_livret_campings.pdf    ←  6 pages A4, à envoyer aux hébergeurs
  Expedition_livret_entreprises.pdf ←  6 pages A4, à envoyer aux entreprises
README.md                  ← présentation + démarrage rapide
PROJECT.md                 ← ce fichier
ANALYSE_CONCURRENCE.md     ← paysage concurrentiel + positionnement retenu (hors dépôt Git)
CLAUDE.md                  ← guide de travail + journal des correctifs
```

> **`site/` et `commercial/` ne font pas partie de l'application** : aucun fichier n'y est servi
> par Pages, et une modification n'entraîne **ni bump de `BUILD` ni bump de `CACHE`**. Le service
> worker ne les connaît pas.
>
> **Site vitrine — en production depuis le 2026-08-05** : <https://www.expedition-selfiesafari.fr>,
> domaine + hébergement **OVHcloud** (`hosting-free-100m`, 100 Mo, FTP, pas de SSH), déployé en
> copiant le **contenu** de `site/` dans le dossier `www`. Deux hébergements indépendants : l'app
> reste sur GitHub Pages. Détail complet et pièges : #61 dans [`CLAUDE.md`](CLAUDE.md).
>
> ⚠️ **AUCUN TARIF dans `site/`** — même règle que `commercial/` et que le mode commande de la
> régie (#60), pour la même raison : ce qui est servi sur le web est lisible par un concurrent.
> Trois tests du banc échouent si un `€`, un montant de la grille ou un « HT » réapparaît.
>
> ⚠️ **`test-site.js` ne doit jamais partir sur le serveur** : `www` est intégralement
> téléchargeable à une URL devinable. Même raison qui a fait sortir un fichier de codes de
> secours OVH du dossier le 2026-08-03. **Règle : rien n'entre dans `site/` qui ne soit destiné
> à être public.**
>
> ⚠️ **La maquette du tirage de `index.html` recopie les cotes de `print-frame.js`** (portrait
> 1046×1395 dans 1200×1800, paysage 1244×933 dans 1800×1200, marge 77, sceau à cheval sur le
> filet bas — recalculées le 2026-08-17).
> **Rien ne relie les deux** : une retouche du cadre laisserait la vitrine afficher de fausses
> proportions sans qu'aucun test ne le signale — sur la page qui sert justement à vendre le
> tirage.
>
> ⚠️ **Le site n'est pas versionné** : déployé par FTP, il n'a ni historique ni retour arrière.
> La copie locale de `site/` est la seule référence.
>
> Vérification : `npm i jsdom && node site/test-site.js` — **85 tests** hors ligne (routeur,
> injection de l'e-mail de contact, fenêtre d'envoi du devis, géométrie de la boussole,
> contrastes en section sombre, règles du `.htaccess`, conformité tarifaire).
>
> **Deux livrets, une cible chacun** — le camping ne doit pas lire « séminaire », ni voir le
> tarif entreprise. Chacun n'affiche que **sa** grille (montants dans `commercial/`, hors dépôt).
> ⚠️ Rien ne synchronise les deux fichiers : une révision de prix se répercute **à la main dans
> les deux**.
>
> ⚠️ **Toute révision de prix doit repasser deux tests** (voir #47) : le **prix par tête à plein
> doit décroître** le long de l'échelle, et **pousser une formule au plafond de la suivante doit
> coûter au moins le prix de la suivante**. La première grille échouait aux deux, ce qui rendait
> les formules hautes strictement moins intéressantes que l'entrée de gamme.
>
> ⚠️ **Deux plafonds différents, à ne pas confondre.** Le plafond **commercial** (affiché dans
> les livrets) suit l'effectif réellement attendu à une animation. Le plafond **opérationnel**
> (~10 équipes, soit 50 participants pour un animateur seul) vient de la validation photo par
> photo et du vote 50/30/10, tous deux manuels sur un seul écran. Le premier est aujourd'hui
> bien en dessous du second : c'est confortable, et il ne faut pas remonter le commercial
> jusqu'au technique sans avoir d'abord réglé le goulot d'arbitrage.
>
> ⚠️ **Le modèle économique repose sur la répétition, pas sur la date isolée** : rapportée aux
> heures réellement travaillées, une date unique paie mal. Repérage et écriture s'amortissent
> dès la deuxième date sur le même site, d'où le **forfait saison** qui est le cœur de l'offre
> et non une option. Détail : #47 dans [`CLAUDE.md`](CLAUDE.md).
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

> `active → validation` est calculé à la fin du temps imparti, mais **persisté uniquement par l'admin** (les équipes le calculent en local). La console `regie.html` étant elle aussi admin, elle persiste la bascule de la même façon.

> Toutes ces transitions existent **des deux côtés** : écrans admin de `expedition.html` et panneau « Pilotage » de `regie.html`. La régie y ajoute `±5/±10 min` en cours de partie et « rouvrir le vote du jury » depuis une chasse clôturée.

**Retours en arrière** (le maître du jeu n'est jamais coincé) :

- `judging → validation` : bouton « ← Validation » (`backToValidation`).
- `validation → active` : bouton « ↩︎ Reprendre la chasse » (`resumeHunt`) — remet `ended_at` à `null` et **décale `started_at`** pour restituer exactement le temps qui restait ; si le chrono était épuisé, un prompt demande les minutes à ajouter (défaut 15) et la durée n'est allongée que si l'ajout dépasse la durée initiale. ⚠️ Sans ce décalage, le contrôle de chrono en tête de `render()` rebasculerait aussitôt en `validation`. Les équipes repassent de l'écran d'attente à l'écran de jeu par realtime.
- `setup → menu de préparation` : bouton « ← Menu » (`backToSetup`) — **détache seulement l'appareil** (`me.gameCode = null`, realtime coupé, brouillons remis à zéro) ; la chasse reste en `setup` et se retrouve dans « Reprendre une session ». Avant, sortir du lobby imposait « Annuler » (= suppression) ou `logout()`. Le bouton de suppression est désormais libellé « Supprimer 🗑 ». Voir `CLAUDE.md` #52.
- `validation → ended` **sans aucune photo** : le bouton principal devient « Clôturer la chasse → » (`finalizeGame`, saut direct par-dessus `judging`) au lieu d'être grisé. Sans lui, une chasse terminée à vide était un cul-de-sac : ni jury, ni fin, donc **ni corbeille RGPD** (le bouton de purge vit sur l'écran de fin). Voir `CLAUDE.md` #51.

### Routeur `render()`

SPA mono-fichier sans framework, propre à `expedition.html` (la console `regie.html` a son
propre rendu, décrit plus bas). `render()` lit `STATE` et choisit l'écran : configuration Supabase, sélection de rôle, **login admin (code email)**, puis côté **admin** (setup → lobby → live → validation → vote jury → fin) et côté **équipe** (join → lobby → active/capture → attente → fin). Deep-links : **diaporama public** `?diapo=CODE`, **accès joueur** `?join=CODE` (inscription pré-remplie).

### Identité & temps réel

- `localStorage.me` = `{ role, id, gameCode }`, par appareil. Seul pointeur reliant l'appareil à une partie.
- **Admin** : authentifié par **Supabase Auth** (code OTP email) ; `me.id` = `auth.uid()`, vérifié par les RLS (`games.admin_id`). Les **équipes** restent anonymes (clé `anon`).
- Abonnement Realtime (websockets) sur `games`, `teams`, `submissions` filtré par `game_code`, + poll de sécurité (~15 s).

---

## Fonctionnalités clés

### Console maître du jeu (`regie.html`)

Fichier **autonome** servi à côté de `expedition.html`, même projet Supabase, même schéma,
**même session d'auth** — le client supabase-js range son jeton en `localStorage` sur l'origine,
donc se connecter d'un côté connecte l'autre. `expedition.html` n'est pas modifié.

**Pourquoi.** Le parcours admin de l'app est une suite d'écrans mobiles (lobby → live →
validation → jury → fin) : on n'y voit jamais le chrono, les équipes et le flux de photos en
même temps. La régie met tout sur un écran, en **1 / 2 / 3 colonnes** selon la largeur ; sous
900 px elle bascule en trois onglets **Pilotage / Travail / Outils**.

**Le vrai gain est l'arbitrage.** La validation peut se faire **pendant** la chasse, au fil des
arrivées, au lieu de tout empiler à la fin — c'est le goulot chiffré au §&nbsp;#47 de
[`CLAUDE.md`](CLAUDE.md) (~11 s par photo à 8 équipes × 10 indices, intenable à 14). S'y ajoutent
un **mode rafale** plein écran et un « tout marquer conforme » sur la sélection filtrée.

| Panneau | Contenu |
|---|---|
| Pilotage | Chrono + barre de progression, compteurs, actions de phase (démarrer, ±5/±10 min, terminer, reprendre, jury, clôturer, rouvrir) |
| Équipes | Score live, progression indice par indice (pastilles), dernière activité, indices de départ + « Répartir auto », retrait en `setup` |
| Preuves | Flux filtrable **statut × équipe × indice**, ✓/✗ en un clic, annulation d'une décision, lot « tout conforme » |
| Jury | Photos groupées par indice, 🥇50/🥈30/🥉10 avec compteur `n/3` par indice |
| Classement | Temps réel, mêmes règles de score que l'app |
| Diffusion | QR d'accès joueurs, QR du diaporama, lien copiable, export ZIP |
| Tirages | Choix de chaque équipe, choix de secours pour une équipe absente, **aperçu du tirage encadré, téléchargement à l'unité ou en ZIP**, complétion automatique des choix manquants |
| Commande | **Tirages à la demande** : n'importe quelle photo, en n exemplaires, panier persistant + bon de commande (voir plus bas) |
| Carte | **Minimap permanente** dans la colonne Pilotage + **carte live** plein écran (voir plus bas) |
| Doublons | **Fusion** d'une équipe réinscrite vers l'équipe conservée (bouton `⇄`, voir plus bas) |
| RGPD | Purge de la chasse et de ses photos |

**Raccourcis clavier** : `V` rafale · `→`/`A`/`Espace` conforme · `←`/`R` refuser · `S` passer ·
`Retour arrière` revenir · `Q` QR · `E` export · `T` tirages à la demande · `M` carte ·
`1`–`3` onglets · `?` aide · `Échap` fermer.

#### Fusion d'équipes en doublon

Une équipe qui se réinscrit au lieu de se reconnecter crée une seconde ligne, et ses preuves se
retrouvent éparpillées. Bouton `⇄` sur chaque ligne d'équipe (**toutes phases**, dès qu'il y a
deux équipes) → sélecteur de l'équipe à **conserver** → confirmation détaillée.

⚠️ **Fusionner, jamais supprimer.** `submissions` porte `on delete cascade` sur `teams` :
supprimer une équipe déjà active détruirait ses preuves **et** laisserait leurs fichiers
orphelins dans le bucket (les chemins ne se reconstruisent que depuis les lignes effacées).
L'ordre est donc **preuves réaffectées, puis ligne supprimée** — jamais l'inverse, et un échec
du transfert interrompt tout sans rien supprimer. La corbeille 🗑 reste réservée à `setup`.

- **Réglages** : `start_clue_id` et `print_submission_id` repris **seulement si** l'équipe
  conservée n'en a pas. Une sentinelle `team:<source>` en choix de tirage est ignorée (elle
  pointe une photo qui disparaît).
- **Photo d'équipe** : le fichier est nommé d'après l'id. Si la cible n'a pas de photo, celle du
  doublon est recopiée sous son id (`upload(upsert:false)` — le bucket n'a pas de policy
  UPDATE) ; sinon elle est retirée. **Le fichier source est supprimé dans les deux cas.**
- ⚠️ **La fusion n'arbitre pas.** Si les deux équipes ont couvert le même indice, les deux
  preuves survivent et le score **additionne les deux**. Ces collisions sont détectées,
  affichées dans le sélecteur et listées dans la confirmation : à toi de refuser une des deux
  photos dans le flux. Automatiser serait arbitraire — la seconde est parfois la meilleure.

Banc : `tests/test-merge.js`, **29 tests JSDOM** dont un stub Supabase qui **enregistre l'ordre**
des opérations — c'est ce qui garantit que le cascade ne peut pas être déclenché à l'envers.

#### Minimap permanente (colonne Pilotage)

Panneau « Carte » de 230 px sous le chrono, visible en continu, avec « ⤢ Agrandir » vers
l'overlay. Il n'apparaît que s'il y a **quelque chose à montrer** (au moins un indice localisé
ou une position reçue) : pas de carte morte, pas d'instance Leaflet créée pour rien.

⚠️ **Le point délicat est le cycle de vie de Leaflet.** `paintConsole()` réécrit tout `#app` à
chaque événement realtime — une carte rendue dans ce HTML serait détruite et recréée en boucle.
Le nœud `#mini-canvas` est donc **créé une fois et conservé détaché du document** ; après chaque
peinture, `mountMini()` le ré-insère dans l'emplacement `#mini-slot`. Leaflet survit à un
**déplacement** de son conteneur, jamais à sa destruction. Corollaires :

- `invalidateSize()` après réinsertion et au changement d'onglet — un conteneur détaché ou une
  colonne masquée mesurent 0×0, et Leaflet garde cette mesure.
- **Cadrage une seule fois** (`MINI.fitted`) : recadrer à chaque position arracherait la vue.
  `miniFit()` recadre à la demande et à la première position d'une équipe.
- Marqueurs mutualisés avec l'overlay via `syncTeamMarkers(ctx, small)` — icônes 22 px et
  infobulle au survol côté minimap, 30 px et étiquette permanente côté plein écran.
- `stopRealtime()` détruit l'instance : la chasse suivante est ailleurs.

#### Carte live (indices + positions des équipes)

Overlay plein écran de la console (bouton « 🗺️ Carte », touche `M`, `Échap` ferme). But :
**localiser une équipe en difficulté pour la guider**. Le maître du jeu voit les indices
**nommés et numérotés** — pas d'anonymisation ici, contrairement à la carte équipe.

**Transport : Realtime Broadcast, rien en base.** Pendant la phase `active`, chaque appareil
équipe émet sa position sur le canal `pos:{code}`, throttlée à **15 s** (batterie + quota
Realtime). Aucune migration, **aucune donnée de localisation stockée ni conservée** : rien à
purger, empreinte RGPD minimale. L'émission démarre en `active` et s'arrête partout ailleurs
(validation, fin, déconnexion). La console écoute le canal **dès l'ouverture de la chasse**,
pas à l'ouverture de la carte : les dernières positions sont déjà là quand on l'ouvre.

Marqueurs équipe = initiale + étiquette permanente « nom · il y a Xs », **grisés au-delà de
60 s**. Le pied de carte liste chaque équipe (localisée avec précision ±m, ou jamais reçue).

⚠️ **Limite navigateur, assumée et affichée dans le pied de carte** : une position n'est émise
que si l'application de l'équipe est **au premier plan** avec le GPS autorisé. Téléphone
verrouillé ou appareil photo ouvert → le marqueur se fige, d'où l'âge affiché. **Un marqueur
figé n'est pas une équipe immobile.** Un refus de géolocalisation est silencieux : l'équipe joue
sans partager sa position. La politique de confidentialité documente ce traitement éphémère.

#### Tirages à la demande (exemplaires vendus en plus)

Le tirage souvenir est **une** photo par équipe, offerte ou incluse dans la formule. Les livrets
prévoient en plus des tirages payants : le mode commande (`🛒 Tirages`, raccourci `T`) sert
exactement à ça.

- Grille de **toutes** les photos de la chasse, triées par équipe puis par ordre d'indice,
  **refusées et selfies d'équipe compris** — une belle photo n'est pas forcément une preuve
  conforme, et c'est souvent celle-là qu'on achète.
- Clic pour ajouter, `−/+` pour la quantité, loupe pour voir le cadre réel avant de vendre.
- Panier stocké en `localStorage` sous `order:{CODE}` : **rien en base**. ⚠️ La persistance
  n'est pas un luxe — la console peut être rechargée entre deux paiements, et un panier perdu
  se reconstitue de mémoire, donc mal.
- Sortie : ZIP `{CODE}_commande_{AAAAMMJJ-HHhMM}.zip`, **un fichier par photo** (le labo prend
  un fichier + une quantité ; envoyer N copies du même JPEG ferait payer N fois le transfert),
  quantité portée par le nom (`_x3`) **et** par un `bon-de-commande.txt` récapitulatif.
  Téléchargement à l'unité possible sans passer par le panier.

⚠️ **Aucun prix n'est codé en dur** : le dépôt est public, les grilles tarifaires n'y ont rien à
faire. Le prix unitaire est une **préférence locale** (`localStorage.print_unit_price`) saisie
une fois sur l'appareil du maître du jeu ; il ne sert qu'à afficher un total et à le reporter
sur le bon de commande. Un test du banc échoue si un tarif réapparaît dans le source.

⚠️ Ce mode n'existe **que** dans la console : la vente est un geste d'organisateur. Côté équipe,
la règle tient — épreuve filigranée, aucun téléchargement (voir `CLAUDE.md` #46).

**Hors périmètre, volontairement** : création/édition d'indices, tiroir des chasses types, carte
Leaflet. Tout le reste du travail du jour J est là.

**Points d'implémentation à connaître** :

- **Écritures** : uniquement des `UPDATE` ciblés (`games`, `submissions`, `teams`), jamais
  d'`upsert` — `games.is_template` n'apparaît dans aucun payload et ne peut donc pas être effacé.
- ⚠️ **`.select()` sur chaque `update()`** : sous RLS, un UPDATE qui ne touche aucune ligne
  (chasse d'un autre compte, `admin_id` legacy) renvoie **0 ligne sans erreur**. Sans ce contrôle,
  l'écran afficherait un changement de phase jamais écrit — même famille de pannes muettes que
  #26 / #43 / #50, attrapée cette fois à l'écriture.
- **Purge** : `purgeGamePhotos` (API Storage) **puis** RPC `admin_purge_game`, jamais l'inverse.
- **Chrono** : la régie étant admin, elle **persiste** la bascule `active → validation`.
- **Défilement** : chaque événement realtime repeint les panneaux ; le `scrollTop` des zones
  scrollables est relevé et restauré, et un test de signature évite de repeindre pour rien. La
  rafale n'est jamais repeinte sous les doigts.

⚠️ **Jamais ouverte dans un vrai navigateur ni sur un événement** au 2026-08-05 : syntaxe validée
et 45 tests fonctionnels JSDOM au vert, ce qui n'est pas un essai terrain.

### Indices de départ (dispersion)
Dans le **lobby**, l'admin assigne un **indice de départ distinct par équipe** (menu + « Répartir auto »). Chaque équipe ne voit **que son indice de départ** ; dès qu'elle l'a **réalisé (photo envoyée)**, les autres se débloquent. Optionnel (`teams.start_clue_id`, « — Aucun — »).

### Tiroir de chasses types
Un scénario prêt à rejouer se range au tiroir : étoile ☆ dans la liste des chasses, ou « ☆ Enregistrer comme chasse type » depuis le lobby. Le tiroir vit sur l'écran de préparation ; « Utiliser cette chasse type → » remplit le formulaire de création (indices, durées, lieu, logo) sans consommer le modèle.

Une chasse type est une ligne `games` avec `is_template=true` : **copie vierge**, aucune équipe, aucune preuve, jamais lancée. Elle est exclue des pickers de reprise et de duplication, et `resumeByCode` refuse son code.

⚠️ **Pourquoi une copie et non un drapeau sur une chasse jouée** : les modèles échappent à la rétention 90 j. Marquer une chasse déjà jouée immobiliserait hors purge les photos et les noms de ses participants. `saveAsTemplate` crée donc toujours une copie neuve ; la source reste soumise à la rétention. Migration : `migration-templates.sql`.

#### Écrire et gérer les modèles depuis la console (#70)

Depuis la régie, bouton **☆ Chasses types** du sélecteur de chasse : créer, **modifier**,
importer, exporter, dupliquer et supprimer un modèle, et **lancer une vraie chasse** depuis
un modèle (nom, date, lieu, durées) sans passer par le téléphone.

L'éditeur donne titre, texte, points, ordre et **coordonnées posées à la carte** (Leaflet :
indice sélectionné + clic, marqueurs déplaçables au glisser). ⚠️ La vue n'est **jamais**
repeinte à la frappe : chaque champ écrit dans `S.tpl`, seules les opérations de structure
repeignent la liste — d'où `paintClueGeo()`, qui met à jour les deux champs de coordonnées
après un clic carte sans reconstruire le formulaire.

**Import / export JSON** — `{name, location, durationMinutes, perClueMinutes, clues:[{title,
text, points, lat, lng}]}`, ou un simple tableau d'indices. C'est la voie de chargement d'un
scénario écrit hors ligne. L'import se fait **par fichier `.json`** (glisser-déposer ou
sélecteur), jamais par collage (#71) : le nom du fichier reste affiché, ce qui laisse une trace
de l'origine du modèle. Refus **avant lecture** : extension autre que `.json`, ou taille au-delà
de 512 Ko. La lecture et l'application sont deux temps distincts — `handleTplFile` lit,
`tplAccept` analyse, `tplImportReport` retient le résultat dans `S.tplImport`, et rien ne touche
au modèle avant le clic de validation.
⚠️ Le contenu du fichier est traité comme une **donnée hostile** : `normClues()` borne les
nombres, tronque les chaînes et réduit l'`id` d'un indice à `[A-Za-z0-9_-]` — cet id finit dans
un littéral JS d'attribut `onclick`.

⚠️ **Les id d'indices sont réattribués** à chaque duplication (`freshClues`) : deux chasses qui
partageraient un `clues[].id` désapparieraient leurs preuves, `submissions.clue_id` n'étant
qualifié que par `game_code`. Le **logo** est recopié sous le code de la nouvelle chasse, jamais
partagé avec le modèle — supprimer un modèle emporte son dossier Storage.

⚠️ **L'UPDATE d'un modèle ne porte ni `is_template`, ni `logo_url`, ni `admin_id`** : une
sauvegarde de contenu ne doit pas pouvoir sortir la ligne du tiroir ni perdre le logo. Et il
vérifie `.select()` — sous RLS, un UPDATE qui ne touche aucune ligne ne remonte pas d'erreur.

La régie **n'édite pas** les chasses ordinaires : l'éditeur d'indices de `expedition.html`
reste la voie de création à la volée. Arbitrage assumé — deux surfaces d'écriture sur
`games.clues`, pas trois. Banc : `tests/test-templates.js` (123 tests).

### Préparer plusieurs chasses à l'avance
Une chasse créée est **enregistrée immédiatement** (statut `setup`). Depuis le lobby, « ← Menu » ramène à l'écran de préparation pour en créer une autre ; le picker « Reprendre une session » (`loadSessionsForPicker` : `status='setup'` + `admin_id`) liste les chasses en attente et reprend directement au lobby. Aucune donnée n'est écrite ni effacée au passage.

### QR code : accès joueurs et diaporama
Un seul overlay (`#qr-overlay`), deux modes portés par la table `QR_MODES` et sélectionnés par `showQR(mode)` — chaque mode fournit son titre, son texte d'aide et sa fonction d'URL :

| Mode | Où | URL encodée | Usage |
|---|---|---|---|
| `join` (défaut) | lobby + live | `?join=CODE` | le joueur arrive **sur l'inscription équipe, code pré-rempli** |
| `diapo` | écran de fin | `?diapo=CODE` | à la remise des prix, chacun scanne pour **emporter le diaporama** |

Lib `qrcode-generator` (CDN, cachée par le SW) ; repli affichant l'URL en clair si elle n'a pas pu être chargée.

⚠️ **L'URL encodée suit l'origine servie, avec un repli hors http/https.** Ouvertes depuis le
disque (`file:///C:/…`), les deux surfaces encodaient ce **chemin local** dans le QR — un
capitaine qui le scanne n'arrive nulle part, et rien ne le signale tant que personne n'essaie.
Une constante `PUBLIC_BASE` prend donc le relais quand le protocole n'est pas http(s), et la
régie affiche alors un avertissement dans l'overlay. Servies normalement, les deux surfaces se
comportent exactement comme avant : elles suivent leur origine, donc un déploiement ailleurs
fonctionne sans retouche. ⚠️ **`PUBLIC_BASE` est en dur dans les deux fichiers** — c'est le seul
endroit à corriger si le site déménage, et aucun test ne peut vérifier qu'une URL en dur est
encore la bonne.

> Le mode `diapo` remplace l'idée d'envoyer le lien par mail : **une adresse mail serait une donnée personnelle de plus**, non couverte par le consentement ni par `confidentialite.html`. Le lien `?diapo=` étant public depuis l'origine, le QR ne fait que le rendre distribuable sur place.
> ⚠️ Le mode `diapo` n'a de sens qu'en statut `ended` : le diaporama ne montre que les photos **validées**. D'où le bouton placé sur l'écran de fin uniquement.
> ⚠️ Lien **public et non signé** : qui a le code voit les photos (déjà vrai avant, via « Copier le lien »).

### Géoloc des indices + carte d'orientation (Leaflet)
Chaque indice porte des coords **optionnelles**. Admin : « 📍 Placer sur la carte » / « 🎯 Ma position » dans l'éditeur d'indices. Équipe : bouton « 🗺️ Carte » (si ≥1 indice localisé) → tous les indices localisés en repères **anonymes** sauf le **départ** (★) et les indices **réalisés** (✓), + position live. ⚠️ Anonymisation **cosmétique** (client) : le payload `clues` transite via la clé `anon` (voir Sécurité).
Côté maître du jeu, la console dispose d'une **carte live** distincte (indices nommés + position de chaque équipe par broadcast éphémère) — voir « Console maître du jeu ».

### Vote du jury (50 / 30 / 10)
En `judging`, photos groupées par indice ; le jury attribue **🥇50 / 🥈30 / 🥉10** (3 max/indice, refusées incluses). Un seul de chaque rang par indice. Stocké dans `submissions.bonus_points`.

⚠️ **En dessous de 4 équipes, le vote ne trie rien** — constaté sur l'événement du 2026-08-06 : avec 3 équipes, les 17 photos ont **toutes** été primées. C'est arithmétique (3 médailles par indice, au plus 3 photos par indice). Sur une petite session, présenter le vote comme un moment de partage plutôt que comme un classement.

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

### Moteur du cadre (`print-frame.js`) — module partagé

Le cadre de tirage est la seule pièce mutualisée entre les deux surfaces. Extrait de
`expedition.html` le 2026-07-30 (#59) parce que la régie devait produire les tirages et que
recopier ~250 lignes de composition canvas — remaniées en #41, #42, #44, #55 puis #58 — aurait
figé ici une version dépassée dès le correctif suivant.

```js
PrintFrame.build(sub, team, game)   // → canvas 10×15 (1200×1800 ou 1800×1200)
PrintFrame.proof(sub, team, game)   // → épreuve 700 px filigranée « ÉPREUVE »
PrintFrame.toBlob(cv)               // → Blob JPEG (qualité PrintFrame.Q = 0,92)
PrintFrame.save(blob, nom)          // → téléchargement
PrintFrame.fileName(game, team)     // → Expedition_CODE_Equipe.jpg
PrintFrame.dateStr(game) · PrintFrame.safeFile(s) · PrintFrame.loadImage(url)
PrintFrame.PX_MM · PrintFrame.SAFE · PrintFrame.PAD   // cotes de la zone de sécurité (mm → px)
```

**Aucune dépendance** : ni Supabase, ni `STATE`, ni DOM applicatif. La chasse est passée en
argument — c'est la seule différence avec l'ancienne fonction, qui lisait `STATE.game`.
`expedition.html` conserve tous ses noms via des alias d'une ligne, donc **aucun appelant n'a
changé** : `const buildPrintCanvas = (sub, team) => PrintFrame.build(sub, team, STATE.game);`

⚠️ **`<script src="print-frame.js">` doit précéder le script inline** de `expedition.html`, qui
évalue `const PRINT_Q = PrintFrame.Q;` dès son chargement. Ni `defer`, ni fin de body.
⚠️ Le module est dans le `CORE` du service worker : disponible hors ligne comme le reste de
l'app-shell. Le retirer casserait le démarrage, en ligne comme hors ligne.

### Tirage souvenir encadré
Écran de fin **équipe** : l'équipe choisit **une** photo parmi les siennes (`teams.print_submission_id`) — sa **photo d'équipe est proposée en première vignette** —, avec une **loupe sur chaque vignette** pour l'ouvrir en grand et zoomer (pincer / molette / double-clic) avant de trancher. Écran de fin **admin** : liste des choix, choix de secours pour une équipe absente, aperçu, téléchargement à l'unité ou en ZIP `{CODE}_tirages.zip`. Le cadre est composé **en canvas** (`buildPrintCanvas`) — la photo passe par `fetch → blob → objectURL` pour ne pas souiller le canvas. Composition : parchemin, double filet, la **rose des vents en sceau à cheval sur le filet bas de la photo** (bord gauche collé à ce filet, 35 % du diamètre sous lui, dessinée **en dernier** pour recouvrir le filet — dessinée avant, elle paraissait derrière une vitre), « EXPÉDITION » sous elle, le **bloc de texte centré sur un axe commun** (équipe / chasse / lieu / date, chacun sur sa ligne en portrait ; **deux lignes** en paysage : équipe puis `chasse · lieu · date`) et le **logo du lieu** à droite du cartouche s'il a été joint à la chasse. ⚠️ Le sceau est ancré sur le rectangle **réellement dessiné** de la photo et dimensionné sur le **petit côté du tirage**, jamais sur la hauteur du cartouche. **Sortie au format fixe 10×15 cm** (1200×1800 portrait / 1800×1200 paysage, ~300 dpi) selon l'orientation de la photo ; la photo est posée entière (jamais rognée), le parchemin absorbe l'écart de ratio. ⚠️ **Zone de sécurité d'impression** : une impression sans marge agrandit le fichier de 2 à 5 % puis rogne le débord, soit **2 à 3 mm perdus sur chaque bord** — « bon format » ne veut pas dire « tout arrive sur le papier ». Les insets des deux filets sont donc **absolus, en millimètres de papier** (`PX_MM = LONG/152.4` ; noir à **4,5 mm**, doré à **5,7 mm**) et jamais une fraction de la marge : c'est ce couplage qui les avait posés à 1,2 et 1,9 mm du bord, où ils disparaissaient entièrement. Marge **77 px (6,5 mm)** dans les deux orientations. Fenêtre photo : **1046×1395** en portrait (3:4 exact, cartouche 328 px) et **1244×933** en paysage pour une 4:3 (cartouche 190 px). Le cartouche a dû grandir avec les filets : le bas du bloc de texte est borné par le filet doré. Prix payé, assumé : la photo paysage perd ~8 % de côté par rapport à la géométrie de #55 — invisible à 300 dpi, contrairement à un cadre absent. Migration : `migration-print-choice.sql`.

### Export ZIP des photos
Écrans **Jury** et **Fin** : télécharge **toutes les photos** d'une partie (filtrable par statut) en `{CODE}_photos.zip`, organisé `Équipe/HHhMM_statut_indice_id.jpg` (JSZip, pool de 8 requêtes). La **photo d'équipe** n'a pas de statut : elle échappe aux filtres et ouvre le dossier de son équipe sous `00_photo-equipe.jpg` (le préfixe la garde en tête au tri).

### Dupliquer une chasse passée
Voie principale : **liste de toutes mes chasses** (`loadGamesForDuplicate`, tout statut, tri par date) → sélection → « Dupliquer cette chasse ». Repli replié : **par code** (`duplicateByCode`), seul moyen de dupliquer la chasse d'un autre compte. Les deux passent par `duplicateFromCode` : indices (nouveaux `id`) + réglages (dont `location`) copiés dans le formulaire → **nouvelle session vierge**. La source n'est jamais modifiée.

Après la copie (chasse type, liste ou code), l'écran **remonte sur le champ « Date de la chasse »** et le surligne 4 s : les pickers vivent en bas de page et « Créer la chasse → » est un bouton sticky toujours visible — sans cette remontée, la nouvelle chasse partait à la date du jour sans que la **date prévue** ait été vue (voir `CLAUDE.md` #62).

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

### Côté `regie.html`

| Fonction | Rôle |
|---|---|
| `openGame` / `backToPicker` | Charger une chasse dans la console / revenir à la liste |
| `paintConsole` / `paintIfChanged` | Rendu des panneaux + test de signature (évite les repeints inutiles et la perte de défilement) |
| `panePilot` / `paneTeams` / `paneShots` / `paneJury` / `paneBoard` / `paneShare` / `panePrints` / `paneDanger` | Les huit panneaux |
| `patchGame` / `patchSub` | `UPDATE` ciblés **avec `.select()`** — détecte les écritures refusées silencieusement par les RLS |
| `decide` / `resetDecision` / `bulkApprove` | Conforme / refusée / validation en lot |
| `openBurst` / `burstDecide` / `burstSkip` / `burstBack` | Mode rafale plein écran (clavier) |
| `startHunt` / `addMinutes` / `endHunt` / `resumeHunt` / `goJudging` / `finalize` / `reopenJudging` | Cycle de vie de la chasse |
| `setVote` | Vote jury 50/30/10, unicité par indice |
| `openZoom` / `makeZoom` | Visionneuse zoom/pan (accepte la sentinelle `team:<id>`) |
| `openPick` / `pickPrint` | Choix de tirage de secours pour une équipe absente |
| `previewPrint` / `downloadPrint` / `downloadAllPrints` | Tirages encadrés via `PrintFrame` : aperçu, unité, ZIP `{CODE}_tirages.zip` |
| `fillMissingPrints` | Complète les choix manquants par la photo la mieux notée de chaque équipe |
| `openOrder` / `renderOrder` / `toggleOrder` / `setQty` | Commande de tirages supplémentaires (panier `localStorage`, quantités) |
| `previewAny` / `downloadOne` / `downloadOrder` | Aperçu et sortie d'une photo quelconque · ZIP de commande + `bon-de-commande.txt` |
| `openMap` / `closeMap` / `paintTeamMarkers` | Carte live : indices nommés + marqueurs équipes reçus par broadcast, vieillissement à 60 s |
| `paneMini` / `mountMini` / `syncTeamMarkers` / `miniFit` | Minimap permanente : nœud Leaflet persistant réinséré après chaque repaint, marqueurs partagés avec l'overlay |
| `openMerge` / `confirmMerge` / `mergeTeams` / `clueClash` | Fusion d'un doublon : preuves réaffectées **puis** ligne supprimée ; détection des indices couverts deux fois |
| `purgeGamePhotos` / `purgeGame` | Effacement RGPD : fichiers **puis** lignes |

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
8. **Tirage souvenir** : composé côté client (canvas), sortie fixe 10×15 à ~300 dpi — la qualité plafonne à ce que vaut la photo envoyée (1600 px). Depuis le 2026-08-17 le cadre tient dans une **zone de sécurité de 4,5 mm** (`tests/test-print.js` refuse tout élément décoratif à moins de 4 mm du bord), ✅ **validée sur tirage réel en paysage ET en portrait** — le cadre complet arrive sur le papier. ⚠️ Le portrait n'avait jamais été imprimé jusque-là et portait le même défaut : **un format de sortie non imprimé n'est pas un format validé**, même si son jumeau l'est.
9. **Reprise d'une chasse terminée** : `resumeHunt` restitue le temps restant mais ne « rejoue » rien — une équipe déjà déconnectée doit se reconnecter par la liste des équipes.
10. **Deux surfaces, un seul module partagé.** Le cadre de tirage est mutualisé (`print-frame.js`, #59) ; le socle — mapping DB, export ZIP, purge, zoom, QR — reste **dupliqué** entre `expedition.html` et `regie.html`. **Un changement de schéma se répercute à la main dans les deux.** Prochain candidat à l'extraction si la douleur vient : le mapping DB.
11. **La régie a servi sur un événement réel** (2026-08-06 : 3 équipes, 9 indices, 17 preuves, validation **et** vote menés depuis la console, arbitrage étalé sur toute la chasse). ⚠️ Deux réserves : cet événement tournait sur la version d'avant la carte live, la minimap et la fusion d'équipes — **ces trois-là n'ont jamais servi sur le terrain** (carte et minimap vérifiées en navigateur depuis) ; et **17 photos ne mettent aucune pression sur le débit d'arbitrage**, qui reste le vrai inconnu à effectif élevé. Restent aussi non éprouvés à l'œil : le **mode rafale** et l'affichage plein cadre des photos. Bancs **rejouables** conservés dans `tests/` : 38 (géométrie du cadre) + 50 (carte live, minimap, émetteur de position) + 29 (fusion d'équipes) = **117**. Le banc du cadre a dû être **réécrit** : celui de #59 vivait dans `/tmp` et a été perdu — c'est précisément pour cela qu'un cadre imprimé hors du papier n'a été découvert qu'au tirage. Le parcours admin de `expedition.html` reste le chemin éprouvé.
12. **Le site vitrine n'a ni versionnement ni retour arrière** (déployé par FTP), et son **devis n'est pas un envoi garanti** : le formulaire prépare le message et propose trois sorties (Gmail, `mailto:`, copie), mais rien ne prouve que le visiteur aille au bout, et aucune trace n'est conservée. Un envoi certain supposerait un service tiers (Formspree, Web3Forms, Netlify Forms).
13. **Aucun banc ne voit les pixels — quatre défauts l'ont prouvé.** Chromium ne s'installe pas dans l'environnement de développement : les bancs JSDOM vérifient le comportement et la géométrie, jamais le rendu. Sont passés au travers, et ont tous été **vus à l'œil par l'organisateur** : sur le site (2026-08-05) un `mailto:` **muet** sur un Windows sans client mail et du **gras noir sur fond noir** ; dans la régie (2026-08-16) des **photos tronquées à la validation** (`max-height:100%` sous un parent flexible : la contrainte saute, l'image s'affiche à sa taille réelle) et un **QR encodant un chemin `file://`**. Les deux premiers sont couverts par des tests ; les deux derniers ne peuvent pas l'être. **Règle qui en découle : borner une image en unités viewport ou dans un bloc positionné, jamais en pourcentage sous un parent flexible.**
14. **Les tests du cadre ne dessinent pas de pixels** : `node-canvas` ne s'installe pas dans l'environnement de développement, `tests/test-print.js` utilise un contexte 2D *enregistreur* et vérifie la **géométrie** (dimensions, rectangle dessiné, rayon et centre du sceau, textes tracés, distance au bord). Il attraperait une régression de mise en page, pas un défaut de rendu — ni ce que fait le labo du fichier. C'est un tirage réel, pas un test, qui a corrigé #55 (voir #58) puis #69 — et c'est un tirage réel, non le banc, qui a fermé #69 en confirmant les deux orientations.
15. **La carte live dépend du premier plan.** Une équipe n'émet sa position que si son application est ouverte et visible, GPS autorisé : téléphone verrouillé, appareil photo ouvert ou onglet en arrière-plan → le marqueur se fige. L'âge de chaque position est affiché pour cette raison ; **un marqueur immobile n'est pas une équipe immobile**. Contournement impossible en web : il faudrait une application native. Aucun historique non plus — le transport est éphémère, une position perdue l'est définitivement.

---

## Roadmap

- **Lot Edge Functions** (`service_role`) : verrouiller les écritures `teams`/`submissions`, servir à chaque équipe seulement ses indices autorisés (ferme la fuite des textes/GPS d'indices), **purger les fichiers du Storage** à l'échéance des 90 j (le cron ne sait plus le faire), et — si le tirage devient une vraie source de revenu — passer le bucket en **privé + URLs signées** avec rendu du cadre côté serveur (aujourd'hui les photos brutes sont publiques et l'épreuve filigranée n'est qu'un frein).
- **Supabase Pro** : plus de pause, backups quotidiens (remplace le keep-alive). Devient un
  **pré-requis commercial** dès la première date vendue : une pause du projet le jour J est
  inacceptable face à un client payant.
- **Commercialisation** (voir `commercial/`, `site/` et #47/#61) : le site vitrine et l'adresse
  `contact@expedition-selfiesafari.fr` sont en place. Restent **avant toute prospection réelle** :
  compléter téléphone / SIRET / statut juridique dans les deux livrets **et dans les deux copies
  de la politique de confidentialité** (`confidentialite.html` à la racine, `site/confidentialite.html`),
  souscrire une **RC pro** (annoncée page 4 des livrets), vérifier « Selfie Safari » à la **base
  Marques de l'INPI**, puis fermer la dette Edge Functions avant de démarcher un grand compte.
  ⚠️ Le domaine dicté au téléphone se transcrit naturellement `expedition-selfie-safari.fr`
  (trois tirets) — variante libre, à réserver en redirection si les erreurs se constatent.
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
- **Éprouver `regie.html` sur un vrai événement**, et produire un **tirage portrait réel** (le
  seul tirage produit à ce jour est un paysage, celui qui a corrigé #55). Ensuite seulement,
  décider s'il faut **factoriser le socle** (mapping DB, export ZIP, purge) comme on l'a fait
  pour le cadre : tant que la régie reste un complément, la duplication restante coûte moins
  cher que l'abstraction.
- **App native** (Expo/React Native) : le schéma et la logique ne changent pas.
- Notifications push quand le jury vote ; replay animé ; etc.

---

## Commandes utiles

```bash
# Serveur local (HTTPS recommandé pour la caméra)
python3 -m http.server 8000
# puis http://localhost:8000/expedition.html      (joueurs + admin mobile)
#      http://localhost:8000/regie.html           (console maître du jeu)
#      http://localhost:8000/regie.html?code=XXXX (console, chasse ouverte directement)
```

```bash
# Contrôle de syntaxe avant livraison (blocs <script> inline + scripts autonomes)
for f in expedition.html regie.html; do
  node -e "const h=require('fs').readFileSync('$f','utf8');
           new Function([...h.matchAll(/<script>([\s\S]*?)<\/script>/g)].pop()[1]);
           console.log('$f OK')"
done
node --check sw.js print-frame.js
```

```bash
# Bancs JSDOM — hors ligne, sans réseau ni base. À rejouer avant toute livraison.
npm i jsdom
node tests/test-print.js    # 38 — géométrie du cadre, zone de sécurité 4 mm
node tests/test-map.js      # 50 — carte live, minimap, émetteur de position
node tests/test-merge.js    # 29 — fusion d'équipes (ordre des écritures)
node site/test-site.js      # 85 — site vitrine (dossier hors dépôt)
```

> ⚠️ **Conserver tout nouveau banc dans `tests/`**, jamais dans `/tmp` : les 71 tests écrits
> pour la console, le moteur du cadre et le branchement de l'app ont été perdus ainsi — et le
> banc du cadre manquait précisément le jour où il aurait attrapé un cadre imprimé hors du papier.

> ⚠️ **Mise en ligne en un seul commit atomique** (`expedition.html` + `regie.html` +
> `print-frame.js` + `sw.js` ensemble) : l'app ne démarre plus sans le module, et un
> `cache.addAll` sur un 404 fait échouer l'installation du service worker. Un commit atomique
> supprime tout état intermédiaire — Pages déploie l'arbre entier d'un coup.

```sql
-- Effacer les LIGNES d'une chasse (cascade → teams + submissions)
-- ⚠️ Les fichiers du bucket ne sont PAS supprimés (restriction storage.objects) :
--    préférer la corbeille de l'app, qui purge d'abord les photos par l'API Storage.
select public.purge_game('XXXX');
```

---

## Historique des évolutions

Le **journal détaillé et numéroté** des correctifs (D4CK live, export ZIP, sécurité Lots 1–2, RGPD, géoloc/carte, PWA app-shell + outbox, reconnexion, branding, envoi idempotent, zoom, QR d'accès, `.nojekyll`, lieu de chasse + duplication par liste, purge Storage, **tirage souvenir** 10×15, photos 1600 px, logo du lieu, **épreuve filigranée**, **sortie de secours de la phase validation**, tiroir de chasses types, QR du diaporama, **sceau et centrage du cadre**, la **console maître du jeu `regie.html`**, l'extraction du moteur de cadre dans **`print-frame.js`**, les **tirages à la demande**, le **site vitrine mis en ligne**, la **carte live du maître du jeu**, la **minimap**, la **fusion d'équipes en doublon**, les **photos entières à la validation**, le **QR robuste hors http** et la **zone de sécurité d'impression du cadre**) est maintenu dans [`CLAUDE.md`](CLAUDE.md) — section « Journal des correctifs ».

> ⚠️ **Un bug de service worker trouvé en ajoutant la régie** (#57, `CACHE` v25→v26) : depuis #35, le handler de navigation écrivait **toute** réponse sous `'./expedition.html'`. Ouvrir `regie.html` une seule fois écrasait donc l'app-shell en cache — hors ligne, un **joueur** serait retombé sur la console du maître du jeu. Le chemin de cache est désormais celui du document réellement demandé.
