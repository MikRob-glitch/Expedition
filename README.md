# Expédition · Chasse au trésor photo

Application web mobile (**PWA installable, capable hors-ligne**) pour organiser une **chasse au trésor multi-équipes**. Les équipes résolvent des indices, prouvent chaque trouvaille par une **photo**, l'admin **valide** la conformité, puis un **jury vote** les meilleures photos. Synchronisation temps réel entre tous les téléphones.

> Zéro build, prêt à déployer : `expedition.html` (~3670 lignes) pour les joueurs et le parcours admin mobile, `regie.html` (~2055 lignes) pour la **console du maître du jeu** sur grand écran, et `print-frame.js` — le moteur du cadre de tirage, partagé par les deux. Documentation technique complète : [`PROJECT.md`](PROJECT.md) ; guide de travail pour modifier l'app : [`CLAUDE.md`](CLAUDE.md).

> 🌐 **Site vitrine en ligne** : [www.expedition-selfiesafari.fr](https://www.expedition-selfiesafari.fr) — la prestation, présentée aux campings et aux entreprises. Source dans le dossier local `site/` (**hors dépôt**), déployée **par FTP chez OVHcloud**, indépendamment de l'application. Contact : `contact@expedition-selfiesafari.fr`.

## Aperçu

- **Console maître du jeu** — `regie.html`, **éprouvée sur un événement réel** (validation des photos et vote menés depuis la console, arbitrage au fil de l'eau pendant la chasse) : chrono, équipes, flux de preuves, vote, classement et tirages **sur un seul écran** (1/2/3 colonnes selon la largeur, onglets au téléphone). Surtout, elle permet de **valider les photos pendant la chasse**, au fil des arrivées, au lieu de tout empiler à la fin — plus un **mode rafale** au clavier. Même connexion que l'app : se connecter d'un côté connecte l'autre.
- **Multi-équipes en temps réel** — websockets (Supabase Realtime) + poll de sécurité (~15 s).
- **Preuve par photo** — caméra native, compression côté client (1600 px, qualité adaptée à l'impression 10×15).
- **Accès joueurs par QR code** — l'admin affiche un QR ; au scan, l'appli s'ouvre sur l'inscription avec le code **pré-rempli** (`?join=CODE`).
- **Jugement live** — validation conforme/refusée par l'admin, puis vote du jury 50/30/10.
- **Chasses types** — rangez un scénario au tiroir : il se duplique à volonté, ne se consomme pas et **ne part pas au ménage automatique** des vieilles chasses. Depuis la console, un **éditeur complet** les écrit et les modifie : titre, texte, points, ordre, et **coordonnées posées au clic sur une carte** ; **import d'un fichier `.json`** (glisser-déposer ou sélecteur) et export, pour préparer un parcours hors ligne et le charger d'un bloc ; « Lancer une chasse » crée la session du jour depuis le modèle, sans le consommer.
- **Préparer à l'avance** — créez vos chasses quand vous voulez, quittez le lobby par « ← Menu » sans rien perdre, retrouvez-les dans « Reprendre une session » le jour J.
- **Doublon d'équipe** — une équipe qui se réinscrit au lieu de se reconnecter éparpille ses photos sur deux lignes. Un bouton `⇄` dans la console les **regroupe** sur l'équipe conservée puis supprime le doublon devenu vide, **à tout moment de la chasse**. Rien n'est perdu : jamais une suppression sèche, qui emporterait les preuves et laisserait leurs fichiers orphelins.
- **Marche arrière** — chasse terminée trop tôt ou par erreur ? Le maître du jeu la **reprend** en un bouton, avec le temps restant restitué ; et une chasse finie sans aucune photo peut être clôturée (donc supprimée) au lieu de rester bloquée.
- **Zoom sur les photos** — pincer / molette / double-clic / glisser pour juger les détails.
- **Indices de départ** — dispersion des équipes (un indice de départ distinct par équipe).
- **Carte d'orientation** — indices géolocalisables (optionnel) sur une carte Leaflet côté équipe (repères anonymes sauf départ + indices déjà réalisés).
- **Carte live du maître du jeu** — une **minimap permanente** dans la colonne de pilotage donne le coup d'œil sans quitter l'arbitrage, et « ⤢ Agrandir » (touche `M`) ouvre la carte plein écran : indices **nommés** et **position de chaque équipe en direct**, pour repérer une équipe en difficulté et la guider. Les positions transitent par un canal temps réel **éphémère** : rien n'est écrit en base, rien n'est conservé. ⚠️ Une équipe n'émet que si son application est **ouverte au premier plan** avec le GPS autorisé — l'âge de chaque position est affiché, et un marqueur figé n'est pas une équipe immobile.
- **Photo d'équipe** — selfie optionnel à l'inscription. C'est souvent la seule photo où l'équipe est au complet : elle s'affiche au lobby, au classement et **en en-tête d'équipe côté maître du jeu** (cliquable pour l'ouvrir en grand), elle est **proposée en premier au choix du tirage souvenir** et ouvre le dossier de l'équipe dans l'export ZIP.
- **Diaporama public** — photos en direct via l'URL `?diapo=CODE`.
- **Export ZIP** — toutes les photos d'une partie, archive organisée par équipe.
- **Tirage souvenir** — chaque équipe choisit sa photo préférée en fin de chasse — photo d'équipe comprise — (zoom sur chaque photo avant de trancher) ; le maître du jeu récupère les tirages **encadrés** au **format 10×15 prêt à imprimer** (portrait ou paysage), à l'unité ou en ZIP, **depuis l'application comme depuis la console**. Le cadre porte la rose des vents en **sceau à cheval sur la photo**, puis, centrés sous elle, le nom de l'équipe, celui de la chasse, le lieu et la date — et le **logo du lieu** à droite si vous en joignez un. Une équipe partie sans choisir ? Un bouton retient sa photo la mieux notée, modifiable ensuite ligne par ligne. Le cadre respecte une **zone de sécurité de 4,5 mm**, **validée sur tirage réel dans les deux orientations** : une impression sans marge agrandit le fichier puis rogne 2 à 3 mm sur chaque bord, et jusqu'au 17 août les filets étaient posés à 1,2 mm — ils n'arrivaient tout simplement pas sur le papier.
- **Tirages à la demande** — pour vendre des exemplaires supplémentaires : la console propose **toutes** les photos de la chasse (refusées et selfies compris), on choisit quantité par quantité, et le ZIP part avec un **bon de commande** récapitulatif. Le prix unitaire est un réglage local, jamais une valeur inscrite dans le code.
- **PWA offline** — service worker (app-shell en cache) + **file d'envoi photo hors-ligne** (IndexedDB) : un rechargement en coupure ne casse plus rien, une photo prise sans réseau part automatiquement au retour du réseau.
- **Dupliquer / supprimer une chasse** — liste de toutes vos chasses passées : re-jouer les mêmes indices en une nouvelle session, ou effacer définitivement (photos comprises).
- **Sécurité & RGPD** — auth admin par **code email** (Supabase Auth), **RLS scopées**, bucket photos verrouillé (INSERT public + DELETE réservé au propriétaire, aucun UPDATE), consentement + politique de confidentialité + purge automatique à 90 j (⚠️ les fichiers restent à purger depuis l'app, voir [`PROJECT.md`](PROJECT.md)).

## Stack

| Couche | Choix |
|---|---|
| Frontend | HTML5 + Vanilla JS, zéro build : `expedition.html` (~3670 l.) + `regie.html` (~2055 l.) + `print-frame.js` (module partagé) |
| Caméra | `<input type="file" capture>` (natif iOS/Android) |
| Backend | Supabase (Postgres + Realtime + Storage + **Auth**) |
| Carte | Leaflet 1.9.4 + tuiles OpenStreetMap (orientation des indices, carte live de la console) |
| PWA | `manifest.json` + `sw.js` (app-shell offline) + outbox IndexedDB + icônes any/maskable |
| CDN | supabase-js@2, jszip@3.10.1, qrcode-generator@1.4.4, Leaflet 1.9.4 |
| Hébergement | GitHub Pages (`.nojekyll`) — HTTPS requis pour la caméra |

> ℹ️ Le **GPS des preuves** du prototype initial reste retiré (la preuve est purement photographique). À ne pas confondre avec la **géoloc optionnelle des indices** (carte d'orientation), réintroduite depuis.

## Démarrage rapide

**1. Supabase (~5 min)**

1. Créer un projet gratuit sur [supabase.com](https://supabase.com).
2. **SQL Editor** → coller [`supabase-setup.sql`](supabase-setup.sql) → **Run** (schéma + RLS scopées + bucket verrouillé + fonctions RGPD).
3. **Auth** : activer le provider **Email** et inclure le jeton `{{ .Token }}` dans le template « Magic Link / OTP » (code admin à 6 chiffres). SMTP custom recommandé en prod.
4. **Settings → API** → noter le `Project URL` + la clé `anon public`.

**2. Hébergement**

Le dépôt se déploie sur **GitHub Pages** (le fichier `.nojekyll` à la racine désactive Jekyll et évite l'échec de build sur les `{{ }}` des docs). Alternatives : Netlify Drop / Vercel (HTTPS obligatoire pour la caméra).

| Surface | URL | Hébergeur |
|---|---|---|
| Joueurs + admin mobile | `https://mikrob-glitch.github.io/Expedition/expedition.html` | GitHub Pages |
| Console maître du jeu | `https://mikrob-glitch.github.io/Expedition/regie.html` (ou `…/regie.html?code=XXXX`) | GitHub Pages |
| Diaporama public | `…/expedition.html?diapo=CODE` | GitHub Pages |
| **Site vitrine** (commercial) | `https://www.expedition-selfiesafari.fr` | OVHcloud, dépôt FTP |

> ⚠️ Les deux hébergements sont **indépendants** : le site vitrine ne passe pas par le dépôt GitHub, et l'application ne passe pas par OVH. Une mise à jour de l'un n'affecte jamais l'autre.

**3. Première utilisation**

L'app embarque des valeurs Supabase **par défaut** codées en dur (`SUPABASE_DEFAULTS`), surchargables via l'écran **Configuration** (`localStorage` : `sb_url` / `sb_key`, par navigateur). L'**admin** se connecte par **code email** ; les **équipes** rejoignent par **code de chasse** (saisi ou via **QR code**).

## Développement local

```bash
# Serveur local (HTTPS recommandé pour la caméra)
python3 -m http.server 8000
# puis ouvrir http://localhost:8000/expedition.html
#           ou http://localhost:8000/regie.html   (console maître du jeu)
```

> ⚠️ **Toujours passer par un serveur local, jamais par un double-clic sur le fichier.** En `file://`, le service worker ne s'enregistre pas et le QR d'accès encoderait un chemin de votre disque : les deux surfaces retombent alors sur l'adresse publiée (constante `PUBLIC_BASE`) et la régie l'affiche en rouge, mais **vous ne testez plus ce qui sera servi**.
>
> ⚠️ Les bancs sont hors ligne et se rejouent en une commande : `npm i jsdom` puis `node tests/test-print.js` (38 tests — géométrie du cadre, dont l'invariant « rien de décoratif à moins de 4 mm du bord »), `node tests/test-map.js` (50 — carte live, minimap, position) et `node tests/test-merge.js` (29 — fusion d'équipes). **Conserver tout nouveau banc dans `tests/`**, jamais dans `/tmp` : c'est pour l'avoir oublié qu'un cadre imprimé hors du papier n'a été vu qu'au tirage.
>
> ⚠️ En modifiant `sw.js`, **bumper la constante `CACHE`** à chaque changement d'app-shell, sinon les appareils gardent l'ancienne version en cache. Le déploiement se fait par commit + push GitHub (procédure dans [`CLAUDE.md`](CLAUDE.md)) — **un seul push, puis attendre** : deux poussées rapprochées font annuler le déploiement en vol par Pages.
>
> ⚠️ Les deux fichiers HTML partagent **un seul module**, `print-frame.js` (le cadre du tirage). Tout le reste — mapping DB, export ZIP, purge, zoom, QR — est encore dupliqué : **un changement de schéma se répercute dans les deux**. Règle du projet : au-delà d'une poignée de lignes, extraire un module, jamais copier.
>
> ⚠️ `expedition.html` **ne démarre plus sans `print-frame.js`** : le `<script src>` doit rester avant le script inline, et sans `defer`. À la mise en ligne, pousser ces fichiers **en un seul commit atomique** — publiés séparément, l'app ne démarre pas sans le module et un `cache.addAll` sur un 404 fait échouer l'installation du service worker.

## Prestation

L'application sert d'abord à **animer des événements** — commercialisés sous le nom **« Selfie Safari »** : chasses au trésor photo clé en main pour campings, villages de vacances, parcs de loisirs et séminaires d'entreprise.

**Vitrine** — [www.expedition-selfiesafari.fr](https://www.expedition-selfiesafari.fr), un `index.html` unique dans le dossier local `site/` (**hors dépôt**) : accueil + une page par cible (campings / entreprises), routeur par ancre, maquette animée du tirage, formulaire de devis. **Aucun tarif** n'y figure — le site est public, la conversion passe par le devis, et trois tests du banc échouent si un montant réapparaît. 85 tests JSDOM hors ligne. Déploiement : les trois fichiers de `site/` (`index.html`, `confidentialite.html`, `.htaccess`) dans le dossier `www` du FTP OVH — **jamais `test-site.js`**.

**Livrets et tarifs** — les supports de vente (deux livrets PDF de 6 pages, un par cible : vacanciers / collaborateurs, sources HTML regénérables par WeasyPrint) et la **grille tarifaire** vivent dans le dossier local `commercial/`, **volontairement hors dépôt** : le dépôt est public, les prix n'y ont rien à faire. Même règle partout — ni dans le code (le prix unitaire des tirages est une préférence locale, jamais une constante), ni sur le site vitrine, ni dans les docs publiées.

> Les plafonds affichés dans les livrets suivent l'effectif réellement attendu ; la limite technique est ailleurs, autour de 10 équipes (validation photo par photo + vote du jury, manuels sur un seul écran). Le modèle repose sur la **répétition** : le parcours est écrit une fois puis rejoué.

Le positionnement — sur-mesure, zéro friction joueur (ni app à installer ni compte), vote de jury artistique et tirage souvenir encadré — est analysé face au marché dans `ANALYSE_CONCURRENCE.md` (hors dépôt).
