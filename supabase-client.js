// Supabase Client for Frontend
// Replace with your actual Supabase credentials

const SUPABASE_URL = 'your_supabase_project_url';
const SUPABASE_ANON_KEY = 'your_supabase_anon_key';

// Initialize Supabase client (add this script tag in HTML before this file)
// <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>

let supabaseClient = null;

function initSupabase() {
  if (window.supabase) {
    supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  }
  return supabaseClient;
}

function getSupabase() {
  return supabaseClient;
}

module.exports = { initSupabase, getSupabase };
