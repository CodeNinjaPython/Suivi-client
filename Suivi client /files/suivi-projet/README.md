# Suivi de projet client

Plateforme de suivi de projet pour clients (production vidéo & photo, La Réunion).
Le client reçoit un lien / QR code et suit l'avancement de son projet sur une
timeline. Stack : HTML + Tailwind (build local) + JS · Supabase · Netlify/Vercel.

## Contenu

- `CLAUDE.md` — contexte complet du projet (à lire en premier).
- `schema.sql` — schéma BDD + sécurité (RLS + RPC), à coller dans l'éditeur SQL de Supabase.
- `public/suivi.html` — page **client** (branchée Supabase, repli sur données de démo).
- `public/admin.html` — **console admin** (login, création/édition de projets, lien + QR).
- `public/config.js` — configuration Supabase **partagée** (URL + clé anon) à renseigner.
- `public/styles.css` — CSS Tailwind compilé (généré par `npm run build:css`).

## Aperçu rapide (sans Supabase)

Ouvre `public/suivi.html` dans un navigateur : tant que `config.js` n'est pas
renseigné (ou sans `?p=...`), la page tourne avec des données de démo.

> Note : les styles proviennent de `public/styles.css`. S'il n'existe pas encore,
> lance d'abord `npm install` puis `npm run build:css`.

## Mise en production

1. **Base de données**
   - Crée un projet sur [supabase.com](https://supabase.com).
   - Ouvre SQL Editor → New query → colle `schema.sql` → Run.
   - Authentication → Users → ajoute ton compte admin (email + mot de passe).

2. **Configuration**
   - Project Settings → API : copie *Project URL* et la clé *anon public*.
   - Renseigne-les dans `public/config.js` (ne mets **jamais** la clé `service_role`).

3. **Build CSS**
   ```bash
   npm install
   npm run build:css      # génère public/styles.css
   # ou, en développement : npm run watch:css
   ```

4. **Déploiement** (dossier `public/` servi en statique)
   - Netlify : `netlify.toml` est prêt (build `npm run build:css`, publish `public`).
   - Vercel : `vercel.json` est prêt (même build, output `public`).

## Utilisation (admin)

1. Ouvre `admin.html`, connecte-toi.
2. « + Nouveau projet », renseigne client + titre.
3. Fais avancer le projet via « Étape suivante » (horodatage automatique) ou le sélecteur.
4. Ajoute une note, un lien de livraison, coche « livré » quand c'est prêt.
5. Copie le lien ou fais scanner le QR code au client.
