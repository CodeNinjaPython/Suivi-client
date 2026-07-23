-- =====================================================================
-- Suivi de projet client — schéma Supabase
-- À coller dans : Supabase → SQL Editor → New query → Run
-- =====================================================================

-- Table des projets
create table projects (
  id            uuid primary key default gen_random_uuid(),
  -- Token du lien client : encodage HEX (0-9 a-f) => 100% URL-safe.
  -- (base64 produirait des / + = qui cassent l'URL ?p=... . La base live est déjà en hex.)
  public_token  text unique not null default encode(gen_random_bytes(9), 'hex'),
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

-- Qui est admin ? Un seul email autorisé (défense en profondeur : même si un
-- autre compte existe sur ce projet Supabase, il n'accède pas aux données).
-- >>> REMPLACE l'email ci-dessous par celui de TON compte admin Supabase. <<<
create or replace function is_admin()
returns boolean language sql stable set search_path = public as $$
  select coalesce((auth.jwt() ->> 'email') = 'fvjeremie@gmail.com', false);
$$;

-- Toi (admin) : accès complet à la table projets
create policy "admin gère tout"
  on projects for all
  using (is_admin())
  with check (is_admin());

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
-- Journal des consultations (une ligne par ouverture du lien client)
create table if not exists project_views (
  id          bigint generated always as identity primary key,
  project_id  uuid references projects(id) on delete cascade,
  viewed_at   timestamptz not null default now(),
  user_agent  text
);
alter table project_views enable row level security;
-- Seul l'admin lit le journal ; le client n'y accède pas.
create policy "admin lit les vues" on project_views for select
  using (is_admin());

-- Compteur + journal. Anti-abus : 1 enregistrement max / 15 s par projet.
drop function if exists register_project_view(text);
create or replace function register_project_view(token text, ua text default null)
returns void language plpgsql security definer set search_path = public as $$
declare pid uuid; last timestamptz;
begin
  select id, last_viewed_at into pid, last from projects where public_token = token;
  if pid is null then return; end if;
  if last is not null and last > now() - interval '15 seconds' then return; end if;  -- throttle
  update projects set view_count = coalesce(view_count, 0) + 1, last_viewed_at = now() where id = pid;
  insert into project_views (project_id, user_agent) values (pid, left(ua, 400));
end;
$$;

grant execute on function register_project_view to anon;

-- =====================================================================
-- Historique des étapes : une ligne à chaque changement de current_step.
-- Alimenté automatiquement par un trigger (capte tout changement, quelle
-- que soit la source). Lu par l'admin uniquement.
-- =====================================================================
create table if not exists step_history (
  id          bigint generated always as identity primary key,
  project_id  uuid references projects(id) on delete cascade,
  step_index  int,
  step_name   text,
  changed_at  timestamptz not null default now()
);
alter table step_history enable row level security;
create policy "admin lit l'historique" on step_history for select
  using (is_admin());

create or replace function log_step_change()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.current_step is distinct from old.current_step then
    insert into step_history (project_id, step_index, step_name)
    values (new.id, new.current_step, new.steps ->> new.current_step);
  end if;
  return new;
end;
$$;
drop trigger if exists on_project_step_change on projects;
create trigger on_project_step_change
  after update on projects
  for each row execute function log_step_change();
