# Expédition · Chasse au trésor photo

Application web mobile pour organiser une **chasse au trésor multi-équipes**. Les équipes résolvent des indices, valident chaque lieu par une **photo + position GPS**, et l'admin juge en temps réel et distribue les points.

> Prototype mono-fichier, zéro build, prêt à déployer. La documentation technique complète est dans [`PROJECT.md`](PROJECT.md).

## Aperçu

- **Multi-équipes en temps réel** — synchronisation par websockets (Supabase Realtime).
- **Preuve par photo géolocalisée** — caméra native + GPS, compression côté client.
- **Jugement live par l'admin** — validation, points et bonus distribués en direct.
- **Aucune installation** — un seul fichier HTML, fonctionne dans le navigateur du téléphone.

## Stack

| Couche | Choix |
|---|---|
| Frontend | HTML5 + Vanilla JS (fichier unique, zéro build) |
| Cartes | Leaflet + OpenStreetMap |
| Caméra | `<input type="file" capture="environment">` (natif iOS/Android) |
| Backend | Supabase (Postgres + Realtime + Storage) |
| Hébergement | Netlify Drop / Vercel / GitHub Pages (HTTPS requis) |

## Démarrage rapide

**1. Supabase (~5 min)**

1. Créer un projet gratuit sur [supabase.com](https://supabase.com).
2. Ouvrir **SQL Editor**, coller le contenu de [`supabase-setup.sql`](supabase-setup.sql) et lancer **Run**.
3. Dans **Settings → API**, noter le `Project URL` et la clé `anon public`.

**2. Hébergement (~2 min)**

Déposer `expedition.html` sur [app.netlify.com/drop](https://app.netlify.com/drop) pour obtenir une URL HTTPS (la caméra et la géolocalisation l'exigent).

**3. Première utilisation**

Ouvrir l'URL → écran **Configuration** → coller l'URL et la clé `anon` → **Connecter**. La config est conservée en `localStorage`, par navigateur.

## Développement local

```bash
# Serveur local (HTTPS recommandé pour caméra/géoloc)
python3 -m http.server 8000
# puis ouvrir http://localhost:8000/expedition.html
# (tunnel HTTPS via ngrok / cloudflared pour tester sur mobile)
```

## Structure

```
expedition.html       App complète, single-file SPA (~1400 lignes)
supabase-setup.sql    Schéma + RLS + bucket Storage (à exécuter 1×)
PROJECT.md            Documentation technique détaillée
```

## Sécurité

Ce dépôt ne contient **aucun secret** : l'URL et la clé `anon` Supabase sont saisies par l'utilisateur et stockées localement dans le navigateur. La clé `anon` est publique par conception ; ne jamais committer de clé `service_role`.

> ⚠️ Les policies RLS livrées sont **permissives** (jeu privé partagé par lien). Voir la section « Roadmap vers la production » de [`PROJECT.md`](PROJECT.md) pour sécuriser avant un usage public.

## Licence

[MIT](LICENSE).
