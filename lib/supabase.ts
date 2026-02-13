import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4';

const supabaseUrl = 'https://evrnqrcjscuahopbkde.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV2cm5xcmN6anNjdWFob3Bia2RlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA5NDAyNTIsImV4cCI6MjA4NjUxNjI1Mn0.ZEcHRY-2hT_P8Tgt1lJDZzegHp0vbzZanL3ufbFP2m4';

let supabase: any = null;
export let isSupabaseConfigured = false;

try {
  supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      storageKey: 'social_app_auth_token'
    }
  });
  isSupabaseConfigured = !!supabaseUrl && !!supabaseAnonKey;
} catch (e) {
  console.warn('Supabase no disponible en este entorno o URL inválida');
}

export { supabase };