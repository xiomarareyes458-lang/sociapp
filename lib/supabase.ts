import { createClient } from '@supabase/supabase-js';


// Priorizar variables de entorno de Vite/Netlify
const supabaseUrl = (import.meta as any).env?.VITE_SUPABASE_URL || 'https://evrnqrczjscuahopbkde.supabase.co';
const supabaseAnonKey = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV2cm5xcmN6anNjdWFob3Bia2RlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA5NDAyNTIsImV4cCI6MjA4NjUxNjI1Mn0.ZEcHRY-2hT_P8Tgt1lJDZzegHp0vbzZanL3ufbFP2m4';

export let supabase: any = null;
export let isSupabaseConfigured = false;

try {
  if (supabaseUrl && supabaseAnonKey && supabaseUrl.startsWith('http')) {
    supabase = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        storageKey: 'social_app_auth_token'
      }
    });
    isSupabaseConfigured = true;
  }
} catch (e) {
  console.error('Error crítico inicializando Supabase:', e);
}

/**
 * Sube la foto de perfil al bucket 'avatars'
 */
export async function uploadProfileImage(file: Blob | File, userId: string): Promise<string> {
  try {
    const fileExt = file instanceof File ? file.name.split('.').pop() : 'png';
    const filePath = `profile-${userId}-${Date.now()}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(filePath, file, { 
        upsert: true 
      });

    if (uploadError) throw uploadError;

    const { data } = supabase.storage
      .from('avatars')
      .getPublicUrl(filePath);

    return data.publicUrl;
  } catch (err) {
    console.error("Error subiendo foto de perfil:", err);
    throw err;
  }
}

/**
 * Sube la foto de portada al bucket 'avatars'
 */
export async function uploadCoverImage(file: Blob | File, userId: string): Promise<string> {
  try {
    const fileExt = file instanceof File ? file.name.split('.').pop() : 'png';
    const filePath = `cover-${userId}-${Date.now()}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(filePath, file, { 
        upsert: true 
      });

    if (uploadError) throw uploadError;

    const { data } = supabase.storage
      .from('avatars')
      .getPublicUrl(filePath);

    return data.publicUrl;
  } catch (err) {
    console.error("Error subiendo foto de portada:", err);
    throw err;
  }
}

// Mantener compatibilidad si se usa en otros sitios
export async function uploadImageToSupabase(file: Blob | File, userId: string): Promise<string> {
  return uploadProfileImage(file, userId);
}
