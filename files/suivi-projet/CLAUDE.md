# Suivi de projet client — PRISMAE / Jérémie & Jeannette

Plateforme web de suivi de projet pour une activité de **production vidéo & photo**
(documentaire, mariage, commercial) basée à **La Réunion**. Le client reçoit un
**lien unique / QR code** en fin de tournage et suit l'avancement de son projet sur
une page personnalisée.

> Langue de l'interface et des échanges : **français**. Réponds en français.

---

## Concept

- Chaque projet a un **token public** unique → lien client `…/suivi.html?p=TOKEN`.
- Le client voit une **timeline d'avancement** (étapes du workflow), une éventuelle
  note de l'équipe, et un bouton de livraison finale quand le projet est livré.
- L'admin (Jérémie, seul utilisateur authentifié) crée les projets, fait avancer
  l'étape en un clic, et génère le lien/QR code.

## Workflow par défaut (modifiable par projet)

`Tournage prévu → Tournage en cours → Tournage terminé → Tri des rushs → Montage → Finalisation → Livraison`

Les étapes sont stockées **par projet** (colonne `steps` en JSON) pour que mariage,
documentaire et commercial puissent avoir des workflows différents sans toucher au code.

---

## Stack

- **Front** : HTML + Tailwind CSS + JavaScript vanilla (pas de framework).
  - Tailwind est **buildé en local** (plus de Play CDN) : `npm run build:css` génère
    `public/styles.css` (bleu PRISMAE), `public/styles-studio.css` (or Studio) et
    `public/styles-mariage.css` (ivoire Mariage) à partir de `src/input.css` et des trois
    configs `tailwind.config.cjs` / `tailwind.studio.config.cjs` / `tailwind.mariage.config.cjs`.
    Polices **auto-hébergées** (`public/fonts/` + `public/fonts.css` ; polices Mariage dans
    `public/assets/fonts/` + `public/fonts-mariage.css`).
- **Back / BDD** : **Supabase** (Postgres + Auth + RLS). Choisi plutôt que Firebase
  car les données sont relationnelles et la sécurité par token est plus simple en SQL.
- **Notifications** : **Edge Function** `supabase/functions/notify` (Deno), déclenchée par un
  Database Webhook sur `UPDATE projects`, envoi email via **Brevo** (sans domaine, expéditeur
  vérifié). Voir `supabase/NOTIFICATIONS.md`.
- **Hébergement** : **Vercel** (site statique servi depuis `public/`) — live sur
  `https://suivi-client.vercel.app`. Analytics Vercel (sans cookie) sur les pages client.
- **QR code** : généré côté admin (lib `qrcode-generator`, dessiné sur canvas → PNG).

## Arborescence

```
suivi-projet/
├─ CLAUDE.md              ← ce fichier (contexte projet)
├─ README.md              ← démarrage rapide
├─ schema.sql             ← schéma BDD + RLS + fonctions RPC (à coller dans Supabase)
├─ package.json           ← build Tailwind (npm run build:css)
├─ tailwind.config.cjs    ← config Tailwind (bleu PRISMAE)
├─ tailwind.studio.config.cjs ← config Tailwind (or Studio)
├─ tailwind.mariage.config.cjs ← config Tailwind (ivoire Mariage)
├─ src/input.css          ← entrée du build Tailwind
├─ supabase/
│  ├─ NOTIFICATIONS.md     ← mise en place des emails (Brevo)
│  └─ functions/notify/index.ts ← Edge Function d'envoi email
└─ public/                ← racine servie par Vercel
   ├─ index.html          ← page d'accueil PRISMAE
   ├─ suivi.html          ← page CLIENT (bleu PRISMAE) — branchée Supabase
   ├─ suivi-studio.html   ← page CLIENT (or Studio) — variante commutée par projet
   ├─ suivi-mariage.html  ← page CLIENT (ivoire Mariage) — charte du site de mariage
   ├─ admin.html          ← interface ADMIN complète (auth, CRUD, QR, export CSV)
   ├─ styles.css / styles-studio.css / fonts.css  ← CSS buildés + polices
   ├─ fonts/              ← polices .woff2 auto-hébergées
   └─ manifest.webmanifest, icônes, og-image, logo  ← PWA + Open Graph
```

---

## Modèle de données (voir `schema.sql`)

Table `projects` :

| colonne          | type        | rôle                                                    |
|------------------|-------------|---------------------------------------------------------|
| id               | uuid        | clé primaire                                            |
| public_token     | text unique | token du lien client (`?p=`)                            |
| studio_name      | text        | « Jérémie & Jeannette » (mariage) ou « PRISMAE » (com.) |
| studio_tagline   | text        | ex. « Immortels Souvenirs »                             |
| client_name      | text        | ex. « Sophie & Marc »                                   |
| client_email     | text        | email du client (pour les notifications, optionnel)     |
| project_title    | text        | ex. « Votre film de mariage »                           |
| project_type     | text        | ex. « Film de mariage », « Documentaire »               |
| event_date       | date        | date de l'événement / tournage                          |
| steps            | jsonb       | tableau ordonné des étapes                              |
| current_step     | int         | index 0-based de l'étape en cours dans `steps`          |
| step_dates       | jsonb       | dates de passage par étape, ex. `{"4":"2026-06-10"}`    |
| client_note      | text        | mot de l'équipe (optionnel)                             |
| delivered        | boolean     | projet livré ?                                          |
| delivery_url     | text        | lien de livraison (Drive, WeTransfer…)                  |
| estimated_delivery | date      | date de livraison estimée (visible client, optionnel)   |
| style            | text        | `prismae` (bleu), `studio` (or) ou `mariage` (ivoire) → choisit la page |
| archived         | boolean     | projet archivé (masqué de la liste active)              |
| view_count       | int         | nb de consultations du lien client                      |
| last_viewed_at   | timestamptz | dernière consultation du lien                           |
| created_at       | timestamptz |                                                         |
| updated_at       | timestamptz |                                                         |

Table `project_views` : journal des consultations (une ligne par ouverture du lien client :
`project_id`, `viewed_at`, `user_agent`). Lue par l'admin uniquement.

Table `step_history` : historique des changements d'étape (`project_id`, `step_index`,
`step_name`, `changed_at`), alimentée par un trigger `on_project_update`. Lue par l'admin.

### Sécurité (important)

- RLS activé : rien n'est lisible par défaut.
- **Admin** : accès restreint à **un seul email** via la fonction `is_admin()`
  (`auth.jwt() ->> 'email'`). Défense en profondeur sur une instance partagée.
  Voir `supabase/migration-securite-historique.sql` (⚠️ y mettre le bon email avant de lancer).
- **Porte email client** : la page client (`suivi.html` / `suivi-studio.html`) **exige la
  saisie de l'email** avant d'afficher le suivi. L'email est enregistré (notifications) puis
  mémorisé sur l'appareil (`localStorage`). Filtre côté client + capture (le lien à token
  donne toujours techniquement accès aux données ; blocage strict serveur = chantier séparé).
- **Client** : ne lit JAMAIS la table directement. Il passe par des fonctions RPC
  `security definer` exposées au rôle `anon`, qui ne renvoient/écrivent que le strict
  nécessaire (jamais l'`id` ni les tokens des autres) :
  - `get_project_by_token(token)` → champs publics de son projet (+ `has_email`, sans l'exposer) ;
  - `set_client_email(token, email)` → enregistre l'email (anti-abus : n'écrase pas un
    email existant, format validé, projet actif uniquement) ;
  - `register_project_view(token, ua)` → compteur + journal de consultation (throttle 15 s).

---

## Charte visuelle (à respecter sur toutes les pages)

Alignée sur le **nouveau site portfolio de Jérémie** (`github.com/CodeNinjaPython/site-jeremie`,
dossier `site/`, Next.js) : sombre bleu-nuit, accent bleu électrique, premium et moderne.

**Couleurs**
- `bg` #07090c · `bg-soft` #0e1218 · `surface` #12161d
- `accent` #3b9bff · `accent-soft` #9ecbff
- `ink` #f4f1ec (texte principal) · `ink-soft` #a3a8b2 · `ink-muted` #6b7280
- lignes/bordures : `rgba(244,241,236,0.08)`
- fond : dégradés radiaux bleus (halo en haut à droite) sur #07090c

**Typo**
- Titres : **Syne** (700/800, `letter-spacing:-0.02em`)
- Corps : **Manrope**
- Données / dates / labels techniques : **DM Mono**

**Éléments signature**
- Badge « kicker » : pilule bleue translucide + point pulsé.
- Boutons **pilule** (`border-radius:999px`), primaire bleu plein, ghost bordé.
- Grain léger en overlay, halos bleus, `prefers-reduced-motion` respecté.
- Timeline client = « table de montage » recolorée en bleu (rail qui se remplit,
  tête de lecture lumineuse pulsée sur l'étape en cours).

**Direction**
- **Mobile-first** (le client arrive par QR code sur son téléphone). Desktop : page client
  sur 2 colonnes (ordre mobile préservé via `display:contents`).
- Élément signature de la page client : la timeline traitée comme une **table de
  montage** — rail vertical qui se remplit (bleu en style PRISMAE, or en style Studio)
  jusqu'à l'étape atteinte, tête de lecture lumineuse et pulsée sur l'étape en cours.
- Animations sobres, squelette de chargement, `prefers-reduced-motion` respecté, focus clavier visible.

---

## État du projet

### Fait
- [x] Schéma BDD + RLS + fonctions RPC (`schema.sql`). Token public en **hex** (URL-safe).
- [x] Page client **branchée sur Supabase**, en **trois styles** (bleu PRISMAE / or Studio / ivoire Mariage)
      commutés par projet : **porte email obligatoire** à l'entrée, timeline, note d'équipe,
      prochaine étape + livraison estimée, bouton de livraison, squelette de chargement,
      **partage** (Web Share), **« poser une question »** (mailto), écrans d'erreur.
- [x] Interface admin `public/admin.html` complète : login Supabase Auth (robuste, sans
      interblocage) ; liste avec **stats**, **recherche/tri**, **archives**, badge d'inactivité ;
      création (modèles de workflow) ; détail avec édition complète, « étape suivante/précédente »
      horodatée, note, livraison estimée, `delivered` + `delivery_url`, style ; **archivage**,
      **duplication**, **suppression** ; **lien + QR code** (copie + PNG) ; **export CSV** ;
      **journal des consultations** par client.
- [x] **Notifications email** (Brevo) via Edge Function + Database Webhook ; email responsive,
      accent par style, bouton « avis Google » à la livraison. Voir `supabase/NOTIFICATIONS.md`.
- [x] **Build Tailwind local** (sortie du CDN) + polices auto-hébergées. **PWA** + Open Graph.
- [x] **PWA installable** : service worker (`public/sw.js`) — cache de la coquille, données
      réseau (jamais périmées), navigations réseau-d'abord.
- [x] **RLS durcie** (`is_admin()` par email) + **historique des étapes** (`step_history` +
      trigger, affiché dans l'admin) — appliquer `supabase/migration-securite-historique.sql`.
- [x] **Déployé** sur Vercel (`suivi-client.vercel.app`) + analytics sans cookie.

### À faire / pistes
1. **Appliquer la migration** `supabase/migration-securite-historique.sql` sur la base live
   (⚠️ y renseigner le bon email admin avant, sinon tu te bloques l'accès à `admin.html`).
2. **Délivrabilité email** : l'envoi part d'un Gmail vérifié via Brevo (sans domaine) → risque
   de spam. Vérifier un **domaine** (SPF/DKIM) pour fiabiliser (voir NOTIFICATIONS.md §6).
3. (Option) **Blocage strict serveur** de la page client (aujourd'hui : porte email côté
   client + capture ; le lien à token donne toujours techniquement accès aux données).

### Infos projet Supabase
- URL : `https://omqskfgodwycorwokwzo.supabase.co`
- Clé publique (anon/publishable) en dur dans `suivi.html` et `admin.html` — OK, publique.
- Token de test : `1fbdb0c70cfe5cdc8d` (projet « Sophie & Marc »).

---

## Conventions & préférences de travail

- Travail **itératif et visuel** : préférer les ajustements guidés par des références
  et captures plutôt que des specs écrites longues.
- Garder les pages **autonomes et simples** à déployer.
- Ne jamais exposer la clé `service_role` côté front : uniquement la clé **anon**.
- Code et commentaires en français.
