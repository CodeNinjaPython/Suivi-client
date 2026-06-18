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
  - En preview, Tailwind est chargé via le Play CDN. **En production, passer au build
    Tailwind** (CLI ou PostCSS) pour la performance.
- **Back / BDD** : **Supabase** (Postgres + Auth + RLS). Choisi plutôt que Firebase
  car les données sont relationnelles et la sécurité par token est plus simple en SQL.
- **Hébergement** : Vercel ou Netlify (site statique servi depuis `public/`).
- **QR code** : à générer (lib JS type `qrcode`, ou service) côté interface admin.

## Arborescence

```
suivi-projet/
├─ CLAUDE.md          ← ce fichier (contexte projet)
├─ README.md          ← démarrage rapide
├─ schema.sql         ← schéma BDD + politiques RLS + fonction RPC (à coller dans Supabase)
└─ public/
   ├─ suivi.html      ← page CLIENT (FAITE — branchement Supabase à activer)
   └─ admin.html      ← interface ADMIN (À CRÉER)
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
| project_title    | text        | ex. « Votre film de mariage »                           |
| project_type     | text        | ex. « Film de mariage », « Documentaire »               |
| event_date       | date        | date de l'événement / tournage                          |
| steps            | jsonb       | tableau ordonné des étapes                              |
| current_step     | int         | index 0-based de l'étape en cours dans `steps`          |
| step_dates       | jsonb       | dates de passage par étape, ex. `{"4":"2026-06-10"}`    |
| client_note      | text        | mot de l'équipe (optionnel)                             |
| delivered        | boolean     | projet livré ?                                          |
| delivery_url     | text        | lien de livraison (Drive, WeTransfer…)                  |
| created_at       | timestamptz |                                                         |
| updated_at       | timestamptz |                                                         |

### Sécurité (important)

- RLS activé : rien n'est lisible par défaut.
- **Admin** : accès complet réservé aux utilisateurs authentifiés (`auth.role() = 'authenticated'`).
- **Client** : ne lit JAMAIS la table directement. Il appelle la fonction RPC
  `get_project_by_token(token)` qui renvoie **uniquement son projet** et **seulement les
  champs publics** (jamais l'`id` ni les tokens des autres projets). Exposée au rôle `anon`.

---

## Charte visuelle (à respecter sur toutes les pages)

Identité « cinéma » sombre et premium, inspirée des pages produit Apple/DJI, déjà
établie sur les autres sites de Jérémie.

**Couleurs**
- `noir` #0B0A08 · `charbon` #14110C · `charbon-2` #1C1810
- `or` #C9A24A · `or-clair` #E6CD93
- `creme` #EFE8D8 (texte principal) · `sable` #8C8473 (texte atténué)

**Typo**
- Titres : **Cormorant Garamond** (serif)
- Corps : **DM Sans**
- Données / dates / labels techniques : **DM Mono**

**Direction**
- **Mobile-first** (le client arrive par QR code sur son téléphone).
- Élément signature de la page client : la timeline traitée comme une **table de
  montage** — rail vertical qui se remplit d'or jusqu'à l'étape atteinte, tête de
  lecture lumineuse et pulsée sur l'étape en cours.
- Animations sobres, `prefers-reduced-motion` respecté, focus clavier visible.

---

## État du projet

### Fait
- [x] Schéma BDD + RLS + fonction RPC (`schema.sql`).
- [x] Page client `public/suivi.html` (responsive, données de démo, charte appliquée).
      Le bloc d'intégration Supabase est présent en commentaire en bas du fichier.

### À faire (par ordre suggéré)
1. **Brancher la page client sur Supabase** : créer le projet Supabase, exécuter
   `schema.sql`, puis remplacer `render(DEMO)` par `loadProject()` (clés URL + anon
   dans `suivi.html`). Ajouter le script `@supabase/supabase-js`.
2. **Interface admin `public/admin.html`** : login Supabase Auth ; liste des projets ;
   création d'un projet (génère le `public_token`) ; bouton « étape suivante » qui
   met à jour `current_step` + horodate `step_dates` ; bascule `delivered` + saisie
   `delivery_url` et `client_note` ; **génération du lien + QR code** du client.
3. **Déploiement** Vercel/Netlify + passage au **build Tailwind** (sortir du CDN).
4. (Option) Table `step_history` ou notifications email à la livraison.

---

## Conventions & préférences de travail

- Travail **itératif et visuel** : préférer les ajustements guidés par des références
  et captures plutôt que des specs écrites longues.
- Garder les pages **autonomes et simples** à déployer.
- Ne jamais exposer la clé `service_role` côté front : uniquement la clé **anon**.
- Code et commentaires en français.
