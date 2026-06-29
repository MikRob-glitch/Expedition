# Expédition · Chasse au trésor photo

Application web mobile (PWA) pour organiser une **chasse au trésor multi-équipes**. Les équipes résolvent des indices, prouvent chaque trouvaille par une **photo**, l'admin **valide** la conformité, puis un **jury vote** les meilleures photos. Synchronisation temps réel entre tous les téléphones.

> Prototype mono-fichier, zéro build, prêt à déployer. La documentation technique complète est dans [`PROJECT.md`](PROJECT.md) ; le guide de travail pour modifier l'app est dans [`CLAUDE.md`](CLAUDE.md).

## Aperçu

- **Multi-équipes en temps réel** — synchronisation par websockets (Supabase Realtime).
- **Preuve par photo** — caméra native, compression côté client (pas de GPS).
- **Jugement live par l'admin** — validation conforme/refusée, puis vote du jury 50/30/10.
- **Indices de départ** — dispersion des équipes (un indice de départ distinct par équipe).
- **Diaporama public** — affichage des photos en direct via l'URL `?diapo=CODE`.
- **Export ZIP** — téléchargement de toutes les photos d'une partie en archive organisée par équipe.
- **Aucune installation** — un seul fichier HTML, fonctionne dans le navigateur du téléphone.

## Stack

| Couche | Choix |
|---|---|
| Frontend | HTML5 + Vanilla JS, fichier unique (~2040 lignes), zéro build |
| Caméra | `<input type="file" capture="environment">` (natif iOS/Android) |
| Backend | Supabase (Postgres + Realtime + Storage) |
| PWA | `manifest.json` + icônes 192/512 (pas de service worker → ni offline, ni install Android/desktop) |
| Hébergement | Netlify Drop / Vercel / GitHub Pages (HTTPS requis pour la caméra) |

> ⚠️ La carte (Leaflet/OpenStreetMap) et la géolocalisation GPS du prototype initial ont été **retirées** : la preuve est désormais purement photographique.

## Démarrage rapide

**1. Supabase (~5 min)**

1. Créer un projet gratuit sur [supabase.com](https://supabase.com).
2. Ouvrir **SQL Editor**, coller le contenu de [`supabase-setup.sql`](supabase-setup.sql) et lancer **Run**.
3. Dans **Settings → API**, noter le `Project URL` et la clé `anon public`.

**2. Hébergement (~2 min)**

Déposer `expedition.html` (+ `manifest.json` + `icons/`) sur [app.netlify.com/drop](https://app.netlify.com/drop), ou utiliser GitHub Pages, pour obtenir une URL HTTPS (la caméra l'exige).

**3. Première utilisation**

L'app embarque des valeurs Supabase **par défaut codées en dur** (`SUPABASE_DEFAULTS`) : elle se connecte donc directement. On peut les **surcharger** via l'écran **Configuration** (stocké en `localStorage` sous `sb_url` / `sb_key`, par navigateur).

## Développement local

```bash
# Serveur local (HTTPS recommandé pour la caméra)
python3 -m http.server