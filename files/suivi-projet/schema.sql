-- =====================================================================
-- Suivi de projet client — schéma Supabase
-- À coller dans : Supabase → SQL Editor → New query → Run
-- =====================================================================

-- Table des projets
create table projects (
  id            uuid primary key default gen_random_uuid(),
  public_token  text unique not null default encode(gen_random_bytes(9), 'base64'),
  studio_name   text not null default 'Jérémie & Jeannette',
  studio_tagline text default 'Immortels Souvenirs',
  client_name   text not null,
  client_email  text,                     -- email du client (pour les notifications)
  project_title text not null,
  project_type  text,
  event_date    date,
  steps         jsonb not null default
                '["Tournage prévu","Tournage en cours","Tournage terminé","Tri des rushs","Montage","Finalisation","Livraison"]',
  current_step  int not null default 0,      -- index 0-based dans "steps"
  step_dates    jsonb default '{}',          -- ex: {"4":"2026-06-10"}
  client_note   text,
  delivered     boolean not null default false,
  delivery_url  text,
  estimated_delivery date,                -- date de livraison estimée (optionnelle)
  style         text not null default 'prismae',  -- 'prismae' (bleu) ou 'studio' (or)
  archived      boolean not null default false,    -- projet archivé (masqué de la liste active)
  view_count    int not null default 0,            -- nb de consultations du lien client
  last_viewed_at timestamptz,                       -- dernière consultation
  created_at    timestamptz default now(),
  updated_at    timestamptz default now()
);

-- Sécurité : on active RLS (rien n'est lisible par défaut)
alter table projects enable row level security;

-- Toi (connecté) : accès complet
create policy "admin gère tout"
  on projects for all
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

-- Le client lit UNIQUEMENT via une fonction qui filtre par token
-- et ne renvoie que les champs publics (jamais l'id ni les tokens des autres)
create or replace function get_project_by_token(token text)
returns json language sql security definer set search_path = public as $$
  select json_build_object(
    'studio_name', studio_name, 'studio_tagline', studio_tagline,
    'client_name', client_name, 'project_title', project_title,
    'project_type', project_type, 'event_date', event_date,
    'steps', steps, 'current_step', current_step, 'step_dates', step_dates,
    'client_note', client_note, 'delivered', delivered, 'delivery_url', delivery_url,
    'estimated_delivery', estimated_delivery, 'style', style,
    'has_email', (client_email is not null)        -- l'email est-il déjà renseigné ? (sans l'exposer)
  )
  from projects where public_token = token;
$$;

grant execute on function get_project_by_token to anon;

-- Le client s'inscrit lui-même aux alertes via son lien. Anti-abus :
--  · seulement si aucun email n'est déjà enregistré (pas d'écrasement d'un vrai client)
--  · format d'email validé côté serveur, longueur bornée
--  · seulement sur un projet actif (ni livré ni archivé)
create or replace function set_client_email(token text, email text)
returns void language sql security definer set search_path = public as $$
  update projects set client_email = lower(trim(email))
  where public_token = token
    and client_email is null
    and delivered = false
    and archived = false
    and length(email) <= 254
    and email ~* '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$';
$$;

grant execute on function set_client_email to anon;

-- Comptabilise une consultation du lien client (incrément + horodatage).
-- Exposée au rôle anon : la page client l'appelle au chargement.
-- Anti-abus : un incrément max toutes les 15 s par projet (bloque les boucles de spam)
create or replace function register_project_view(token text)
returns void language sql security definer set search_path = public as $$
  update projects
    set view_count = coalesce(view_count, 0) + 1,
        last_viewed_at = now()
  where public_token = token
    and (last_viewed_at is null or last_viewed_at < now() - interval '15 seconds');
$$;

grant execute on function register_project_view to anon;
