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
    'estimated_delivery', estimated_delivery
  )
  from projects where public_token = token;
$$;

grant execute on function get_project_by_token to anon;
