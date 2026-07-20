/* =========================================================================
   CONFIGURATION SUPABASE (partagée par suivi.html et admin.html)
   -------------------------------------------------------------------------
   Instance partagée avec le projet "notre-couple".
   Clé "publishable" (nouveau format Supabase) = clé publique côté front,
   équivalente à l'ancienne "anon". Sûre à exposer.

   IMPORTANT : ne mets JAMAIS la clé "secret" (sb_secret_...) ici. Uniquement
   la clé publishable. La sécurité est assurée par les politiques RLS et la
   fonction get_project_by_token (voir schema.sql).
   ========================================================================= */
window.APP_CONFIG = {
  SUPABASE_URL:  "https://aymtpbsmmclpfehlkdha.supabase.co",
  SUPABASE_ANON: "sb_publishable_rKhCtcLCsFB1OcVcYjHTEQ_VJjelP3y",
};
