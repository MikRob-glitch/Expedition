# Expédition · Chasse au trésor photo

Application web mobile (**PWA installable, capable hors-ligne**) pour organiser une **chasse au trésor multi-équipes**. Les équipes résolvent des indices, prouvent chaque trouvaille par une **photo**, l'admin **valide** la conformité, puis un **jury vote** les meilleures photos. Synchronisation temps réel entre tous les téléphones.

> Application mono-fichier (`expedition.html`, ~3360 lignes), zéro build, prête à déployer. Documentation technique complète : [`PROJECT.md`](PROJECT.md) ; guide de travail pour modifier l'app : [`CLAUDE.md`](CLAUDE.md).

## Aperçu

- **Multi-équipes en temps réel** — websockets (Supabase Realtime) + poll de sécurité (~15 s).
- **Preuve par photo** — caméra native, compression côté client (1600 px, qualité adaptée à l'impression 10×15).
- **Accès joueurs par QR code** — l'admin affiche un QR ; au scan, l'appli s'ouvre sur l'inscription avec le code **pré-rempli** (`?join=CODE`).
- **Jugement live** — validation conforme/refusée par l'admin, puis vote du jury 50/30/10.
- **Zoom sur les photos** — pincer / molette / double-clic / glisser pour juger les détails.
- **Indices de départ** — dispersion des équipes (un indice de départ distinct par équipe).
- **Carte d'orientation** — indices géolocalisables (optionnel) sur une carte Leaflet côté équipe (repères anonymes sauf départ + indices déjà réalisés).
- **Photo d'équipe** — selfie optionnel à l'inscription, affiché au lobby et au classement.
- **Diaporama public** — photos en direct via l'URL `?diapo=CODE`.
- **Export ZIP** — toutes les photos d'une partie, archive organisée par équipe.
- **Tirage souvenir** — chaque équipe choisit sa photo préférée en fin de chasse ; le maître du jeu récupère les tirages **encadrés** (rose des vents, nom de la chasse, nom de l'équipe, date) au **format 10×15 prêt à imprimer** (portrait ou paysage), à l'unité ou en ZIP.
- **PWA offline** — service worker (app-shell en cache) + **file d'envoi photo hors-ligne** (IndexedDB) : un rechargement en coupure ne casse plus rien, une photo prise sans réseau part automatiquement au retour du réseau.
- **Dupliquer / supprimer une chasse** — liste de toutes vos chasses passées : re-jouer les mêmes indices en une nouvelle session, ou effacer définitivement (photos comprises).
- **Sécurité & RGPD** — auth admin par **code email** (Supabase Auth), **RLS scopées**, bucket photos verrouillé, consentement + politique de confidentialité + purge automatique à 90 j (⚠️ les fichiers restent à purger depuis l'app, voir [`PROJECT.md`](PROJECT.md)).

## Stack

| Couche | Choix |
|---|---|
| Frontend | HTML5 + Vanilla JS, fichier unique (~3360 lignes), zéro build |
| Caméra | `<input type="file" capture>` (natif iOS/Android) |
| Backend | Supabase (Postgres + Realtime + Storage + **Auth**) |
| Carte | Leaflet 1.9.4 + tuiles OpenStreetMap (orientation des indices) |
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

Le dépôt se déploie sur **GitHub Pages** (le fichier `.nojekyll` à la racine désactive Jekyll et évite l'échec de build sur les `{{ }}` des docs). Prod : `https://mikrob-glitch.github.io/Expedition/expedition.html`. Alternatives : Netlify Drop / Vercel (HTTPS obligatoire pour la caméra).

**3. Première utilisation**

L'app embarque des valeurs Supabase **par défaut** codées en dur (`SUPABASE_DEFAULTS`), surchargables via l'écran **Configuration** (`localStorage` : `sb_url` / `sb_key`, par navigateur). L'**admin** se connecte par **code email** ; les **équipes** rejoignent par **code de chasse** (saisi ou via **QR code**).

## Développement local

```bash
# Serveur local (HTTPS recommandé pour la caméra)
python3 -m http.server 8000
# puis ouvrir http://localhost:8000/expedition.html
```

> ⚠️ En modifiant `sw.js`, **bumper la constante `CACHE`** à chaque changement d'app-shell, sinon les appareils gardent l'ancienne version en cache. Le déploiement se fait par commit + push GitHub (procédure dans [`CLAUDE.md`](CLAUDE.md)).
