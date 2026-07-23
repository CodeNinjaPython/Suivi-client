# Notifications email (Brevo, sans nom de domaine) — mise en place

Le client reçoit un email automatique **à chaque changement d'étape** et **à la livraison**.
Logique : `supabase/functions/notify/index.ts` (Edge Function) déclenchée par un **Database
Webhook** sur la table `projects`, qui envoie via **Brevo**. Brevo permet d'envoyer **sans
domaine** grâce à l'« expéditeur unique vérifié » (on vérifie une adresse à soi, ex. un Gmail).
La clé API reste un **secret Supabase**.

## 0. Migration BDD
Voir le bloc SQL consolidé fourni dans le suivi (colonnes client_email / view_count /
last_viewed_at + fonctions get_project_by_token, register_project_view, set_client_email).

## 1. Compte Brevo
1. Crée un compte sur https://www.brevo.com (gratuit, 300 emails/jour).
2. **Vérifie ton expéditeur** : Settings → Senders, Domains & Dedicated IPs → **Senders** →
   Add a sender → mets ton nom + ton email (ex. `jeremie.fv@gmail.com`) → tu reçois un email
   de validation, clique le lien. (Aucun domaine requis.)
3. **Clé API** : Settings → **SMTP & API** → **API Keys** → Generate a new API key → copie-la.

## 2. Secrets Supabase
Edge Functions → Secrets (remplace les anciens secrets Resend) :
```
BREVO_API_KEY = xkeysib-xxxxxxxx
SENDER_EMAIL  = jeremie.fv@gmail.com     # l'expéditeur VÉRIFIÉ dans Brevo
SENDER_NAME   = PRISMAE
SITE_URL      = https://suivi-client.vercel.app
WEBHOOK_SECRET = (la même valeur que dans le webhook)
```
(Tu peux supprimer RESEND_API_KEY et FROM_EMAIL, ils ne servent plus.)

## 3. Redéployer la fonction
Edge Functions → `notify` → édite et **colle le nouveau code** de
`supabase/functions/notify/index.ts` (version Brevo) → Deploy. (Verify JWT reste sur OFF.)

## 4. Webhook
Déjà en place (trigger `on_project_update_notify`). Rien à refaire si tu l'as créé.

## 5. Tester
Admin → un projet avec un email client → avance l'étape → Enregistrer. Le client doit
recevoir le mail. Avec Brevo + expéditeur vérifié, l'envoi fonctionne vers **n'importe quel
email** (pas seulement le tien). Logs : Supabase → Edge Functions → notify → Logs.

> Délivrabilité : sans domaine, les mails partent depuis ton Gmail vérifié via Brevo ; ils
> peuvent parfois arriver en spam. Pour une délivrabilité optimale, vérifier un domaine (voir §6).

## 6. Passer à un domaine (recommandé pour l'anti-spam)

Envoyer depuis un Gmail via Brevo fonctionne, mais les mails finissent souvent en spam
(le domaine `gmail.com` ne t'appartient pas → pas d'alignement SPF/DKIM/DMARC). Dès que tu
as un nom de domaine (ex. `prismae.re`), authentifie-le dans Brevo :

1. **Brevo → Settings → Senders, Domains & Dedicated IPs → Domains → Add a domain.**
   Saisis ton domaine (`prismae.re`).
2. Brevo affiche des **enregistrements DNS** (une clé **DKIM** en TXT/CNAME, un **SPF**,
   souvent un **DMARC**). Ajoute-les chez ton **registrar** (là où le domaine est géré :
   OVH, Gandi, Cloudflare…). Attends la propagation (quelques minutes à quelques heures).
3. Reviens sur Brevo → **Verify / Authenticate** : les enregistrements passent au vert.
4. **Crée un expéditeur sur ce domaine** (ex. `contact@prismae.re`) et vérifie-le.
5. Mets à jour le **secret Supabase** `SENDER_EMAIL = contact@prismae.re`
   (Edge Functions → Secrets), garde `SENDER_NAME = PRISMAE`. Rien d'autre à changer
   dans le code : `notify` lit déjà `SENDER_EMAIL`.
6. Renvoie un mail de test (avance une étape) et vérifie qu'il arrive en boîte principale.

> Astuce : ajoute aussi un enregistrement **DMARC** en « p=none » au début (surveillance),
> puis « p=quarantine » une fois que tout est vert, pour maximiser la réputation.
