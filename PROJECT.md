# Expédition · Chasse au trésor photo

Application web mobile (PWA) pour une chasse au trésor multi-équipes. Les équipes résolvent des indices, prouvent chaque trouvaille par une **photo**, l'admin **valide** la conformité, puis un **jury vote** les meilleures photos. Synchronisation temps réel entre tous les téléphones.

> Mono-fichier, sans build. Dépôt : `github.com/MikRob-glitch/Expedition`.

---

## Stack

| Couche | Choix | Pourquoi |
|---|---|---|
| Frontend | HTML5 + Vanilla JS, fichier unique (~2040 lignes) | Zéro build, démarrage instantané, debug trivial |
| Backend | Supabase (Postgres + Realtime + Storage) | Synchro websockets, photos hébergées, tier gratuit |
| Caméra | `<input type="file" capture="environment">` | Caméra native iOS/Android sans permission custom |
| PWA | `manifest.json` + icônes 192/512 + `apple-touch-icon` | « Ajouter à l'écran d'accueil » (iOS) |
| Hébergement | Netlify / Vercel / GitHub Pages | HTTPS obligatoire (la caméra l'exige) |
| Typo | Fraunces (serif display) + Geist + Geist Mono | Identité « expédition vintage » |

> ⚠️ Changements depuis le prototype initial : **la carte (Leaflet/OpenStreetMap) et la géolocalisation GPS ont été retirées** — la preuve est désormais purement photographique.

---

## Fichiers du projet

```
expedition.html        ← app complète, single-file SPA (~2040 lignes)
supabase-setup.sql     ← schéma + RLS + bucket Storage (à exécuter 1×)
manifest.json          ← manifeste PWA
icons/                 ← icon-192.png, icon-512.png
README.md              ← présentation + démarrage rapide
PROJECT.md             ← ce fichier
```

---

## Démarrage rapide

1. **Supabase** : créer un projet sur supabase.com → SQL Editor → coller `supabase-setup.sql` → Run → noter `Project URL` + clé `anon public` (Settings → API).
2. **Config** : l'app embarque des valeurs Supabase **par défaut** codées en dur (`SUPABASE_DEFAULTS`). On peut les surcharger via l'écran **Configuration** (stocké en `localStorage`, par navigateur).
3. **Héberger** `expedition.html` (+ `manifest.json` + `icons/`) en **HTTPS**.

---

## Architecture

### Modèle de données

```sql
games        (code PK, name, status, duration_minutes, per_clue_minutes,
              clues JSONB, admin_id, created_at, started_at, ended_at)

teams        (id PK, game_code FK, name, start_clue_id, joined_at)

submissions  (id PK, game_code FK, team_id FK, clue_id, photo_url,
              status, points, bonus_points, submitted_at, judged_at,
              lat, lng  ← hérités, désormais inutilisés / optionnels)
```

- `games.clues` (JSONB) : `[{id, title, text, points}, ...]` — **plus de lat/lng** (GPS retiré).
- `teams.start_clue_id` : indice de départ imposé à l'équipe (dispersion). `null` = pas de verrou.
- `submissions.bonus_points` : sert aux **points de vote du jury** (50/30/10).
- `submissions.lat/lng` : colonnes héritées du prototype GPS, rendues **optionnelles** (l'app ne les renseigne plus).
- Toutes les FK ont `on delete cascade`.

### Machine à états (`games.status`)

```
setup → active → validation → judging → ended
```

| Statut | Phase | Qui agit |
|---|---|---|
| `setup` | Lobby : indices, équipes, **assignation des indices de départ** | Admin |
| `active` | Les équipes capturent et envoient leurs preuves photo | Équipes |
| `validation` | Marquer chaque photo **conforme / refusée** (→ points d'indice) | Admin |
| `judging` | **Vote du jury** : 50/30/10 par indice (toutes photos) | Jury/Admin |
| `ended` | Classement final + galerie | — |

> La transition `active → validation` est automatique à la fin du temps imparti.

### Routeur `render()`

SPA mono-fichier sans framework. `render()` lit `STATE` et choisit l'écran :
configuration Supabase, sélection de rôle, puis côté **admin** (setup → lobby → live → validation → vote jury → fin) et côté **équipe** (join → lobby → active/capture → attente → fin). Mode bonus : **diaporama public** via l'URL `?diapo=CODE`.

### Identité & temps réel

- `me` (rôle + teamId + gameCode) en `localStorage`, par appareil. Pas d'auth Supabase (anon).
- Abonnement Realtime (websockets) sur `games`, `teams`, `submissions` filtré par `game_code`, + poll de sécurité toutes les 15 s.

---

## Fonctionnalités clés

### Indices de départ (dispersion)

Dans le **lobby**, l'admin assigne un **indice de départ distinct par équipe** (menu déroulant par équipe + bouton « Répartir auto » qui mélange et distribue). Au lancement, chaque équipe ne voit **que son indice de départ** ; dès qu'elle l'a **réalisé (photo envoyée)**, tous les autres indices se débloquent. But : éviter que toutes les équipes partent au même endroit. Fonctionnalité **optionnelle** (« — Aucun — » = pas de verrou). Stocké dans `teams.start_clue_id`.

### Vote du jury (50 / 30 / 10)

En phase `judging`, les photos sont **groupées par indice**. Pour chaque indice, le jury attribue **🥇 50 / 🥈 30 / 🥉 10** à 3 photos max, parmi **toutes** les photos de l'indice — **y compris les refusées**. Un seul de chaque rang par indice (réassigner un rang le retire automatiquement de l'ancienne photo). Stocké dans `submissions.bonus_points`.

### Calcul du score

```
score équipe = Σ points d'indice (photos CONFORMES uniquement)
             + Σ points de vote (TOUTES les photos, refusées incluses)
```

Une photo **refusée** rapporte **0 point d'indice** mais peut gagner **50/30/10** au vote. Les photos votées (même refusées) apparaissent dans la galerie finale.

### Export ZIP des photos

Depuis les écrans **Jury** et **Fin**, un modal permet de télécharger **toutes les photos d'une partie** dans une archive `{CODE}_photos.zip` (filtrable par statut). Côté client : **JSZip** (`jszip@3.10.1`), pool de 8 requêtes parallèles. Nomenclature des fichiers : `Équipe/HHhMM_statut_indice_id.jpg`.

### PWA

`manifest.json` + icônes + `apple-touch-icon` → installable en « Ajouter à l'écran d'accueil » sur iOS.
⚠️ **Pas de service worker** : l'app n'est donc **pas pleinement installable sur Android/desktop** et **pas utilisable hors-ligne**. Ajout possible (~30 lignes).

---

## Fonctions clés à connaître

| Fonction | Rôle |
|---|---|
| `loadGame` / `saveGame` | Lire / écrire la partie (+ équipes) |
| `loadSubmissions` / `saveSubmission` | Lire / écrire les preuves (upload photo si dataURL) |
| `uploadPhoto` | Blob → Storage bucket `photos` → URL publique |
| `addTeam` / `removeTeam` | INSERT / DELETE équipe |
| `setTeamStartClue` / `autoAssignStartClues` | Assigner les indices de départ (vérifie l'écriture) |
| `myStartClueId` / `myStartClueDone` | Verrou côté équipe |
| `validateSubmission` / `resetValidation` | Conforme / refusée (points d'indice) |
| `setVote` | Vote jury 50/30/10, unicité par indice |
| `renderLeaderboard` | Classement (points d'indice + vote) |
| `render` | Routeur principal, idempotent |

---

## Sécurité ⚠️

- L'**URL et la clé anon Supabase** sont **codées en dur** dans `expedition.html` (`SUPABASE_DEFAULTS`), sur un **dépôt public**.
- Les policies **RLS sont permissives** (`for all using(true) with check(true)`).
- Conséquence : **quiconque** trouve le dépôt peut lire/écrire/supprimer toutes les données (parties, équipes, preuves) et le bucket photos.
- Acceptable pour un **jeu privé entre amis** partagé par lien ; **inacceptable** pour un usage public.
- Pistes : dépôt **privé**, OU config saisie par l'utilisateur (pas de clé en dur), OU (vraie solution) **Supabase Auth + RLS strictes**.

> Note RLS : la mise à jour de `teams` doit être autorisée (policy `for all`), sinon l'assignation des indices de départ échoue silencieusement (0 ligne écrite).

---

## Limitations connues

1. **Sécurité** : clé en dur + RLS ouvertes (voir ci-dessus).
2. **PWA partielle** : pas de service worker (ni install Android/desktop, ni offline).
3. **Plus de GPS** : la preuve est la photo seule, sans vérification de position.
4. **Pas de tests automatisés**.
5. **Compression photo destructive** (cible < 1,4 Mo).

---

## Roadmap

- **Sécuriser** : Supabase Auth + RLS basées sur `auth.uid()`, ou dépôt privé.
- **Service worker** : installation complète + cache offline + file d'attente des envois.
- **App native** (Expo/React Native) : `expo-camera`, `@supabase/supabase-js` ; le schéma et la logique ne changent pas.
- Notifications push quand le jury vote ; replay animé ; etc.

---

## Commandes utiles

```bash
# Serveur local (HTTPS recommandé pour la caméra)
python3 -m http.server 8000
# puis ouvrir http://localhost:8000/expedition.html

# Réinitialiser une chasse (cascade → teams + submissions)
psql "$SUPABASE_DB_URL" -c "delete from games where code = 'XXXX';"
```

---

## Historique des évolutions

- **Réécriture (autre poste)** : refonte UI, phases `validat