# Expédition · Chasse au trésor photo

Prototype mobile-web d'une chasse au trésor multi-équipes. Les équipes résolvent des indices, valident chaque lieu par une photo + position GPS, l'admin juge en temps réel et distribue les points.

---

## Stack

| Couche | Choix | Pourquoi |
|---|---|---|
| Frontend | HTML5 + Vanilla JS, fichier unique | Zéro build, déploiement par drag-drop, démarre instantanément |
| Cartes | Leaflet + OpenStreetMap | Gratuit, sans clé API, performant |
| Caméra | `<input type="file" capture="environment">` | Caméra native iOS/Android sans permission custom |
| Backend | Supabase (Postgres + Realtime + Storage) | Synchro websockets, photos hébergées, tier gratuit suffisant |
| Hébergement | Netlify Drop / Vercel / GitHub Pages | HTTPS obligatoire (caméra + géoloc l'exigent) |
| Typo | Fraunces (display serif) + Geist (sans) + Geist Mono | Identité "expédition vintage" |

---

## Fichiers du projet

```
expedition.html        ← app complète, single file (~1400 lignes)
supabase-setup.sql     ← schéma + RLS + bucket Storage, à exécuter 1x
PROJECT.md             ← ce fichier
```

---

## Démarrage rapide

### 1. Supabase (5 min)

1. Créer un projet sur **supabase.com** (gratuit)
2. **SQL Editor** → coller `supabase-setup.sql` → Run
3. **Settings → API** → noter `Project URL` et `anon public` key

### 2. Hébergement (2 min)

Déposer `expedition.html` sur **app.netlify.com/drop** → récupérer l'URL HTTPS.

### 3. Première utilisation

Ouvrir l'URL → écran Configuration → coller URL + anon key → Connecter. La config reste dans `localStorage` (par navigateur).

---

## Architecture

### Flux de données

```
Téléphone admin ─┐                                  ┌─ Téléphone équipe A
                 ├── HTTPS ──► Supabase ──► WS ────┤
Téléphone équipe ┘   (REST)    (Postgres            └─ Téléphone équipe B
                                + Realtime
                                + Storage)
```

- **Lectures/écritures** : `sb.from('table').select/insert/upsert/delete`
- **Realtime** : `sb.channel(...).on('postgres_changes', ...)` filtré par `game_code`
- **Photos** : compression canvas (1000px, JPEG 0.7+) → `sb.storage.from('photos').upload()` → URL publique stockée dans `submissions.photo_url`
- **Filet de sécurité** : poll DB toutes les 15 s au cas où le websocket lâche

### Modèle de données

```sql
games          (code PK, name, status, duration_minutes, per_clue_minutes,
                clues JSONB, admin_id, created_at, started_at, ended_at)

teams          (id PK, game_code FK, name, joined_at)

submissions    (id PK, game_code FK, team_id FK, clue_id, photo_url,
                lat, lng, status, points, bonus_points, submitted_at, judged_at)
```

- `games.clues` est en JSONB : `[{id, title, text, lat, lng, points}, ...]` — choix volontaire, les indices ne changent jamais après création, pas besoin de table dédiée.
- `status` : `setup` → `active` → `ended` (machine à états strict, contraint via CHECK).
- Toutes les FK ont `on delete cascade` : supprimer un jeu nettoie tout.

### Identité

- `me` (rôle + teamId + gameCode) → `localStorage` du navigateur, **per-device**
- Pas d'auth Supabase : tout est anon. Le code à 4 lettres sert de "secret" partagé.

### Boucles de rendu

L'app est un SPA mono-fichier sans framework. Le routeur `render()` examine `STATE` et choisit l'écran :

```
render()
├── pas de config Supabase    → screenSetup
├── pas de "me"               → screenRoleSelect
├── admin + pas de game       → screenAdminSetup
├── admin + game.setup        → screenAdminLobby
├── admin + game.active       → screenAdminLive
├── admin + game.ended        → screenAdminEnd
├── team + pas de game        → screenTeamJoin
├── team + game.setup         → screenTeamLobby
├── team + game.active        → screenTeamActive (ou screenTeamCapture si indice ouvert)
└── team + game.ended         → screenTeamEnd
```

Chaque changement Supabase (websocket) → `refreshState()` → diff JSON → `render()` si besoin.

---

## Fonctions clés à connaître

| Fonction | Rôle |
|---|---|
| `loadGame(code)` | Lit `games` + `teams`, retourne objet hydraté |
| `saveGame(game)` | UPSERT dans `games` |
| `loadSubmissions(code)` | SELECT `submissions` triées par date desc |
| `saveSubmission(sub)` | Upload photo si dataURL, puis UPSERT dans `submissions` |
| `uploadPhoto(dataUrl, gameCode, subId)` | Blob → Storage bucket `photos` → URL publique |
| `addTeam(code, name)` / `removeTeam(id)` | INSERT/DELETE dans `teams` |
| `startRealtime()` / `stopRealtime()` | Abonnement WS aux 3 tables filtrées par game_code |
| `compressImage(file)` | Canvas → JPEG, target max 1000px et < 1.4 Mo |
| `render()` | Routeur principal, idempotent |

---

## Limitations connues (assumées)

1. **Pas d'auth.** Quiconque a la clé anon peut écrire n'importe où. Acceptable pour un jeu privé partagé par lien, **inacceptable en prod publique**.
2. **Pas de mode offline.** Si une équipe perd le réseau au moment de soumettre, la preuve est perdue (pas de queue locale).
3. **Compression photo destructive.** On vise < 1.4 Mo donc qualité variable selon le contenu.
4. **Pas de tests automatisés.** Prototype.
5. **Pas de PWA installable.** Pas de manifest ni de service worker. Ajout possible en ~30 lignes.

---

## Roadmap vers la production

### Étape 1 : sécuriser (~2 h)

```sql
-- Supabase Auth : magic link ou anonyme
-- Remplacer les policies permissives par :

create policy games_admin_write on games for insert/update/delete
  using (auth.uid()::text = admin_id);

create policy games_read on games for select using (true);
-- (le code à 4 lettres reste un secret partagé)

create policy teams_member on teams for all
  using (game_code in (select game_code from teams where id = auth.uid()::text));

create policy submissions_team on submissions for insert
  with check (team_id in (select id from teams where /* user owns team */));

create policy submissions_admin_judge on submissions for update
  using (game_code in (select code from games where admin_id = auth.uid()::text));
```

### Étape 2 : app native (~1 jour)

Migrer vers **Expo (React Native)** :

```bash
npx create-expo-app expedition --template
cd expedition
npx expo install expo-camera expo-location react-native-maps @supabase/supabase-js
```

Mapping direct :
- `<input capture>` → `expo-camera` (`Camera.takePictureAsync` avec compression intégrée)
- Leaflet → `react-native-maps` (Apple Maps / Google Maps natifs)
- `localStorage` → `expo-secure-store`
- Le reste (Supabase client, schéma, RLS) ne change pas

Build APK + IPA : `eas build --platform all`. Distribution : TestFlight / lien APK / store.

### Étape 3 : nice-to-have

- Notifications push à l'équipe quand l'admin juge (Supabase Edge Function + `expo-notifications`)
- Mode offline avec queue locale (`expo-sqlite` + sync à la reconnexion)
- Vérification GPS automatique : si distance(photo, cible) > 50 m, marquer comme suspect
- Vote inter-équipes pour le bonus photo (au lieu de l'admin seul)
- Replay du jeu : timeline animée des soumissions sur la carte

---

## Décisions de design assumées

- **Pas de framework JS.** Surcoût pour un SPA de 1400 lignes, démarrage instantané, debugging trivial.
- **Photos en JPEG client-side.** WebP serait 20-30 % plus léger mais l'API canvas iOS ≤ 14 ne le supporte pas systématiquement.
- **Code de chasse à 4 lettres, alphabet réduit.** Exclu `0/O`, `1/I/L`, `Z/2`, etc. → ~32^4 = 1 M combinaisons, suffisant et lisible.
- **`clues` en JSONB**, pas une table. Les indices sont immuables après création, pas de besoin de FK, pas de jointure → écriture et lecture plus simples.
- **Pas de migrations** dans le repo, schéma livré en `.sql` plat. Pour un prototype, surcoût injustifié.

---

## Commandes utiles

```bash
# Lancer un serveur local pour développer (HTTPS recommandé pour caméra/géoloc)
python3 -m http.server 8000
# puis ouvrir https://localhost:8000/expedition.html
# (tunnel HTTPS via ngrok / cloudflared si besoin sur mobile)

# Réinitialiser une chasse côté DB
psql "$SUPABASE_DB_URL" -c "delete from games where code = 'XXXX';"
# (cascade → teams et submissions sont supprimés aussi)

# Vider le bucket photos d'un jeu
# Supabase Dashboard → Storage → photos → dossier {code} → tout sélectionner → delete
```

---

## Contact technique

Stack du créateur : Supabase, déjà familier. Migration Expo recommandée à terme.
Pour reprendre le projet : lire ce fichier, exécuter `supabase-setup.sql`, ouvrir `expedition.html`. Tout est dedans.
