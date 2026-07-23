# Suivi-client — carte du projet (à lire en premier)

Plateforme de suivi de projet client (PRISMAE / Jérémie & Jeannette, production
vidéo & photo, La Réunion). Site statique + Supabase, déployé sur Vercel
(`suivi-client.vercel.app`). Langue : **français**.

> But de ce fichier : éviter de relire tout le code à chaque session. Il dit où
> se trouve chaque chose et quel fichier toucher pour telle modification.

## Où travailler
- **Copie de travail : ce dépôt** (`~/Documents/Suivi-client`), branche `main`.
- ⚠️ Ne PAS utiliser `~/Documents/GitHub/Suivi client` : c'est un ancien clone mort,
  déconnecté de l'histoire réelle.
- Après édition d'un fichier `public/*.html` : `cd files/suivi-projet && npm run build:css`
  (recompile `styles.css` + `styles-studio.css`) puis commit + push (`main`).

## Arborescence utile
```
files/suivi-projet/
├─ CLAUDE.md              ← contexte détaillé (modèle de données, charte, état)
├─ schema.sql             ← schéma complet (fresh install)
├─ supabase/
│  ├─ NOTIFICATIONS.md                     ← mise en place emails (Brevo) + §6 domaine
│  ├─ migration-securite-historique.sql    ← À APPLIQUER sur la base live
│  └─ functions/notify/index.ts            ← Edge Function email (Brevo)
├─ tailwind.config.cjs / tailwind.studio.config.cjs
└─ public/                ← racine servie par Vercel
   ├─ index.html          ← page d'accueil
   ├─ suivi.html          ← page CLIENT bleue (PRISMAE)
   ├─ suivi-studio.html   ← page CLIENT or (Studio)
   ├─ admin.html          ← console admin (auth, CRUD, QR, export, historique)
   ├─ sw.js               ← service worker PWA (bump VERSION si assets changent)
   └─ styles.css / styles-studio.css / fonts.css / fonts/ / icônes / manifest
```

## Pour modifier X → toucher Y
| Modification | Fichier(s) |
|---|---|
| Page client (bleu) : contenu/porte email/logique | `public/suivi.html` |
| Page client (or) : idem style Studio | `public/suivi-studio.html` |
| Console admin : liste, fiche, création, historique | `public/admin.html` |
| BDD (tables, RLS, RPC, triggers) | `schema.sql` (+ écrire une migration dans `supabase/`) |
| Emails (contenu, expéditeur, avis Google) | `supabase/functions/notify/index.ts` + `NOTIFICATIONS.md` |
| PWA / cache / offline | `public/sw.js` (+ enregistrement en bas des pages) |
| Couleurs / polices Tailwind | `tailwind*.config.cjs` puis `npm run build:css` |

## Faits établis (ne pas re-déduire)
- **Supabase** : `https://omqskfgodwycorwokwzo.supabase.co`. Clé publishable en dur
  dans les pages (publique, OK). Ne jamais mettre la clé `secret`.
- **Token client** : hex (URL-safe), généré par défaut en base. Lien : `suivi.html?p=TOKEN`.
- **Sécurité BDD** : RLS via `is_admin()` (email admin). Le client passe par des RPC
  `security definer` (`get_project_by_token`, `set_client_email`, `register_project_view`).
- **Porte email client** : email obligatoire pour voir le suivi. Clés `localStorage` :
  - `suivi_email_<token>` : email déjà saisi sur cet appareil (ne pas redemander).
  - `sc_admin_until` : posé par `admin.html` (activité admin, 30 min) → fait sauter la
    porte pour l'admin sur les liens client.
- **Admin** : session en `sessionStorage` (déconnexion à la fermeture) + auto-logout
  30 min d'inactivité. Login Supabase Auth (email/mot de passe).
- **Deux styles** commutés par projet (`style` = `prismae` | `studio`) : `suivi.html`
  redirige vers `suivi-studio.html` si `style = studio`.

## Migration en attente
`supabase/migration-securite-historique.sql` doit être exécutée sur la base live
(après avoir mis le bon email dans `is_admin()`), sinon RLS durcie + `step_history`
inactifs. Voir aussi `files/suivi-projet/CLAUDE.md` pour le détail complet.
