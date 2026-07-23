-- =====================================================================
-- MIGRATION à appliquer sur la base LIVE (Supabase → SQL Editor → Run)
-- Contenu :
--   1. Durcissement RLS : accès admin restreint à UN email (au lieu de tout
--      compte connecté).
--   2. Historique des étapes (table step_history + trigger).
-- Idempotent : peut être ré-exécuté sans casse.
--
-- ⚠️ AVANT DE LANCER : remplace l'email dans is_admin() ci-dessous par celui de
--    TON compte admin Supabase. Sinon tu te bloques l'accès à admin.html.
--    (Rassure-toi : même bloqué, tu peux toujours corriger ici, dans le SQL
--     Editor, qui s'exécute avec les pleins droits.)
-- =====================================================================

-- 1) Qui est admin ? (source unique de l'email autorisé)
create or replace function is_admin()
returns boolean language sql stable set search_path = public as $$
  select coalesce((auth.jwt() ->> 'email') = 'fvjeremie@gmail.com', false);
$$;

-- 2) Policies durcies (on remplace les anciennes basées sur auth.role())
drop policy if exists "admin gère tout" on projects;
create policy "admin gère tout"
  on projects for all
  using (is_admin())
  with check (is_admin());

drop policy if exists "admin lit les vues" on project_views;
create policy "admin lit les vues" on project_views for select
  using (is_admin());

-- 3) Historique des étapes
create table if not exists step_history (
  id          bigint generated always as identity primary key,
  project_id  uuid references projects(id) on delete cascade,
  step_index  int,
  step_name   text,
  changed_at  timestamptz not null default now()
);
alter table step_history enable row level security;
drop policy if exists "admin lit l'historique" on step_history;
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

-- Recharge le cache de l'API (par sécurité)
notify pgrst, 'reload schema';
