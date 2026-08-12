-- ============================================================
-- Migration : la date de livraison estimée devient activable / désactivable
-- ------------------------------------------------------------
-- Jusqu'ici, la seule façon de ne pas montrer de date de livraison au client
-- était de vider le champ, donc de perdre la date. On ajoute un interrupteur :
-- la date reste enregistrée côté admin, et on choisit projet par projet si le
-- client la voit (page de suivi + email de notification).
--
-- Sans risque : la colonne est ajoutée avec la valeur "true" par défaut, donc
-- tous les projets existants continuent d'afficher leur date comme avant.
--
-- À exécuter dans Supabase → SQL Editor.
-- ============================================================

alter table projects
  add column if not exists show_estimated_delivery boolean not null default true;

comment on column projects.show_estimated_delivery is
  'La date de livraison estimée est-elle montrée au client (page de suivi + email) ?';

-- La page client ne lit jamais la table : elle passe par cette fonction.
-- Il faut donc qu'elle renvoie le nouveau drapeau, sinon la page ne peut pas
-- savoir qu'il faut masquer la date. (Reprise à l'identique de schema.sql,
-- avec la seule ligne 'show_estimated_delivery' en plus.)
create or replace function get_project_by_token(token text)
returns json language sql security definer set search_path = public as $$
  select json_build_object(
    'studio_name', studio_name, 'studio_tagline', studio_tagline,
    'client_name', client_name, 'project_title', project_title,
    'project_type', project_type, 'event_date', event_date,
    'steps', steps, 'current_step', current_step, 'step_dates', step_dates,
    'client_note', client_note, 'delivered', delivered, 'delivery_url', delivery_url,
    'estimated_delivery', estimated_delivery, 'style', style,
    'show_estimated_delivery', show_estimated_delivery,
    'has_email', (client_email is not null)        -- l'email est-il déjà renseigné ? (sans l'exposer)
  )
  from projects where public_token = token;
$$;

grant execute on function get_project_by_token to anon;
