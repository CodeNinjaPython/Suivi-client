-- =====================================================================
-- MIGRATION : plusieurs comptes administrateurs
-- À appliquer sur la base LIVE (Supabase → SQL Editor → Run).
--
-- Avant, `is_admin()` n'autorisait qu'UNE adresse en dur. Ici on passe à une
-- liste : il suffit d'ajouter/retirer une ligne du tableau ci-dessous.
-- Idempotent : peut être ré-exécuté sans casse.
--
-- ⚠️ Le compte doit AUSSI exister dans Supabase → Authentication → Users.
--    Autoriser l'email ici ne crée pas le compte ; créer le compte sans
--    l'autoriser ici donne une session valide mais zéro donnée (RLS bloque).
--
-- ⚠️ Ne retire jamais ta propre adresse de la liste : tu perdrais l'accès à
--    admin.html. (Récupérable ici même : le SQL Editor a les pleins droits.)
-- =====================================================================

create or replace function is_admin()
returns boolean language sql stable set search_path = public as $$
  select coalesce(
    lower(auth.jwt() ->> 'email') = any (array[
      'fvjeremie@gmail.com',
      'contact@jourjstudio.com',
      'cjeannette821@gmail.com',
      'jourjjstudio@gmail.com'
    ]),
    false
  );
$$;

-- Vérification : doit renvoyer false ici (le SQL Editor n'a pas de JWT), et
-- true depuis une session admin connectée sur admin.html.
-- select is_admin();
