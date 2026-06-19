# Notifications email (Resend) — mise en place

Le client reçoit un email automatique **à chaque changement d'étape** et **à la livraison**.
La logique est dans `supabase/functions/notify/index.ts` (Edge Function), déclenchée par un
**Database Webhook** sur la table `projects`. La clé Resend reste un **secret Supabase** : elle
n'apparaît jamais dans le code ni dans le front.

## 0. Migration BDD (colonne email)
Dans Supabase → SQL Editor :
```sql
alter table projects add column if not exists client_email text;
```
Puis, dans l'admin, renseigne l'email du client sur chaque projet.

## 1. Compte Resend
1. Crée un compte sur https://resend.com (gratuit jusqu'à 3 000 mails/mois).
2. **Vérifie un domaine** (Domains → Add Domain) pour envoyer depuis `suivi@tondomaine.re`.
   - Sans domaine, tu peux tester avec l'expéditeur `onboarding@resend.dev` (limité).
3. Crée une **API key** (API Keys → Create) et copie-la.

## 2. Secrets Supabase
Project Settings → Edge Functions → Secrets (ou via CLI `supabase secrets set`) :
```
RESEND_API_KEY = re_xxxxxxxxxxxx
FROM_EMAIL     = PRISMAE <suivi@tondomaine.re>     # ou "PRISMAE <onboarding@resend.dev>" pour tester
SITE_URL       = https://TON-URL.vercel.app        # base des liens client (sans / final)
WEBHOOK_SECRET = une-chaine-aleatoire-longue        # invente-la, on la réutilise à l'étape 4
```

## 3. Déployer la fonction
Nécessite le CLI Supabase (`npm i -g supabase`), connecté à ton projet :
```bash
supabase login
supabase link --project-ref omqskfgodwycorwokwzo
supabase functions deploy notify --no-verify-jwt
```
L'URL de la fonction sera :
`https://omqskfgodwycorwokwzo.supabase.co/functions/v1/notify`

## 4. Brancher le Database Webhook
Supabase → Database → **Webhooks** → Create a new hook :
- **Table** : `projects`
- **Events** : `Update` (uniquement)
- **Type** : HTTP Request → **POST**
- **URL** : l'URL de la fonction (ci-dessus)
- **HTTP Headers** : ajoute `x-webhook-secret` = la même valeur que `WEBHOOK_SECRET`

## 5. Tester
Dans l'admin, avance l'étape d'un projet qui a un email client → le client doit recevoir le mail.
En cas de souci, regarde les logs : Supabase → Edge Functions → notify → Logs.

> Astuce : la fonction n'envoie un mail que si l'email client est renseigné **et** si l'étape a
> changé (ou si le projet vient d'être marqué livré). Aucun spam sur les autres modifications.
