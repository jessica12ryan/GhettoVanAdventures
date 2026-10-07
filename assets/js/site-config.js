/* Site configuration — safe to commit.
 *
 * SUPABASE_URL and SUPABASE_ANON_KEY are PUBLIC values (the anon key is
 * designed to ship in client-side code). Security comes from Row Level
 * Security policies in tools/supabase-schema.sql, not from secrecy:
 * visitors can only read approved sightings and submit unapproved ones.
 *
 * Setup: create a free Supabase project, run tools/supabase-schema.sql in
 * its SQL Editor, then paste the Project URL + anon public key below.
 * Until then the Spotted page shows a "coming soon" notice.
 */
window.GVA_CONFIG = {
  SUPABASE_URL: 'https://YOUR-PROJECT.supabase.co',
  SUPABASE_ANON_KEY: 'YOUR-ANON-KEY'
};
