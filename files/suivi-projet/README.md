# Suivi de projet client

Plateforme de suivi de projet pour clients (production vidéo & photo, La Réunion).
Stack : HTML + Tailwind + JS · Supabase · Vercel/Netlify.

## Démarrer avec Claude Code

1. Place ce dossier où tu veux, ouvre un terminal dedans, lance `claude`.
2. Claude Code lit automatiquement `CLAUDE.md` (tout le contexte du projet y est).
3. Premier message suggéré :

   « Lis CLAUDE.md. On reprend ce projet. Propose-moi un plan en étapes pour
     (1) brancher la page client sur Supabase et (2) construire l'interface admin
     avec génération du lien et du QR code. »

## Contenu

- `CLAUDE.md` — contexte complet du projet (à lire en premier).
- `schema.sql` — schéma BDD + sécurité, à coller dans l'éditeur SQL de Supabase.
- `public/suivi.html` — page client (faite ; ouvre-la dans un navigateur pour la voir).

## Aperçu rapide de la page client

Ouvre `public/suivi.html` directement dans un navigateur : elle tourne avec des
données de démo. Modifie le bloc `DEMO` (en bas du fichier) pour tester les états.
