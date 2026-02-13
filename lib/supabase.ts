
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const getEnv = (key: string): string => {
  try {
    // Intenta obtener desde process.env (Vite/Webpack) o window.process (algunas configuraciones de Netlify)
    if (typeof process !== 'undefined' && process.env?.[key]) return process.env[key];
    if ((window as any).process?.env?.[key]) return (window as any).process.env[key];
  } catch (e) {}
  return '';
};

const supabaseUrl = getEnv('SUPABASE_URL');
const supabaseAnonKey = getEnv('SUPABASE_ANON_KEY');

// Solo intentamos crear el cliente si tenemos las credenciales para evitar el error "supabaseUrl is required"
export const isSupabaseConfigured = supabaseUrl !== '' && supabaseAnonKey !== '';

export const supabase = isSupabaseConfigured 
  ? createClient(supabaseUrl, supabaseAnonKey) 
  : null;
